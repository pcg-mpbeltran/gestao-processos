// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CentralStore } from './store'
import { createApi, tokenHash } from './api'
import { HttpCentralTransport } from '../src/infrastructure/sync/httpTransport'
import { CentralTaskRepository, type SyncCache } from '../src/infrastructure/sync/centralTaskRepository'
import { SyncError, type CentralTransport, type Command } from '../src/infrastructure/sync/contract'
import type { Task } from '../src/domain/task'
import type { User } from '../src/domain/user'

const a: User = { id: 'a', name: 'Pessoa A', initials: 'A', role: 'Colaborador', team: 'Equipe 1' }
const b: User = { ...a, id: 'b', name: 'Pessoa B' }
const manager: User = { ...a, id: 'g', role: 'Gestor' }
const viewer: User = { ...a, id: 'v', role: 'Visualizador' }
const outsider: User = { ...a, id: 'x', team: 'Equipe 2' }
const users = [a, b, manager, viewer, outsider]
function task(patch: Partial<Task> = {}): Task {
  return { id: 't1', title: 'Atividade demonstrativa', description: '', origin: 'equipe',
    requesterId: a.id, assigneeId: b.id, priority: 'media', status: 'nao_iniciada',
    dependencyIds: [], tags: [], visibility: 'equipe', createdAt: '', updatedAt: '', ...patch }
}
function create(patch: Partial<Task> = {}, commandId = 'create-1'): Command {
  return { kind: 'create', commandId, task: task(patch) }
}
function update(revision = 1, patch = { status: 'concluida' } as Partial<Task>, commandId = 'update-1'): Command {
  return { kind: 'update', commandId, taskId: 't1', revision, patch }
}
let store: CentralStore
let directory: string
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'process-sync-'))
  store = new CentralStore(join(directory, 'test.sqlite'), users)
})
afterEach(() => { store.close(); rmSync(directory, { recursive: true, force: true }) })

