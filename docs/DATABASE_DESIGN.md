# 数据库设计文档

## 1. MySQL 关系数据库设计

### 1.1 用户相关表

#### users (用户表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 用户ID |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 |
| email | VARCHAR(100) | UNIQUE, NOT NULL | 邮箱 |
| phone | VARCHAR(20) | UNIQUE, NULL | 手机号 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希 |
| avatar_url | VARCHAR(500) | NULL | 头像URL |
| role | ENUM('user','creator','admin') | DEFAULT 'user' | 角色 |
| storage_quota | BIGINT | DEFAULT 10737418240 | 存储配额(字节，默认10GB) |
| storage_used | BIGINT | DEFAULT 0 | 已用存储 |
| status | ENUM('active','banned','deleted') | DEFAULT 'active' | 状态 |
| wechat_openid | VARCHAR(100) | UNIQUE, NULL | 微信OpenID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引设计**:
- PRIMARY KEY (id)
- UNIQUE KEY uk_email (email)
- UNIQUE KEY uk_phone (phone)
- UNIQUE KEY uk_wechat (wechat_openid)
- INDEX idx_role_status (role, status)
- INDEX idx_created_at (created_at)

#### user_profiles (用户资料表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| user_id | BIGINT | PRIMARY KEY, FOREIGN KEY | 用户ID |
| real_name | VARCHAR(50) | NULL | 真实姓名 |
| bio | TEXT | NULL | 个人简介 |
| location | VARCHAR(100) | NULL | 地区 |
| website | VARCHAR(200) | NULL | 个人网站 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**关联**: `user_id` → `users.id` (ON DELETE CASCADE)

### 1.2 资源相关表

#### resources (资源表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 资源ID |
| creator_id | BIGINT | FOREIGN KEY, NOT NULL | 创作者ID |
| title | VARCHAR(200) | NOT NULL | 标题 |
| description | TEXT | NULL | 描述 |
| category | VARCHAR(50) | NOT NULL | 分类(编程/设计/考证等) |
| subcategory | VARCHAR(50) | NULL | 子分类 |
| tags | JSON | NULL | 标签数组 |
| file_type | ENUM('video','document','image','archive','other') | NOT NULL | 文件类型 |
| file_size | BIGINT | NOT NULL | 文件大小(字节) |
| file_url | VARCHAR(500) | NOT NULL | OSS文件URL |
| cover_url | VARCHAR(500) | NULL | 封面图URL |
| preview_url | VARCHAR(500) | NULL | 预览文件URL |
| price_type | ENUM('free','paid','subscription') | DEFAULT 'free' | 价格类型 |
| price | DECIMAL(10,2) | DEFAULT 0.00 | 价格(元) |
| download_count | INT | DEFAULT 0 | 下载次数 |
| view_count | INT | DEFAULT 0 | 浏览次数 |
| rating_avg | DECIMAL(3,2) | DEFAULT 0.00 | 平均评分(1-5) |
| rating_count | INT | DEFAULT 0 | 评分人数 |
| status | ENUM('draft','pending','approved','rejected','deleted') | DEFAULT 'draft' | 状态 |
| review_comment | TEXT | NULL | 审核意见 |
| reviewed_at | TIMESTAMP | NULL | 审核时间 |
| reviewed_by | BIGINT | FOREIGN KEY, NULL | 审核人ID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引设计**:
- PRIMARY KEY (id)
- INDEX idx_creator (creator_id)
- INDEX idx_category (category, subcategory)
- INDEX idx_status (status)
- INDEX idx_rating (rating_avg DESC, rating_count DESC)
- INDEX idx_created_at (created_at DESC)
- FULLTEXT INDEX ft_search (title, description, tags)

**关联**:
- `creator_id` → `users.id` (ON DELETE RESTRICT)
- `reviewed_by` → `users.id` (ON DELETE SET NULL)

