# 前端邮箱验证集成指南

## 🔗 API 集成配置

### 1. 环境变量配置

编辑 `.env.local` 或 `.env.development`：

```env
# API 基础 URL
VITE_API_BASE=http://localhost:3000/api
```

编辑 `vite.config.js`：

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})
```

### 2. API 客户端更新

更新 `src/api/auth.js`：

```javascript
import { client } from './client'

// ========== 邮箱验证相关 ==========

/**
 * 发送邮箱验证码
 * @param {string} email - 邮箱地址
 * @returns {Promise}
 * 
 * 响应格式：
 * {
 *   "success": true,
 *   "message": "验证码已发送，请查看邮箱",
 *   "expiresIn": 600
 * }
 */
export function sendVerificationCode(email) {
  return client.post('/auth/send-verification-code', { email })
}

/**
 * 验证邮箱验证码
 * @param {string} email - 邮箱地址
 * @param {string} code - 验证码
 * @returns {Promise}
 * 
 * 响应格式：
 * {
 *   "success": true,
 *   "message": "邮箱验证成功",
 *   "data": {
 *     "email": "user@example.com",
 *     "verificationToken": "token...",
 *     "expiresIn": 1800
 *   }
 * }
 */
export function verifyCode(email, code) {
  return client.post('/auth/verify-code', { email, code })
}

/**
 * 重新发送验证码
 * @param {string} email - 邮箱地址
 * @returns {Promise}
 */
export function resendVerificationCode(email) {
  return client.post('/auth/resend-verification-code', { email })
}

/**
 * 用户注册
 * @param {object} payload - 注册信息
 * @returns {Promise}
 * 
 * payload 格式：
 * {
 *   "username": "username",
 *   "email": "user@example.com",
 *   "password": "password123",
 *   "verificationToken": "token...",
 *   "inviteCode": "optional"
 * }
 * 
 * 响应格式：
 * {
 *   "success": true,
 *   "message": "注册成功",
 *   "data": {
 *     "user": { ... },
 *     "token": "jwt_token...",
 *     "refreshToken": "refresh_token...",
 *     "expiresIn": 86400
 *   }
 * }
 */
export function register(payload) {
  return client.post('/auth/register', payload)
}

/**
 * 用户登录
 * @param {object} payload - 登录信息
 * @returns {Promise}
 */
export function login(payload) {
  return client.post('/auth/login', payload)
}

/**
 * 刷新 Token
 * @param {string} refreshToken - 刷新令牌
 * @returns {Promise}
 */
export function refreshAccessToken(refreshToken) {
  return client.post('/auth/refresh', { refreshToken })
}

/**
 * 获取用户资料
 * @returns {Promise}
 */
export function fetchProfile() {
  return client.get('/auth/profile')
}

/**
 * 用户登出
 * @returns {Promise}
 */
export function logout() {
  return client.post('/auth/logout')
}
```

## 🔄 注册流程 - 完整实现

### 1. 更新 RegisterForm.vue 中的邮箱验证

```vue
<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { sendVerificationCode, verifyCode, register } from '../../api/auth'

// ... 其他代码 ...

async function sendCode() {
  if (!isEmailValid.value) {
    emailError.value = '请输入有效的邮箱地址'
    return
  }

  sending.value = true
  emailError.value = ''

  try {
    // 调用后端 API
    const response = await sendVerificationCode(emailForm.email)
    
    if (response.data?.success) {
      codeSent.value = true
      ElMessage.success('验证码已发送，请检查邮箱')

      // 启动 60 秒倒计时
      startCodeCountdown()

      // 启动 10 分钟验证码有效期倒计时
      startCodeExpiresCountdown()
    } else {
      emailError.value = response.data?.message || '发送失败，请重试'
      ElMessage.error(emailError.value)
    }
  } catch (error) {
    const message = error.response?.data?.message || '发送失败，请重试'
    emailError.value = message
    
    // 处理速率限制
    if (error.response?.status === 429) {
      const retryAfter = error.response?.data?.retryAfter
      emailError.value = `请${retryAfter}秒后再尝试`
    }
    
    ElMessage.error(emailError.value)
  } finally {
    sending.value = false
  }
}

async function verifyEmail() {
  if (!isCodeValid.value) {
    codeError.value = '请输入6位数字验证码'
    return
  }

  verifying.value = true
  codeError.value = ''

  try {
    // 调用后端 API 验证验证码
    const response = await verifyCode(emailForm.email, emailForm.code)

    if (response.data?.success) {
      // 验证成功，保存验证 token
      emailForm.verificationToken = response.data.data.verificationToken
      
      // 验证成功
      emailVerified.value = true
      form.email = emailForm.email
      ElMessage.success('邮箱验证成功！')

      // 清除倒计时
      if (countdownInterval) clearInterval(countdownInterval)
      if (expiresInterval) clearInterval(expiresInterval)
    } else {
      codeError.value = response.data?.message || '验证失败'
      ElMessage.error(codeError.value)
    }
  } catch (error) {
    const message = error.response?.data?.message || '验证码不正确，请重试'
    codeError.value = message
    ElMessage.error(codeError.value)
  } finally {
    verifying.value = false
  }
}

