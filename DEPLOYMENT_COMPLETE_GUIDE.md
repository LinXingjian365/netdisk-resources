# 邮箱验证功能 - 完整部署指南

## 📋 项目结构

```
netdisk-resources/
├── src/                          # 前端源代码
│   ├── components/auth/          # 认证组件
│   │   └── RegisterForm.vue       # 注册表单（已完成）
│   ├── api/                       # API 客户端
│   │   ├── auth.js                # 认证 API（需更新）
│   │   └── client.js              # Axios 客户端配置
│   └── ...
│
├── docs/                          # 文档
│   ├── BACKEND_DESIGN.md          # 后端架构设计
│   ├── BACKEND_IMPLEMENTATION.md  # 后端实现示例
│   └── ...
│
├── backend-*.js                   # 后端代码示例（待复制）
├── .env.example                   # 环境变量示例
├── BACKEND_IMPLEMENTATION_COMPLETE.md  # 完整后端指南
└── FRONTEND_INTEGRATION_GUIDE.md       # 前端集成指南

netdisk-backend/                  # 后端项目（需要创建）
├── src/
│   ├── config/
│   │   └── email.js               # 邮件服务配置
│   ├── models/
│   │   └── User.js                # 用户模型
│   ├── controllers/
│   │   ├── authController.js      # 认证控制器
│   │   └── emailVerificationController.js  # 验证码控制器
│   ├── routes/
│   │   └── auth.js                # 认证路由
│   ├── middleware/
│   │   └── auth.js                # 认证中间件
│   └── server.js                  # 主服务器文件
├── .env                           # 环境变量（从 .env.example 复制）
└── package.json
```

## 🚀 一键部署脚本

### Windows (PowerShell)

创建文件 `setup.ps1`：

```powershell
# ========================================
# 网络资源共享平台 - 一键部署脚本
# ========================================

Write-Host "🚀 开始部署后端服务..." -ForegroundColor Green

# 1. 创建后端项目目录
Write-Host "📁 创建项目目录..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "netdisk-backend" -Force | Out-Null
Set-Location netdisk-backend

# 2. 初始化 npm
Write-Host "📦 初始化 NPM 项目..." -ForegroundColor Cyan
npm init -y

# 3. 安装依赖
Write-Host "⬇️  安装依赖包..." -ForegroundColor Cyan
npm install `
  express@4.18.2 `
  mongoose@7.6.0 `
  bcryptjs@2.4.3 `
  jsonwebtoken@9.1.0 `
  nodemailer@6.9.5 `
  dotenv@16.3.1 `
  cors@2.8.5 `
  helmet@7.1.0 `
  express-validator@7.0.0 `
  redis@4.6.10 `
  axios@1.6.0

npm install --save-dev `
  nodemon@3.0.1 `
  eslint@8.53.0

# 4. 创建项目结构
Write-Host "📂 创建目录结构..." -ForegroundColor Cyan
@(
  "src",
  "src/config",
  "src/models",
  "src/routes",
  "src/controllers",
  "src/middleware",
  "src/services",
  "src/utils",
  "logs"
) | ForEach-Object {
  New-Item -ItemType Directory -Path $_ -Force | Out-Null
}

# 5. 复制配置文件
Write-Host "📋 复制配置文件..." -ForegroundColor Cyan
Copy-Item "..\backend-email-service.js" "src/config/email.js" -Force
Copy-Item "..\backend-email-verification-controller.js" "src/controllers/emailVerificationController.js" -Force
Copy-Item "..\backend-auth-controller.js" "src/controllers/authController.js" -Force
Copy-Item "..\backend-auth-routes.js" "src/routes/auth.js" -Force
Copy-Item "..\backend-user-model.js" "src/models/User.js" -Force
Copy-Item "..\backend-middleware.js" "src/middleware/auth.js" -Force
Copy-Item "..\\.env.example" ".env" -Force

Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📖 后续步骤：" -ForegroundColor Yellow
Write-Host "1. 编辑 .env 文件，填入你的配置"
Write-Host "2. 确保 MongoDB 和 Redis 服务已启动"
Write-Host "3. 运行 npm run dev 启动开发服务器"
Write-Host ""
```

### Linux/Mac

创建文件 `setup.sh`：

```bash
#!/bin/bash

# ========================================
# 网络资源共享平台 - 一键部署脚本
# ========================================

echo "🚀 开始部署后端服务..."

