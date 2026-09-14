# 部署与测试文档

## 1. 环境变量配置

### 1.1 后端环境变量 (.env.production)

```bash
# 数据库配置
DATABASE_HOST=mysql-master
DATABASE_PORT=3306
DATABASE_USER=netdisk_user
DATABASE_PASSWORD=your_strong_password
DATABASE_NAME=netdisk

# MongoDB配置
MONGODB_URI=mongodb://netdisk_user:your_password@mongodb:27017/netdisk?authSource=admin

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Elasticsearch配置
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200

# JWT配置
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 阿里云OSS配置
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=netdisk-resources
OSS_REGION=oss-cn-hangzhou
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com

# 七牛云CDN配置（可选）
QINIU_ACCESS_KEY=your_qiniu_access_key
QINIU_SECRET_KEY=your_qiniu_secret_key
QINIU_BUCKET=netdisk-cdn
QINIU_DOMAIN=https://cdn.example.com

# 微信支付配置
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret
WECHAT_MCH_ID=your_merchant_id
WECHAT_API_KEY=your_api_key
WECHAT_NOTIFY_URL=https://api.example.com/orders/payment/callback/wechat

# 支付宝配置
ALIPAY_APPID=your_alipay_appid
ALIPAY_PRIVATE_KEY=your_private_key
ALIPAY_PUBLIC_KEY=your_public_key
ALIPAY_NOTIFY_URL=https://api.example.com/orders/payment/callback/alipay

# 应用配置
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://www.example.com
API_URL=https://api.example.com

# 文件上传限制
MAX_FILE_SIZE=5368709120  # 5GB
CHUNK_SIZE=5242880        # 5MB

# 敏感词过滤
SENSITIVE_WORDS_API=https://api.example.com/sensitive/check
```

### 1.2 前端环境变量 (.env.production)

```bash
REACT_APP_API_URL=https://api.example.com
REACT_APP_WECHAT_APPID=your_wechat_appid
REACT_APP_CDN_URL=https://cdn.example.com
REACT_APP_OSS_PUBLIC_URL=https://netdisk-resources.oss-cn-hangzhou.aliyuncs.com
```

## 2. Docker Compose 部署

### 2.1 启动服务

```bash
# 构建镜像
docker compose -f docker-compose.prod.yml build

# 启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 停止服务
docker compose -f docker-compose.prod.yml down
```

### 2.2 数据库初始化

```bash
# 执行数据库迁移
docker compose -f docker-compose.prod.yml exec backend npm run migration:run

# 初始化Elasticsearch索引
docker compose -f docker-compose.prod.yml exec backend npm run es:sync
```

## 3. Nginx 配置

### 3.1 nginx.conf

```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    server_name www.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 前端静态资源
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 缓存策略
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API代理
    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket支持
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 文件上传大小限制
    client_max_body_size 5G;
}
```

## 4. 压力测试脚本

### 4.1 模拟1000人同时下载 (loadtest.js)

```javascript
const loadtest = require('loadtest');
const axios = require('axios');

// 获取测试用户Token
async function getTestTokens(count) {
  const tokens = [];
  for (let i = 0; i < count; i++) {
    try {
      const res = await axios.post('http://localhost:3000/api/auth/login', {
        email: `test${i}@example.com`,
        password: 'test123456',
      });
      tokens.push(res.data.token);
    } catch (error) {
      console.error(`Failed to get token for user ${i}:`, error.message);
    }
  }
  return tokens;
}

// 下载资源测试
async function downloadResource(token, resourceId) {
  try {
    const response = await axios.post(
      `http://localhost:3000/api/resources/${resourceId}/download`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'stream',
      }
    );
    return { success: true, size: response.headers['content-length'] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 执行压力测试
async function runLoadTest() {
  console.log('Starting load test...');
  
  const tokens = await getTestTokens(1000);
  console.log(`Got ${tokens.length} tokens`);
  
  const resourceId = 1; // 测试资源ID
  const results = {
    success: 0,
    failed: 0,
    totalSize: 0,
    errors: [],
  };
  
  const startTime = Date.now();
  
  // 并发下载
  const promises = tokens.map((token, index) =>
    downloadResource(token, resourceId)
      .then((result) => {
        if (result.success) {
          results.success++;
          results.totalSize += parseInt(result.size || 0);
        } else {
          results.failed++;
          results.errors.push(result.error);
        }
      })
      .catch((error) => {
        results.failed++;
        results.errors.push(error.message);
      })
  );
  
  await Promise.all(promises);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n=== Load Test Results ===');
  console.log(`Total Requests: ${tokens.length}`);
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.success / tokens.length) * 100).toFixed(2)}%`);
  console.log(`Total Duration: ${duration.toFixed(2)}s`);
  console.log(`Throughput: ${(tokens.length / duration).toFixed(2)} req/s`);
  console.log(`Total Data: ${(results.totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (results.errors.length > 0) {
    console.log('\n=== Top 10 Errors ===');
    const errorCounts = {};
    results.errors.forEach((err) => {
      errorCounts[err] = (errorCounts[err] || 0) + 1;
    });
    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([err, count]) => {
        console.log(`${err}: ${count}`);
      });
  }
}

runLoadTest().catch(console.error);
```

### 4.2 使用 k6 进行压力测试 (loadtest.js)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // 30秒内增加到100用户
    { duration: '1m', target: 500 },     // 1分钟内增加到500用户
    { duration: '2m', target: 1000 },    // 2分钟内增加到1000用户
    { duration: '5m', target: 1000 },     // 保持1000用户5分钟
    { duration: '2m', target: 0 },       // 2分钟内降为0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95%请求在500ms内
    http_req_failed: ['rate<0.03'],      // 错误率<3%
    errors: ['rate<0.03'],
  },
};

const BASE_URL = 'http://localhost:3000/api';

export default function () {
  // 登录获取Token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `test${__VU}@example.com`,
    password: 'test123456',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const success = check(loginRes, {
    'login status 200': (r) => r.status === 200,
  });
  
  errorRate.add(!success);
  
  if (!success) {
    return;
  }
  
  const token = JSON.parse(loginRes.body).token;
  
  // 下载资源
  const downloadRes = http.post(
    `${BASE_URL}/resources/1/download`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const downloadSuccess = check(downloadRes, {
    'download status 200': (r) => r.status === 200,
    'download has URL': (r) => JSON.parse(r.body).downloadUrl !== undefined,
  });
  
  errorRate.add(!downloadSuccess);
  
  sleep(1);
}
```

### 4.3 运行压力测试

```bash
# 安装依赖
npm install -g loadtest k6

# 运行Node.js测试
node scripts/loadtest.js

# 运行k6测试
k6 run scripts/loadtest-k6.js
```

## 5. 监控与告警

### 5.1 Prometheus 监控指标

- `http_requests_total`: HTTP请求总数
- `http_request_duration_seconds`: 请求耗时
- `database_connections_active`: 数据库活跃连接数
- `redis_commands_total`: Redis命令总数
- `file_uploads_total`: 文件上传总数
- `downloads_total`: 下载总数

### 5.2 告警规则

- 错误率 > 5%
- 响应时间 P95 > 1s
- 数据库连接数 > 80%
- 磁盘使用率 > 85%
- CPU使用率 > 90%

---

**文档版本**: v1.0  
**最后更新**: 2025-12-10

