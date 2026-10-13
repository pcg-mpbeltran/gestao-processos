import { describe, expect, it } from 'vitest'
import { isOverdue, taskMatchesBucket, taskSchema, type Task } from './task'

const baseTask: Task = {
  id: 'task-1',
  title: 'Validar documento',
  description: '',
  origin: 'equipe',
  assigneeId: 'user-1',
  requesterId: 'user-2',
  priority: 'alta',
  status: 'nao_iniciada',
  dueDate: '2026-10-12',
  dependencyIds: [],
  tags: [],
  visibility: 'equipe',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
}

describe('regras de tarefas', () => {
  it('valida o contrato mínimo de uma tarefa', () => {
    expect(taskSchema.parse(baseTask)).toEqual(baseTask)
  })

  it('identifica tarefa atrasada e não concluída', () => {
    expect(isOverdue(baseTask, '2026-10-13')).toBe(true)
    expect(isOverdue({ ...baseTask, status: 'concluida' }, '2026-10-13')).toBe(false)
  })

  it('separa tarefas delegadas das atribuídas ao próprio solicitante', () => {
    expect(taskMatchesBucket(baseTask, 'delegadas', 'user-2', '2026-10-13')).toBe(true)
    expect(taskMatchesBucket({ ...baseTask, assigneeId: 'user-2' }, 'delegadas', 'user-2', '2026-10-13')).toBe(false)
  })
})

