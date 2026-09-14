import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'
import crypto from 'node:crypto'
import env from '../config/env.js'

const { Schema } = mongoose

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, '用户名不能为空'],
      unique: true,
      trim: true,
      minlength: [3, '用户名至少 3 个字符'],
      maxlength: [20, '用户名最多 20 个字符'],
      index: true
    },

    email: {
      type: String,
      required: [true, '邮箱不能为空'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请输入有效的邮箱地址']
    },

    password: {
      type: String,
      required: [true, '密码不能为空'],
      minlength: 6,
      select: false // 查询时默认不返回
    },

    // ---- 邮箱验证 ----
    email_verified: { type: Boolean, default: false },
    email_verified_at: { type: Date, default: null },

    // ---- 资料 ----
    avatar: { type: String, default: null },
    bio: { type: String, default: null, maxlength: 500 },

    // ---- 角色 ----
    role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
    isVip: { type: Boolean, default: false },
    vipExpiresAt: { type: Date, default: null },

    // ---- 邀请 ----
    // 注意：这里不能设置 default: null。
    // sparse 唯一索引只跳过"字段缺失"的文档，null 仍会被索引，
    // 结果就是第二个未填邀请码的用户注册时报 "inviteCode 已被使用"。
    inviteCode: { type: String, unique: true, sparse: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // ---- 状态 ----
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },

    lastLoginAt: { type: Date, default: null },

    stats: {
      totalFavorites: { type: Number, default: 0 },
      totalUploads: { type: Number, default: 0 },
      totalDownloads: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// ---- 索引 ----
userSchema.index({ createdAt: -1 })
userSchema.index({ email: 1, email_verified: 1 })

// ---- 虚拟字段 ----
userSchema.virtual('vipValid').get(function () {
  return Boolean(this.isVip && this.vipExpiresAt && this.vipExpiresAt > new Date())
})

// ---- 保存前加密密码 ----
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  try {
    this.password = await bcryptjs.hash(this.password, env.BCRYPT_ROUNDS)
    next()
  } catch (err) {
    next(err)
  }
})

// ---- 实例方法 ----
userSchema.methods.comparePassword = function (candidate) {
  return bcryptjs.compare(candidate, this.password)
}

userSchema.methods.generateInviteCode = async function () {
  this.inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase()
  await this.save()
  return this.inviteCode
}

/** 对外输出的公开字段（绝不包含 password） */
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    email_verified: this.email_verified,
    email_verified_at: this.email_verified_at,
    avatar: this.avatar,
    bio: this.bio,
    role: this.role,
    isVip: this.isVip,
    vipExpiresAt: this.isVip ? this.vipExpiresAt : null,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    stats: this.stats,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  }
}

// ---- 静态方法 ----
userSchema.statics.checkUsernameExists = async function (username) {
  return Boolean(await this.exists({ username: username.trim() }))
}

userSchema.statics.checkEmailExists = async function (email) {
  return Boolean(await this.exists({ email: String(email).toLowerCase() }))
}

export default mongoose.model('User', userSchema)
