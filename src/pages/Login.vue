<template>
  <div class="auth">
    <div class="auth__card card">
      <h1 class="auth__title">
        {{ isRegister ? '创建账号' : '登录' }}
      </h1>
      <p class="auth__sub">
        {{ isRegister ? '邮箱验证后即可发布与管理资源' : '欢迎回来，继续探索优质资源' }}
      </p>

      <LoginForm v-if="!isRegister" @success="onSuccess" />
      <RegisterForm v-else @success="onSuccess" />

      <footer class="auth__switch">
        <span class="muted">
          {{ isRegister ? '已有账号？' : '还没有账号？' }}
        </span>
        <el-button link type="primary" @click="toggle">
          {{ isRegister ? '去登录' : '去注册' }}
        </el-button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '../components/auth/LoginForm.vue'
import RegisterForm from '../components/auth/RegisterForm.vue'

const route = useRoute()
const router = useRouter()

const isRegister = ref(false)

function toggle() {
  isRegister.value = !isRegister.value
}

function onSuccess() {
  const redirect = route.query.redirect
  router.push(typeof redirect === 'string' ? redirect : { name: 'home' })
}

// 访问 /login?mode=register 可直接进入注册
if (route.query.mode === 'register') isRegister.value = true
</script>

<style scoped>
.auth {
  display: flex;
  justify-content: center;
  padding: 40px 0 20px;
}

.auth__card {
  width: 100%;
  max-width: 460px;
  padding: 32px;
}

.auth__title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
}

.auth__sub {
  margin: 0 0 26px;
  color: var(--text-3);
  font-size: 14px;
}

.auth__switch {
  margin-top: 22px;
  text-align: center;
  font-size: 14px;
}

@media (max-width: 480px) {
  .auth__card {
    padding: 22px;
  }
}
</style>
