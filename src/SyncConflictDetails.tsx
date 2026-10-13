import { statusLabel, type Task } from './domain/task'
import type { User } from './domain/user'
import type { Command, VersionedTask } from './infrastructure/sync/contract'

const labels: Record<string, string> = {
  title: 'Título', description: 'Descrição', assigneeId: 'Responsável',
  requesterId: 'Solicitante', priority: 'Prioridade', status: 'Status',
  startDate: 'Início', dueDate: 'Prazo', processId: 'Processo', eventId: 'Evento',
  dependencyIds: 'Dependências', tags: 'Etiquetas', visibility: 'Visibilidade',
  origin: 'Origem', text: 'Comentário',
}
export function SyncConflictDetails({ command, current, users }: {
  command?: Command; current?: VersionedTask; users: User[]
}) {
  if (!command) return null
  const values = command.kind === 'create' ? command.task : command.kind === 'update' ? command.patch : { text: command.text }
  function format(field: string, value: unknown) {
    if (value === undefined || value === '') return 'Não informado'
    if (field === 'status') return statusLabel(value as Task['status'])
    if (field === 'assigneeId' || field === 'requesterId') return users.find(u => u.id === value)?.name ?? 'Pessoa indisponível'
    return Array.isArray(value) ? value.join(', ') || 'Nenhuma' : String(value)
  }
  return <div>
    {Object.entries(values).filter(([key]) => key in labels).map(([key, value]) =>
      <div key={key}>
        <strong>{labels[key]}</strong>
        <p>Sua alteração: {format(key, value)}</p>
        {current && key !== 'text' && <p>No servidor: {format(key, current.task[key as keyof Task])}</p>}
      </div>
    )}
  </div>
}
