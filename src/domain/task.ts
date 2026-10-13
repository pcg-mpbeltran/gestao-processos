import { z } from 'zod'

export const taskOrigins = [
  'pessoal',
  'equipe',
  'processo',
  'cronograma',
  'recorrencia',
  'requisicao',
] as const

export const taskStatuses = [
  'nao_iniciada',
  'em_andamento',
  'aguardando',
  'bloqueada',
  'em_revisao',
  'concluida',
  'cancelada',
] as const

export const taskStatusConfig = [
  { id: 'nao_iniciada', label: 'Não iniciada', tone: 'neutral' },
  { id: 'em_andamento', label: 'Em andamento', tone: 'info' },
  { id: 'aguardando', label: 'Aguardando', tone: 'warning' },
  { id: 'bloqueada', label: 'Bloqueada', tone: 'danger' },
  { id: 'em_revisao', label: 'Em revisão', tone: 'violet' },
  { id: 'concluida', label: 'Concluída', tone: 'success' },
  { id: 'cancelada', label: 'Cancelada', tone: 'neutral' },
] as const

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  origin: z.enum(taskOrigins),
  assigneeId: z.string().min(1),
  requesterId: z.string().min(1),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']),
  status: z.enum(taskStatuses),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  processId: z.string().optional(),
  eventId: z.string().optional(),
  poVersionId: z.string().optional(),
  dependencyIds: z.array(z.string()),
  tags: z.array(z.string()),
  visibility: z.enum(['privada', 'envolvidos', 'equipe']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Task = z.infer<typeof taskSchema>
export type TaskStatus = Task['status']

export type WorkBucket =
  | 'hoje'
  | 'proximas'
  | 'atrasadas'
  | 'sem_data'
  | 'recorrentes'
  | 'criadas'
  | 'delegadas'
  | 'aguardando'
  | 'concluidas'

export function statusLabel(status: TaskStatus) {
  return taskStatusConfig.find((item) => item.id === status)?.label ?? status
}

export function isFinished(task: Task) {
  return task.status === 'concluida' || task.status === 'cancelada'
}

export function isOverdue(task: Task, today: string) {
  return Boolean(task.dueDate && task.dueDate < today && !isFinished(task))
}

export function taskMatchesBucket(
  task: Task,
  bucket: WorkBucket,
  userId: string,
  today: string,
) {
  switch (bucket) {
    case 'hoje':
      return task.assigneeId === userId && task.dueDate === today && !isFinished(task)
    case 'proximas':
      return task.assigneeId === userId && Boolean(task.dueDate && task.dueDate > today) && !isFinished(task)
    case 'atrasadas':
      return task.assigneeId === userId && isOverdue(task, today)
    case 'sem_data':
      return task.assigneeId === userId && !task.dueDate && !isFinished(task)
    case 'recorrentes':
      return task.assigneeId === userId && task.origin === 'recorrencia' && !isFinished(task)
    case 'criadas':
      return task.requesterId === userId
    case 'delegadas':
      return task.requesterId === userId && task.assigneeId !== userId
    case 'aguardando':
      return task.assigneeId === userId && task.status === 'aguardando'
    case 'concluidas':
      return task.assigneeId === userId && task.status === 'concluida'
  }
}

