import { useState, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import type { Task, TaskStatus } from './domain/task'
import type { User } from './domain/user'
import { HomePage } from './features/home/HomePage'
import { PlaceholderPage } from './features/shared/PlaceholderPage'
import { WorkPage } from './features/work/WorkPage'

interface Props {
  central?: boolean
  tasks: Task[]
  currentUser: User
  users: User[]
  selectableUsers?: User[]
  selectedUserId: string
  onUserChange: (id: string) => void
  onCreateTask: (input: Pick<Task, 'title' | 'assigneeId' | 'dueDate' | 'origin' | 'priority'>) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  notice?: ReactNode
}
export function Workspace({ central = false, tasks, currentUser, users, selectableUsers, selectedUserId, onUserChange, onCreateTask, onStatusChange, notice }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="app-shell">
      <Sidebar central={central} open={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} />
      <div className="main-shell">
        <Topbar central={central} users={selectableUsers ?? users} selectedUserId={selectedUserId} onUserChange={onUserChange} />
        <main>{notice}
          <Routes>
            <Route path="/" element={<HomePage currentUser={currentUser} tasks={tasks} />} />
            <Route path="/meu-trabalho" element={<WorkPage currentUser={currentUser} users={users} tasks={tasks} onCreateTask={onCreateTask} onStatusChange={onStatusChange} />} />
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
