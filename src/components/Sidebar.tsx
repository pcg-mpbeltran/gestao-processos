import {
  CalendarDays,
  CheckSquare2,
  ClipboardList,
  FileText,
  GitBranch,
  Home,
  Menu,
  Repeat2,
  Settings,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: 'Início', path: '/', icon: Home },
  { label: 'Meu trabalho', path: '/meu-trabalho', icon: CheckSquare2 },
  { label: 'Equipe', path: '/equipe', icon: Users },
  { label: 'Requisições', path: '/requisicoes', icon: ClipboardList },
  { label: 'Processos', path: '/processos', icon: Workflow },
  { label: 'Cronogramas', path: '/cronogramas', icon: CalendarDays },
  { label: 'Relações', path: '/relacoes', icon: GitBranch },
  { label: 'POs', path: '/pos', icon: FileText },
  { label: 'Substituições', path: '/substituicoes', icon: Repeat2 },
]

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={onToggle} />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Gestão</strong>
            <small>Processos e trabalho</small>
          </div>
          <button className="icon-button sidebar-close" aria-label="Fechar menu" onClick={onToggle}>
            <X size={20} />
          </button>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          <span className="nav-label">Espaço de trabalho</span>
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => {
                if (window.innerWidth < 900) onToggle()
              }}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/configuracoes" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <Settings size={19} />
            <span>Configurações</span>
          </NavLink>
          <div className="foundation-note">
            <span className="foundation-dot" />
            <div>
              <strong>Versão de fundação</strong>
              <small>Dados armazenados neste navegador</small>
            </div>
          </div>
        </div>
      </aside>
      <button className="mobile-menu-button" aria-label="Abrir menu" onClick={onToggle}>
        <Menu size={21} />
      </button>
    </>
  )
}

