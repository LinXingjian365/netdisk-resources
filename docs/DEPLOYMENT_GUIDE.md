# 🚀 邮箱验证 + 后端数据库部署指南

## 📋 目录

1. [前端邮箱验证集成](#前端邮箱验证集成)
2. [后端部署](#后端部署)
3. [数据库配置](#数据库配置)
4. [邮件服务配置](#邮件服务配置)
5. [Docker部署](#docker部署)
6. [测试指南](#测试指南)

---

## 🎯 前端邮箱验证集成

### 已完成的前端改动

✅ **RegisterForm.vue** - 集成邮箱验证码流程
- 步骤1: 输入邮箱并发送验证码
- 步骤2: 输入6位验证码验证
- 步骤3: 填写注册信息完成注册

✅ **api/auth.js** - 添加验证码接口
- `sendVerificationCode(email)` - 发送验证码
- `verifyCode(email, code)` - 验证验证码
- `resendVerificationCode(email)` - 重新发送

✅ **components/auth/EmailVerificationCode.vue** - 独立验证码组件（可选）
- 完整的邮箱验证流程
- 倒计时和有效期管理
- 错误处理和重试

### 前端启动

```bash
# 安装依赖
npm install

# 开发模式（连接后端）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

### 前端环境配置 (.env.local)

```env
# API服务器地址
VITE_API_BASE=http://localhost:3000/api

# 开发模式
VITE_ENV=development
```

---

## 🔧 后端部署

### 1. 创建后端项目结构

```bash
mkdir netdisk-api && cd netdisk-api

# 创建文件夹结构
mkdir -p src/{models,routes,middleware,services,utils}
mkdir -p tests
```

### 2. 初始化Node.js项目

```bash
npm init -y
npm install express mongoose bcryptjs jsonwebtoken nodemailer dotenv cors helmet express-validator redis
npm install --save-dev nodemon jest supertest
```

### 3. 创建.env文件

```env
# 环境
NODE_ENV=development
PORT=3000

# 数据库 (MongoDB)
DATABASE_URL=mongodb://localhost:27017/netdisk_db

# 或 PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost:5432/netdisk_db

# Redis (可选，用于缓存验证码)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@netdisk-resources.com

# CORS
FRONTEND_URL=http://localhost:5173

# 日志
LOG_LEVEL=debug
```

### 4. 创建server.js

```javascript
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// 中间件
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}))
app.use(express.json())

// 数据库连接
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('✓ 数据库已连接'))
  .catch(err => console.error('✗ 数据库连接失败:', err))

// 路由
app.use('/api/auth', require('./routes/auth.js'))
app.use('/api/resources', require('./routes/resources.js'))

// 启动服务器
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
})
```

### 5. 启动后端

```bash
# 开发模式 (自动重启)
npm run dev

# 生产模式
npm start
```

---

## 💾 数据库配置

### 选项 A: MongoDB (推荐用于快速开发)

#### 本地部署

```bash
# MacOS
brew install mongodb-community
brew services start mongodb-community

# Windows (使用 Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Linux
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### MongoDB Atlas (云服务)

1. 访问 [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. 创建免费集群
3. 获取连接字符串：`mongodb+srv://user:password@cluster.mongodb.net/netdisk_db`
4. 更新 `.env` 文件中的 `DATABASE_URL`

### 选项 B: PostgreSQL (推荐用于生产)

#### 本地部署

```bash
# MacOS
brew install postgresql
brew services start postgresql

# Windows (使用 Docker)
docker run -d \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=netdisk_db \
  --name postgres \
  postgres:15-alpine

# 创建数据库和用户
psql -U postgres -c "CREATE DATABASE netdisk_db"
psql -U postgres -c "CREATE USER netdisk WITH PASSWORD 'password'"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE netdisk_db TO netdisk"
```

#### 环境变量

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/netdisk_db
```

### 数据库初始化脚本

```javascript
// scripts/initDb.js
import User from '../src/models/User.js'
import Resource from '../src/models/Resource.js'

async function initDatabase() {
  try {
    console.log('初始化数据库...')
    
    // 创建索引
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ username: 1 }, { unique: true })
    await Resource.collection.createIndex({ user_id: 1 })
    await Resource.collection.createIndex({ category: 1 })
    
    console.log('✓ 数据库初始化完成')
  } catch (error) {
    console.error('✗ 初始化失败:', error)
  }
}

initDatabase()
```

运行:
```bash
node scripts/initDb.js
```

---

## 📧 邮件服务配置

### 选项 A: Gmail SMTP (推荐用于测试)

1. 启用 2-Step Verification: https://myaccount.google.com/security
2. 生成应用密码: https://myaccount.google.com/apppasswords
3. 配置 `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
```

### 选项 B: SendGrid (推荐用于生产)

1. 注册账户: https://sendgrid.com/
2. 获取 API Key
3. 更新 emailService.js:

```javascript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export async function sendVerificationEmail(email, code) {
  await sgMail.send({
    to: email,
    from: process.env.SMTP_FROM,
    subject: '邮箱验证码 - 网络资源共享平台',
    html: `<h1>${code}</h1><p>有效期10分钟</p>`
  })
}
```

### 选项 C: AWS SES

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 测试邮件发送

```bash
# 创建测试脚本
cat > test-email.js << 'EOF'
import { sendVerificationEmail } from './src/services/emailService.js'

sendVerificationEmail('your-email@example.com', '123456')
  .then(() => console.log('✓ 邮件已发送'))
  .catch(err => console.error('✗ 发送失败:', err))
EOF

