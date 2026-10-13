import type { Task } from '../domain/task'
import type { User } from '../domain/user'

function isoDate(offset: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

const now = new Date().toISOString()

export const demoUsers: User[] = [
  { id: 'user-ana', name: 'Ana Costa', initials: 'AC', role: 'Gestor', team: 'Operações acadêmicas' },
  { id: 'user-bruno', name: 'Bruno Lima', initials: 'BL', role: 'Colaborador', team: 'Operações acadêmicas' },
  { id: 'user-carla', name: 'Carla Mendes', initials: 'CM', role: 'Dono do processo', team: 'Processos' },
]

export const demoTasks: Task[] = [
  {
    id: 'task-001',
    title: 'Revisar termo de prorrogação',
    description: 'Conferir vigência, prazos e links de referência.',
    origin: 'processo',
    assigneeId: 'user-ana',
    requesterId: 'user-carla',
    priority: 'alta',
    status: 'em_andamento',
    dueDate: isoDate(0),
    processId: 'processo-prorrogacao',
    poVersionId: 'po-prorrogacao-v2',
    dependencyIds: [],
    tags: ['Prorrogação', 'Documentos'],
    visibility: 'equipe',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-002',
    title: 'Validar cronograma da próxima turma',
    description: 'Revisar datas das etapas antes do fechamento.',
    origin: 'cronograma',
    assigneeId: 'user-ana',
    requesterId: 'user-ana',
    priority: 'urgente',
    status: 'em_revisao',
    dueDate: isoDate(-2),
    eventId: 'evento-validacao',
    dependencyIds: [],
    tags: ['Cronograma'],
    visibility: 'equipe',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-003',
    title: 'Preparar pauta da reunião semanal',
    description: 'Consolidar decisões e impedimentos da equipe.',
    origin: 'recorrencia',
    assigneeId: 'user-ana',
    requesterId: 'user-ana',
    priority: 'media',
    status: 'nao_iniciada',
    dueDate: isoDate(3),
    dependencyIds: [],
    tags: ['Equipe'],
    visibility: 'privada',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-004',
    title: 'Atualizar instruções do projeto de pesquisa',
    description: 'Incorporar o retorno da revisão técnica.',
    origin: 'equipe',
    assigneeId: 'user-bruno',
    requesterId: 'user-ana',
    priority: 'alta',
    status: 'aguardando',
    dueDate: isoDate(5),
    processId: 'processo-projeto-pesquisa',
    dependencyIds: ['task-005'],
    tags: ['Projeto de pesquisa'],
    visibility: 'envolvidos',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-005',
    title: 'Aprovar texto-base da comunicação',
    description: 'Validar linguagem e referências antes da publicação.',
    origin: 'requisicao',
    assigneeId: 'user-carla',
    requesterId: 'user-ana',
    priority: 'media',
    status: 'bloqueada',
    dependencyIds: [],
    tags: ['Comunicação'],
    visibility: 'envolvidos',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-006',
    title: 'Organizar links de referência',
    description: 'Reunir os documentos externos usados pela equipe.',
    origin: 'pessoal',
    assigneeId: 'user-ana',
    requesterId: 'user-ana',
    priority: 'baixa',
    status: 'nao_iniciada',
    dependencyIds: [],
    tags: ['Organização'],
    visibility: 'privada',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'task-007',
    title: 'Registrar decisão do calendário',
    description: 'Decisão registrada para consulta histórica.',
    origin: 'cronograma',
    assigneeId: 'user-ana',
    requesterId: 'user-carla',
    priority: 'media',
    status: 'concluida',
    dueDate: isoDate(-4),
    dependencyIds: [],
    tags: ['Cronograma'],
    visibility: 'equipe',
    createdAt: now,
    updatedAt: now,
  },
]

export const processSummary = [
  { id: 'processo-documentos', name: 'Documentos', total: 67, color: '#d10f24' },
  { id: 'processo-cronograma', name: 'Cronograma e mensagens', total: 45, color: '#2563eb' },
  { id: 'processo-prorrogacao', name: 'Prorrogação', total: 16, color: '#7c3aed' },
  { id: 'processo-defesas', name: 'Defesas', total: 23, color: '#059669' },
]

