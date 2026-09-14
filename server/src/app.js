import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import env from './config/env.js'
import routes from './routes/index.js'
import { notFoundHandler, errorHandler, rateLimiter } from './middleware/index.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(
    cors({
      origin: (origin, callback) => {
        // 允许无 origin 的请求（curl / 服务端调用）
        if (!origin) return callback(null, true)
        if (env.CORS_ORIGIN.includes(origin) || env.CORS_ORIGIN.includes('*')) {
          return callback(null, true)
        }
        return callback(new Error(`CORS 策略拒绝来源: ${origin}`))
      },
      credentials: true
    })
  )

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // 全局限流
  app.use(
    rateLimiter({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS
    })
  )

  app.use('/api', routes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export default createApp
