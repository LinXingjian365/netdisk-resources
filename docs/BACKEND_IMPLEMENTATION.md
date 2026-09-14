// ========================================
// 后端实现示例 - Express.js
// ========================================

// 1. package.json
{
  "name": "netdisk-api",
  "version": "1.0.0",
  "description": "网络资源共享平台后端API",
  "main": "server.js",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "nodemailer": "^6.9.1",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-validator": "^7.0.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}

// ========================================

// 2. server.js - 主服务器文件

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import resourceRoutes from './routes/resources.js'
import favoriteRoutes from './routes/favorites.js'

dotenv.config()

const app = express()

// 中间件
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 数据库连接
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('✓ MongoDB 已连接'))
  .catch(err => console.error('✗ MongoDB 连接失败:', err))

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/favorites', favoriteRoutes)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: '服务器错误' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
})

// ========================================

// 3. models/User.js - 用户模型

import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
  },
  password_hash: {
    type: String,
    required: true
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  email_verified_at: Date,
  
  phone: String,
  avatar_url: String,
  bio: String,
  
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending'
  },
  
  invite_code: {
    type: String,
    unique: true,
    sparse: true
  },
  invited_by_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  is_admin: {
    type: Boolean,
    default: false
  },
  two_factor_enabled: {
    type: Boolean,
    default: false
  },
  
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  last_login_at: Date
})

// 密码加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next()
  
  try {
    const salt = await bcryptjs.genSalt(10)
    this.password_hash = await bcryptjs.hash(this.password_hash, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// 密码验证
userSchema.methods.comparePassword = async function(password) {
  return await bcryptjs.compare(password, this.password_hash)
}

// 隐藏敏感信息
userSchema.methods.toJSON = function() {
  const obj = this.toObject()
  delete obj.password_hash
  return obj
}

export default mongoose.model('User', userSchema)

// ========================================

// 4. models/Resource.js - 资源模型

import mongoose from 'mongoose'

const resourceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: String,
  category: {
    type: String,
    required: true
  },
  
  netdisk_type: {
    type: String,
    enum: ['aliyun', 'baidu', 'tianyi'],
    required: true
  },
  resource_url: {
    type: String,
    required: true
  },
  password: String,
  
  tags: [String],
  file_count: Number,
  file_size: String,
  
  view_count: {
    type: Number,
    default: 0
  },
  download_count: {
    type: Number,
    default: 0
  },
  like_count: {
    type: Number,
    default: 0
  },
  
  is_approved: {
    type: Boolean,
    default: false
  },
  is_deleted: {
    type: Boolean,
    default: false
  },
  
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  deleted_at: Date
})

resourceSchema.index({ user_id: 1 })
resourceSchema.index({ category: 1 })
resourceSchema.index({ created_at: -1 })

export default mongoose.model('Resource', resourceSchema)

// ========================================

// 5. models/EmailVerificationCode.js - 邮箱验证码模型

import mongoose from 'mongoose'

const emailVerificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  expires_at: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL索引
  },
  verified_at: Date,
  attempts: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
})

emailVerificationCodeSchema.index({ email: 1 })

export default mongoose.model('EmailVerificationCode', emailVerificationCodeSchema)

// ========================================

// 6. routes/auth.js - 认证路由

import express from 'express'
import { check, validationResult } from 'express-validator'
import User from '../models/User.js'
import EmailVerificationCode from '../models/EmailVerificationCode.js'
import { sendVerificationEmail } from '../services/emailService.js'
import { generateToken, authenticate } from '../middleware/auth.js'
import { generateCode, generateInviteCode } from '../utils/generators.js'

const router = express.Router()

// 发送验证码
router.post('/send-verification-code', [
  check('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body

    // 检查邮箱是否已注册
    const existingUser = await User.findOne({ email, email_verified: true })
    if (existingUser) {
      return res.status(400).json({ message: '邮箱已被注册' })
    }

    // 删除之前未验证的验证码
    await EmailVerificationCode.deleteMany({ email })

    // 生成6位验证码
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分钟

    // 保存到数据库
    const verification = await EmailVerificationCode.create({
      email,
      code,
      expires_at: expiresAt
    })

    // 发送邮件
    try {
      await sendVerificationEmail(email, code)
      res.json({ message: '验证码已发送' })
    } catch (error) {
      console.error('邮件发送失败:', error)
      // 删除已保存的验证码
      await EmailVerificationCode.deleteOne({ _id: verification._id })
      res.status(500).json({ message: '邮件发送失败，请重试' })
    }
  } catch (error) {
    console.error('错误:', error)
    res.status(500).json({ message: '服务器错误' })
  }
})

