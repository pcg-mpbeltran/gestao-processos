import { CalendarDays, Check, ChevronDown, CirclePlus, Filter, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  isOverdue,
  statusLabel,
  taskMatchesBucket,
  type Task,
  type TaskStatus,
  type WorkBucket,
} from '../../domain/task'
import type { User } from '../../domain/user'

const buckets: Array<{ id: WorkBucket; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'proximas', label: 'Próximas' },
  { id: 'atrasadas', label: 'Atrasadas' },
  { id: 'sem_data', label: 'Sem data' },
  { id: 'recorrentes', label: 'Recorrentes' },
  { id: 'criadas', label: 'Criadas por mim' },
  { id: 'delegadas', label: 'Delegadas por mim' },
  { id: 'aguardando', label: 'Aguardando' },
  { id: 'concluidas', label: 'Concluídas' },
]

interface WorkPageProps {
  currentUser: User
  users: User[]
  tasks: Task[]
  onCreateTask: (task: Pick<Task, 'title' | 'assigneeId' | 'dueDate' | 'origin' | 'priority'>) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
}

export function WorkPage({ currentUser, users, tasks, onCreateTask, onStatusChange }: WorkPageProps) {
  const [bucket, setBucket] = useState<WorkBucket>('hoje')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    return tasks
      .filter((task) => taskMatchesBucket(task, bucket, currentUser.id, today))
      .filter((task) => !normalized || `${task.title} ${task.description} ${task.tags.join(' ')}`.toLocaleLowerCase('pt-BR').includes(normalized))
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  }, [bucket, currentUser.id, query, tasks, today])

  const counts = useMemo(
    () => Object.fromEntries(buckets.map((item) => [item.id, tasks.filter((task) => taskMatchesBucket(task, item.id, currentUser.id, today)).length])),
    [currentUser.id, tasks, today],
  )

  return (
    <div className="page-content">
      <section className="page-heading">
        <div><span className="eyebrow">Gestão do trabalho</span><h1>Meu trabalho</h1><p>Organize o que precisa de atenção e acompanhe suas entregas.</p></div>
        <button className="primary-button" onClick={() => setDialogOpen(true)}><CirclePlus size={18} /> Nova tarefa</button>
      </section>

      <section className="work-layout">
        <aside className="work-buckets" aria-label="Filtros de tarefas">
          {buckets.map((item) => (
            <button key={item.id} className={bucket === item.id ? 'active' : ''} onClick={() => setBucket(item.id)}>
              <span>{item.label}</span><small>{counts[item.id]}</small>
            </button>
          ))}
        </aside>

        <section className="panel task-panel">
          <header className="task-toolbar">
            <div><h2>{buckets.find((item) => item.id === bucket)?.label}</h2><p>{visibleTasks.length} {visibleTasks.length === 1 ? 'atividade' : 'atividades'}</p></div>
            <div className="task-tools">
              <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nesta visão" /></label>
              <button className="secondary-button"><Filter size={16} /> Filtros</button>
            </div>
          </header>

          <div className="task-list">
            {visibleTasks.length === 0 ? (
              <div className="empty-state"><span><Check size={24} /></span><h3>Nada por aqui</h3><p>Esta visão não possui atividades no momento.</p></div>
            ) : visibleTasks.map((task) => {
              const assignee = users.find((user) => user.id === task.assigneeId)
              const overdue = isOverdue(task, today)
              return (
                <article className="task-row" key={task.id}>
                  <button
                    className={`task-check ${task.status === 'concluida' ? 'done' : ''}`}
                    aria-label={task.status === 'concluida' ? 'Reabrir tarefa' : 'Concluir tarefa'}
                    onClick={() => onStatusChange(task.id, task.status === 'concluida' ? 'nao_iniciada' : 'concluida')}
                  >
                    {task.status === 'concluida' && <Check size={15} />}
                  </button>
                  <div className="task-main">
                    <strong>{task.title}</strong>
                    <p>{task.description}</p>
                    <div className="task-meta">
                      <span className={`status-badge status-${task.status}`}>{statusLabel(task.status)}</span>
                      <span className="origin-badge">{task.origin}</span>
                      {task.tags.slice(0, 2).map((tag) => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                  </div>
                  <div className="task-owner" title={assignee?.name}><span>{assignee?.initials ?? '?'}</span></div>
                  <time className={overdue ? 'overdue' : ''}><CalendarDays size={15} />{task.dueDate ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${task.dueDate}T12:00:00`)) : 'Sem data'}</time>
                  <button className="row-menu" aria-label="Mais opções"><ChevronDown size={17} /></button>
                </article>
              )
            })}
          </div>
        </section>
      </section>

      {dialogOpen && (
        <QuickTaskDialog currentUser={currentUser} users={users} onClose={() => setDialogOpen(false)} onCreate={(task) => { onCreateTask(task); setDialogOpen(false); setBucket(task.assigneeId === currentUser.id && task.dueDate === today ? 'hoje' : 'criadas') }} />
      )}
    </div>
  )
}

interface QuickTaskDialogProps {
  currentUser: User
  users: User[]
  onClose: () => void
  onCreate: WorkPageProps['onCreateTask']
}

function QuickTaskDialog({ currentUser, users, onClose, onCreate }: QuickTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState(currentUser.id)
  const [dueDate, setDueDate] = useState('')

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="task-dialog" onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return; onCreate({ title: title.trim(), assigneeId, dueDate: dueDate || undefined, origin: assigneeId === currentUser.id ? 'pessoal' : 'equipe', priority: 'media' }) }}>
        <header><div><span className="eyebrow">Criação rápida</span><h2>Nova tarefa</h2></div><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button></header>
        <label>Título<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="O que precisa ser feito?" /></label>
        <div className="dialog-grid">
          <label>Responsável<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label>Prazo<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        </div>
        <p className="dialog-hint">Tarefas atribuídas a outra pessoa são criadas como tarefas de equipe.</p>
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button">Criar tarefa</button></footer>
      </form>
    </div>
  )
}

