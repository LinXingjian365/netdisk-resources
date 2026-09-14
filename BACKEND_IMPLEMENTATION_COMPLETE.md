# 邮箱验证功能 - 完整后端实现指南

## 📋 概述

这是一个完整的邮箱验证实现方案，使用 QQ 邮箱的 SMTP 服务发送验证码，通过 Redis 存储验证码实现速率限制和过期管理。

## 🎯 功能流程

### 注册流程

```
1. 用户输入邮箱
   ↓
2. 前端发送 POST /auth/send-verification-code
   ↓
3. 后端验证邮箱格式和重复
   ↓
4. 后端生成 6 位验证码
   ↓
5. 验证码存储到 Redis（10分钟过期）
   ↓
6. 通过 SMTP 发送验证码邮件
   ↓
7. 用户输入验证码
   ↓
8. 前端发送 POST /auth/verify-code
   ↓
9. 后端验证码校验（与 Redis 对比）
   ↓
10. 验证成功生成临时验证 token
   ↓
11. 用户填写完整注册信息
   ↓
12. 前端发送 POST /auth/register（包含验证 token）
   ↓
13. 后端再次验证 token 有效性
   ↓
14. 检查用户名/邮箱是否重复
   ↓
15. 密码加密并创建用户
   ↓
16. 返回 JWT 令牌
```

## 🔧 技术栈

- **框架**：Express.js 4.18.2
- **数据库**：MongoDB 7.0
- **缓存**：Redis 4.6.10
- **邮件服务**：Nodemailer 6.9.5
- **密码加密**：bcryptjs 2.4.3
- **身份认证**：JWT (jsonwebtoken 9.1.0)
- **输入验证**：express-validator 7.0.0

## 📦 安装步骤

### 1. 初始化项目

```bash
# 创建项目目录
mkdir netdisk-backend
cd netdisk-backend

# 初始化 npm
npm init -y

# 安装依赖
npm install express mongoose bcryptjs jsonwebtoken nodemailer dotenv cors helmet express-validator redis axios

# 安装开发依赖
npm install --save-dev nodemon eslint
```

### 2. 创建项目结构

```bash
mkdir -p src/{config,models,routes,controllers,middleware,services,utils}
mkdir -p src/config/email
mkdir -p logs
```

### 3. 复制配置文件

从本项目根目录复制以下文件到 `netdisk-backend/src`：

- `backend-email-service.js` → `src/config/email.js`
- `backend-email-verification-controller.js` → `src/controllers/emailVerificationController.js`
- `backend-auth-controller.js` → `src/controllers/authController.js`
- `backend-auth-routes.js` → `src/routes/auth.js`
- `backend-user-model.js` → `src/models/User.js`
- `backend-middleware.js` → `src/middleware/auth.js`

### 4. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
# 数据库
DATABASE_URL=mongodb://localhost:27017/netdisk

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# QQ 邮箱配置（已获取）
QQ_EMAIL=your_email@qq.com
QQ_EMAIL_AUTH_CODE=your_qq_email_auth_code

# 前端 URL
FRONTEND_URL=http://localhost:5173
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🚀 API 端点

### 1. 发送验证码

**请求**
```
POST /api/auth/send-verification-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**成功响应 (200)**
```json
{
  "success": true,
  "message": "验证码已发送，请查看邮箱",
  "expiresIn": 600
}
```

**错误响应 (429 - 速率限制)**
```json
{
  "success": false,
  "message": "请30秒后再尝试",
  "retryAfter": 30
}
```

**错误响应 (409 - 邮箱已注册)**
```json
{
  "success": false,
  "message": "该邮箱已被注册"
}
```

### 2. 验证验证码

**请求**
```
POST /api/auth/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

**成功响应 (200)**
```json
{
  "success": true,
  "message": "邮箱验证成功",
  "data": {
    "email": "user@example.com",
    "verificationToken": "abc123def456...",
    "expiresIn": 1800
  }
}
```

**错误响应 (401 - 验证码过期)**
```json
{
  "success": false,
  "message": "验证码已过期或不存在，请重新获取"
}
```

### 3. 用户注册

**请求**
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "username",
  "email": "user@example.com",
  "password": "password123",
  "verificationToken": "abc123def456...",
  "inviteCode": "optional_code"
}
```

**成功响应 (201)**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "username",
      "email": "user@example.com",
      "email_verified": true,
      "role": "user",
      "isVip": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

### 4. 用户登录

**请求**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**成功响应 (200)**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": { ... },
    "token": "...",
    "refreshToken": "...",
    "expiresIn": 86400
  }
}
```

## 🔐 QQ 邮箱 SMTP 配置详解

### 获取授权码步骤

1. **登录 QQ 邮箱**
   - 地址：https://mail.qq.com

2. **进入邮箱设置**
   - 点击右上角"设置" → "账户"

3. **开启 IMAP/SMTP 服务**
   - 找到 "POP3/IMAP/SMTP/Exchange/CardDAV 服务"
   - 点击"开启"

4. **获取授权码**
   - 系统会提示生成授权码
   - 复制并保存授权码：`your_qq_email_auth_code`

