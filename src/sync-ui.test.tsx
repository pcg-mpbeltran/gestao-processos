import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { Workspace } from './Workspace'
import { SyncConflictDetails } from './SyncConflictDetails'
import { demoUsers, demoTasks } from './data/demo'

describe('Interface de sincronização', () => {
  function workspace(central: boolean) {
    const markup = renderToStaticMarkup(<MemoryRouter><Workspace
      central={central} tasks={[]} users={demoUsers} currentUser={demoUsers[0]}
      selectedUserId={demoUsers[0].id} onUserChange={() => {}}
      onCreateTask={() => {}} onStatusChange={() => {}}
    /></MemoryRouter>)
    const root = document.createElement('div')
    root.innerHTML = markup
    return root
  }
  it('modo central mostra identidade autenticada sem seletor ou textos da simulação', () => {
    const root = workspace(true)
    expect(root.querySelector('[aria-label="Simular usuário"]')).toBeNull()
    expect(root.textContent).not.toContain('Ambiente demonstrativo')
    expect(root.textContent).not.toContain('Dados armazenados neste navegador')
    expect(root.querySelector('[aria-label="Usuário autenticado"]')?.textContent).toContain(demoUsers[0].name)
    expect(root.textContent).toContain('Dados no servidor')
  })
  it('modo local mantém seletor e identificação da demonstração', () => {
    const root = workspace(false)
    expect(root.querySelector('[aria-label="Simular usuário"]')).not.toBeNull()
    expect(root.textContent).toContain('Ambiente demonstrativo')
    expect(root.textContent).toContain('Dados armazenados neste navegador')
  })
  it('conflito apresenta campos e valores legíveis sem comandos ou identificadores internos', () => {
    const markup = renderToStaticMarkup(<SyncConflictDetails
      command={{ kind: 'update', commandId: 'id-secreto', taskId: demoTasks[0].id, revision: 1, patch: { title: '<script>texto</script>', status: 'concluida' } }}
      current={{ task: demoTasks[0], revision: 2 }} users={demoUsers}
    />)
    const root = document.createElement('div')
    root.innerHTML = markup
    expect(root.querySelectorAll('.sync-field')).toHaveLength(2)
    expect(root.textContent).toContain('Sua alteração')
    expect(root.textContent).toContain('No servidor')
    expect(root.textContent).toContain('Concluída')
    expect(root.textContent).not.toContain('id-secreto')
    expect(root.querySelector('script')).toBeNull()
  })
})
