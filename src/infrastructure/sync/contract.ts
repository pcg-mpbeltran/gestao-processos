import { z } from 'zod'
import { taskSchema, type Task } from '../../domain/task'
import type { User } from '../../domain/user'

export const patchSchema = taskSchema.omit({
  id: true, requesterId: true, origin: true, createdAt: true, updatedAt: true,
  poVersionId: true,
}).partial().strict()
const key = z.string().min(1).max(128)
export const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), commandId: key, task: taskSchema.strict() }).strict(),
  z.object({
    kind: z.literal('update'), commandId: key, taskId: key,
    revision: z.number().int().positive(), patch: patchSchema,
  }).strict(),
  z.object({
    kind: z.literal('comment'), commandId: key, taskId: key,
    revision: z.number().int().positive(), text: z.string().trim().min(1).max(10000),
  }).strict(),
])
export type Command = z.infer<typeof commandSchema>
export interface VersionedTask { task: Task; revision: number }
export interface Audit {
  cursor: number
  taskId: string
  actorId: string
  at: string
  action: Command['kind']
  previousRevision: number
  revision: number
  fields: string[]
  comment?: string
}
export type Change = { cursor: number; taskId: string; record: VersionedTask | null }
export interface Snapshot { cursor: number; records: VersionedTask[] }
export interface Delta { cursor: number; changes: Change[] }
export interface Session { user: User; users: User[] }
export interface CentralTransport {
  session(): Promise<Session>
  snapshot(): Promise<Snapshot>
  changes(cursor: number): Promise<Delta>
  execute(command: Command): Promise<VersionedTask>
  history(taskId: string): Promise<Audit[]>
}
export class SyncError extends Error {
  constructor(public status: number, message: string, public current?: VersionedTask) {
    super(message)
  }
}
export type SyncState = 'salvando' | 'sincronizado' | 'sem conexão' | 'alteração pendente' | 'conflito' | 'falha'
