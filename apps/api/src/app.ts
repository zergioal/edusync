import express from 'express'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { errorHandler } from './middlewares/errorHandler'
import { notFound } from './middlewares/notFound'
import { apiRouter } from './routes'
import { auditoriaMiddleware } from './middlewares/auditoria'
import { tenantMiddleware } from './middlewares/tenant.middleware'

const app = express()

// ─── CORS dinámico: permite cualquier subdominio de BASE_DOMAIN ───────────────

const baseDomain  = process.env['BASE_DOMAIN'] ?? 'edusync.bo'
const devOrigins  = (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173')
  .split(',').map(o => o.trim()).filter(Boolean)

const subdomainRe = new RegExp(`^https://[a-z0-9-]+\\.${baseDomain.replace(/\./g, '\\.')}$`)

app.use(compression())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true) // server-to-server / Postman

    // Orígenes de desarrollo/staging configurados (soporta lista separada por comas)
    if (devOrigins.includes(origin)) return callback(null, true)

    // Dominio base exacto
    if (origin === `https://${baseDomain}`) return callback(null, true)

    // Cualquier subdominio de BASE_DOMAIN
    if (subdomainRe.test(origin)) return callback(null, true)

    // Vercel preview/deploy URLs (para el frontend en Vercel)
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return callback(null, true)

    callback(new Error(`CORS: origin ${origin} not allowed`), false)
  },
  credentials: true,
}))

app.use(helmet())
app.use(morgan(process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/v1', tenantMiddleware, auditoriaMiddleware, apiRouter)

app.use(notFound)
app.use(errorHandler)

export default app
