import crypto from 'node:crypto'
import { getRedisClient, keys } from '../db/redis.js'
import { sendVerificationEmail } from '../config/email.js'
import env from '../config/env.js'
import User from '../models/User.js'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/** 生成指定长度的数字验证码 */
export function generateVerificationCode(length = env.VERIFICATION_CODE_LENGTH) {
  const bytes = crypto.randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += String(bytes[i] % 10)
  }
  return code
}

/**
 * POST /api/auth/send-verification-code
 * 发送邮箱验证码（注册用；已注册邮箱会被拒绝）
 */
export async function sendVerificationCode(req, res) {
  try {
    const email = normalizeEmail(req.body.email)
    const redis = getRedisClient()

    // 已注册邮箱不允许再走注册验证流程
    const existing = await User.exists({ email })
    if (existing) {
      return res.status(409).json({ success: false, message: '该邮箱已被注册' })
    }

    // 重发冷却（60s）
    const cooldownKey = keys.resendCooldown(email)
    const cooldownTtl = await redis.ttl(cooldownKey)
    if (cooldownTtl > 0) {
      return res.status(429).json({
        success: false,
        message: `请 ${cooldownTtl} 秒后再试`,
        retryAfter: cooldownTtl
      })
    }

    const code = generateVerificationCode()
    const codeKey = keys.verificationCode(email)

    await redis.setEx(codeKey, env.VERIFICATION_CODE_TTL_SECONDS, code)
    await redis.setEx(cooldownKey, env.VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS, '1')

    const mail = await sendVerificationEmail(email, code)

    if (!mail.success) {
      // 发信失败则立即失效该验证码，避免出现"收不到却验证通过"的状态
      await redis.del(codeKey)
      await redis.del(cooldownKey)
      return res.status(502).json({
        success: false,
        message: '验证码邮件发送失败，请稍后重试',
        ...(env.NODE_ENV === 'development' ? { detail: mail.error } : {})
      })
    }

    return res.status(200).json({
      success: true,
      message: '验证码已发送，请查看邮箱',
      data: {
        email,
        expiresIn: env.VERIFICATION_CODE_TTL_SECONDS,
        resendCooldown: env.VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS
      }
    })
  } catch (error) {
    console.error('[sendVerificationCode]', error)
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

/**
 * POST /api/auth/verify-code
 * 校验验证码，通过后下发一个短期 verificationToken 供注册使用
 */
export async function verifyCode(req, res) {
  try {
    const email = normalizeEmail(req.body.email)
    const code = String(req.body.code || '').trim()
    const redis = getRedisClient()

    const codeKey = keys.verificationCode(email)
    const cached = await redis.get(codeKey)

    if (!cached) {
      return res.status(400).json({
        success: false,
        message: '验证码已过期或不存在，请重新获取'
      })
    }

    if (cached !== code) {
      return res.status(400).json({ success: false, message: '验证码不正确' })
    }

    // 验证通过：立即作废验证码，防止重复使用
    await redis.del(codeKey)
    await redis.del(keys.resendCooldown(email))

    const verificationToken = crypto.randomBytes(32).toString('hex')
    await redis.setEx(
      keys.verificationToken(email),
      env.VERIFICATION_TOKEN_TTL_SECONDS,
      verificationToken
    )

    return res.status(200).json({
      success: true,
      message: '邮箱验证成功',
      data: {
        email,
        verificationToken,
        expiresIn: env.VERIFICATION_TOKEN_TTL_SECONDS
      }
    })
  } catch (error) {
    console.error('[verifyCode]', error)
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

/** POST /api/auth/resend-verification-code */
export async function resendVerificationCode(req, res) {
  return sendVerificationCode(req, res)
}

/** POST /api/auth/check-email-verification */
export async function checkEmailVerification(req, res) {
  try {
    const email = normalizeEmail(req.body.email)
    const verificationToken = String(req.body.verificationToken || '')

    if (!email || !verificationToken) {
      return res.status(400).json({ success: false, message: '邮箱和验证 token 不能为空' })
    }

    const redis = getRedisClient()
    const cached = await redis.get(keys.verificationToken(email))

    if (!cached || cached !== verificationToken) {
      return res.status(401).json({ success: false, message: '验证 token 无效或已过期' })
    }

    return res.status(200).json({ success: true, message: '邮箱验证有效' })
  } catch (error) {
    console.error('[checkEmailVerification]', error)
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

export default {
  sendVerificationCode,
  verifyCode,
  resendVerificationCode,
  checkEmailVerification,
  generateVerificationCode
}
