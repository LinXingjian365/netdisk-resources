import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'
import { getRedisClient, keys } from '../db/redis.js'
import env from '../config/env.js'

/**
 * JWT 认证中间件。
 * 校验签名、有效期，并检查 token 是否已被登出（黑名单）。
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供身份验证令牌'
      })
    }

    const token = header.slice(7)

    const decoded = jwt.verify(token, env.JWT_SECRET)

    // 登出后的 token 进入黑名单（以 jti 为维度，Redis 中只存短 id）
    if (decoded.jti) {
      const redis = getRedisClient()
      const blacklisted = await redis.get(keys.tokenBlacklist(decoded.jti))
      if (blacklisted) {
        return res.status(401).json({ success: false, message: '令牌已失效，请重新登录' })
      }
    }

    req.user = decoded
    req.token = token
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期，请刷新' })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: '令牌无效' })
    }
    console.error('[auth] 认证异常:', error)
    return res.status(401).json({ success: false, message: '身份验证失败' })
  }
}

/** 可选认证：有 token 就解析，没有也放行（用于公开接口的个性化） */
export async function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return next()

  try {
    req.user = jwt.verify(header.slice(7), env.JWT_SECRET)
  } catch {
    req.user = null
  }
  next()
}

/** 角色授权 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' })
    }
    next()
  }
}

/** 处理 express-validator 的校验结果 */
export function validateInput(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg
      }))
    })
  }
  next()
}

/** 基于 Redis 的 IP 限流 */
export function rateLimiter(options = {}) {
  const {
    windowMs = env.RATE_LIMIT_WINDOW_MS,
    maxRequests = env.RATE_LIMIT_MAX_REQUESTS,
    message = '请求过于频繁，请稍后再试'
  } = options

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))

  return async (req, res, next) => {
    try {
      const redis = getRedisClient()
      const identity = req.ip || req.socket?.remoteAddress || 'unknown'
      const key = keys.rateLimit(identity)

      const current = await redis.incr(key)
      if (current === 1) {
        await redis.expire(key, windowSeconds)
      }

      res.setHeader('X-RateLimit-Limit', String(maxRequests))
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - current)))

      if (current > maxRequests) {
        const retryAfter = await redis.ttl(key)
        res.setHeader('Retry-After', String(retryAfter))
        return res.status(429).json({ success: false, message, retryAfter })
      }

      next()
    } catch (error) {
      // 限流组件故障不应阻断业务
      console.error('[rate-limit] 错误:', error.message)
      next()
    }
  }
}

/** 404 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `接口不存在: ${req.method} ${req.originalUrl}`
  })
}

/** 统一错误处理 */
export function errorHandler(err, req, res, next) {
  console.error('[error]', err)

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: Object.values(err.errors).map((e) => e.message)
    })
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || '字段'
    return res.status(409).json({ success: false, message: `${field} 已被使用` })
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: '请求体不是合法的 JSON' })
  }

  const status = err.status || err.statusCode || 500
  return res.status(status).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  })
}

export default {
  authenticate,
  optionalAuthenticate,
  requireRole,
  validateInput,
  rateLimiter,
  notFoundHandler,
  errorHandler
}
