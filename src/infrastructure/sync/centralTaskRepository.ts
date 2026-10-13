import { SyncError, type CentralTransport, type Command, type VersionedTask, type SyncState } from './contract'

export interface SyncCache {
  load(): { records: VersionedTask[]; cursor: number; pending: Command[] } | null
  save(data: { records: VersionedTask[]; cursor: number; pending: Command[] }): void
}
export class SessionSyncCache implements SyncCache {
  constructor(private key: string) {}
  load() {
    const raw = sessionStorage.getItem(this.key)
    return raw ? JSON.parse(raw) : null
  }
  save(data: Parameters<SyncCache['save']>[0]) { sessionStorage.setItem(this.key, JSON.stringify(data)) }
}
export class CentralTaskRepository {
  records: VersionedTask[] = []
  pending: Command[] = []
  cursor = 0
  state: SyncState = 'alteração pendente'
  error = ''
  conflict?: VersionedTask
  private busy = false
  private initialized = false
  private listeners = new Set<() => void>()
  private timer?: ReturnType<typeof setInterval>
  constructor(private transport: CentralTransport, private cache: SyncCache) {
    const cached = cache.load()
    if (cached) {
      this.records = cached.records
      this.pending = cached.pending
      this.cursor = cached.cursor
    }
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private emit() { for (const listener of this.listeners) listener() }
  private persist() {
    this.cache.save({ records: this.records, cursor: this.cursor, pending: this.pending })
  }
  private upsert(record: VersionedTask) {
    const existing = this.records.find(r => r.task.id === record.task.id)
    if (existing && existing.revision >= record.revision) return
    this.records = [...this.records.filter(r => r.task.id !== record.task.id), record]
  }
  enqueue(command: Command) {
    // Uma operação pendente por atividade evita editar uma revisão ainda não confirmada.
    const id = command.kind === 'create' ? command.task.id : command.taskId
    if (this.pending.some(c => (c.kind === 'create' ? c.task.id : c.taskId) === id)) {
      throw new Error('Esta atividade já possui uma alteração pendente.')
    }
    this.pending = [...this.pending, command]
    try { this.persist() } catch (error) {
      this.pending = this.pending.filter(c => c !== command)
      throw error
    }
    this.state = 'alteração pendente'
    this.emit()
    void this.sync()
  }
  async sync() {
    if (this.busy) return
    this.busy = true
    const blocked = this.state === 'conflito' || this.state === 'falha'
    this.state = blocked ? this.state : 'salvando'
    this.emit()
    try {
      if (!this.initialized) {
        const snapshot = await this.transport.snapshot()
        this.records = snapshot.records
        this.cursor = snapshot.cursor
        this.initialized = true
        this.persist()
      }
      while (!blocked && this.pending.length) {
        const command = this.pending[0]
        const result = await this.transport.execute(command)
        this.upsert(result)
        this.pending.shift()
        this.persist()
      }
      const delta = await this.transport.changes(this.cursor)
      for (const change of [...delta.changes].sort((a, b) => a.cursor - b.cursor)) {
        if (change.cursor <= this.cursor) continue
        if (change.record) this.upsert(change.record)
        else this.records = this.records.filter(r => r.task.id !== change.taskId)
      }
      this.cursor = delta.cursor
      this.persist()
      if (!blocked) { this.state = this.pending.length ? 'alteração pendente' : 'sincronizado'; this.error = '' }
    } catch (error) {
      if (error instanceof SyncError && error.status === 410) {
        this.initialized = false
        this.state = 'alteração pendente'
      } else if (error instanceof SyncError && error.status === 409) {
        this.state = 'conflito'
        this.conflict = error.current
        this.error = error.message
      } else if (error instanceof SyncError && error.status >= 500) {
        this.state = 'sem conexão'
        this.error = 'Servidor indisponível. A fila será reenviada automaticamente.'
      } else if (error instanceof SyncError || !(error instanceof TypeError || error instanceof DOMException)) {
        this.state = 'falha'
        this.error = error instanceof Error ? error.message : 'Falha na sincronização.'
      } else {
        this.state = 'sem conexão'
        this.error = 'As alterações pendentes serão reenviadas ao reconectar.'
      }
    } finally { this.busy = false; this.emit() }
  }
  // Nenhuma rebase automática: a pessoa deve revisar a versão central e descartar ou reaplicar.
  async discardPending() {
    if (this.busy) return
    this.pending.shift()
    this.conflict = undefined
    this.state = 'alteração pendente'
    this.initialized = false
    this.persist()
    await this.sync()
  }
  async reapplyConflict() {
    const command = this.pending[0]
    if (this.busy || !this.conflict || !command || command.kind === 'create') return
    this.pending[0] = { ...command, commandId: crypto.randomUUID(), revision: this.conflict.revision }
    this.conflict = undefined
    this.state = 'alteração pendente'
    this.persist()
    await this.sync()
  }
  start() {
    void this.sync()
    this.timer = setInterval(() => { void this.sync() }, 2000)
    return () => { clearInterval(this.timer) }
  }
  history(taskId: string) { return this.transport.history(taskId) }
}