describe('Fonte central transacional', () => {
  it('A cria, B recebe, B conclui e A recupera a mudança pelo cursor', () => {
    store.execute(a, create())
    const snapshot = store.snapshot(b)
    expect(snapshot.records[0].revision).toBe(1)
    store.execute(b, update())
    const changes = store.changes(a, snapshot.cursor)
    expect(changes.changes[0].record?.task.status).toBe('concluida')
    expect(changes.changes[0].record?.revision).toBe(2)
  })
  it('reenvia exatamente o mesmo resultado sem duplicar tarefa ou auditoria, inclusive após reiniciar', () => {
    const first = store.execute(a, create())
    store.close()
    store = new CentralStore(join(directory, 'test.sqlite'), users)
    expect(store.execute(a, create())).toEqual(first)
    expect(store.snapshot(a).records).toHaveLength(1)
    expect(store.history(a, 't1')).toHaveLength(1)
    expect(() => store.execute(a, create({ title: 'Outro conteúdo' }))).toThrow('Chave idempotente')
    expect(() => store.execute(a, create({}, 'another-id'))).toThrow('Identificador')
  })
  it('duas conexões concorrentes não aceitam a mesma revisão', async () => {
    store.execute(a, create())
    const second = new CentralStore(join(directory, 'test.sqlite'), users)
    try {
      const outcomes = await Promise.allSettled([
        Promise.resolve().then(() => store.execute(a, update())),
        Promise.resolve().then(() => second.execute(b, update(1, { title: 'Edição B' }, 'b1'))),
      ])
      expect(outcomes.filter(r => r.status === 'fulfilled')).toHaveLength(1)
      const rejected = outcomes.find(r => r.status === 'rejected') as PromiseRejectedResult
      expect(rejected.reason).toBeInstanceOf(SyncError)
      expect(rejected.reason.current.revision).toBe(2)
      expect(store.history(a, 't1')).toHaveLength(2)
    } finally { second.close() }
  })
  it('não entrega conteúdo pessoal a outro usuário, gestor, feed ou histórico', () => {
    store.execute(a, create({ origin: 'pessoal', assigneeId: a.id, visibility: 'equipe', description: 'privado' }))
    for (const user of [b, manager, outsider]) {
      expect(store.snapshot(user).records).toEqual([])
      expect(store.changes(user, 0).changes).toEqual([])
      expect(() => store.history(user, 't1')).toThrow('não encontrada')
      expect(() => store.execute(user, update())).toThrow('não encontrada')
    }
    expect(store.snapshot(a).records[0].task.visibility).toBe('privada')
  })
  it('delegação pessoal explícita permite acesso sem expor o histórico privado anterior', () => {
    store.execute(a, create({ origin: 'pessoal', assigneeId: a.id, visibility: 'privada' }))
    store.execute(a, { kind: 'comment', taskId: 't1', commandId: 'private-comment', revision: 1, text: 'Nota privada' })
    store.execute(a, update(2, { assigneeId: b.id }, 'delegate'))
    expect(store.snapshot(b).records).toHaveLength(1)
    expect(JSON.stringify(store.changes(b, 0))).not.toContain('Nota privada')
    expect(store.history(b, 't1')).toEqual([])
  })
  it('revogação remove cache e impede entrega de versões antigas e replay idempotente', () => {
    store.execute(a, create({ visibility: 'envolvidos' }))
    store.execute(b, update())
    const cursor = store.snapshot(b).cursor
    store.execute(a, update(2, { assigneeId: a.id, visibility: 'privada' }, 'revoke'))
    expect(store.changes(b, cursor).changes).toEqual([{ cursor: 3, taskId: 't1', record: null }])
    expect(store.changes(b, 0).changes.every(c => c.record === null)).toBe(true)
    expect(() => store.execute(b, update())).toThrow('não encontrada')
  })
  it('valida perfil, identidade, equipe, atribuição e campos imutáveis no servidor', () => {
    expect(() => store.execute(viewer, create({ requesterId: viewer.id }))).toThrow('somente consulta')
    expect(() => store.execute(b, create())).toThrow('solicitante')
    expect(() => store.execute(a, create({ assigneeId: outsider.id }))).toThrow('fora da equipe')
    store.execute(a, create())
    expect(() => store.execute(outsider, update())).toThrow('não encontrada')
    expect(() => store.execute(b, update(1, { assigneeId: a.id }))).toThrow('Somente')
    expect(() => store.execute(a, update(1, { requesterId: b.id }))).toThrow('Comando inválido')
    expect(() => store.execute(manager, update(1, { poVersionId: 'nova' }))).toThrow('Comando inválido')
    expect(store.history(a, 't1')).toHaveLength(1)
  })
  it('comentários são revisionados, idempotentes e auditados com autor e horário do servidor', () => {
    store.execute(a, create())
    const comment: Command = { kind: 'comment', commandId: 'c1', taskId: 't1', revision: 1, text: 'Comentário de teste' }
    store.execute(b, comment)
    store.execute(b, comment)
    const history = store.history(a, 't1')
    expect(history).toHaveLength(2)
    expect(history[1]).toMatchObject({ actorId: b.id, action: 'comment', previousRevision: 1, revision: 2, comment: 'Comentário de teste' })
    expect(Number.isNaN(Date.parse(history[1].at))).toBe(false)
    expect(history[0].fields).toContain('title')
  })
  it('pagina eventos ordenados sem perder o cursor quando existem atividades invisíveis', () => {
    for (let i = 0; i < 505; i++) store.execute(a, create({ id: 't' + i, origin: 'pessoal', assigneeId: a.id }, 'k' + i))
    const first = store.changes(b, 0)
    expect(first).toEqual({ cursor: 500, changes: [] })
    expect(store.changes(b, first.cursor)).toEqual({ cursor: 505, changes: [] })
    expect(() => store.changes(a, 999)).toThrow('Cursor inválido')
  })
})

function memoryCache(): SyncCache {
  let data: ReturnType<SyncCache['load']> = null
  return { load: () => data && structuredClone(data), save: value => { data = structuredClone(value) } }
}
function transport(user: User): CentralTransport {
  return {
    session: async () => store.session(user), snapshot: async () => store.snapshot(user),
    changes: async cursor => store.changes(user, cursor), execute: async c => store.execute(user, c),
    history: async id => store.history(user, id),
  }
}

