import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { DurableSyncCache } from './durableSyncCache'
import { CentralTaskRepository } from './centralTaskRepository'
import { HttpCentralTransport } from './httpTransport'
import { SyncError, type Command } from './contract'
import { demoTasks } from '../../data/demo'

const command: Command = {
  kind: 'create', commandId: 'persistir-1',
  task: { ...demoTasks[0], id: 'persistida', requesterId: 'a' },
}
const data = { records: [{ task: command.task, revision: 1 }], cursor: 1, pending: [command] }
const key = 'gestao-processos.sync.v2.a'
const legacyKey = 'gestao-processos.sync.v1.a'
const envelope = (value: unknown) => JSON.stringify({ version: 2, userId: 'a', data: value })

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

// Simula o escalonamento exclusivo da API Web Locks, compartilhado pelas abas.
function installLocks() {
  const tails = new Map<string, Promise<unknown>>()
  vi.stubGlobal('navigator', { locks: { request: vi.fn((name: string, _options: unknown, action: () => Promise<unknown>) => {
    const next = (tails.get(name) ?? Promise.resolve()).catch(() => {}).then(action)
    tails.set(name, next)
    return next
  }) } })
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); installLocks() })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Cache durável', () => {
  it('restaura a fila em nova instância depois de encerrar a sessão anterior', () => {
    new DurableSyncCache('a').save(data)
    sessionStorage.clear()
    const reopened = new DurableSyncCache('a')
    expect(reopened.load()).toEqual(data)
    expect(new DurableSyncCache('b').load()).toBeNull()
    expect(localStorage.getItem(key)).not.toContain('token')
  })

  it.each([
    ['JSON truncado', '{'],
    ['versão desconhecida', JSON.stringify({ version: 99, userId: 'a', data })],
    ['identidade diferente', JSON.stringify({ version: 2, userId: 'b', data })],
    ['cursor negativo', envelope({ ...data, cursor: -1 })],
    ['cursor fracionado', envelope({ ...data, cursor: 1.2 })],
    ['lista ausente', envelope({ cursor: 1, pending: [] })],
    ['tarefa inválida', envelope({ ...data, records: [{ task: {}, revision: 1 }] })],
    ['revisão inválida', envelope({ ...data, records: [{ task: command.task, revision: 0 }] })],
    ['comando inválido', envelope({ ...data, pending: [{ kind: 'delete' }] })],
    ['comandos duplicados', envelope({ ...data, pending: [command, command] })],
    ['tarefas duplicadas', envelope({ ...data, records: [...data.records, ...data.records] })],
    ['autor incompatível', envelope({ ...data, pending: [{ ...command, task: { ...command.task, requesterId: 'b' } }] })],
  ])('descarta automaticamente cache com %s', (_name, raw) => {
    localStorage.setItem(key, raw)
    localStorage.setItem('outro-aplicativo', 'preservar')
    expect(new DurableSyncCache('a').load()).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
    expect(localStorage.getItem('outro-aplicativo')).toBe('preservar')
  })

  it('migra a fila válida da versão anterior sem alterar a chave idempotente', () => {
    sessionStorage.setItem(legacyKey, JSON.stringify(data))
    expect(new DurableSyncCache('a').load()).toEqual(data)
    expect(sessionStorage.getItem(legacyKey)).toBeNull()
    expect(new DurableSyncCache('a').load()?.pending[0].commandId).toBe('persistir-1')
  })

  it('preserva a origem se a migração falhar por quota', () => {
    sessionStorage.setItem(legacyKey, JSON.stringify(data))
    const denied = { getItem: () => null, setItem: () => { throw new Error('Quota excedida') } } as unknown as Storage
    expect(() => new DurableSyncCache('a', denied).load()).toThrow('Quota excedida')
    expect(sessionStorage.getItem(legacyKey)).not.toBeNull()
  })

  it('descarta também JSON inválido legado', () => {
    sessionStorage.setItem(legacyKey, '{')
    expect(new DurableSyncCache('a').load()).toBeNull()
    expect(sessionStorage.getItem(legacyKey)).toBeNull()
  })

  it('recarrega o servidor normalmente após descartar um cache inválido', async () => {
    localStorage.setItem(key, '{')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ cursor: 1, records: data.records }))
      .mockResolvedValueOnce(Response.json({ cursor: 1, changes: [] })))
    const repo = new CentralTaskRepository(new HttpCentralTransport('teste'), new DurableSyncCache('a'))
    await repo.sync()
    expect(repo.state).toBe('sincronizado')
    expect(repo.records).toEqual(data.records)
  })
})

