import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { SyncConflictNotice } from './SyncConflictNotice'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = '' })

it('anuncia conflito fora da área visível sem interromper digitação e abre o painel por ação explícita', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  function view(active: boolean) {
    return <><h2 id="sync-conflict-title" tabIndex={-1}>Revisar alteração</h2>
      <input aria-label="Descrição" />
      <SyncConflictNotice active={active} /></>
  }
  await act(async () => root.render(view(false)))
  const input = container.querySelector('input')!
  const title = container.querySelector('h2')!
  const scroll = vi.fn()
  title.scrollIntoView = scroll
  input.focus()
  input.value = 'Texto em edição'
  const focus = vi.spyOn(title, 'focus')
  await act(async () => root.render(view(true)))
  const alert = container.querySelector('[role="alert"]')!
  expect(alert.getAttribute('aria-atomic')).toBe('true')
  expect(alert.classList.contains('sync-conflict-notice')).toBe(true)
  expect(alert.textContent).toContain('conflito de edição')
  expect(document.activeElement).toBe(input)
  expect(input.value).toBe('Texto em edição')
  expect(scroll).not.toHaveBeenCalled()
  expect(focus).not.toHaveBeenCalled()
  const button = alert.querySelector('button')!
  expect(button.getAttribute('aria-controls')).toBe(title.id)
  await act(async () => button.click())
  expect(document.activeElement).toBe(title)
  expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' })
  await act(async () => root.render(view(false)))
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('')
  await act(async () => root.unmount())
})
