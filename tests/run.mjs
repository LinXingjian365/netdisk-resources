/**
 * 全功能集成测试
 *
 * 运行前提：
 *   1. MongoDB 与 Redis 已启动
 *   2. 后端已启动： cd server && npm start   （默认 http://localhost:3000）
 *
 * 运行： npm test        （仓库根目录）
 *
 * 说明：邮箱验证码在自动化测试环境下不真实投递（MAIL_TRANSPORT=json），
 *       测试直接连接 Redis 读取验证码，以完成完整的注册流程验证。
 *       生产环境 MAIL_TRANSPORT=smtp，验证码只通过邮件投递。
 */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api'
const SERVER_DIR = path.resolve(new URL('../server/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))

// 从 server 目录解析依赖，避免根目录重复安装
const serverRequire = createRequire(pathToFileURL(path.join(SERVER_DIR, 'package.json')))
const { createClient } = serverRequire('redis')

let passed = 0
let failed = 0
const failures = []

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`
}

function ok(name, detail = '') {
  passed++
  console.log(`  ${C.green('✓')} ${name}${detail ? C.dim(' — ' + detail) : ''}`)
}

function fail(name, detail) {
  failed++
  failures.push({ name, detail })
  console.log(`  ${C.red('✗')} ${name}\n      ${C.red(detail)}`)
}

async function test(name, fn) {
  try {
    await fn()
  } catch (e) {
    fail(name, e.message)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function assertStatus(res, expected, label) {
  if (res.status !== expected) {
    throw new Error(`${label}: 期望 HTTP ${expected}，实际 ${res.status} — ${JSON.stringify(res.body)}`)
  }
}

// ---------- HTTP 辅助 ----------
async function api(method, url, { body, token } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  let parsed
  try {
    parsed = await res.json()
  } catch {
    parsed = null
  }

  return { status: res.status, body: parsed, headers: res.headers }
}

// ---------- Redis 辅助（读取验证码） ----------
let redis
async function getRedis() {
  if (!redis) {
    redis = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' })
    redis.on('error', (e) => console.error('[redis]', e.message))
    await redis.connect()
  }
  return redis
}

async function readCode(email) {
  const r = await getRedis()
  return r.get(`verification_code:${email.toLowerCase()}`)
}

// ---------- 测试主体 ----------
const stamp = Date.now()
const email = `tester_${stamp}@example.com`
const otherEmail = `other_${stamp}@example.com`
const username = `tester_${String(stamp).slice(-8)}`

let accessToken = ''
let refreshToken = ''
let verificationToken = ''
let createdResourceId = ''

console.log(C.bold('\n════════════════════════════════════════════'))
console.log(C.bold('  全功能集成测试'))
console.log(C.bold('════════════════════════════════════════════'))
console.log(C.dim(`  目标: ${BASE}`))
console.log(C.dim(`  账号: ${email}\n`))

console.log(C.bold('[1] 服务与依赖健康检查'))

await test('健康检查返回 200 且 Mongo/Redis 均为 up', async () => {
  const res = await api('GET', '/health')
  assertStatus(res, 200, '健康检查')
  assert(res.body.success === true, 'success 应为 true')
  assert(res.body.checks.mongodb === 'up', 'MongoDB 应为 up')
  assert(res.body.checks.redis === 'up', 'Redis 应为 up')
  ok('健康检查', `mongodb=${res.body.checks.mongodb}, redis=${res.body.checks.redis}`)
})

await test('未知路由返回 404', async () => {
  const res = await api('GET', '/definitely-not-exist')
  assertStatus(res, 404, '未知路由')
  ok('未知路由 404')
})

console.log(C.bold('\n[2] 邮箱验证码'))

await test('非法邮箱返回 400', async () => {
  const res = await api('POST', '/auth/send-verification-code', { body: { email: 'not-an-email' } })
  assertStatus(res, 400, '非法邮箱')
  ok('非法邮箱被拒绝', res.body.message)
})

await test('发送验证码成功', async () => {
  const res = await api('POST', '/auth/send-verification-code', { body: { email } })
  assertStatus(res, 200, '发送验证码')
  assert(res.body.success === true, 'success 应为 true')
  ok('发送验证码', `有效期 ${res.body.data.expiresIn}s`)
})

await test('验证码确实写入 Redis', async () => {
  const code = await readCode(email)
  assert(code, 'Redis 中未找到验证码')
  assert(/^\d{6}$/.test(code), `验证码应为 6 位数字，实际: ${code}`)
  ok('验证码已存入 Redis', `code=${code}`)
})

await test('60 秒冷却内重复发送返回 429', async () => {
  const res = await api('POST', '/auth/send-verification-code', { body: { email } })
  assertStatus(res, 429, '重复发送')
  assert(typeof res.body.retryAfter === 'number', '应返回 retryAfter')
  ok('重发被限流', `${res.body.retryAfter}s 后可重发`)
})

await test('错误验证码返回 400', async () => {
  const res = await api('POST', '/auth/verify-code', { body: { email, code: '000000' } })
  assertStatus(res, 400, '错误验证码')
  ok('错误验证码被拒绝', res.body.message)
})

await test('正确验证码通过并返回 verificationToken', async () => {
  const code = await readCode(email)
  assert(code, '无法读取验证码')

  const res = await api('POST', '/auth/verify-code', { body: { email, code } })
  assertStatus(res, 200, '校验验证码')

  verificationToken = res.body.data.verificationToken
  assert(verificationToken, '未返回 verificationToken')
  ok('验证码校验通过', `token=${verificationToken.slice(0, 12)}…`)
})

await test('校验通过后验证码立即失效（不可重复使用）', async () => {
  const code = await readCode(email)
  assert(!code, '验证码应已被删除')
  ok('验证码已作废旧')
})

console.log(C.bold('\n[3] 用户注册'))

await test('无效 verificationToken 注册返回 401', async () => {
  const res = await api('POST', '/auth/register', {
    body: { username, email, password: 'abc123', verificationToken: 'bogus-token' }
  })
  assertStatus(res, 401, '无效 token 注册')
  ok('无效 token 被拒绝', res.body.message)
})

await test('弱密码返回 400', async () => {
  const res = await api('POST', '/auth/register', {
    body: { username, email, password: 'abcdef', verificationToken }
  })
  assertStatus(res, 400, '弱密码注册')
  ok('弱密码（缺数字）被拒绝')
})

await test('注册成功并返回令牌', async () => {
  const res = await api('POST', '/auth/register', {
    body: { username, email, password: 'abc123', verificationToken }
  })
  assertStatus(res, 201, '注册')

  accessToken = res.body.data.token
  refreshToken = res.body.data.refreshToken

  assert(accessToken, '未返回 access token')
  assert(refreshToken, '未返回 refresh token')
  assert(res.body.data.user.email_verified === true, 'email_verified 应为 true')
  assert(!res.body.data.user.password, '响应中绝不能包含 password')

  ok('注册成功', `user=${res.body.data.user.username}`)
})

await test('已注册邮箱再次发送验证码返回 409', async () => {
  const res = await api('POST', '/auth/send-verification-code', { body: { email } })
  assertStatus(res, 409, '重复注册')
  ok('重复邮箱被拒绝', res.body.message)
})

await test('重复用户名注册返回 409', async () => {
  // 为另一个邮箱完成验证
  await api('POST', '/auth/send-verification-code', { body: { email: otherEmail } })
  const code = await readCode(otherEmail)
  assert(code, '无法读取第二个邮箱的验证码')

  const v = await api('POST', '/auth/verify-code', { body: { email: otherEmail, code } })
  assertStatus(v, 200, '第二个邮箱校验')

  const res = await api('POST', '/auth/register', {
    body: {
      username,
      email: otherEmail,
      password: 'abc123',
      verificationToken: v.body.data.verificationToken
    }
  })
  assertStatus(res, 409, '重复用户名')
  ok('重复用户名被拒绝', res.body.message)
})

console.log(C.bold('\n[4] 认证与会话'))

await test('未提供令牌访问 profile 返回 401', async () => {
  const res = await api('GET', '/auth/profile')
  assertStatus(res, 401, '无令牌')
  ok('未认证访问被拒绝')
})

await test('伪造令牌访问 profile 返回 401', async () => {
  const res = await api('GET', '/auth/profile', { token: 'fake.jwt.token' })
  assertStatus(res, 401, '伪造令牌')
  ok('伪造令牌被拒绝')
})

await test('有效令牌可获取 profile', async () => {
  const res = await api('GET', '/auth/profile', { token: accessToken })
  assertStatus(res, 200, '获取 profile')
  assert(res.body.data.user.email === email, '邮箱应匹配')
  ok('获取 profile 成功', res.body.data.user.username)
})

await test('刷新令牌可用', async () => {
  const res = await api('POST', '/auth/refresh', { body: { refreshToken } })
  assertStatus(res, 200, '刷新令牌')
  assert(res.body.data.token, '应返回新 access token')
  accessToken = res.body.data.token
  ok('令牌刷新成功')
})

await test('无效刷新令牌返回 401', async () => {
  const res = await api('POST', '/auth/refresh', { body: { refreshToken: 'invalid' } })
  assertStatus(res, 401, '无效刷新令牌')
  ok('无效刷新令牌被拒绝')
})

await test('更新资料', async () => {
  const res = await api('PATCH', '/auth/profile', {
    token: accessToken,
    body: { bio: '集成测试用户' }
  })
  assertStatus(res, 200, '更新资料')
  assert(res.body.data.user.bio === '集成测试用户', 'bio 应已更新')
  ok('资料更新成功')
})

console.log(C.bold('\n[5] 资源接口'))

await test('资源列表返回分页数据', async () => {
  const res = await api('GET', '/resources?page=1&pageSize=5')
  assertStatus(res, 200, '资源列表')

  const { items, pagination } = res.body.data
  assert(Array.isArray(items), 'items 应为数组')
  assert(items.length === 5, `应返回 5 条，实际 ${items.length}`)
  assert(pagination.total >= 12, `总数应不少于 12（种子数据），实际 ${pagination.total}`)

  ok('资源列表', `共 ${pagination.total} 条，第 1 页 ${items.length} 条`)
})

await test('按分类筛选生效', async () => {
  const res = await api('GET', '/resources?category=%E5%91%A8%E6%98%93')
  assertStatus(res, 200, '分类筛选')

  const items = res.body.data.items
  assert(items.length > 0, '周易分类应有数据')
  assert(
    items.every((i) => i.category === '周易'),
    '返回项应全部属于周易分类'
  )
  ok('分类筛选', `${items.length} 条周易资源`)
})

await test('关键词搜索生效', async () => {
  const res = await api('GET', '/resources?keyword=%E9%87%91%E5%88%9A%E7%BB%8F')
  assertStatus(res, 200, '关键词搜索')

  const items = res.body.data.items
  assert(items.length > 0, '应搜索到金刚经相关资源')
  ok('关键词搜索', `${items.length} 条命中`)
})

await test('排序参数生效（最多浏览）', async () => {
  const res = await api('GET', '/resources?sort=hottest&pageSize=5')
  assertStatus(res, 200, '排序')

  const items = res.body.data.items
  const views = items.map((i) => i.views)
  const sorted = [...views].sort((a, b) => b - a)
  assert(JSON.stringify(views) === JSON.stringify(sorted), '浏览数应降序排列')
  ok('按浏览量排序', views.join(' > '))
})

await test('筛选元数据接口', async () => {
  const res = await api('GET', '/resources/meta/filters')
  assertStatus(res, 200, '筛选元数据')
  assert(Array.isArray(res.body.data.categories), 'categories 应为数组')
  assert(res.body.data.categories.length > 0, 'categories 不应为空')
  ok('筛选元数据', `${res.body.data.categories.length} 个分类`)
})

await test('资源详情可读', async () => {
  const list = await api('GET', '/resources?pageSize=1')
  const id = list.body.data.items[0].id

  const res = await api('GET', `/resources/${id}`)
  assertStatus(res, 200, '资源详情')
  assert(res.body.data.id === id, 'id 应匹配')
  ok('资源详情', res.body.data.title)
})

await test('不存在的资源返回 404', async () => {
  const res = await api('GET', '/resources/000000000000000000000000')
  assertStatus(res, 404, '不存在的资源')
  ok('不存在的资源返回 404')
})

await test('未登录发布资源返回 401', async () => {
  const res = await api('POST', '/resources', {
    body: { title: 'x', url: 'https://example.com', category: '其他', netdiskType: 'other' }
  })
  assertStatus(res, 401, '未登录发布')
  ok('未登录发布被拒绝')
})

await test('登录后发布资源返回 201', async () => {
  const res = await api('POST', '/resources', {
    token: accessToken,
    body: {
      title: '集成测试发布资源',
      description: '由自动化测试创建',
      url: 'https://pan.baidu.com/s/integration-test',
      extractCode: 'it01',
      category: '其他',
      netdiskType: 'baidu',
      tags: ['测试']
    }
  })
  assertStatus(res, 201, '发布资源')

  createdResourceId = res.body.data.id
  assert(createdResourceId, '应返回资源 id')
  ok('发布资源成功', createdResourceId)
})

await test('发布后可在列表中检索到', async () => {
  const res = await api('GET', '/resources?keyword=%E9%9B%86%E6%88%90%E6%B5%8B%E8%AF%95')
  assertStatus(res, 200, '检索新资源')
  assert(res.body.data.items.length > 0, '应能检索到刚发布的资源')
  ok('新资源可检索')
})

await test('非法分类发布返回 400', async () => {
  const res = await api('POST', '/resources', {
    token: accessToken,
    body: {
      title: 'bad',
      url: 'https://example.com',
      category: '不存在的分类',
      netdiskType: 'other'
    }
  })
  assertStatus(res, 400, '非法分类')
  ok('非法分类被拒绝')
})

console.log(C.bold('\n[6] 登录与登出'))

await test('错误密码登录返回 401', async () => {
  const res = await api('POST', '/auth/login', { body: { email, password: 'wrongpass' } })
  assertStatus(res, 401, '错误密码')
  ok('错误密码被拒绝')
})

await test('正确密码登录返回 200', async () => {
  const res = await api('POST', '/auth/login', { body: { email, password: 'abc123' } })
  assertStatus(res, 200, '登录')
  assert(res.body.data.token, '应返回 token')
  accessToken = res.body.data.token
  refreshToken = res.body.data.refreshToken
  ok('登录成功')
})

await test('不存在的账号登录返回 401', async () => {
  const res = await api('POST', '/auth/login', {
    body: { email: `nobody_${stamp}@example.com`, password: 'abc123' }
  })
  assertStatus(res, 401, '不存在账号')
  ok('不存在账号被拒绝')
})

await test('登出成功', async () => {
  const res = await api('POST', '/auth/logout', { token: accessToken })
  assertStatus(res, 200, '登出')
  ok('登出成功')
})

await test('登出后令牌进入黑名单，立即失效', async () => {
  const res = await api('GET', '/auth/profile', { token: accessToken })
  assertStatus(res, 401, '登出后访问')
  ok('登出后令牌已失效', res.body.message)
})

// ---------- 清理测试产生的数据 ----------
try {
  const mongoose = serverRequire('mongoose')
  const User = (await import(pathToFileURL(path.join(SERVER_DIR, 'src/models/User.js')).href)).default
  const Resource = (
    await import(pathToFileURL(path.join(SERVER_DIR, 'src/models/Resource.js')).href)
  ).default

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/netdisk_resources')

  const r1 = await Resource.deleteMany({ title: '集成测试发布资源' })
  const r2 = await User.deleteMany({ email: { $in: [email, otherEmail] } })

  await mongoose.disconnect()

  console.log(C.dim(`\n  已清理测试数据：资源 ${r1.deletedCount} 条，用户 ${r2.deletedCount} 个`))
} catch (e) {
  console.log(C.yellow(`\n  数据清理跳过：${e.message}`))
}

// ---------- 汇总 ----------
if (redis) {
  await redis.quit().catch(() => {})
}

console.log('\n' + C.bold('════════════════════════════════════════════'))
console.log(C.bold('  测试结果'))
console.log(C.bold('════════════════════════════════════════════'))
console.log(`  通过: ${C.green(String(passed))}`)
console.log(`  失败: ${failed ? C.red(String(failed)) : '0'}`)

if (failed) {
  console.log(C.red('\n  失败详情:'))
  for (const f of failures) {
    console.log(`   • ${f.name}\n     ${f.detail}`)
  }
  console.log()
  process.exit(1)
} else {
  console.log(C.green(`\n  ✅ 全部 ${passed} 项测试通过\n`))
  process.exit(0)
}
