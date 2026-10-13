export type UserRole = 'Administrador' | 'Gestor' | 'Dono do processo' | 'Colaborador' | 'Visualizador'

export interface User {
  id: string
  name: string
  initials: string
  role: UserRole
  team: string
}

