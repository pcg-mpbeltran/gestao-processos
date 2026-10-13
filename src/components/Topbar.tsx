import { Bell, ChevronDown, Search } from 'lucide-react'
import type { User } from '../domain/user'

interface TopbarProps {
  central?: boolean
  users: User[]
  selectedUserId: string
  onUserChange: (userId: string) => void
}

export function Topbar({ central = false, users, selectedUserId, onUserChange }: TopbarProps) {
  const currentUser = users.find((user) => user.id === selectedUserId) ?? users[0]

  return (
    <header className="topbar">
      <label className="global-search">
        <Search size={18} />
        <input aria-label="Buscar no sistema" placeholder="Buscar tarefas, processos ou POs" />
        <kbd>Ctrl K</kbd>
      </label>

      <div className="topbar-actions">
        <span className={central ? 'central-chip' : 'simulation-chip'}>{central ? 'Modo central' : 'Ambiente demonstrativo'}</span>
        <button className="icon-button notification-button" aria-label="Notificações">
          <Bell size={19} />
          <span />
        </button>
        <div className={central ? "user-switcher authenticated-user" : "user-switcher"} aria-label={central ? "Usuário autenticado" : undefined}>
          <span className="avatar">{currentUser.initials}</span>
          <span className="user-copy">
            <strong>{currentUser.name}</strong>
            <small>{currentUser.role}</small>
          </span>
          {!central && <><select
            aria-label="Simular usuário"
            value={selectedUserId}
            onChange={(event) => onUserChange(event.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.role}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" /></>}
        </div>
      </div>
    </header>
  )
}
