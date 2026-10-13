import type { z } from 'zod'
import { SyncError, type CentralTransport, type Command } from './contract'
import { sessionSchema, snapshotSchema, deltaSchema, versionedTaskSchema, historySchema, errorSchema } from './responseSchemas'

export class HttpCentralTransport implements CentralTransport {
  constructor(private token: string, private base = '/api') {}
  private async request<T>(path: string, schema: z.ZodType<T>, command?: Command): Promise<T> {
    const response = await fetch(this.base + path, {
      method: command ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + this.token, ...(command ? { 'Content-Type': 'application/json' } : {}) },
      body: command ? JSON.stringify(command) : undefined,
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    let result: unknown
    try {
      result = await response.json()
    } catch {
      // O servidor pode ter confirmado o comando antes de o proxy perder a resposta.
      // Repetir com a mesma chave é seguro; retirar da fila neste ponto não seria.
      throw new SyncError(response.ok ? 503 : response.status,
        response.ok || response.status >= 500
          ? 'Resposta do servidor indisponível. Tentaremos novamente.'
          : 'Solicitação recusada pelo servidor (HTTP ' + response.status + ').')
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(result)
      if (!parsed.success) throw new SyncError(response.status, 'Solicitação recusada pelo servidor (HTTP ' + response.status + ').')
      throw new SyncError(response.status, parsed.data.message, parsed.data.current)
    }
    const parsed = schema.safeParse(result)
    if (!parsed.success) throw new SyncError(503, 'Resposta incompleta do servidor. Tentaremos novamente.')
    return parsed.data
  }
  session() { return this.request('/session', sessionSchema) }
  snapshot() { return this.request('/tasks', snapshotSchema) }
  changes(cursor: number) { return this.request('/changes?cursor=' + cursor, deltaSchema) }
  execute(command: Command) { return this.request('/commands', versionedTaskSchema, command) }
  history(taskId: string) { return this.request('/history?taskId=' + encodeURIComponent(taskId), historySchema) }
}