### SMTP 配置参数

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,           // SSL 端口
  secure: true,        // 使用 SSL 加密
  auth: {
    user: 'your_email@qq.com',          // QQ 邮箱
    pass: 'your_qq_email_auth_code'            // 授权码（不是 QQ 密码）
  }
})
```

## 📧 邮件模板

邮件包含以下内容：

- **标题**：【培鑫盈资源网】邮箱验证码
- **验证码**：6 位数字，字体大号醒目
- **有效期**：10 分钟
- **安全提示**：警告用户不要泄露验证码
- **专业设计**：蓝色主题，响应式设计

## 🛡️ 安全机制

### 1. 速率限制

- **发送验证码**：60 秒内最多发送一次
- **验证码过期**：10 分钟后自动失效
- **密码要求**：最少 6 位，必须包含字母和数字
- **验证 Token**：30 分钟有效期，一次性使用

### 2. 密码加密

使用 bcryptjs，轮数为 10：

```javascript
const hashedPassword = await bcryptjs.hash(password, 10)
const isValid = await bcryptjs.compare(password, hashedPassword)
```

### 3. JWT 令牌

```javascript
// Access Token：24 小时有效期
const accessToken = jwt.sign(
  { id, email, username },
  JWT_SECRET,
  { expiresIn: '24h' }
)

// Refresh Token：7 天有效期
const refreshToken = jwt.sign(
  { id, email, username },
  JWT_SECRET,
  { expiresIn: '7d' }
)
```

### 4. Redis 黑名单

登出时将 Token 加入黑名单，防止重复使用

## 💾 数据库设计

### User 集合

```javascript
{
  _id: ObjectId,
  username: String,           // 唯一，3-20字符
  email: String,              // 唯一，小写
  password: String,           // 加密后的密码
  email_verified: Boolean,    // 邮箱是否已验证
  email_verified_at: Date,    // 验证时间
  avatar: String,             // 头像 URL
  bio: String,                // 个人简介
  role: String,               // 'user' | 'admin' | 'moderator'
  isVip: Boolean,             // VIP 状态
  vipExpiresAt: Date,         // VIP 过期时间
  inviteCode: String,         // 邀请码
  invitedBy: ObjectId,        // 邀请者 ID
  isActive: Boolean,          // 账户状态
  isBanned: Boolean,          // 是否被封禁
  banReason: String,          // 封禁原因
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  stats: {
    totalFavorites: Number,
    totalUploads: Number,
    totalDownloads: Number
  }
}
```

## 🧪 测试

### 使用 Postman 测试流程

1. **发送验证码**
   ```
   POST http://localhost:3000/api/auth/send-verification-code
   {
     "email": "test@qq.com"
   }
   ```
   预期：返回成功响应，查看 QQ 邮箱收取验证码

2. **验证验证码**
   ```
   POST http://localhost:3000/api/auth/verify-code
   {
     "email": "test@qq.com",
     "code": "123456"
   }
   ```
   预期：返回 `verificationToken`

3. **注册用户**
   ```
   POST http://localhost:3000/api/auth/register
   {
     "username": "testuser",
     "email": "test@qq.com",
     "password": "password123",
     "verificationToken": "abc123..."
   }
   ```
   预期：创建用户，返回 JWT 令牌

4. **登录**
   ```
   POST http://localhost:3000/api/auth/login
   {
     "email": "test@qq.com",
     "password": "password123"
   }
   ```
   预期：返回令牌

## 🐛 常见问题

### Q: 邮件无法发送
**A**: 
- 检查 QQ 邮箱是否开启 SMTP 服务
- 确认授权码正确（不是 QQ 密码）
- 检查防火墙是否阻止 465/587 端口
- 查看日志中的错误信息

### Q: Redis 连接失败
**A**:
- 确保 Redis 服务已启动
- 检查 Redis 主机和端口配置
- 检查 Redis 密码是否正确

### Q: 验证码总是过期
**A**:
- 检查服务器时间是否正确
- Redis 有效期设置是否过短
- 检查 Redis 是否正常工作

### Q: 注册总是失败
**A**:
- 确认验证 Token 未过期（30分钟）
- 检查邮箱是否重复注册
- 检查用户名是否重复
- 查看完整错误信息

## 📚 相关文件

- `backend-email-service.js` - 邮件服务配置
- `backend-email-verification-controller.js` - 验证码控制器
- `backend-auth-controller.js` - 身份认证控制器
- `backend-auth-routes.js` - 路由定义
- `backend-user-model.js` - 用户模型
- `backend-middleware.js` - 中间件
- `.env.example` - 环境变量示例

## 🎓 下一步

1. **前端集成**
   - 更新 `src/api/auth.js` 调用实际后端 API
   - 配置 axios 基础 URL：`VITE_API_BASE=http://localhost:3000/api`

2. **测试邮箱验证流程**
   - 完整注册测试
   - 邮件接收测试
   - 各种错误场景测试

3. **部署上线**
   - 配置生产环境变量
   - 设置 HTTPS
   - 配置自定义域名
   - 监控和日志系统

4. **功能扩展**
   - 添加忘记密码功能
   - 实现邮箱更改验证
   - 添加两步验证（2FA）
   - 实现社交登录（GitHub、Google 等）

## 📞 支持

如有问题，请参考：
- Express 官方文档：https://expressjs.com
- MongoDB 官方文档：https://docs.mongodb.com
- Nodemailer 文档：https://nodemailer.com
- JWT 介绍：https://jwt.io
