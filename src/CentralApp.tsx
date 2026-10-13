import { SyncConflictDetails } from './SyncConflictDetails'
import { useEffect, useState } from 'react'
import type { Task, TaskStatus } from './domain/task'
import { Workspace } from './Workspace'
import { HttpCentralTransport } from './infrastructure/sync/httpTransport'
import { CentralTaskRepository, SessionSyncCache } from './infrastructure/sync/centralTaskRepository'
import type { Session } from './infrastructure/sync/contract'

export function CentralApp() {
  const [token, setToken] = useState('')
  const [session, setSession] = useState<Session>()
  const [repository, setRepository] = useState<CentralTaskRepository>()
  const [error, setError] = useState('')
  const [, render] = useState(0)
  const [connecting, setConnecting] = useState(false)
  useEffect(() => {
    if (!repository) return
    const unsubscribe = repository.subscribe(() => render(n => n + 1))
    const stop = repository.start()
    return () => { unsubscribe(); stop() }
  }, [repository])
  async function connect() {
    setConnecting(true)
    setError('')
    try {
      const transport = new HttpCentralTransport(token)
      const authenticated = await transport.session()
      const repo = new CentralTaskRepository(transport, new SessionSyncCache('gestao-processos.sync.v1.' + authenticated.user.id))
      setSession(authenticated)
      setRepository(repo)
      setToken('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível conectar.') }
    finally { setConnecting(false) }
  }
  if (!session || !repository) return (
    <main className="page-content">
      <form className="task-dialog" onSubmit={e => { e.preventDefault(); void connect() }}>
        <h1>Conectar ao trabalho compartilhado</h1>
        <label>Credencial de acesso<input type="password" autoComplete="off" required value={token} onChange={e => setToken(e.target.value)} /></label>
        <p>A credencial é fornecida pelo administrador e permanece somente na memória desta sessão.</p>
        <button className="primary-button" disabled={connecting}>Conectar</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  )
  const user = session.user
  function enqueue(action: () => void) {
    try { action(); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao registrar alteração.') }
  }
  function createTask(input: Pick<Task, 'title' | 'assigneeId' | 'dueDate' | 'origin' | 'priority'>) {
    const now = new Date().toISOString()
    enqueue(() => repository!.enqueue({
      kind: 'create', commandId: crypto.randomUUID(),
      task: { ...input, id: crypto.randomUUID(), description: '', requesterId: user.id,
        status: 'nao_iniciada', dependencyIds: [], tags: [],
        visibility: input.assigneeId === user.id ? 'privada' : 'envolvidos',
        createdAt: now, updatedAt: now },
    }))
  }
  function updateStatus(taskId: string, status: TaskStatus) {
    const record = repository!.records.find(r => r.task.id === taskId)
    if (record) enqueue(() => repository!.enqueue({
      kind: 'update', commandId: crypto.randomUUID(), taskId, revision: record.revision, patch: { status },
    }))
  }
  return <Workspace tasks={repository.records.map(r => r.task)} currentUser={user} users={session.users}
    selectedUserId={user.id} onUserChange={() => {}} selectableUsers={[user]}
    onCreateTask={createTask} onStatusChange={updateStatus}
    notice={<section className="panel" aria-label="Sincronização">
      <p role="status">Sincronização: {repository.state}. {repository.pending.length > 0 && repository.pending.length + ' alteração(ões) pendente(s).'} {repository.error}</p>
      {error && <p role="alert">{error}</p>}
      {(repository.state === 'conflito' || repository.state === 'falha') && <>
        <p>Sua alteração permanece pendente. Revise antes de decidir.</p>
        <SyncConflictDetails command={repository.pending[0]} current={repository.conflict} users={session.users} />
        <button onClick={() => void repository.discardPending()}>Descartar alteração pendente e recarregar</button>
        {repository.conflict && <button onClick={() => void repository.reapplyConflict()}>Reaplicar minha alteração sobre esta revisão</button>}
      </>}
      <button onClick={() => void repository.sync()}>Sincronizar agora</button>
      <button onClick={() => { setRepository(undefined); setSession(undefined); setError('') }}>Desconectar</button>
    </section>} />
}

