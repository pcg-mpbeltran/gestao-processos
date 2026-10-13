import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { processSummary } from '../../data/demo'
import { isOverdue, type Task } from '../../domain/task'
import type { User } from '../../domain/user'

interface HomePageProps {
  currentUser: User
  tasks: Task[]
}

export function HomePage({ currentUser, tasks }: HomePageProps) {
  const today = new Date().toISOString().slice(0, 10)
  const assigned = tasks.filter((task) => task.assigneeId === currentUser.id)
  const open = assigned.filter((task) => !['concluida', 'cancelada'].includes(task.status))
  const overdue = assigned.filter((task) => isOverdue(task, today))
  const completed = assigned.filter((task) => task.status === 'concluida')

  return (
    <div className="page-content">
      <section className="welcome-block">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1>Olá, {currentUser.name.split(' ')[0]}</h1>
          <p>Acompanhe suas prioridades e o trabalho compartilhado da equipe.</p>
        </div>
        <Link to="/meu-trabalho" className="primary-button">
          Abrir meu trabalho <ArrowRight size={17} />
        </Link>
      </section>

      <section className="metric-grid" aria-label="Resumo do trabalho">
        <article className="metric-card">
          <span className="metric-icon neutral"><Layers3 size={20} /></span>
          <div><small>Em aberto</small><strong>{open.length}</strong><p>Tarefas sob sua responsabilidade</p></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon red"><CircleAlert size={20} /></span>
          <div><small>Atrasadas</small><strong>{overdue.length}</strong><p>Precisam de atenção hoje</p></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon blue"><CalendarClock size={20} /></span>
          <div><small>Próximos 7 dias</small><strong>{open.filter((task) => task.dueDate && task.dueDate > today).length}</strong><p>Compromissos planejados</p></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon green"><CheckCircle2 size={20} /></span>
          <div><small>Concluídas</small><strong>{completed.length}</strong><p>Histórico disponível</p></div>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel priority-panel">
          <header className="panel-header">
            <div><span className="eyebrow">Prioridades</span><h2>Para cuidar agora</h2></div>
            <Link to="/meu-trabalho">Ver todas</Link>
          </header>
          <div className="compact-task-list">
            {open.slice(0, 4).map((task) => (
              <article key={task.id}>
                <span className={`priority-line ${task.priority}`} />
                <div><strong>{task.title}</strong><small>{task.tags.join(' · ') || 'Sem etiqueta'}</small></div>
                <time>{task.dueDate ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${task.dueDate}T12:00:00`)) : 'Sem data'}</time>
              </article>
            ))}
          </div>
        </section>

        <section className="panel process-panel">
          <header className="panel-header">
            <div><span className="eyebrow">Catálogo</span><h2>Processos mapeados</h2></div>
            <Link to="/processos">Abrir catálogo</Link>
          </header>
          <div className="process-summary">
            {processSummary.map((process) => (
              <article key={process.id}>
                <span style={{ background: process.color }} />
                <div><strong>{process.name}</strong><small>{process.total} itens demonstrativos</small></div>
                <ArrowRight size={16} />
              </article>
            ))}
          </div>
          <p className="source-note">A fonte possui 20 macroprocessos e 319 registros hierárquicos. Os dados da interface são anonimizados.</p>
        </section>
      </div>
    </div>
  )
}