// 验证验证码
router.post('/verify-code', [
  check('email').isEmail().normalizeEmail(),
  check('code').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { email, code } = req.body

    const verification = await EmailVerificationCode.findOne({ email, code })

    if (!verification) {
      return res.status(400).json({ message: '验证码不正确' })
    }

    if (new Date() > verification.expires_at) {
      return res.status(400).json({ message: '验证码已过期' })
    }

    // 标记为已验证
    await EmailVerificationCode.updateOne(
      { _id: verification._id },
      { verified_at: new Date() }
    )

    res.json({ message: '验证码验证成功', email })
  } catch (error) {
    res.status(500).json({ message: '服务器错误' })
  }
})

// 用户注册
router.post('/register', [
  check('username').isLength({ min: 3, max: 20 }),
  check('email').isEmail().normalizeEmail(),
  check('password').isLength({ min: 6, max: 20 }),
  check('code').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, email, password, code: verificationCode, inviteCode } = req.body

    // 验证验证码
    const verification = await EmailVerificationCode.findOne({
      email,
      code: verificationCode,
      verified_at: { $exists: true }
    })

    if (!verification) {
      return res.status(400).json({ message: '邮箱未验证' })
    }

    // 检查用户名/邮箱是否存在
    const existing = await User.findOne({
      $or: [{ username }, { email }]
    })

    if (existing) {
      return res.status(400).json({
        message: existing.email === email ? '邮箱已注册' : '用户名已存在'
      })
    }

    // 创建用户
    const newUser = await User.create({
      username,
      email,
      password_hash: password,
      email_verified: true,
      email_verified_at: new Date(),
      status: 'active',
      invite_code: generateInviteCode(),
      invited_by_id: inviteCode ? (await getUserByInviteCode(inviteCode))?._id : null
    })

    // 删除验证码
    await EmailVerificationCode.deleteOne({ email })

    // 生成JWT
    const token = generateToken(newUser._id)

    res.json({
      message: '注册成功',
      data: {
        user: newUser.toJSON(),
        token
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({ message: '注册失败' })
  }
})

// 用户登录
router.post('/login', [
  check('username').notEmpty(),
  check('password').notEmpty()
], async (req, res) => {
  try {
    const { username, password } = req.body

    // 查找用户（支持用户名或邮箱登录）
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    })

    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' })
    }

    // 验证密码
    const isValid = await user.comparePassword(password)
    if (!isValid) {
      return res.status(400).json({ message: '用户名或密码错误' })
    }

    // 检查邮箱是否验证
    if (!user.email_verified) {
      return res.status(400).json({
        message: '邮箱未验证，请先验证邮箱',
        email: user.email
      })
    }

    // 更新登录时间
    await User.updateOne({ _id: user._id }, { last_login_at: new Date() })

    // 生成JWT
    const token = generateToken(user._id)

    res.json({
      message: '登录成功',
      data: {
        user: user.toJSON(),
        token
      }
    })
  } catch (error) {
    res.status(500).json({ message: '登录失败' })
  }
})

// 获取当前用户信息
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    res.json({ data: user.toJSON() })
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败' })
  }
})

async function getUserByInviteCode(code) {
  return await User.findOne({ invite_code: code })
}

export default router

// ========================================

// 7. middleware/auth.js - 认证中间件

import jwt from 'jsonwebtoken'

export function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  )
}

export function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ message: '未授权' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: '令牌无效或已过期' })
  }
}

// ========================================

// 8. services/emailService.js - 邮件服务

import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
})

export async function sendVerificationEmail(email, code) {
  const html = \`
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>邮箱验证</h2>
      <p>你的验证码是:</p>
      <h1 style="letter-spacing: 10px; color: #409EFF;">\${code}</h1>
      <p>验证码有效期为10分钟，请不要分享给他人。</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #909399; font-size: 12px;">
        这是一条自动发送的邮件，请不要回复。如有问题，请联系客服。
      </p>
    </div>
  \`

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@netdisk.com',
    to: email,
    subject: '邮箱验证码 - 网络资源共享平台',
    html
  })
}

// ========================================

// 9. utils/generators.js - 生成器工具

export function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ========================================
