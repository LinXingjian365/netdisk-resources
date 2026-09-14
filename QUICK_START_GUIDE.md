# 邮箱验证功能 - 快速参考指南

## 📌 核心文件位置

### 前端（Vue 3）
```
src/components/auth/RegisterForm.vue    ✅ 已完成
  - 邮箱输入验证
  - 60秒倒计时
  - 验证码输入
  - 10分钟有效期跟踪
  - 进度条显示
  - 错误处理

src/api/auth.js                         ⚠️ 需更新
  - sendVerificationCode(email)
  - verifyCode(email, code)
  - register(payload)
  - login(payload)

src/api/client.js                       ✅ 已有
  - Axios 配置
  - 请求拦截器
  - 响应拦截器
```

### 后端（Node.js + Express）
```
已提供示例代码，需复制到 netdisk-backend/src/

src/config/email.js                     ← backend-email-service.js
src/models/User.js                      ← backend-user-model.js
src/controllers/authController.js       ← backend-auth-controller.js
src/controllers/emailVerificationController.js ← backend-email-verification-controller.js
src/routes/auth.js                      ← backend-auth-routes.js
src/middleware/auth.js                  ← backend-middleware.js
.env                                    ← .env.example
```

## 🔧 快速部署（3分钟）

### Windows PowerShell
```powershell
# 1. 创建后端项目
mkdir netdisk-backend
cd netdisk-backend

# 2. 初始化和安装
npm init -y
npm install express mongoose bcryptjs jsonwebtoken nodemailer dotenv cors helmet express-validator redis

# 3. 创建目录
mkdir -p src/{config,models,routes,controllers,middleware}

# 4. 复制文件（从 netdisk-resources）
Copy-Item "..\backend-email-service.js" "src/config/email.js"
Copy-Item "..\backend-user-model.js" "src/models/User.js"
Copy-Item "..\backend-auth-controller.js" "src/controllers/authController.js"
Copy-Item "..\backend-email-verification-controller.js" "src/controllers/emailVerificationController.js"
Copy-Item "..\backend-auth-routes.js" "src/routes/auth.js"
Copy-Item "..\backend-middleware.js" "src/middleware/auth.js"
Copy-Item "..\\.env.example" ".env"

# 5. 编辑 .env（填入你的配置）
notepad .env

# 6. 创建 src/server.js（参考 BACKEND_IMPLEMENTATION_COMPLETE.md）

# 7. 启动
npm run dev
```

### Linux/Mac
```bash
mkdir netdisk-backend && cd netdisk-backend
npm init -y
npm install express mongoose bcryptjs jsonwebtoken nodemailer dotenv cors helmet express-validator redis
mkdir -p src/{config,models,routes,controllers,middleware}
cp ../backend-*.js src/
cp ../.env.example .env
nano .env  # 编辑配置
npm run dev
```

## 🔌 API 端点速查表

### 发送验证码
```
POST /api/auth/send-verification-code

请求体：
{ "email": "user@example.com" }

成功响应 (200)：
{ "success": true, "message": "验证码已发送", "expiresIn": 600 }

错误响应 (429)：
{ "success": false, "message": "请30秒后再尝试", "retryAfter": 30 }

错误响应 (409)：
{ "success": false, "message": "该邮箱已被注册" }
```

### 验证验证码
```
POST /api/auth/verify-code

请求体：
{ "email": "user@example.com", "code": "123456" }

成功响应 (200)：
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "verificationToken": "token...",
    "expiresIn": 1800
  }
}

错误响应 (401)：
{ "success": false, "message": "验证码已过期或不存在" }

错误响应 (400)：
{ "success": false, "message": "验证码不正确" }
```

### 用户注册
```
POST /api/auth/register

请求体：
{
  "username": "user",
  "email": "user@example.com",
  "password": "password123",
  "verificationToken": "token...",
  "inviteCode": "optional"
}

成功响应 (201)：
{
  "success": true,
  "data": {
    "user": { id, username, email, role, ... },
    "token": "jwt_token...",
    "refreshToken": "refresh_token...",
    "expiresIn": 86400
  }
}

错误响应：
- 400: 请求参数不正确
- 401: 验证 token 无效或过期
- 409: 用户名/邮箱已被使用
```

### 用户登录
```
POST /api/auth/login

请求体：
{ "email": "user@example.com", "password": "password123" }

成功响应 (200)：
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token...",
    "refreshToken": "refresh_token...",
    "expiresIn": 86400
  }
}

错误响应 (401)：
{ "success": false, "message": "邮箱或密码不正确" }
```

### 获取用户资料
```
GET /api/auth/profile
Authorization: Bearer <token>

成功响应 (200)：
{
  "success": true,
  "data": {
    "user": { id, username, email, role, ... }
  }
}

错误响应 (401)：
{ "success": false, "message": "未提供身份验证令牌" }
```

