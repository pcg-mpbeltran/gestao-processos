import { SyncError, type CentralTransport, type Command, type VersionedTask, type SyncState } from './contract'

export interface SyncCache {
  exclusive?<T>(action: () => Promise<T>): Promise<T>
  load(): { records: VersionedTask[]; cursor: number; pending: Command[] } | null
  save(data: { records: VersionedTask[]; cursor: number; pending: Command[] }): void
}
export class CentralTaskRepository {
  records: VersionedTask[] = []
  pending: Command[] = []
  cursor = 0
  state: SyncState = 'alteração pendente'
  error = ''
  conflict?: VersionedTask
  private operation: Promise<unknown> = Promise.resolve()
  private syncQueued?: Promise<void>
  private initialized = false
  private listeners = new Set<() => void>()
  private timer?: ReturnType<typeof setInterval>
  constructor(private transport: CentralTransport, private cache: SyncCache) {
    // O cache compartilhado só é lido/migrado dentro do bloqueio entre abas.
    if (!cache.exclusive) this.restore()
  }
  private restore() {
    const previous = this.pending[0]?.commandId
    const cached = this.cache.load()
    if (cached) {
      this.records = cached.records
      this.pending = cached.pending
      this.cursor = cached.cursor
    } else {
      this.records = []; this.pending = []; this.cursor = 0; this.initialized = false
    }
    if (previous !== this.pending[0]?.commandId) {
      this.conflict = undefined; this.error = ''; this.state = 'alteração pendente'
    }
  }
  private run<T>(action: () => Promise<T>): Promise<T> {
    const work = this.operation.then(() => this.cache.exclusive
      ? this.cache.exclusive(async () => { this.restore(); return action() })
      : action())
    this.operation = work.catch(() => {})
    return work
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
  async enqueue(command: Command) {
    await this.run(async () => {
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
      if (this.state !== 'conflito' && this.state !== 'falha') this.state = 'alteração pendente'
      this.emit()
    })
    void this.sync()
  }
  sync(): Promise<void> {
    if (this.syncQueued) return this.syncQueued
    this.syncQueued = this.run(() => this.syncLocked()).catch(error => {
      this.state = 'falha'
      this.error = error instanceof Error ? error.message : 'Falha ao coordenar a sincronização.'
      this.emit()
    }).finally(() => { this.syncQueued = undefined })
    return this.syncQueued
  }
  private async syncLocked() {
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
    } finally { this.emit() }
  }
  // Nenhuma rebase automática: a pessoa deve revisar a versão central e descartar ou reaplicar.
  async discardPending() {
    const expected = this.pending[0]?.commandId
    await this.run(async () => {
      // Uma resolução feita em outra aba nunca descarta o próximo comando por engano.
      if (!expected || this.pending[0]?.commandId !== expected) return
      const previous = this.pending
      this.pending = this.pending.slice(1)
      try { this.persist() } catch (error) { this.pending = previous; throw error }
      this.conflict = undefined
      this.state = 'alteração pendente'
      this.initialized = false
    })
    await this.sync()
  }
  async reapplyConflict() {
    const expected = this.pending[0]?.commandId
    const revision = this.conflict?.revision
    await this.run(async () => {
      const command = this.pending[0]
      if (!revision || !command || command.commandId !== expected || command.kind === 'create') return
      const previous = this.pending
      this.pending = [{ ...command, commandId: crypto.randomUUID(), revision }, ...this.pending.slice(1)]
      try { this.persist() } catch (error) { this.pending = previous; throw error }
      this.conflict = undefined
      this.state = 'alteração pendente'
    })
    await this.sync()
  }
  start() {
    void this.sync()
    this.timer = setInterval(() => { void this.sync() }, 2000)
    return () => { clearInterval(this.timer) }
  }
  history(taskId: string) { return this.transport.history(taskId) }
}