# 1. 创建后端项目目录
echo "📁 创建项目目录..."
mkdir -p netdisk-backend
cd netdisk-backend

# 2. 初始化 npm
echo "📦 初始化 NPM 项目..."
npm init -y

# 3. 安装依赖
echo "⬇️  安装依赖包..."
npm install \
  express@4.18.2 \
  mongoose@7.6.0 \
  bcryptjs@2.4.3 \
  jsonwebtoken@9.1.0 \
  nodemailer@6.9.5 \
  dotenv@16.3.1 \
  cors@2.8.5 \
  helmet@7.1.0 \
  express-validator@7.0.0 \
  redis@4.6.10 \
  axios@1.6.0

npm install --save-dev \
  nodemon@3.0.1 \
  eslint@8.53.0

# 4. 创建项目结构
echo "📂 创建目录结构..."
mkdir -p src/{config,models,routes,controllers,middleware,services,utils}
mkdir -p logs

# 5. 复制配置文件
echo "📋 复制配置文件..."
cp ../backend-email-service.js src/config/email.js
cp ../backend-email-verification-controller.js src/controllers/emailVerificationController.js
cp ../backend-auth-controller.js src/controllers/authController.js
cp ../backend-auth-routes.js src/routes/auth.js
cp ../backend-user-model.js src/models/User.js
cp ../backend-middleware.js src/middleware/auth.js
cp ../.env.example .env

echo "✅ 部署完成！"
echo ""
echo "📖 后续步骤："
echo "1. 编辑 .env 文件，填入你的配置"
echo "2. 确保 MongoDB 和 Redis 服务已启动"
echo "3. 运行 npm run dev 启动开发服务器"
```

## 🔧 手动部署步骤

### 前置要求

- Node.js >= 16.0
- npm >= 8.0
- MongoDB >= 5.0
- Redis >= 7.0
- Git（可选）

### 步骤 1: 初始化后端项目

```bash
mkdir netdisk-backend
cd netdisk-backend
npm init -y
```

### 步骤 2: 安装依赖

```bash
npm install express mongoose bcryptjs jsonwebtoken nodemailer dotenv cors helmet express-validator redis axios
npm install --save-dev nodemon eslint
```

### 步骤 3: 创建项目结构

```bash
mkdir -p src/{config,models,routes,controllers,middleware,services,utils}
mkdir -p logs
```

### 步骤 4: 复制文件

从 `netdisk-resources` 目录复制以下文件：

```bash
# 复制到 src/config/
cp ../backend-email-service.js src/config/email.js

# 复制到 src/controllers/
cp ../backend-email-verification-controller.js src/controllers/emailVerificationController.js
cp ../backend-auth-controller.js src/controllers/authController.js

# 复制到 src/routes/
cp ../backend-auth-routes.js src/routes/auth.js

# 复制到 src/models/
cp ../backend-user-model.js src/models/User.js

# 复制到 src/middleware/
cp ../backend-middleware.js src/middleware/auth.js

# 复制环境变量
cp ../.env.example .env
```

### 步骤 5: 配置环境变量

编辑 `.env` 文件：

```env
NODE_ENV=development
PORT=3000

# MongoDB
DATABASE_URL=mongodb://localhost:27017/netdisk

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars-long

# QQ 邮箱（已配置）
QQ_EMAIL=your_email@qq.com
QQ_EMAIL_AUTH_CODE=your_qq_email_auth_code

# 前端 URL
FRONTEND_URL=http://localhost:5173
```

### 步骤 6: 创建主服务器文件

创建 `src/server.js`：

```javascript
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'

dotenv.config()

const app = express()

// 中间件
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// 数据库连接
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/netdisk')
  .then(() => console.log('✓ MongoDB 已连接'))
  .catch(err => console.error('✗ MongoDB 连接失败:', err))

// 路由
app.use('/api/auth', authRoutes)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 启动服务
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
})
```

### 步骤 7: 更新 package.json

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest"
  },
  "type": "module"
}
```

### 步骤 8: 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🗄️ 数据库初始化

### MongoDB 连接

```bash
# 使用 mongo CLI
mongo

# 或使用 MongoDB Compass GUI
# https://www.mongodb.com/products/compass
```

### Redis 连接

```bash
# 启动 Redis 服务
redis-server

# 在另一个终端验证连接
redis-cli ping
# 应返回 PONG
```

## 🧪 测试后端服务

### 使用 Postman

1. 导入这个 JSON 到 Postman：

