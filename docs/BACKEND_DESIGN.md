// ========================================
// 后端架构设计文档
// ========================================
// 
// 项目: 网络资源教程共享平台 - 后端设计
// 描述: 完整的用户认证、邮箱验证、数据库存储方案
// 
// ========================================

## 🏗️ 后端技术栈

### 推荐方案 (Node.js + Express)

```
技术栈:
├─ 运行时: Node.js 18+ LTS
├─ 框架: Express.js 4.x (轻量级 Web 框架)
├─ 数据库: PostgreSQL 14+ (推荐) 或 MongoDB 5+ (可选)
├─ ORM/ODM: Sequelize (PostgreSQL) 或 Mongoose (MongoDB)
├─ 缓存: Redis (用户会话、验证码缓存)
├─ 邮件服务: Nodemailer + 企业邮箱/SMTP
├─ 认证: JWT (JSON Web Token)
├─ 密码: bcrypt (密码加密)
└─ 环境: dotenv (环境变量)
```

---

## 📊 数据库设计

### 用户表 (users)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(255),
  bio TEXT,
  
  -- 邮箱验证
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  
  -- 账户状态
  status ENUM('pending', 'active', 'suspended') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  
  -- 邀请码系统
  invite_code VARCHAR(20) UNIQUE,
  invited_by_id UUID REFERENCES users(id),
  
  -- 其他
  is_admin BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_username ON users(username);
```

### 邮箱验证码表 (email_verification_codes)
```sql
CREATE TABLE email_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(100) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_code ON email_verification_codes(email);
CREATE INDEX idx_expires ON email_verification_codes(expires_at);
```

### 网盘资源表 (resources)
```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 资源信息
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  
  -- 链接信息
  netdisk_type ENUM('aliyun', 'baidu', 'tianyi') NOT NULL,
  resource_url VARCHAR(500) NOT NULL,
  password VARCHAR(50),
  
  -- 元数据
  tags TEXT[], -- 存储为数组
  file_count INT,
  file_size VARCHAR(50),
  
  -- 统计
  view_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  
  -- 审核
  is_approved BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_user_id ON resources(user_id);
CREATE INDEX idx_category ON resources(category);
CREATE INDEX idx_created ON resources(created_at DESC);
```

### 用户收藏表 (user_favorites)
```sql
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_user_favorites ON user_favorites(user_id);
```

### 用户活动日志表 (user_activities)
```sql
CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  action VARCHAR(50) NOT NULL, -- 'login', 'upload', 'download', 'view'
  resource_id UUID REFERENCES resources(id),
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_activities ON user_activities(user_id);
CREATE INDEX idx_action ON user_activities(action);
```

---

## 🔐 邮箱验证码流程

### 前端流程

```javascript
// 1. 用户点击"发送验证码"
async sendVerificationCode(email) {
  // 验证邮箱格式
  if (!isValidEmail(email)) {
    ElMessage.error('请输入有效的邮箱地址')
    return
  }
  
  // 调用后端API
  try {
    const response = await client.post('/auth/send-verification-code', { email })
    ElMessage.success('验证码已发送，请检查邮箱')
    this.codeSentTime = Date.now()
    this.countdownTime = 60
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  }
}

// 2. 用户输入验证码并提交注册
async handleRegister() {
  // 验证表单
  await this.formRef.validate()
  
  // 验证验证码
  if (!this.verificationCode || this.verificationCode.length !== 6) {
    ElMessage.error('请输入6位验证码')
    return
  }
  
  try {
    const response = await apiRegister({
      username: this.form.username,
      email: this.form.email,
      password: this.form.password,
      verificationCode: this.verificationCode,
      inviteCode: this.form.inviteCode || null
    })
    
    ElMessage.success('注册成功！请登录')
    this.$emit('success')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败')
  }
}
```

### 后端流程

```javascript
// 1. 发送验证码接口
router.post('/auth/send-verification-code', async (req, res) => {
  const { email } = req.body
  
  // 验证邮箱格式
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: '邮箱格式不正确' })
  }
  
  // 检查邮箱是否已注册
  const existingUser = await User.findOne({ email })
  if (existingUser && existingUser.email_verified) {
    return res.status(400).json({ message: '邮箱已被注册' })
  }
  
  // 生成6位验证码
  const code = generateVerificationCode() // '123456'
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分钟有效期
  
  // 保存验证码到数据库
  await EmailVerificationCode.create({
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
    res.status(500).json({ message: '邮件发送失败' })
  }
})

