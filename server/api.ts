import { createServer, type IncomingMessage } from 'node:http'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { CentralStore } from './store'
import type { User } from '../src/domain/user'
import { SyncError } from '../src/infrastructure/sync/contract'

export interface Credential { tokenHash: string; user: User }
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex') }
async function body(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 65536) throw new SyncError(413, 'Comando muito grande.')
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new SyncError(400, 'JSON inválido.') }
}
export function createApi(store: CentralStore, credentials: Credential[]) {
  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    try {
      const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
      const hash = tokenHash(token ?? '')
      const credential = token && credentials.find(c =>
        c.tokenHash.length === hash.length && timingSafeEqual(Buffer.from(c.tokenHash), Buffer.from(hash)))
      if (!credential) throw new SyncError(401, 'Credencial inválida ou expirada.')
      const user = credential.user
      const url = new URL(req.url ?? '/', 'http://localhost')
      let result: unknown
      if (req.method === 'GET' && url.pathname === '/api/session') result = store.session(user)
      else if (req.method === 'GET' && url.pathname === '/api/tasks') result = store.snapshot(user)
      else if (req.method === 'GET' && url.pathname === '/api/changes') result = store.changes(user, Number(url.searchParams.get('cursor') ?? 'NaN'))
      else if (req.method === 'GET' && url.pathname === '/api/history') result = store.history(user, url.searchParams.get('taskId') ?? '')
      else if (req.method === 'POST' && url.pathname === '/api/commands') result = store.execute(user, await body(req))
      else throw new SyncError(404, 'Rota não encontrada.')
      res.end(JSON.stringify(result))
    } catch (error) {
      const known = error instanceof SyncError
      res.statusCode = known ? error.status : 500
      res.end(JSON.stringify({
        message: known ? error.message : 'Falha interna da sincronização.',
        ...(known && error.current ? { current: error.current } : {}),
      }))
    }
  })
}