describe('Respostas HTTP recuperáveis', () => {
  it.each([
    [502, '<html>Bad gateway</html>'],
    [503, ''],
    [200, ''],
    [204, null],
    [200, '{'],
    [200, '{}'],
    [200, 'null'],
  ])('preserva e reenvia a fila após status %s e conteúdo %s', async (status, body) => {
    const original = { records: [], cursor: 0, pending: [command] }
    new DurableSyncCache('a').save(original)
    let accepted = false
    const ids: string[] = []
    const request = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/tasks')) return Response.json({ cursor: 0, records: [] })
      if (url.includes('/changes')) return Response.json({ cursor: 1, changes: [] })
      ids.push(JSON.parse(String(init?.body)).commandId)
      if (!accepted) {
        accepted = true // Simula commit confirmado antes de perder a resposta.
        return new Response(body, { status })
      }
      return Response.json(data.records[0])
    })
    vi.stubGlobal('fetch', request)
    const repo = new CentralTaskRepository(new HttpCentralTransport('teste'), new DurableSyncCache('a'))
    await repo.sync()
    expect(repo.state).toBe('sem conexão')
    expect(new DurableSyncCache('a').load()?.pending).toEqual([command])
    // Fecha a sessão, entra novamente e confirma o mesmo comando.
    sessionStorage.clear()
    const restored = new CentralTaskRepository(new HttpCentralTransport('teste'), new DurableSyncCache('a'))
    await restored.sync()
    expect(restored.state).toBe('sincronizado')
    expect(restored.pending).toEqual([])
    expect(restored.records).toHaveLength(1)
    expect(ids).toEqual(['persistir-1', 'persistir-1'])
    expect(new DurableSyncCache('a').load()?.pending).toEqual([])
  })

  it.each([401, 403, 409])('mantém a semântica de erros JSON válidos: %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      message: 'Rejeitado', ...(status === 409 ? { current: data.records[0] } : {}),
    }, { status })))
    await expect(new HttpCentralTransport('teste').execute(command)).rejects.toMatchObject({ status })
  })

  it('preserva revisão central em conflito válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      message: 'Conflito', current: data.records[0],
    }, { status: 409 })))
    try { await new HttpCentralTransport('teste').execute(command) }
    catch (error) { expect(error).toBeInstanceOf(SyncError); expect((error as SyncError).current).toEqual(data.records[0]) }
  })
})


describe('Coordenação da fila entre abas', () => {
  function offline() {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Sem rede')))
  }
  function repository() {
    return new CentralTaskRepository(new HttpCentralTransport('teste'), new DurableSyncCache('a'))
  }
  const second: Command = { ...command, commandId: 'persistir-2', task: { ...command.task, id: 'segunda' } }

  it('duas instâncias registram comandos diferentes simultaneamente sem sobrescrever a fila', async () => {
    offline()
    const a = repository(), b = repository()
    await Promise.all([a.enqueue(command), b.enqueue(second)])
    await Promise.all([a.sync(), b.sync()])
    expect(new DurableSyncCache('a').load()?.pending).toEqual([command, second])
    expect(a.pending).toEqual([command, second])
    expect(b.pending).toEqual([command, second])
    expect(navigator.locks.request).toHaveBeenCalledWith(key, { mode: 'exclusive' }, expect.any(Function))
  })

  it('confirmação em uma aba e gravação na outra não perdem nem ressuscitam comandos', async () => {
    const response = deferred<Response>()
    const executing = deferred<void>()
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/tasks')) return Response.json({ cursor: 0, records: [] })
      if (url.includes('/changes')) return Response.json({ cursor: 1, changes: [] })
      if (JSON.parse(String(init?.body)).commandId === command.commandId) {
        executing.resolve()
        return response.promise
      }
      throw new TypeError('Sem rede')
    }))
    const a = repository(), b = repository()
    await a.enqueue(command)
    await executing.promise
    const enqueued = b.enqueue(second)
    response.resolve(Response.json(data.records[0]))
    await enqueued
    await Promise.all([a.sync(), b.sync()])
    expect(new DurableSyncCache('a').load()?.pending).toEqual([second])
  })

  it('duas abas não aceitam operações pendentes diferentes para a mesma tarefa', async () => {
    offline()
    const results = await Promise.allSettled([
      repository().enqueue(command), repository().enqueue({ ...command, commandId: 'duplicado' }),
    ])
    expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected'])
    expect(new DurableSyncCache('a').load()?.pending).toEqual([command])
  })

  it('um descarte antigo em outra aba não remove o próximo comando', async () => {
    new DurableSyncCache('a').save({ ...data, pending: [command, second] })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/tasks')) return Response.json({ cursor: 1, records: data.records })
      if (url.includes('/changes')) return Response.json({ cursor: 1, changes: [] })
      return Response.json({ message: 'Conflito' }, { status: 409 })
    }))
    const a = repository(), b = repository()
    await Promise.all([a.sync(), b.sync()])
    await a.discardPending()
    await b.discardPending()
    expect(new DurableSyncCache('a').load()?.pending).toEqual([second])
  })

  it('não grava sem suporte à coordenação segura', async () => {
    vi.stubGlobal('navigator', {})
    await expect(repository().enqueue(command)).rejects.toThrow('coordenação segura')
    expect(localStorage.getItem(key)).toBeNull()
  })
})

describe('Erros HTTP não recuperáveis', () => {
  it.each([401, 403, 404, 409, 422, 429])('preserva HTTP %s mesmo sem corpo JSON válido', async status => {
    for (const body of ['', '<html>Rejeitado</html>', '{}']) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })))
      await expect(new HttpCentralTransport('teste').execute(command)).rejects.toMatchObject({ status })
    }
  })
  it.each([401, 403])('HTTP %s vazio bloqueia reenvio automático, preservando a fila', async status => {
    new DurableSyncCache('a').save(data)
    const execute = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/tasks')) return Response.json({ cursor: 1, records: data.records })
      if (url.includes('/changes')) return Response.json({ cursor: 1, changes: [] })
      execute()
      return new Response('', { status })
    }))
    const repo = new CentralTaskRepository(new HttpCentralTransport('teste'), new DurableSyncCache('a'))
    await repo.sync()
    expect(repo.state).toBe('falha')
    await repo.sync()
    expect(execute).toHaveBeenCalledTimes(1)
    expect(new DurableSyncCache('a').load()?.pending).toEqual([command])
  })
})