#### resource_files (资源文件表 - 支持多文件)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 文件ID |
| resource_id | BIGINT | FOREIGN KEY, NOT NULL | 资源ID |
| file_name | VARCHAR(255) | NOT NULL | 文件名 |
| file_url | VARCHAR(500) | NOT NULL | OSS文件URL |
| file_size | BIGINT | NOT NULL | 文件大小 |
| file_order | INT | DEFAULT 0 | 文件顺序 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引设计**:
- PRIMARY KEY (id)
- INDEX idx_resource (resource_id, file_order)

**关联**: `resource_id` → `resources.id` (ON DELETE CASCADE)

### 1.3 交易相关表

#### orders (订单表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 订单ID |
| order_no | VARCHAR(32) | UNIQUE, NOT NULL | 订单号 |
| user_id | BIGINT | FOREIGN KEY, NOT NULL | 用户ID |
| resource_id | BIGINT | FOREIGN KEY, NOT NULL | 资源ID |
| price | DECIMAL(10,2) | NOT NULL | 订单金额 |
| payment_method | ENUM('wechat','alipay','balance') | NULL | 支付方式 |
| payment_status | ENUM('pending','paid','failed','refunded') | DEFAULT 'pending' | 支付状态 |
| payment_time | TIMESTAMP | NULL | 支付时间 |
| transaction_id | VARCHAR(100) | NULL | 第三方交易号 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引设计**:
- PRIMARY KEY (id)
- UNIQUE KEY uk_order_no (order_no)
- INDEX idx_user (user_id, payment_status)
- INDEX idx_resource (resource_id)
- INDEX idx_payment_status (payment_status, created_at)

**关联**:
- `user_id` → `users.id` (ON DELETE RESTRICT)
- `resource_id` → `resources.id` (ON DELETE RESTRICT)

#### withdrawals (提现表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 提现ID |
| creator_id | BIGINT | FOREIGN KEY, NOT NULL | 创作者ID |
| amount | DECIMAL(10,2) | NOT NULL | 提现金额 |
| account_type | ENUM('wechat','alipay','bank') | NOT NULL | 账户类型 |
| account_info | JSON | NOT NULL | 账户信息(加密) |
| status | ENUM('pending','processing','completed','rejected') | DEFAULT 'pending' | 状态 |
| processed_at | TIMESTAMP | NULL | 处理时间 |
| remark | TEXT | NULL | 备注 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引设计**:
- PRIMARY KEY (id)
- INDEX idx_creator (creator_id, status)
- INDEX idx_status (status, created_at)

**关联**: `creator_id` → `users.id` (ON DELETE RESTRICT)

### 1.4 互动相关表

#### favorites (收藏表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 收藏ID |
| user_id | BIGINT | FOREIGN KEY, NOT NULL | 用户ID |
| resource_id | BIGINT | FOREIGN KEY, NOT NULL | 资源ID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引设计**:
- PRIMARY KEY (id)
- UNIQUE KEY uk_user_resource (user_id, resource_id)
- INDEX idx_user (user_id, created_at DESC)
- INDEX idx_resource (resource_id)

**关联**:
- `user_id` → `users.id` (ON DELETE CASCADE)
- `resource_id` → `resources.id` (ON DELETE CASCADE)

#### downloads (下载记录表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 下载ID |
| user_id | BIGINT | FOREIGN KEY, NULL | 用户ID(匿名下载为NULL) |
| resource_id | BIGINT | FOREIGN KEY, NOT NULL | 资源ID |
| order_id | BIGINT | FOREIGN KEY, NULL | 订单ID(付费资源) |
| ip_address | VARCHAR(45) | NULL | IP地址 |
| user_agent | VARCHAR(500) | NULL | User-Agent |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 下载时间 |

**索引设计**:
- PRIMARY KEY (id)
- INDEX idx_user (user_id, created_at DESC)
- INDEX idx_resource (resource_id, created_at DESC)
- INDEX idx_created_at (created_at)

**关联**:
- `user_id` → `users.id` (ON DELETE SET NULL)
- `resource_id` → `resources.id` (ON DELETE CASCADE)
- `order_id` → `orders.id` (ON DELETE SET NULL)

