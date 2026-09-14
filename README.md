# 网络资源教程共享平台

> 网盘资源分享与检索系统：**Vue 3 + Vite + Element Plus** 前端，**Express + MongoDB + Redis** 后端。
> 用户需通过**邮箱验证码**完成注册，可浏览、搜索、收藏与发布资源。

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

---

## 目录结构

```
netdisk-resources/
├── src/                    # 前端源码（Vue 3）
│   ├── api/                # 接口层：axios 客户端（含 GET 缓存）、auth、resources
│   ├── components/         # 组件：ResourceList / ResourceCard / LazyImage / VirtualList
│   │   └── auth/           # 登录表单、注册表单（含 60s 验证码倒计时）
│   ├── composables/        # useAnalytics、useClipboard
│   ├── pages/              # Home / Categories / ResourceDetail / Login / Profile / Contact / NotFound
│   ├── router/             # 路由与登录守卫
│   ├── stores/             # Pinia：auth、app
│   ├── utils/              # cache、filters
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── server/                 # 后端源码（Express）
│   └── src/
│       ├── config/         # env、email（nodemailer）
│       ├── controllers/    # auth、emailVerification、resource
│       ├── db/             # mongo、redis（全局单连接）
│       ├── middleware/     # JWT 认证、校验、限流、错误处理
│       ├── models/         # User、Resource
│       ├── routes/         # /api/auth、/api/resources、/api/health
│       ├── scripts/        # seed.js 演示数据
│       ├── app.js
│       └── index.js        # 入口
├── tests/run.mjs           # 全功能集成测试（36 项）
├── public/                 # manifest、service worker、图标
└── docker-compose.yml      # 仅提供 MongoDB + Redis 两个数据服务
```

---

## 快速开始

### 前置要求

- Node.js >= 18
- **MongoDB**（本机安装，或 `docker compose up -d`）
- **Redis**（本机安装，或 `docker compose up -d`）

### 1. 启动数据服务

```bash
docker compose up -d              # 提供 MongoDB:27017 与 Redis:6379
# 或使用本机已安装的 MongoDB / Redis
```

### 2. 启动后端

```bash
cd server
cp .env.example .env              # 按需修改，至少填写 JWT_SECRET 与 SMTP 凭据
npm install
npm run seed                      # 可选：写入 12 条演示资源
npm start                         # http://localhost:3000
```

健康检查： <http://localhost:3000/api/health>

### 3. 启动前端

```bash
npm install
npm run dev                       # http://localhost:5173
```

开发服务器已配置 `/api` 代理到 `http://localhost:3000`，因此无需额外处理跨域。

### 生产构建

```bash
npm run build                     # 产物输出到 dist/
npm run preview
```

---

## 环境变量

后端配置见 [`server/.env.example`](server/.env.example)，复制为 `server/.env` 后修改。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | `3000` |
| `CORS_ORIGIN` | 允许的前端来源，逗号分隔 | `http://localhost:5173` |
| `MONGO_URI` | MongoDB 连接串 | `mongodb://127.0.0.1:27017/netdisk_resources` |
| `REDIS_URL` | Redis 连接串 | `redis://127.0.0.1:6379` |
| `JWT_SECRET` | JWT 签名密钥，**生产必须替换** | 无（占位值） |
| `MAIL_TRANSPORT` | `smtp` 真实发信 / `json` 仅测试不投递 | `smtp` |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` | SMTP 配置 | `smtp.qq.com` / `465` |
| `VERIFICATION_CODE_TTL_SECONDS` | 验证码有效期 | `600` |
| `VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS` | 重发冷却 | `60` |

> **安全提示**：`.env` 已被 `.gitignore` 排除，请勿提交。未配置 SMTP 时验证码邮件无法发送。

---

## API

基础路径：`/api`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/health` | 健康检查（含 Mongo/Redis 状态） | 否 |
| POST | `/auth/send-verification-code` | 发送邮箱验证码 | 否 |
| POST | `/auth/verify-code` | 校验验证码，返回 verificationToken | 否 |
| POST | `/auth/resend-verification-code` | 重发验证码 | 否 |
| POST | `/auth/check-email-verification` | 校验 verificationToken | 否 |
| POST | `/auth/register` | 注册（需 verificationToken） | 否 |
| POST | `/auth/login` | 登录 | 否 |
| POST | `/auth/logout` | 登出（令牌加入黑名单） | 是 |
| POST | `/auth/refresh` | 刷新 access token | 否 |
| GET | `/auth/profile` | 获取当前用户资料 | 是 |
| PATCH | `/auth/profile` | 更新资料 | 是 |
| GET | `/resources` | 资源列表（搜索/筛选/排序/分页） | 否 |
| GET | `/resources/meta/filters` | 分类与网盘类型元数据 | 否 |
| GET | `/resources/:id` | 资源详情 | 否 |
| POST | `/resources` | 发布资源 | 是 |

### 注册流程

```
输入邮箱 → 发送验证码 → 用户输入验证码 → 校验通过获得 verificationToken
        → 填写用户名/密码 → 携带 token 注册 → 返回 JWT，自动登录
```

---

## 测试

```bash
# 1. 确保 MongoDB、Redis 已启动
# 2. 启动后端： cd server && npm start
npm test
```

`tests/run.mjs` 覆盖 36 项集成用例：健康检查、验证码全生命周期、注册/登录/登出黑名单、
令牌刷新、权限校验、资源搜索筛选排序分页、发布资源与参数校验等。

> 说明：测试环境建议设置 `MAIL_TRANSPORT=json`，测试脚本会直接连接 Redis 读取验证码，
> 从而在不真实发信的情况下验证完整注册链路。生产环境请使用 `smtp`。

---

## 实现说明

- **搜索**：MongoDB 的 `$text` 索引**不会**对中文按词切分（实测 `集成测试` 命中 0 条），
  因此关键词检索改用大小写不敏感的正则匹配 `title / description / tags`。
- **`inviteCode` 唯一索引**：schema 中不能设 `default: null`。sparse 索引只跳过"字段缺失"，
  `null` 仍会被索引，会导致第二个未填邀请码的用户注册失败。
- **Redis 连接**：全服务共享单一客户端（原实现每个模块各建一个，存在连接泄漏）。
- **令牌黑名单**：JWT 携带 `jti`，登出后按剩余有效期写入 Redis。

---

## 仓库中的历史文档

根目录下仍有若干早期设计/交付文档（如 `00_START_HERE.md`、`BACKEND_IMPLEMENTATION_COMPLETE.md` 等）。
它们描述的是**最初的设计方案**，与当前实现存在出入（例如其中提到的目录结构与依赖早已重构）。
请以本 README 和 `src/`、`server/` 中的实际代码为准。

---

## 许可证

[MIT](LICENSE)
