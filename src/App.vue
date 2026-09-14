<template>
  <div class="app">
    <header class="header glass">
      <div class="container header__inner">
        <RouterLink :to="{ name: 'home' }" class="brand">
          <span class="brand__mark">资</span>
          <span class="brand__text">网络资源教程库</span>
        </RouterLink>

        <nav class="nav">
          <RouterLink :to="{ name: 'home' }" class="nav__link">首页</RouterLink>
          <RouterLink :to="{ name: 'categories' }" class="nav__link">分类</RouterLink>
          <RouterLink :to="{ name: 'contact' }" class="nav__link">联系</RouterLink>
        </nav>

        <div class="actions">
          <template v-if="auth.isAuthenticated">
            <el-dropdown @command="onCommand">
              <span class="user">
                <span class="user__avatar">{{ initial }}</span>
                <span class="user__name">{{ auth.user?.username }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>

          <template v-else>
            <el-button text @click="$router.push({ name: 'login' })">登录</el-button>
            <el-button type="primary" @click="$router.push({ name: 'login', query: { mode: 'register' } })">
              注册
            </el-button>
          </template>
        </div>
      </div>
    </header>

    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="footer">
      <div class="container footer__inner">
        <p class="footer__brand">网络资源教程库 · 培鑫盈资源教程分享</p>
        <p class="footer__copy muted">© {{ year }} Aspire Edge Studio. 资源链接均来自网络分享。</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from './stores/auth'
import { useAppStore } from './stores/app'

const router = useRouter()
const auth = useAuthStore()
const app = useAppStore()

const year = new Date().getFullYear()
const initial = computed(() => (auth.user?.username || 'U').charAt(0).toUpperCase())

async function onCommand(cmd) {
  if (cmd === 'profile') {
    router.push({ name: 'profile' })
    return
  }

  if (cmd === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '确认', { type: 'warning' })
    } catch {
      return
    }
    await auth.logout()
    ElMessage.success('已退出登录')
    router.push({ name: 'home' })
  }
}

onMounted(() => {
  app.applySettings()
  auth.restore()
})
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border);
  height: var(--header-h);
}

.header__inner {
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.brand__mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.nav {
  display: flex;
  gap: 20px;
  margin-left: 12px;
  flex: 1;
}

.nav__link {
  font-size: 15px;
  color: var(--text-2);
  padding: 6px 0;
  position: relative;
}

.nav__link:hover {
  color: var(--brand-600);
}

.nav__link.router-link-active {
  color: var(--brand-600);
  font-weight: 600;
}

.nav__link.router-link-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  background: var(--brand-500);
  border-radius: 2px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.user__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand-500);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user__name {
  font-size: 14px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer {
  border-top: 1px solid var(--border);
  background: var(--surface);
  padding: 26px 0;
}

.footer__inner {
  text-align: center;
}

.footer__brand {
  margin: 0 0 6px;
  font-weight: 600;
}

.footer__copy {
  margin: 0;
  font-size: 13px;
}

@media (max-width: 640px) {
  .brand__text {
    display: none;
  }
  .user__name {
    display: none;
  }
  .nav {
    gap: 14px;
  }
}
</style>