describe('Adaptador e reconexão', () => {
  it('sincroniza duas sessões, notifica assinantes e deduplica eventos repetidos', async () => {
    const repoA = new CentralTaskRepository(transport(a), memoryCache())
    const base = transport(b)
    const repoB = new CentralTaskRepository({ ...base, changes: async c => {
      const delta = await base.changes(c)
      return { ...delta, changes: [...delta.changes, ...delta.changes].reverse() }
    } }, memoryCache())
    await repoA.sync(); await repoB.sync()
    let notified = 0
    const stop = repoB.subscribe(() => notified++)
    store.execute(a, create())
    await repoB.sync()
    expect(repoB.records).toHaveLength(1)
    store.execute(b, update())
    await repoA.sync()
    expect(repoA.records[0].task.status).toBe('concluida')
    expect(notified).toBeGreaterThan(0)
    stop()
  })
  it('perda de resposta após commit e recarga da sessão reenvia o mesmo comando sem duplicar', async () => {
    const cache = memoryCache()
    const base = transport(a)
    const repo = new CentralTaskRepository({ ...base, execute: async c => {
      await base.execute(c)
      throw new TypeError('rede indisponível')
    } }, cache)
    await repo.sync()
    await repo.enqueue(create())
    await expect.poll(() => repo.state).toBe('sem conexão')
    expect(repo.pending).toHaveLength(1)
    const restored = new CentralTaskRepository(base, cache)
    await restored.sync()
    expect(restored.pending).toEqual([])
    expect(restored.records).toHaveLength(1)
    expect(store.history(a, 't1')).toHaveLength(1)
  })
  it('preserva conflito e requer reaplicação explícita com nova revisão', async () => {
    store.execute(a, create())
    const repo = new CentralTaskRepository(transport(a), memoryCache())
    await repo.sync()
    store.execute(b, update())
    await repo.enqueue(update(1, { title: 'Título de A' }, 'a2'))
    await expect.poll(() => repo.state).toBe('conflito')
    expect(store.snapshot(a).records[0].task.title).toBe('Atividade demonstrativa')
    await repo.sync()
    expect(repo.pending).toHaveLength(1)
    await repo.reapplyConflict()
    expect(repo.state).toBe('sincronizado')
    expect(repo.records[0]).toMatchObject({ revision: 3, task: { title: 'Título de A', status: 'concluida' } })
  })
  it('descarta conflito sem sobrescrever e remove atividade quando o acesso é revogado', async () => {
    store.execute(a, create({ visibility: 'envolvidos' }))
    const repo = new CentralTaskRepository(transport(b), memoryCache())
    await repo.sync()
    store.execute(a, update())
    await repo.enqueue(update(1, { title: 'Descarte' }))
    await expect.poll(() => repo.state).toBe('conflito')
    await repo.discardPending()
    expect(repo.records[0].task.title).toBe('Atividade demonstrativa')
    store.execute(a, update(2, { assigneeId: a.id, visibility: 'privada' }, 'revoke'))
    await repo.sync()
    expect(repo.records).toEqual([])
  })
  it('falha de armazenamento local não aceita silenciosamente uma operação', async () => {
    const repo = new CentralTaskRepository(transport(a), { load: () => null, save: () => { throw new Error('Quota excedida') } })
    await expect(repo.enqueue(create())).rejects.toThrow('Quota excedida')
    expect(repo.pending).toEqual([])
    expect(store.snapshot(a).records).toEqual([])
  })
})

describe('API HTTP autenticada', () => {
  it('valida credenciais e usa a identidade do servidor mesmo diante de usuário forjado', async () => {
    const server = createApi(store, [{ tokenHash: tokenHash('token-a'), user: a }, { tokenHash: tokenHash('token-b'), user: b }])
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as { port: number }
    const base = 'http://127.0.0.1:' + address.port + '/api'
    try {
      const httpA = new HttpCentralTransport('token-a', base)
      const httpB = new HttpCentralTransport('token-b', base)
      expect((await httpA.session()).user.id).toBe(a.id)
      await expect(new HttpCentralTransport('inválido', base).snapshot()).rejects.toMatchObject({ status: 401 })
      await expect(httpB.execute(create())).rejects.toMatchObject({ status: 403 })
      await httpA.execute(create())
      expect((await httpB.snapshot()).records).toHaveLength(1)
      await httpB.execute(update())
      expect((await httpA.changes(1)).changes[0].record?.revision).toBe(2)
      expect(await httpA.history('t1')).toHaveLength(2)
      const invalid = await fetch(base + '/commands', { method: 'POST', headers: { Authorization: 'Bearer token-a' }, body: '{' })
      expect(invalid.status).toBe(400)
    } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())) }
  })
})