node test-email.js
```

---

## 🐳 Docker部署

### Docker Compose (完整堆栈)

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # MongoDB 数据库
  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 后端 API
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: mongodb://root:password@mongo:27017/netdisk_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      FRONTEND_URL: http://frontend:80
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules

  # 前端应用
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      VITE_API_BASE: http://localhost:3000/api
    depends_on:
      - api

volumes:
  mongo_data:
```

启动所有服务:

```bash
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down
```

### 单独运行后端容器

```bash
# 构建镜像
docker build -t netdisk-api .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=mongodb://mongo:27017/netdisk_db \
  -e SMTP_HOST=smtp.gmail.com \
  --name netdisk-api \
  netdisk-api
```

---

## 🧪 测试指南

### 1. 测试邮箱验证流程

```bash
# 发送验证码
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 验证码验证
curl -X POST http://localhost:3000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# 用户注册（需要先验证邮箱）
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@example.com",
    "password":"SecurePass123",
    "code":"123456"
  }'
```

### 2. 测试用户登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"SecurePass123"}'
```

### 3. 运行单元测试

```bash
npm test
```

### 4. Postman 测试集合

导入此集合到 Postman:

```json
{
  "info": {
    "name": "网络资源平台API",
    "description": "邮箱验证和资源管理API测试"
  },
  "item": [
    {
      "name": "发送验证码",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/send-verification-code",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\"}"
        }
      }
    },
    {
      "name": "用户注册",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/register",
        "body": {
          "mode": "raw",
          "raw": "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"SecurePass123\",\"code\":\"123456\"}"
        }
      }
    }
  ]
}
```

---

## 📊 验证流程图

```
┌─────────────────────────────────────┐
│ 1. 用户输入邮箱                      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. 后端生成6位验证码                │
│    保存到数据库(10分钟TTL)         │
│    发送到用户邮箱                  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 3. 用户输入验证码                    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 4. 后端验证码是否正确              │
│    检查是否过期                    │
│    标记邮箱为已验证                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 5. 用户继续填写注册信息              │
│    用户名、密码等                  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 6. 后端创建用户账户                  │
│    加密密码                        │
│    返回JWT Token                   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ ✓ 注册成功，用户可以登录            │
└─────────────────────────────────────┘
```

---

## 🔒 安全最佳实践

### 后端安全

```javascript
// 1. 速率限制 - 防止暴力破解
import rateLimit from 'express-rate-limit'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5 // 限制5次尝试
})

app.post('/auth/login', loginLimiter, handleLogin)

// 2. 验证码限制
const codeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 3 // 最多3次请求
})

app.post('/auth/send-verification-code', codeLimiter, sendCode)

// 3. 密码哈希
import bcryptjs from 'bcryptjs'
const hashedPassword = await bcryptjs.hash(password, 10)

// 4. 环境变量保护
// .env 文件不要提交到git
echo '.env' >> .gitignore

// 5. HTTPS 生产环境必须用HTTPS
// 6. CORS 配置白名单
```

### 前端安全

```javascript
// 1. 不要在localStorage存储敏感信息
localStorage.setItem('token', token) // ✓ 可以

// 2. 实现CSRF保护
// 3. 输入验证和清理
// 4. 使用HTTPS
```

---

## 📈 性能优化

### 数据库优化

```javascript
// 1. 创建索引
db.users.createIndex({ email: 1 }, { unique: true })
db.resources.createIndex({ user_id: 1 })
db.resources.createIndex({ created_at: -1 })

// 2. 查询优化
// 使用 lean() 获取纯JavaScript对象
User.find().lean()

// 3. 连接池
mongoose.set('maxPoolSize', 10)
```

### 缓存策略

```javascript
// Redis 缓存验证码
import redis from 'redis'

const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379
})

// 存储验证码
await redisClient.setex(
  `verify:${email}`,
  600, // 10分钟过期
  code
)

// 检查验证码
const storedCode = await redisClient.get(`verify:${email}`)
```

---

## 🚀 部署到云服务

### Heroku 部署

```bash
# 1. 登录 Heroku
heroku login

# 2. 创建应用
heroku create netdisk-api

# 3. 配置环境变量
heroku config:set JWT_SECRET=your-secret
heroku config:set DATABASE_URL=mongodb+srv://...

# 4. 部署
git push heroku main

# 5. 查看日志
heroku logs --tail
```

### AWS 部署

1. 使用 Elastic Beanstalk
2. 配置 RDS for MongoDB/PostgreSQL
3. 使用 SES 发送邮件

### DigitalOcean App Platform 部署

1. 连接 GitHub 仓库
2. 配置环境变量
3. 自动部署

---

## ✅ 检查清单

部署前请确保:

- [ ] 环境变量已配置 (.env)
- [ ] 数据库已连接
- [ ] 邮件服务已配置
- [ ] JWT_SECRET 已更改
- [ ] CORS 白名单已配置
- [ ] 数据库索引已创建
- [ ] 日志系统已设置
- [ ] 备份策略已制定
- [ ] 监控告警已配置
- [ ] 安全审计已完成

---

## 📞 故障排除

### 常见问题

**Q: 验证码无法发送**
```bash
# 检查SMTP配置
# 确保应用密码正确
# 检查邮箱账户安全设置
```

**Q: 数据库连接失败**
```bash
# 确保 MongoDB/PostgreSQL 已启动
# 检查连接字符串
# 检查防火墙设置
```

**Q: CORS 错误**
```javascript
// 检查 FRONTEND_URL 环境变量
// 确保前端地址在白名单中
```

---

祝你部署顺利！🎉