### 1.5 分享相关表

#### shares (分享链接表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 分享ID |
| resource_id | BIGINT | FOREIGN KEY, NOT NULL | 资源ID |
| share_code | VARCHAR(32) | UNIQUE, NOT NULL | 分享码 |
| password | VARCHAR(20) | NULL | 提取码 |
| expires_at | TIMESTAMP | NULL | 过期时间 |
| max_downloads | INT | NULL | 最大下载次数 |
| download_count | INT | DEFAULT 0 | 已下载次数 |
| created_by | BIGINT | FOREIGN KEY, NULL | 创建人ID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引设计**:
- PRIMARY KEY (id)
- UNIQUE KEY uk_share_code (share_code)
- INDEX idx_resource (resource_id)
- INDEX idx_expires (expires_at)

**关联**:
- `resource_id` → `resources.id` (ON DELETE CASCADE)
- `created_by` → `users.id` (ON DELETE SET NULL)

## 2. MongoDB 非关系数据库设计

### 2.1 评论集合 (comments)

```javascript
{
  _id: ObjectId,
  resourceId: Number,        // 资源ID
  userId: Number,            // 用户ID
  parentId: ObjectId,        // 父评论ID(回复)
  content: String,           // 评论内容
  rating: Number,            // 评分(1-5)
  likes: Number,             // 点赞数
  status: String,            // 状态: active/deleted
  createdAt: Date,
  updatedAt: Date,
  // 索引: { resourceId: 1, createdAt: -1 }, { userId: 1 }
}
```

### 2.2 系统日志集合 (system_logs)

```javascript
{
  _id: ObjectId,
  level: String,             // info/warn/error
  module: String,            // 模块名
  action: String,            // 操作类型
  userId: Number,            // 用户ID(可选)
  resourceId: Number,         // 资源ID(可选)
  message: String,            // 日志消息
  metadata: Object,          // 额外元数据
  ipAddress: String,         // IP地址
  userAgent: String,         // User-Agent
  createdAt: Date,
  // 索引: { createdAt: -1 }, { level: 1, createdAt: -1 }
}
```

### 2.3 用户行为日志集合 (user_activities)

```javascript
{
  _id: ObjectId,
  userId: Number,            // 用户ID
  action: String,            // 行为: view/download/favorite/comment
  resourceId: Number,        // 资源ID
  metadata: Object,          // 行为元数据
  sessionId: String,         // 会话ID
  createdAt: Date,
  // 索引: { userId: 1, createdAt: -1 }, { resourceId: 1, action: 1 }
}
```

## 3. Redis 缓存设计

### 3.1 会话缓存
- **Key格式**: `session:{userId}`
- **Value**: JWT Token + 用户信息
- **TTL**: 7天

### 3.2 热门资源缓存
- **Key格式**: `hot:resources:{category}`
- **Value**: 资源ID列表(JSON)
- **TTL**: 1小时

### 3.3 资源详情缓存
- **Key格式**: `resource:{resourceId}`
- **Value**: 资源完整信息(JSON)
- **TTL**: 30分钟

### 3.4 搜索缓存
- **Key格式**: `search:{query}:{page}:{size}`
- **Value**: 搜索结果(JSON)
- **TTL**: 10分钟

### 3.5 下载限流
- **Key格式**: `rate:download:{userId}:{resourceId}`
- **Value**: 下载次数
- **TTL**: 1小时

## 4. Elasticsearch 索引设计

### 4.1 资源搜索索引 (resources_index)

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "long" },
      "title": { "type": "text", "analyzer": "ik_max_word" },
      "description": { "type": "text", "analyzer": "ik_max_word" },
      "tags": { "type": "keyword" },
      "category": { "type": "keyword" },
      "subcategory": { "type": "keyword" },
      "creator_id": { "type": "long" },
      "price": { "type": "float" },
      "rating_avg": { "type": "float" },
      "download_count": { "type": "integer" },
      "status": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

**分析器**: 使用IK分词器(中文分词)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-10