async function handleRegister() {
  if (!formRef.value) return
  
  // 验证表单
  await formRef.value.validate()
  
  if (!form.agreeTerms) {
    ElMessage.warning('请先同意用户协议和隐私政策')
    return
  }
  
  if (!emailVerified.value) {
    ElMessage.warning('请先验证邮箱')
    return
  }
  
  loading.value = true

  try {
    // 调用注册 API，包含验证 token
    const response = await register({
      username: form.username,
      email: form.email,
      password: form.password,
      verificationToken: emailForm.verificationToken,
      inviteCode: form.inviteCode
    })

    if (response.data?.success) {
      // 保存用户信息和 token
      const { user, token, refreshToken } = response.data.data
      
      // 保存到本地存储
      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
      
      ElMessage.success('注册成功，正在跳转...')
      
      // 延迟 1 秒后跳转
      setTimeout(() => {
        emit('success', { user, token })
        handleClose()
      }, 1000)
    } else {
      ElMessage.error(response.data?.message || '注册失败')
    }
  } catch (error) {
    const message = error.response?.data?.message || '注册失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}
</script>
```

### 2. 更新 auth 存储状态 (stores/auth.js)

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, logout as apiLogout } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const refreshToken = ref(localStorage.getItem('refreshToken'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(email, password) {
    const response = await apiLogin({ email, password })
    
    if (response.data?.success) {
      const { user: userData, token: accessToken, refreshToken: newRefreshToken } = response.data.data
      
      user.value = userData
      token.value = accessToken
      refreshToken.value = newRefreshToken
      
      localStorage.setItem('token', accessToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      localStorage.setItem('user', JSON.stringify(userData))
      
      return response.data
    }
    
    throw response
  }

  async function logout() {
    try {
      await apiLogout()
    } catch (error) {
      console.error('登出错误:', error)
    } finally {
      user.value = null
      token.value = null
      refreshToken.value = null
      
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }

  function setUser(userData) {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function setToken(accessToken) {
    token.value = accessToken
    localStorage.setItem('token', accessToken)
  }

  function loadFromStorage() {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    
    if (storedUser) user.value = JSON.parse(storedUser)
    if (storedToken) token.value = storedToken
    if (storedRefreshToken) refreshToken.value = storedRefreshToken
  }

  return {
    user,
    token,
    refreshToken,
    isAuthenticated,
    login,
    logout,
    setUser,
    setToken,
    loadFromStorage
  }
})
```

### 3. 初始化存储 (App.vue)

```vue
<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // 应用启动时，从本地存储加载用户信息
  authStore.loadFromStorage()
})
</script>
```

## 🧪 测试完整流程

### 使用 Postman 或 curl 测试

#### 1. 发送验证码
```bash
curl -X POST http://localhost:3000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qq.com"}'
```

#### 2. 验证验证码
```bash
curl -X POST http://localhost:3000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qq.com","code":"123456"}'
```

#### 3. 注册用户
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@qq.com",
    "password":"password123",
    "verificationToken":"token_from_step_2"
  }'
```

#### 4. 登录用户
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@qq.com","password":"password123"}'
```

## 📱 前端页面测试清单

- [ ] 邮箱格式验证正确
- [ ] 发送验证码后显示 60 秒倒计时
- [ ] 倒计时期间按钮禁用
- [ ] 倒计时结束后按钮恢复
- [ ] 邮箱输入框发送后禁用
- [ ] 收到验证码邮件
- [ ] 输入验证码后验证按钮启用
- [ ] 验证成功后进入注册表单
- [ ] 填写完整注册信息后可以注册
- [ ] 注册成功后跳转到首页
- [ ] 可以用新账号登录

## 🔗 跨域配置（如需要）

如果前后端不在同一域名，后端 Express 需要配置 CORS：

```javascript
// server.js
import cors from 'cors'

app.use(cors({
  origin: [
    'http://localhost:5173',     // 本地开发
    'https://yourdomain.com',    // 生产环境
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

## 📚 相关文档

- 后端实现完整指南：`BACKEND_IMPLEMENTATION_COMPLETE.md`
- 邮件服务配置：`backend-email-service.js`
- 身份认证控制器：`backend-auth-controller.js`
- 验证码控制器：`backend-email-verification-controller.js`

## ⚠️ 重要注意事项

1. **不要暴露授权码**
   - 将授权码保存在 `.env` 文件中
   - 从不将授权码提交到版本控制系统
   - 不要在客户端代码中存储授权码

2. **HTTPS 建议**
   - 生产环境必须使用 HTTPS
   - 确保 JWT 令牌通过加密连接传输

3. **Token 管理**
   - Access Token 有效期较短（24小时）
   - Refresh Token 有效期较长（7天）
   - 定期刷新 Access Token

4. **错误处理**
   - 为用户提供友好的错误提示
   - 记录详细的日志用于调试
   - 不要泄露敏感的系统错误信息

5. **邮件测试**
   - 使用 QQ 邮箱测试发送和接收
   - 检查垃圾邮件文件夹
   - 可能需要延迟几秒才能收到邮件
