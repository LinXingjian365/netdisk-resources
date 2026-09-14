import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// server/.env  (server/src/config/env.js -> ../../../.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function num(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback
  return String(value).toLowerCase() === 'true'
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: num(process.env.PORT, 3000),

  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/netdisk_resources',

  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  MAIL_TRANSPORT: (process.env.MAIL_TRANSPORT || 'smtp').toLowerCase(),
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.qq.com',
  SMTP_PORT: num(process.env.SMTP_PORT, 465),
  SMTP_SECURE: bool(process.env.SMTP_SECURE, true),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || '培鑫盈资源网创',
  MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || 'noreply@example.com',

  VERIFICATION_CODE_LENGTH: num(process.env.VERIFICATION_CODE_LENGTH, 6),
  VERIFICATION_CODE_TTL_SECONDS: num(process.env.VERIFICATION_CODE_TTL_SECONDS, 600),
  VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS: num(
    process.env.VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS,
    60
  ),
  VERIFICATION_TOKEN_TTL_SECONDS: num(process.env.VERIFICATION_TOKEN_TTL_SECONDS, 1800),

  BCRYPT_ROUNDS: num(process.env.BCRYPT_ROUNDS, 10),
  RATE_LIMIT_WINDOW_MS: num(process.env.RATE_LIMIT_WINDOW_MS, 900000),
  RATE_LIMIT_MAX_REQUESTS: num(process.env.RATE_LIMIT_MAX_REQUESTS, 100)
}

/**
 * 校验启动必需的配置。
 * 缺失时快速失败并给出明确提示，避免带着错误配置静默运行。
 */
export function assertRequiredEnv() {
  const problems = []

  if (!env.JWT_SECRET || env.JWT_SECRET === 'change_me_to_a_long_random_string') {
    problems.push('JWT_SECRET 未设置或仍为占位值（生产环境必须替换为高强度随机字符串）')
  }

  if (env.MAIL_TRANSPORT === 'smtp' && (!env.SMTP_USER || !env.SMTP_PASS)) {
    // 非致命：仅警告。邮件功能不可用，但其余接口仍可运行。
    console.warn('[config] 警告: SMTP 凭据未配置，邮箱验证码将无法真正发送。')
    console.warn('[config] 提示: 设置 MAIL_TRANSPORT=json 可在自动化测试中跳过真实发信。')
  }

  if (env.MAIL_TRANSPORT !== 'smtp' && env.MAIL_TRANSPORT !== 'json') {
    problems.push(`MAIL_TRANSPORT 取值非法: ${env.MAIL_TRANSPORT}（只允许 smtp 或 json）`)
  }

  return problems
}

export default env
