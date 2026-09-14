import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { getRedisClient, keys } from '../db/redis.js'
import env from '../config/env.js'
import User from '../models/User.js'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function signToken(user, expiresIn) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      jti: crypto.randomUUID()
    },
    env.JWT_SECRET,
    { expiresIn }
  )
}

/**
 * POST /api/auth/register
 * 需携带邮箱验证阶段下发的 verificationToken
 */
export async function register(req, res) {
  try {
    const { username, password, verificationToken, inviteCode } = req.body
    const email = normalizeEmail(req.body.email)
    const redis = getRedisClient()

    // 1. 校验邮箱验证 token
    const tokenKey = keys.verificationToken(email)
    const cachedToken = await redis.get(tokenKey)

    if (!cachedToken || cachedToken !== verificationToken) {
      return res.status(401).json({
        success: false,
        message: '邮箱验证 token 无效或已过期，请重新验证邮箱'
      })
    }

    // 2. 唯一性检查
    if (await User.checkUsernameExists(username)) {
      return res.status(409).json({ success: false, message: '用户名已被使用' })
    }
    if (await User.checkEmailExists(email)) {
      return res.status(409).json({ success: false, message: '邮箱已被注册' })
    }

    // 3. 创建用户（密码在 pre('save') 中自动加密）
    const user = new User({
      username: username.trim(),
      email,
      password,
      email_verified: true,
      email_verified_at: new Date(),
      lastLoginAt: new Date(),
      // 未填写时保持字段缺失，避免落入 unique sparse 索引
      ...(inviteCode ? { inviteCode } : {})
    })

    await user.save()

    // 4. 一次性 token 用后即焚
    await redis.del(tokenKey)

    // 5. 签发令牌
    const accessToken = signToken(user, env.JWT_ACCESS_EXPIRES_IN)
    const refreshToken = signToken(user, env.JWT_REFRESH_EXPIRES_IN)

    return res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: user.toPublicJSON(),
        token: accessToken,
        refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN
      }
    })
  } catch (error) {
    console.error('[register]', error)

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0]
      const label = field === 'username' ? '用户名' : field === 'email' ? '邮箱' : field
      return res.status(409).json({ success: false, message: `${label} 已被使用` })
    }

    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email)
    const { password } = req.body

    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({ success: false, message: '邮箱或密码不正确' })
    }

    const ok = await user.comparePassword(password)
    if (!ok) {
      return res.status(401).json({ success: false, message: '邮箱或密码不正确' })
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: user.banReason ? `账号已被封禁：${user.banReason}` : '账号已被封禁'
      })
    }

    if (!user.email_verified) {
      return res.status(403).json({ success: false, message: '邮箱未验证，请先完成验证' })
    }

    user.lastLoginAt = new Date()
    await user.save({ validateBeforeSave: false })

    const accessToken = signToken(user, env.JWT_ACCESS_EXPIRES_IN)
    const refreshToken = signToken(user, env.JWT_REFRESH_EXPIRES_IN)

    return res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        user: user.toPublicJSON(),
        token: accessToken,
        refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN
      }
    })
  } catch (error) {
    console.error('[login]', error)
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

/**
 * POST /api/auth/logout
 * 将当前 token 的 jti 加入黑名单，直到其自然过期
 */
export async function logout(req, res) {
  try {
    const redis = getRedisClient()
    const decoded = req.user

    if (decoded?.jti && decoded?.exp) {
      const ttl = Math.floor(decoded.exp - Date.now() / 1000)
      if (ttl > 0) {
        await redis.setEx(keys.tokenBlacklist(decoded.jti), ttl, '1')
      }
    }

    return res.status(200).json({ success: true, message: '登出成功' })
  } catch (error) {
    console.error('[logout]', error)
    return res.status(500).json({ success: false, message: '登出失败' })
  }
}

/**
 * POST /api/auth/refresh
 * 用 refreshToken 换取新的 accessToken
 */
export async function refreshToken(req, res) {
  try {
    const token = req.body.refreshToken

    if (!token) {
      return res.status(400).json({ success: false, message: 'refreshToken 不能为空' })
    }

    const decoded = jwt.verify(token, env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' })
    }

    const accessToken = signToken(user, env.JWT_ACCESS_EXPIRES_IN)

    return res.status(200).json({
      success: true,
      message: '令牌已刷新',
      data: { token: accessToken, expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    })
  } catch (error) {
    return res.status(401).json({ success: false, message: 'refreshToken 无效或已过期' })
  }
}

/** GET /api/auth/profile */
export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }
    return res.status(200).json({ success: true, data: { user: user.toPublicJSON() } })
  } catch (error) {
    console.error('[getProfile]', error)
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

/** PATCH /api/auth/profile */
export async function updateProfile(req, res) {
  try {
    const allowed = ['username', 'bio', 'avatar']
    const patch = {}

    for (const field of allowed) {
      if (req.body[field] !== undefined) patch[field] = req.body[field]
    }

    if (patch.username) {
      const conflict = await User.exists({ username: patch.username, _id: { $ne: req.user.id } })
      if (conflict) {
        return res.status(409).json({ success: false, message: '用户名已被使用' })
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, patch, {
      new: true,
      runValidators: true
    })

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    return res.status(200).json({
      success: true,
      message: '资料已更新',
      data: { user: user.toPublicJSON() }
    })
  } catch (error) {
    console.error('[updateProfile]', error)
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

export default {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile
}