// 2. 用户注册接口 (带验证码验证)
router.post('/auth/register', async (req, res) => {
  const { username, email, password, verificationCode, inviteCode } = req.body
  
  // 验证验证码
  const verCode = await EmailVerificationCode.findOne({
    email,
    code: verificationCode
  })
  
  if (!verCode) {
    return res.status(400).json({ message: '验证码不正确' })
  }
  
  if (new Date() > verCode.expires_at) {
    return res.status(400).json({ message: '验证码已过期' })
  }
  
  // 检查用户名/邮箱是否已存在
  const existing = await User.findOne({
    $or: [{ username }, { email }]
  })
  
  if (existing) {
    return res.status(400).json({ message: '用户名或邮箱已存在' })
  }
  
  // 创建新用户
  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = await User.create({
    username,
    email,
    password_hash: hashedPassword,
    email_verified: true,
    email_verified_at: new Date(),
    status: 'active',
    invite_code: generateInviteCode()
  })
  
  // 标记验证码为已验证
  await EmailVerificationCode.updateOne(
    { _id: verCode._id },
    { verified_at: new Date() }
  )
  
  // 生成JWT token
  const token = jwt.sign(
    { userId: newUser._id, email: newUser.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  res.json({
    message: '注册成功',
    data: {
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar_url: newUser.avatar_url
      },
      token
    }
  })
})
```

---

## 💾 资源存储API

### 上传资源接口

```javascript
// POST /api/resources
router.post('/api/resources', authenticate, async (req, res) => {
  const { title, description, category, netdisk_type, resource_url, password, tags } = req.body
  
  // 验证必填字段
  if (!title || !category || !netdisk_type || !resource_url) {
    return res.status(400).json({ message: '缺少必填字段' })
  }
  
  // 验证网盘类型
  const validTypes = ['aliyun', 'baidu', 'tianyi']
  if (!validTypes.includes(netdisk_type)) {
    return res.status(400).json({ message: '无效的网盘类型' })
  }
  
  try {
    const newResource = await Resource.create({
      user_id: req.user.userId,
      title,
      description,
      category,
      netdisk_type,
      resource_url,
      password: password || null,
      tags: tags || []
    })
    
    res.json({
      message: '资源上传成功',
      data: newResource
    })
  } catch (error) {
    res.status(500).json({ message: '上传失败' })
  }
})

// GET /api/resources - 获取资源列表
router.get('/api/resources', async (req, res) => {
  const { category, keyword, sort = '-created_at', page = 1, limit = 20 } = req.query
  
  let query = { is_deleted: false, is_approved: true }
  
  // 按分类筛选
  if (category) {
    query.category = category
  }
  
  // 按关键字搜索
  if (keyword) {
    query.$or = [
      { title: new RegExp(keyword, 'i') },
      { description: new RegExp(keyword, 'i') },
      { tags: keyword }
    ]
  }
  
  const skip = (page - 1) * limit
  const resources = await Resource
    .find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user_id', 'username avatar_url')
  
  const total = await Resource.countDocuments(query)
  
  res.json({
    data: resources,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  })
})

// GET /api/resources/:id - 获取资源详情
router.get('/api/resources/:id', async (req, res) => {
  const resource = await Resource.findById(req.params.id)
    .populate('user_id', 'username avatar_url bio')
  
  if (!resource) {
    return res.status(404).json({ message: '资源不存在' })
  }
  
  // 增加浏览次数
  resource.view_count += 1
  await resource.save()
  
  res.json({ data: resource })
})
```

### 收藏接口

```javascript
// POST /api/favorites - 添加收藏
router.post('/api/favorites', authenticate, async (req, res) => {
  const { resource_id } = req.body
  
  const existing = await UserFavorite.findOne({
    user_id: req.user.userId,
    resource_id
  })
  
  if (existing) {
    return res.status(400).json({ message: '已添加到收藏' })
  }
  
  const favorite = await UserFavorite.create({
    user_id: req.user.userId,
    resource_id
  })
  
  // 增加资源的收藏计数
  await Resource.findByIdAndUpdate(resource_id, {
    $inc: { like_count: 1 }
  })
  
  res.json({ message: '已添加到收藏' })
})

// DELETE /api/favorites/:id - 删除收藏
router.delete('/api/favorites/:id', authenticate, async (req, res) => {
  const favorite = await UserFavorite.findByIdAndDelete(req.params.id)
  
  if (favorite) {
    // 减少资源的收藏计数
    await Resource.findByIdAndUpdate(favorite.resource_id, {
      $inc: { like_count: -1 }
    })
  }
  
  res.json({ message: '已取消收藏' })
})

// GET /api/favorites - 获取我的收藏
router.get('/api/favorites', authenticate, async (req, res) => {
  const favorites = await UserFavorite
    .find({ user_id: req.user.userId })
    .populate('resource_id')
    .sort('-created_at')
  
  res.json({ data: favorites })
})
```

---

## 🔧 环境配置

### .env 文件

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/netdisk_db
# 或 MongoDB
# DATABASE_URL=mongodb://localhost:27017/netdisk_db

# Redis (可选，用于缓存和会话)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@netdisk-resources.com

# 应用
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000/api

# 前端
VITE_API_BASE=http://localhost:3000/api
```

---

## 📦 NPM 依赖

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "sequelize": "^6.28.0",
    "pg": "^8.10.0",
    "redis": "^4.6.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "nodemailer": "^6.9.1",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-validator": "^7.0.0",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  }
}
```

---

## 🚀 部署建议

### Docker Compose

```yaml
version: '3.8'

services:
  # 后端API
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/netdisk_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  # PostgreSQL数据库
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=netdisk_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # 前端
  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

---

## 测试

### 单元测试

```javascript
describe('Auth API', () => {
  it('应该成功发送验证码', async () => {
    const response = await request(app)
      .post('/auth/send-verification-code')
      .send({ email: 'test@example.com' })
    
    expect(response.status).toBe(200)
    expect(response.body.message).toBe('验证码已发送')
  })
  
  it('应该成功注册用户', async () => {
    // 先发送验证码
    await request(app)
      .post('/auth/send-verification-code')
      .send({ email: 'newuser@example.com' })
    
    // 获取验证码
    const verCode = await EmailVerificationCode.findOne({
      email: 'newuser@example.com'
    })
    
    // 注册用户
    const response = await request(app)
      .post('/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePassword123',
        verificationCode: verCode.code
      })
    
    expect(response.status).toBe(200)
    expect(response.body.data.token).toBeDefined()
  })
})
```

---

这就是完整的后端设计方案！你现在可以：

1. ✅ **邮箱验证**: 用户注册时获取6位验证码
2. ✅ **数据存储**: 用户信息、资源链接完整保存
3. ✅ **API接口**: 完整的CRUD操作
4. ✅ **安全认证**: JWT token + bcrypt密码加密
5. ✅ **数据库**: PostgreSQL 或 MongoDB 方案

下一步可以部署这个后端，和前端对接！
