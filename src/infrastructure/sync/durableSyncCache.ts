import { z } from 'zod'
import { taskSchema } from '../../domain/task'
import { commandSchema } from './contract'
import type { SyncCache } from './centralTaskRepository'

const cacheSchema = z.object({
  records: z.array(z.object({ task: taskSchema.strict(), revision: z.number().int().positive() }).strict()),
  cursor: z.number().int().nonnegative(),
  pending: z.array(commandSchema),
}).strict().refine(data =>
  new Set(data.records.map(r => r.task.id)).size === data.records.length &&
  new Set(data.pending.map(c => c.commandId)).size === data.pending.length &&
  new Set(data.pending.map(c => c.kind === 'create' ? c.task.id : c.taskId)).size === data.pending.length,
'Registros ou comandos duplicados.')

const envelopeSchema = z.object({
  version: z.literal(2),
  userId: z.string().min(1),
  data: cacheSchema,
}).strict()

/** Persistência durável por identidade. Tokens nunca fazem parte do cache. */
export class DurableSyncCache implements SyncCache {
  private key: string
  private legacyKey: string
  constructor(
    private userId: string,
    private storage: Storage = localStorage,
    private legacyStorage: Storage = sessionStorage,
  ) {
    this.key = 'gestao-processos.sync.v2.' + userId
    this.legacyKey = 'gestao-processos.sync.v1.' + userId
  }
  async exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (!navigator.locks) {
      throw new Error('Este navegador não oferece coordenação segura entre abas. Use um navegador atualizado em HTTPS ou localhost.')
    }
    return navigator.locks.request(this.key, { mode: 'exclusive' }, action)
  }
  load(): ReturnType<SyncCache['load']> {
    const raw = this.storage.getItem(this.key)
    if (raw !== null) {
      try {
        const parsed = envelopeSchema.safeParse(JSON.parse(raw))
        if (parsed.success && parsed.data.userId === this.userId && this.belongsToUser(parsed.data.data)) {
          return parsed.data.data
        }
      } catch { /* JSON inválido é descartado, sem impedir a conexão. */ }
      this.storage.removeItem(this.key)
      this.legacyStorage.removeItem(this.legacyKey)
      return null
    }
    // Migração da fila anterior: só remover a origem após confirmar a gravação.
    const legacy = this.legacyStorage.getItem(this.legacyKey)
    if (legacy === null) return null
    let parsed
    try { parsed = cacheSchema.safeParse(JSON.parse(legacy)) }
    catch { this.legacyStorage.removeItem(this.legacyKey); return null }
    if (!parsed.success || !this.belongsToUser(parsed.data)) {
      this.legacyStorage.removeItem(this.legacyKey)
      return null
    }
    this.save(parsed.data)
    this.legacyStorage.removeItem(this.legacyKey)
    return parsed.data
  }
  private belongsToUser(data: Parameters<SyncCache['save']>[0]) {
    return data.pending.every(c => c.kind !== 'create' || c.task.requesterId === this.userId)
  }
  save(data: Parameters<SyncCache['save']>[0]) {
    const validated = cacheSchema.parse(data)
    if (!this.belongsToUser(validated)) throw new Error('Fila pertence a outra identidade.')
    // setItem é atômico: falhas de quota não substituem a última fila válida.
    this.storage.setItem(this.key, JSON.stringify({ version: 2, userId: this.userId, data: validated }))
  }
}
