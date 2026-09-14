import env, { assertRequiredEnv } from './config/env.js'
import { createApp } from './app.js'
import { connectMongo, disconnectMongo } from './db/mongo.js'
import { connectRedis, disconnectRedis } from './db/redis.js'

async function bootstrap() {
  const problems = assertRequiredEnv()

  if (problems.length && env.NODE_ENV === 'production') {
    for (const p of problems) console.error('[config] 致命错误:', p)
    process.exit(1)
  }

  for (const p of problems) console.warn('[config] 警告:', p)

  // ---- 依赖服务：真实 MongoDB + 真实 Redis，连不上就拒绝启动 ----
  try {
    await connectMongo()
    console.log('[mongo] 已连接:', env.MONGO_URI)
  } catch (error) {
    console.error('[mongo] 连接失败:', error.message)
    console.error('[mongo] 请确认 MongoDB 已启动且 MONGO_URI 配置正确')
    process.exit(1)
  }

  try {
    await connectRedis()
    console.log('[redis] 已连接:', env.REDIS_URL)
  } catch (error) {
    console.error('[redis] 连接失败:', error.message)
    console.error('[redis] 请确认 Redis 已启动且 REDIS_URL 配置正确')
    await disconnectMongo()
    process.exit(1)
  }

  const app = createApp()

  const server = app.listen(env.PORT, () => {
    console.log(`[server] 监听中: http://localhost:${env.PORT}`)
    console.log(`[server] 健康检查: http://localhost:${env.PORT}/api/health`)
    console.log(`[server] 运行环境: ${env.NODE_ENV}`)
  })

  const shutdown = async (signal) => {
    console.log(`\n[server] 收到 ${signal}，正在优雅退出...`)
    server.close(async () => {
      await disconnectRedis().catch(() => {})
      await disconnectMongo().catch(() => {})
      console.log('[server] 已退出')
      process.exit(0)
    })

    // 兜底：10 秒后强制退出
    setTimeout(() => process.exit(1), 10000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  return server
}

bootstrap().catch((error) => {
  console.error('[server] 启动失败:', error)
  process.exit(1)
})
