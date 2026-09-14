import { createClient } from 'redis'
import env from '../config/env.js'

// 全局唯一的 Redis 客户端（原 backend-*.js 中每个文件各建一个连接，造成连接泄漏）
let client = null
let connectPromise = null

export function getRedisClient() {
  if (!client) {
    client = createClient({
      url: env.REDIS_URL,
      password: env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 200, 5000)
      }
    })

    client.on('error', (err) => {
      console.error('[redis] 客户端错误:', err.message)
    })
    client.on('reconnecting', () => console.warn('[redis] 正在重连...'))
    client.on('ready', () => console.log('[redis] 连接就绪'))
  }
  return client
}

export async function connectRedis() {
  if (!connectPromise) {
    const c = getRedisClient()
    connectPromise = c.connect().then(() => c)
  }
  return connectPromise
}

export async function disconnectRedis() {
  if (client && client.isOpen) {
    await client.quit()
    client = null
    connectPromise = null
  }
}

// ---- 键名约定（集中定义，避免各处硬编码字符串不一致） ----
export const keys = {
  verificationCode: (email) => `verification_code:${email}`,
  resendCooldown: (email) => `code_rate_limit:${email}`,
  verificationToken: (email) => `verification_token:${email}`,
  tokenBlacklist: (jti) => `blacklist:${jti}`,
  rateLimit: (identity) => `rate_limit:${identity}`
}

export default connectRedis
