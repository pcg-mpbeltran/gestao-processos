import { z } from 'zod'
import { taskSchema } from '../../domain/task'

export const versionedTaskSchema = z.object({ task: taskSchema, revision: z.number().int().positive() })
const cursor = z.number().int().nonnegative()
const userSchema = z.object({
  id: z.string().min(1), name: z.string(), initials: z.string(), team: z.string(),
  role: z.enum(['Administrador', 'Gestor', 'Dono do processo', 'Colaborador', 'Visualizador']),
})
export const sessionSchema = z.object({ user: userSchema, users: z.array(userSchema) })
export const snapshotSchema = z.object({ cursor, records: z.array(versionedTaskSchema) })
export const deltaSchema = z.object({
  cursor,
  changes: z.array(z.object({ cursor, taskId: z.string().min(1), record: versionedTaskSchema.nullable() })),
})
export const historySchema = z.array(z.object({
  cursor, taskId: z.string(), actorId: z.string(), at: z.string(),
  action: z.enum(['create', 'update', 'comment']),
  previousRevision: cursor, revision: z.number().int().positive(),
  fields: z.array(z.string()), comment: z.string().optional(),
}))
export const errorSchema = z.object({ message: z.string(), current: versionedTaskSchema.optional() })