```json
{
  "info": {
    "name": "邮箱验证 API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "发送验证码",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {"raw": "{\"email\":\"test@qq.com\"}"},
        "url": {"raw": "http://localhost:3000/api/auth/send-verification-code"}
      }
    },
    {
      "name": "验证验证码",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {"raw": "{\"email\":\"test@qq.com\",\"code\":\"123456\"}"},
        "url": {"raw": "http://localhost:3000/api/auth/verify-code"}
      }
    },
    {
      "name": "注册用户",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {"raw": "{\"username\":\"testuser\",\"email\":\"test@qq.com\",\"password\":\"password123\",\"verificationToken\":\"token_here\"}"},
        "url": {"raw": "http://localhost:3000/api/auth/register"}
      }
    }
  ]
}
```

### 使用 curl

```bash
# 发送验证码
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qq.com"}'

# 验证验证码（获取邮件中的验证码）
curl -X POST http://localhost:3000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qq.com","code":"123456"}'

# 注册用户（使用上一步返回的 token）
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@qq.com","password":"password123","verificationToken":"token_from_verify_step"}'
```

## 📊 监控和日志

### 查看运行日志

```bash
# 开发环境
npm run dev

# 查看 MongoDB 连接日志
export MONGOOSE_DEBUG=true
npm run dev

# 保存日志到文件
npm run dev > logs/app.log 2>&1 &
```

### 监控指标

推荐使用 PM2 进行进程管理：

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start src/server.js --name "netdisk-api"

# 查看日志
pm2 logs netdisk-api

# 监控资源使用
pm2 monit
```

## 🔒 生产环境配置

### 环境变量（生产）

```env
NODE_ENV=production
PORT=3000

# 数据库（使用外部 MongoDB 服务如 MongoDB Atlas）
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/netdisk

# Redis（使用外部 Redis 服务如 Redis Cloud）
REDIS_HOST=redis-server.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# JWT（长的随机字符串）
JWT_SECRET=generate-a-long-random-string-here-min-32-chars

# HTTPS 和安全
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### SSL/TLS 配置

使用 Let's Encrypt 和 Certbot：

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d yourdomain.com

# 在 Express 中配置 HTTPS
import https from 'https'
import fs from 'fs'

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/fullchain.pem')
}

https.createServer(options, app).listen(443)
```

### 反向代理（Nginx）

```nginx
upstream netdisk_api {
  server localhost:3000;
}

server {
  listen 80;
  server_name api.yourdomain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  location / {
    proxy_pass http://netdisk_api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 🐳 Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 3000

CMD ["node", "src/server.js"]
```

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: mongodb://mongo:27017/netdisk
      REDIS_HOST: redis
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongo_data:
  redis_data:
```

启动：

```bash
docker-compose up -d
```

## 🔄 更新和维护

### 更新依赖

```bash
npm outdated
npm update
npm audit
npm audit fix
```

### 备份数据库

```bash
# MongoDB 备份
mongodump --uri="mongodb://localhost:27017/netdisk" --out=./backups

# Redis 备份
redis-cli BGSAVE
```

### 日志轮转

使用 `logrotate`：

```bash
sudo nano /etc/logrotate.d/netdisk-api

# 添加以下配置
/path/to/netdisk-backend/logs/*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 app app
  sharedscripts
  postrotate
    kill -SIGUSR1 $(pgrep -f "node src/server.js")
  endscript
}
```

## 📞 故障排查

### MongoDB 连接失败

```bash
# 检查 MongoDB 是否运行
mongosh --eval "db.adminCommand('ping')"

# 检查连接字符串
# 本地: mongodb://localhost:27017/netdisk
# 远程: mongodb+srv://user:pass@cluster.mongodb.net/netdisk
```

### Redis 连接失败

```bash
# 检查 Redis 是否运行
redis-cli ping

# 检查配置
redis-cli info server
```

### 邮件无法发送

```bash
# 检查 QQ 邮箱授权码
# 确保已在 .env 中正确设置

# 测试 SMTP 连接
telnet smtp.qq.com 465
```

### 令牌验证失败

```bash
# 检查 JWT_SECRET 是否一致
# 检查令牌是否过期
# 清除浏览器本地存储重新测试
```

## 📚 相关文档

- 完整后端指南：`BACKEND_IMPLEMENTATION_COMPLETE.md`
- 前端集成指南：`FRONTEND_INTEGRATION_GUIDE.md`
- API 路由文档：`docs/API_ROUTES.md`