## ⚙️ 环境变量配置

### 最小配置（本地开发）
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/netdisk
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-min-32-chars
QQ_EMAIL=your_email@qq.com
QQ_EMAIL_AUTH_CODE=your_qq_email_auth_code
FRONTEND_URL=http://localhost:5173
```

### 生产配置
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/netdisk
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
JWT_SECRET=generate-a-very-long-random-string-here
QQ_EMAIL=your-qq-email@qq.com
QQ_EMAIL_AUTH_CODE=your-auth-code
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

## 📊 前端状态管理示例

```javascript
// stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const isAuthenticated = computed(() => !!token.value)

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUser(userData) {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { user, token, isAuthenticated, setToken, setUser, logout }
})
```

## 🧪 测试命令

### 使用 curl 测试
```bash
# 发送验证码
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qq.com"}'

# 验证验证码
curl -X POST http://localhost:3000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qq.com","code":"123456"}'

# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@qq.com",
    "password":"password123",
    "verificationToken":"token_from_previous_step"
  }'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qq.com","password":"password123"}'

# 获取资料
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <your_token_here>"
```

## 🛠️ 常见问题快速解决

| 问题 | 解决方案 |
|------|--------|
| 邮件无法发送 | 检查 QQ 邮箱授权码是否正确 |
| MongoDB 连接失败 | 确保 MongoDB 已启动：`mongod` |
| Redis 连接失败 | 确保 Redis 已启动：`redis-server` |
| 跨域错误 | 后端 CORS 配置中添加前端 URL |
| Token 验证失败 | 检查 JWT_SECRET 是否一致 |
| 验证码总是过期 | 检查系统时间和 Redis TTL |
| 邮件格式验证失败 | 确保邮箱格式正确：user@domain.com |

## 📚 完整文档列表

| 文档 | 内容 |
|------|------|
| `PROJECT_COMPLETION_SUMMARY.md` | 项目完成情况总结 |
| `BACKEND_IMPLEMENTATION_COMPLETE.md` | 后端完整实现指南 |
| `FRONTEND_INTEGRATION_GUIDE.md` | 前端集成指南 |
| `DEPLOYMENT_COMPLETE_GUIDE.md` | 部署和运维指南 |
| `EMAIL_VERIFICATION_IMPLEMENTATION.md` | 前端邮箱验证实现 |
| `TEST_REPORT.md` | 测试报告 |

## 🔐 安全检查清单

- [ ] JWT_SECRET 使用强密码（最少32字符）
- [ ] QQ 邮箱授权码保存在 .env（不提交版本控制）
- [ ] 生产环境使用 HTTPS
- [ ] 已设置 CORS 白名单
- [ ] 已启用请求速率限制
- [ ] 验证码有效期设为 10 分钟
- [ ] 密码加密轮数 >= 10
- [ ] Token 有效期合理（Access: 24h, Refresh: 7d）
- [ ] 敏感信息不在日志中输出
- [ ] 已配置备份和恢复方案

## 🚀 快速启动步骤

```bash
# 1. 启动数据库
mongod          # MongoDB
redis-server    # Redis

# 2. 启动后端
cd netdisk-backend
npm run dev     # localhost:3000

# 3. 启动前端
cd netdisk-resources
npm run dev     # localhost:5173

# 4. 测试
# 打开浏览器访问 http://localhost:5173
# 点击注册，完整测试邮箱验证流程
```

## 💡 代码示例速查

### 前端：调用发送验证码
```javascript
import { sendVerificationCode } from '@/api/auth'

async function handleSendCode() {
  try {
    const response = await sendVerificationCode('user@example.com')
    if (response.data?.success) {
      console.log('验证码已发送')
    }
  } catch (error) {
    console.error('发送失败:', error.response?.data?.message)
  }
}
```

### 前端：调用注册
```javascript
import { register } from '@/api/auth'

async function handleRegister() {
  try {
    const response = await register({
      username: 'user',
      email: 'user@example.com',
      password: 'password123',
      verificationToken: 'token_from_verify_step'
    })
    if (response.data?.success) {
      localStorage.setItem('token', response.data.data.token)
      // 跳转到首页
    }
  } catch (error) {
    console.error('注册失败:', error.response?.data?.message)
  }
}
```

### 后端：验证 JWT Token
```javascript
import { authenticate } from '@/middleware/auth.js'

// 在路由中使用
router.get('/protected', authenticate, (req, res) => {
  // req.user 包含已验证的用户信息
  res.json({ userId: req.user.id })
})
```

---

**最后更新**：2024年12月11日
**项目状态**：✅ 完成就绪
**后续步骤**：参考 BACKEND_IMPLEMENTATION_COMPLETE.md 开始部署

祝你的项目顺利上线！🎉
