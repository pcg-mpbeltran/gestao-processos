/** O aviso anuncia o conflito sem roubar o foco ou rolar durante a digitação. */
export function SyncConflictNotice({ active }: { active: boolean }) {
  function openConflict() {
    const title = document.getElementById('sync-conflict-title')
    title?.focus({ preventScroll: true })
    title?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }
  return <div className={active ? 'sync-conflict-notice' : undefined} role="alert" aria-atomic="true">
    {active && <>
      <span>Há um conflito de edição. Sua alteração permanece pendente.</span>
      <button className="secondary-button" aria-controls="sync-conflict-title" onClick={openConflict}>Revisar conflito</button>
    </>}
  </div>
}
