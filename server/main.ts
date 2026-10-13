import { readFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import { CentralStore } from './store'
import { createApi } from './api'

const configPath = process.env.SYNC_CREDENTIALS_FILE
if (!configPath) throw new Error('Defina SYNC_CREDENTIALS_FILE com o arquivo privado de credenciais.')
const credentialSchema = z.array(z.object({
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  user: z.object({
    id: z.string().min(1), name: z.string().min(1), initials: z.string().min(1),
    team: z.string().min(1),
    role: z.enum(['Administrador', 'Gestor', 'Dono do processo', 'Colaborador', 'Visualizador']),
  }).strict(),
}).strict()).min(1)
const credentials = credentialSchema.parse(JSON.parse(readFileSync(configPath, 'utf8')))
if (new Set(credentials.map(c => c.user.id)).size !== credentials.length ||
    new Set(credentials.map(c => c.tokenHash)).size !== credentials.length) {
  throw new Error('Identidades e credenciais devem ser únicas.')
}
const path = process.env.SYNC_DATABASE ?? './var/sync.sqlite'
mkdirSync(dirname(path), { recursive: true })
const store = new CentralStore(path, credentials.map(c => c.user))
const server = createApi(store, credentials)
server.listen(Number(process.env.SYNC_PORT ?? 3001), '127.0.0.1', () => {
  console.log('API de sincronização disponível em http://127.0.0.1:' + (process.env.SYNC_PORT ?? 3001))
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => { store.close(); process.exit(0) }))
}
