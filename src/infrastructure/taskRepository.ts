import { z } from 'zod'
import { taskSchema, type Task } from '../domain/task'

export interface TaskRepository {
  list(): Promise<Task[]>
  save(tasks: Task[]): Promise<void>
}

const taskCollectionSchema = z.array(taskSchema)

export class LocalStorageTaskRepository implements TaskRepository {
  constructor(private readonly storageKey: string) {}

  async list() {
    const raw = window.localStorage.getItem(this.storageKey)
    if (!raw) return []

    const parsed = taskCollectionSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.warn('Dados locais inválidos foram ignorados.', parsed.error)
      return []
    }

    return parsed.data
  }

  async save(tasks: Task[]) {
    const validated = taskCollectionSchema.parse(tasks)
    window.localStorage.setItem(this.storageKey, JSON.stringify(validated))
  }
}

