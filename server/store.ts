import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { commandSchema, SyncError, type Command, type VersionedTask, type Audit, type Delta } from '../src/infrastructure/sync/contract'
import type { Task } from '../src/domain/task'
import type { User } from '../src/domain/user'

type Stored = VersionedTask & { team: string }
type EventRow = { cursor: number; task_id: string; before_json: string | null; after_json: string; audit_json: string }
const elevated = (user: User) => user.role === 'Administrador' || user.role === 'Gestor'

function canRead(user: User, row: Stored) {
  if (user.team !== row.team) return false
  const t = row.task
  // A origem pessoal prevalece sobre uma visibilidade enviada incorretamente.
  if (t.origin === 'pessoal' && t.requesterId === t.assigneeId) return t.requesterId === user.id
  if (t.visibility === 'privada') return t.requesterId === user.id
  return t.visibility === 'equipe' || t.requesterId === user.id || t.assigneeId === user.id
}

export class CentralStore {
  private db: DatabaseSync
  readonly instanceId: string

  constructor(path: string, private users: User[]) {
    this.db = new DatabaseSync(path)
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (
        actor TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, result TEXT NOT NULL,
        PRIMARY KEY(actor, id)
      );
      CREATE TABLE IF NOT EXISTS events (
        cursor INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL,
        before_json TEXT, after_json TEXT NOT NULL, audit_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_task ON events(task_id, cursor);
    `)
    this.db.prepare('INSERT OR IGNORE INTO metadata VALUES (?, ?)').run('instance', randomUUID())
    this.instanceId = (this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('instance') as { value: string }).value
  }

  close() { this.db.close() }
  private actor(user: User) {
    const actual = this.users.find(u => u.id === user.id)
    if (!actual) throw new SyncError(401, 'Sessão inválida.')
    return actual
  }
  private get(id: string): Stored | undefined {
    const row = this.db.prepare('SELECT json FROM tasks WHERE id = ?').get(id) as { json: string } | undefined
    return row && JSON.parse(row.json)
  }
  private cursor() {
    return (this.db.prepare('SELECT COALESCE(MAX(cursor), 0) AS n FROM events').get() as { n: number }).n
  }
  session(user: User) {
    const actual = this.actor(user)
    return { user: actual, users: this.users.filter(u => u.team === actual.team) }
  }
  snapshot(user: User) {
    const actual = this.actor(user)
    // Snapshot e cursor pertencem à mesma visão transacional.
    this.db.exec('BEGIN')
    try {
      const records = (this.db.prepare('SELECT json FROM tasks').all() as { json: string }[])
        .map(r => JSON.parse(r.json) as Stored).filter(r => canRead(actual, r))
        .map(({ task, revision }) => ({ task, revision }))
      const cursor = this.cursor()
      this.db.exec('COMMIT')
      return { records, cursor }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  changes(user: User, cursor: number): Delta {
    const actual = this.actor(user)
    this.db.exec('BEGIN')
    try {
      const upper = this.cursor()
      if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > upper) {
        throw new SyncError(410, 'Cursor inválido. Recarregue a fonte central.')
      }
      const rows = this.db.prepare('SELECT * FROM events WHERE cursor > ? ORDER BY cursor LIMIT 500')
        .all(cursor) as EventRow[]
      const changes: Delta['changes'] = []
      for (const row of rows) {
        const after = JSON.parse(row.after_json) as Stored
        const before = row.before_json && JSON.parse(row.before_json) as Stored | null
        const current = this.get(row.task_id)!
        // Nunca entregar snapshots antigos que agora estejam fora do escopo.
        // Conceder acesso hoje também não concede acesso ao passado.
        if (canRead(actual, after) && canRead(actual, current)) {
          changes.push({ cursor: row.cursor, taskId: row.task_id, record: { task: after.task, revision: after.revision } })
        } else if ((before && canRead(actual, before)) || canRead(actual, after)) {
          changes.push({ cursor: row.cursor, taskId: row.task_id, record: null })
        }
      }
      this.db.exec('COMMIT')
      return { cursor: rows.at(-1)?.cursor ?? upper, changes }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  history(user: User, taskId: string): Audit[] {
    const actual = this.actor(user)
    const current = this.get(taskId)
    if (!current || !canRead(actual, current)) throw new SyncError(404, 'Atividade não encontrada.')
    return (this.db.prepare('SELECT * FROM events WHERE task_id = ? ORDER BY cursor').all(taskId) as EventRow[])
      .filter(r => canRead(actual, JSON.parse(r.after_json)) && (!r.before_json || canRead(actual, JSON.parse(r.before_json))))
      .map(r => ({ ...JSON.parse(r.audit_json), cursor: r.cursor }))
  }
  execute(user: User, input: unknown): VersionedTask {
    const actual = this.actor(user)
    const parsed = commandSchema.safeParse(input)
    if (!parsed.success) throw new SyncError(400, 'Comando inválido.')
    const command = parsed.data
    if (actual.role === 'Visualizador') throw new SyncError(403, 'Seu perfil permite somente consulta.')
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = this.apply(actual, command)
      this.db.exec('COMMIT')
      return result
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  private apply(user: User, command: Command): VersionedTask {
    const payload = JSON.stringify(command)
    const previous = this.db.prepare('SELECT payload, result FROM commands WHERE actor = ? AND id = ?')
      .get(user.id, command.commandId) as { payload: string; result: string } | undefined
    const taskId = command.kind === 'create' ? command.task.id : command.taskId
    const before = this.get(taskId)
    if (previous) {
      if (!before || !canRead(user, before)) throw new SyncError(404, 'Atividade não encontrada.')
      if (previous.payload !== payload) throw new SyncError(409, 'Chave idempotente reutilizada com outro conteúdo.')
      return JSON.parse(previous.result)
    }
    const now = new Date().toISOString()
    let task: Task
    if (command.kind === 'create') {
      if (before) throw new SyncError(409, 'Identificador já utilizado.')
      if (command.task.requesterId !== user.id) throw new SyncError(403, 'O solicitante deve ser o usuário autenticado.')
      task = { ...command.task, createdAt: now, updatedAt: now }
    } else {
      if (!before || !canRead(user, before)) throw new SyncError(404, 'Atividade não encontrada.')
      if (!elevated(user) && user.id !== before.task.requesterId && user.id !== before.task.assigneeId) {
        throw new SyncError(403, 'Sem permissão para alterar esta atividade.')
      }
      if (before.revision !== command.revision) {
        throw new SyncError(409, 'Outra pessoa alterou esta atividade.', { task: before.task, revision: before.revision })
      }
      if (command.kind === 'update' && ('assigneeId' in command.patch || 'visibility' in command.patch)) {
        if (!elevated(user) && user.id !== before.task.requesterId) {
          throw new SyncError(403, 'Somente o solicitante ou gestor pode alterar o compartilhamento.')
        }
      }
      task = { ...before.task, ...(command.kind === 'update' ? command.patch : {}), updatedAt: now }
    }
    const assignee = this.users.find(u => u.id === task.assigneeId)
    if (!assignee || assignee.team !== user.team) throw new SyncError(403, 'Responsável fora da equipe autorizada.')
    if (task.origin === 'pessoal' && task.assigneeId === task.requesterId) task.visibility = 'privada'
    if (task.assigneeId !== task.requesterId && task.visibility === 'privada') task.visibility = 'envolvidos'
    const record = { task, revision: (before?.revision ?? 0) + 1 }
    const stored: Stored = { ...record, team: before?.team ?? user.team }
    const fields = Object.keys(task).filter(k => JSON.stringify(task[k as keyof Task]) !== JSON.stringify(before?.task[k as keyof Task]))
    const audit: Omit<Audit, 'cursor'> = {
      taskId, actorId: user.id, at: now, action: command.kind,
      previousRevision: before?.revision ?? 0, revision: record.revision, fields,
      ...(command.kind === 'comment' ? { comment: command.text } : {}),
    }
    this.db.prepare('INSERT INTO tasks VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json')
      .run(taskId, JSON.stringify(stored))
    this.db.prepare('INSERT INTO events(task_id, before_json, after_json, audit_json) VALUES (?, ?, ?, ?)')
      .run(taskId, before ? JSON.stringify(before) : null, JSON.stringify(stored), JSON.stringify(audit))
    this.db.prepare('INSERT INTO commands VALUES (?, ?, ?, ?)').run(user.id, command.commandId, payload, JSON.stringify(record))
    return record
  }
}
