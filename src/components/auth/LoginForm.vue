<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    @submit.prevent="onSubmit"
  >
    <el-form-item label="邮箱" prop="email">
      <el-input
        v-model="form.email"
        size="large"
        placeholder="请输入注册邮箱"
        autocomplete="email"
        :prefix-icon="Message"
      />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        v-model="form.password"
        size="large"
        type="password"
        show-password
        placeholder="请输入密码"
        autocomplete="current-password"
        :prefix-icon="Lock"
        @keyup.enter="onSubmit"
      />
    </el-form-item>

    <el-form-item>
      <div class="row-between">
        <el-checkbox v-model="form.remember">记住我</el-checkbox>
      </div>
    </el-form-item>

    <el-button
      type="primary"
      size="large"
      class="submit"
      :loading="loading"
      @click="onSubmit"
    >
      登录
    </el-button>
  </el-form>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Message, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits(['success'])

const auth = useAuthStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  email: '',
  password: '',
  remember: true
})

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function onSubmit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await auth.login({
      email: form.email.trim(),
      password: form.password,
      remember: form.remember
    })

    ElMessage.success('登录成功，欢迎回来！')
    emit('success')
  } catch (e) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.submit {
  width: 100%;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
</style>
