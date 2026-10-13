import { SyncError, type CentralTransport, type Command, type Session, type Snapshot, type Delta, type VersionedTask, type Audit } from './contract'

export class HttpCentralTransport implements CentralTransport {
  constructor(private token: string, private base = '/api') {}
  private async request<T>(path: string, command?: Command): Promise<T> {
    const response = await fetch(this.base + path, {
      method: command ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + this.token, ...(command ? { 'Content-Type': 'application/json' } : {}) },
      body: command ? JSON.stringify(command) : undefined,
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    const result = await response.json() as T & { message: string; current?: VersionedTask }
    if (!response.ok) throw new SyncError(response.status, result.message, result.current)
    return result
  }
  session() { return this.request<Session>('/session') }
  snapshot() { return this.request<Snapshot>('/tasks') }
  changes(cursor: number) { return this.request<Delta>('/changes?cursor=' + cursor) }
  execute(command: Command) { return this.request<VersionedTask>('/commands', command) }
  history(taskId: string) { return this.request<Audit[]>('/history?taskId=' + encodeURIComponent(taskId)) }
}

