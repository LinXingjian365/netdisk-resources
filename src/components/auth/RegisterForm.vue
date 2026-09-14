<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    @submit.prevent="onSubmit"
  >
    <!-- 步骤一：邮箱 + 验证码 -->
    <el-form-item label="邮箱" prop="email">
      <el-input
        v-model="form.email"
        size="large"
        placeholder="请输入邮箱"
        :disabled="emailVerified"
        :prefix-icon="Message"
      />
    </el-form-item>

    <el-form-item label="邮箱验证码" prop="code">
      <div class="code-row">
        <el-input
          v-model="form.code"
          size="large"
          maxlength="6"
          placeholder="6 位数字验证码"
          :disabled="!codeSent"
        />

        <el-button
          size="large"
          :disabled="countdown > 0 || sendingCode"
          :loading="sendingCode"
          @click="sendCode"
        >
          {{ codeButtonText }}
        </el-button>
      </div>

      <div v-if="codeSent && !emailVerified" class="hint">
        验证码已发送，10 分钟内有效。
        <span v-if="countdown > 0">{{ countdown }} 秒后可重发</span>
      </div>

      <el-progress
        v-if="codeSent && !emailVerified"
        :percentage="codeProgress"
        :stroke-width="4"
        :show-text="false"
        class="progress"
      />
    </el-form-item>

    <el-button
      v-if="!emailVerified"
      class="submit"
      size="large"
      :disabled="!codeSent"
      :loading="verifying"
      @click="verifyEmailCode"
    >
      验证邮箱
    </el-button>

    <!-- 步骤二：账号信息 -->
    <template v-if="emailVerified">
      <el-alert type="success" :closable="false" show-icon title="邮箱验证成功" class="alert" />

      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="form.username"
          size="large"
          placeholder="3-20 位，字母/数字/下划线/中文"
          :prefix-icon="User"
        />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          size="large"
          type="password"
          show-password
          placeholder="6-20 位，需同时包含字母和数字"
          :prefix-icon="Lock"
        />
      </el-form-item>

      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          size="large"
          type="password"
          show-password
          placeholder="请再次输入密码"
          :prefix-icon="Lock"
          @keyup.enter="onSubmit"
        />
      </el-form-item>

      <el-button
        type="primary"
        size="large"
        class="submit"
        :loading="loading"
        @click="onSubmit"
      >
        完成注册
      </el-button>
    </template>
  </el-form>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Message, Lock, User } from '@element-plus/icons-vue'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits(['success'])

const auth = useAuthStore()
const formRef = ref(null)

const sendingCode = ref(false)
const verifying = ref(false)
const loading = ref(false)

const codeSent = ref(false)
const emailVerified = ref(false)
const countdown = ref(0)
const codeExpiresAt = ref(0)

const form = reactive({
  email: '',
  code: '',
  username: '',
  password: '',
  confirmPassword: '',
  verificationToken: ''
})

let timer = null

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3-20 个字符', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
      message: '只能包含字母、数字、下划线和中文',
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6-20 个字符', trigger: 'blur' },
    {
      pattern: /^(?=.*[a-zA-Z])(?=.*\d).+$/,
      message: '密码必须同时包含字母和数字',
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    {
      validator: (rule, value, callback) => {
        if (!value) return callback(new Error('请再次输入密码'))
        if (value !== form.password) return callback(new Error('两次输入的密码不一致'))
        callback()
      },
      trigger: 'blur'
    }
  ]
}

const codeButtonText = computed(() => {
  if (countdown.value > 0) return `${countdown.value}s 后重发`
  if (codeSent.value) return '重新发送'
  return '获取验证码'
})

const codeProgress = computed(() => {
  if (!codeExpiresAt.value) return 0
  const remaining = codeExpiresAt.value - Date.now()
  const total = 10 * 60 * 1000
  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)))
})

function startCountdown(seconds) {
  countdown.value = seconds
  clearInterval(timer)

  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(timer)
      timer = null
      countdown.value = 0
    }
  }, 1000)
}

async function sendCode() {
  if (!form.email) {
    ElMessage.warning('请先输入邮箱')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    ElMessage.warning('邮箱格式不正确')
    return
  }

  sendingCode.value = true
  try {
    const res = await authApi.sendVerificationCode(form.email.trim())

    codeSent.value = true
    codeExpiresAt.value = Date.now() + (res.data?.expiresIn || 600) * 1000
    startCountdown(res.data?.resendCooldown || 60)

    ElMessage.success('验证码已发送，请查收邮箱')
  } catch (e) {
    ElMessage.error(e.message || '验证码发送失败')
  } finally {
    sendingCode.value = false
  }
}

async function verifyEmailCode() {
  if (!/^\d{6}$/.test(form.code)) {
    ElMessage.warning('请输入 6 位数字验证码')
    return
  }

  verifying.value = true
  try {
    const res = await authApi.verifyCode(form.email.trim(), form.code)

    form.verificationToken = res.data.verificationToken
    emailVerified.value = true

    ElMessage.success('邮箱验证成功，请填写账号信息')
  } catch (e) {
    ElMessage.error(e.message || '验证码不正确')
  } finally {
    verifying.value = false
  }
}

async function onSubmit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (!emailVerified.value) {
    ElMessage.warning('请先完成邮箱验证')
    return
  }

  loading.value = true
  try {
    await auth.register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      verificationToken: form.verificationToken
    })

    ElMessage.success('注册成功，已自动登录')
    emit('success')
  } catch (e) {
    ElMessage.error(e.message || '注册失败')
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  // 防止组件卸载后定时器仍在运行
  clearInterval(timer)
  timer = null
})
</script>

<style scoped>
.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row .el-input {
  flex: 1;
}

.submit {
  width: 100%;
}

.hint {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 4px;
}

.progress {
  margin-top: 8px;
}

.alert {
  margin-bottom: 18px;
}
</style>
