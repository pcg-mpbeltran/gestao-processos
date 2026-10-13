import { Workspace } from './Workspace'
import { CentralApp } from './CentralApp'
import { useEffect, useMemo, useState } from 'react'
import { demoTasks, demoUsers } from './data/demo'
import type { Task, TaskStatus } from './domain/task'
import { LocalStorageTaskRepository } from './infrastructure/taskRepository'

function LocalApp() {
  const repository = useMemo(() => new LocalStorageTaskRepository('gestao-processos.tasks.v1'), [])
  const [tasks, setTasks] = useState<Task[]>([])
  const [ready, setReady] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(demoUsers[0].id)
  const currentUser = demoUsers.find((user) => user.id === selectedUserId) ?? demoUsers[0]

  useEffect(() => {
    let active = true
    repository.list().then((stored) => {
      if (!active) return
      setTasks(stored.length ? stored : demoTasks)
      setReady(true)
    })
    return () => { active = false }
  }, [repository])

  useEffect(() => {
    if (ready) void repository.save(tasks)
  }, [ready, repository, tasks])

  function createTask(input: Pick<Task, 'title' | 'assigneeId' | 'dueDate' | 'origin' | 'priority'>) {
    const timestamp = new Date().toISOString()
    const task: Task = {
      ...input,
      id: crypto.randomUUID(),
      description: '',
      requesterId: currentUser.id,
      status: 'nao_iniciada',
      dependencyIds: [],
      tags: [],
      visibility: input.assigneeId === currentUser.id ? 'privada' : 'envolvidos',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    setTasks((current) => [task, ...current])
  }

  function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status, updatedAt: new Date().toISOString() } : task))
  }

  if (!ready) return <div className="app-loading">Preparando seu espaço de trabalho…</div>

  return <Workspace tasks={tasks} currentUser={currentUser} users={demoUsers}
    selectedUserId={selectedUserId} onUserChange={setSelectedUserId}
    onCreateTask={createTask} onStatusChange={updateStatus} />
}

export default function App() {
  return import.meta.env.VITE_CENTRAL_SYNC === 'true' ? <CentralApp /> : <LocalApp />
}

