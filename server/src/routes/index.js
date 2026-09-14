import { Router } from 'express'
import authRoutes from './auth.js'
import resourceRoutes from './resources.js'
import { getRedisClient } from '../db/redis.js'
import mongoose from 'mongoose'

const router = Router()

/** 健康检查：同时反映 Mongo 与 Redis 的真实连通状态 */
router.get('/health', async (req, res) => {
  let redisOk = false
  try {
    const redis = getRedisClient()
    await redis.ping()
    redisOk = redis.isOpen
  } catch {
    redisOk = false
  }

  const mongoOk = mongoose.connection.readyState === 1

  const ok = mongoOk && redisOk

  return res.status(ok ? 200 : 503).json({
    success: ok,
    status: ok ? 'ok' : 'degraded',
    service: 'netdisk-resources-server',
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: mongoOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down'
    }
  })
})

router.use('/auth', authRoutes)
router.use('/resources', resourceRoutes)

export default router
