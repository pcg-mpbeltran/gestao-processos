import { useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { demoTasks, demoUsers } from './data/demo'
import type { Task, TaskStatus } from './domain/task'
import { HomePage } from './features/home/HomePage'
import { PlaceholderPage } from './features/shared/PlaceholderPage'
import { WorkPage } from './features/work/WorkPage'
import { LocalStorageTaskRepository } from './infrastructure/taskRepository'

function App() {
  const repository = useMemo(() => new LocalStorageTaskRepository('gestao-processos.tasks.v1'), [])
  const [tasks, setTasks] = useState<Task[]>([])
  const [ready, setReady] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(demoUsers[0].id)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} />
      <div className="main-shell">
        <Topbar users={demoUsers} selectedUserId={selectedUserId} onUserChange={setSelectedUserId} />
        <main>
          <Routes>
            <Route path="/" element={<HomePage currentUser={currentUser} tasks={tasks} />} />
            <Route path="/meu-trabalho" element={<WorkPage currentUser={currentUser} users={demoUsers} tasks={tasks} onCreateTask={createTask} onStatusChange={updateStatus} />} />
            <Route path="/equipe" element={<PlaceholderPage title="Equipe" description="Visão compartilhada de responsabilidades, capacidade e delegações." />} />
            <Route path="/requisicoes" element={<PlaceholderPage title="Requisições" description="Solicitações que originam tarefas no mecanismo unificado." />} />
            <Route path="/processos" element={<PlaceholderPage title="Processos" description="Catálogo hierárquico de macroprocessos, processos e atividades." />} />
            <Route path="/cronogramas" element={<PlaceholderPage title="Cronogramas" description="Calendários, eventos, dependências e geração idempotente de tarefas." />} />
            <Route path="/relacoes" element={<PlaceholderPage title="Relações" description="Mapa visual de dependências entre processos, tarefas, eventos e POs." />} />
            <Route path="/pos" element={<PlaceholderPage title="Procedimentos operacionais" description="Tutoriais versionados, variantes e regras de aplicabilidade." />} />
            <Route path="/substituicoes" element={<PlaceholderPage title="Substituições" description="Coberturas temporárias para férias e ausências." />} />
            <Route path="/configuracoes" element={<PlaceholderPage title="Configurações" description="Perfis, permissões, status e preferências do sistema." />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App

