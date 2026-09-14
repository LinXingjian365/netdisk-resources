<template>
  <div class="container profile">
    <h1 class="section-title">个人中心</h1>

    <div class="profile__grid">
      <aside class="profile__side">
        <div class="card profile__card">
          <div class="profile__avatar">{{ initial }}</div>
          <h3 class="profile__name">{{ auth.user?.username }}</h3>
          <p class="muted profile__email">{{ auth.user?.email }}</p>

          <el-tag v-if="auth.user?.email_verified" type="success" size="small" effect="light">
            邮箱已验证
          </el-tag>
          <el-tag v-else type="warning" size="small" effect="light">邮箱未验证</el-tag>

          <div class="profile__stats">
            <div>
              <strong>{{ app.favoriteCount }}</strong>
              <span>收藏</span>
            </div>
            <div>
              <strong>{{ app.searchHistory.length }}</strong>
              <span>搜索</span>
            </div>
          </div>

          <el-button class="profile__logout" type="danger" plain @click="onLogout">
            退出登录
          </el-button>
        </div>

        <AccessibilityPanel class="profile__a11y" />
      </aside>

      <main class="profile__main">
        <el-tabs v-model="tab">
          <el-tab-pane label="我的收藏" name="favorites">
            <FavoritesPanel />
          </el-tab-pane>

          <el-tab-pane label="搜索历史" name="history">
            <div class="card history">
              <header class="history__head">
                <h4>搜索历史（{{ app.searchHistory.length }}）</h4>
                <el-button
                  v-if="app.searchHistory.length"
                  size="small"
                  text
                  type="danger"
                  @click="app.clearSearchHistory()"
                >
                  清空
                </el-button>
              </header>

              <el-empty
                v-if="!app.searchHistory.length"
                description="暂无搜索记录"
                :image-size="90"
              />

              <div v-else class="history__tags">
                <el-tag
                  v-for="kw in app.searchHistory"
                  :key="kw"
                  closable
                  effect="plain"
                  @close="app.removeSearchHistory(kw)"
                >
                  {{ kw }}
                </el-tag>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="发布资源" name="publish">
            <div class="card publish">
              <el-alert
                v-if="!auth.isAuthenticated"
                type="warning"
                :closable="false"
                show-icon
                title="请先登录"
              />

              <el-form :model="draft" :rules="publishRules" ref="publishForm" label-position="top">
                <el-form-item label="标题" prop="title">
                  <el-input v-model="draft.title" placeholder="资源标题" maxlength="120" show-word-limit />
                </el-form-item>

                <el-form-item label="网盘链接" prop="url">
                  <el-input v-model="draft.url" placeholder="https://pan.baidu.com/..." />
                </el-form-item>

                <el-form-item label="提取码">
                  <el-input v-model="draft.extractCode" placeholder="选填" maxlength="20" />
                </el-form-item>

                <div class="publish__row">
                  <el-form-item label="分类" prop="category">
                    <el-select v-model="draft.category" placeholder="选择分类">
                      <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="网盘类型" prop="netdiskType">
                    <el-select v-model="draft.netdiskType" placeholder="选择网盘">
                      <el-option
                        v-for="t in netdiskTypes"
                        :key="t.value"
                        :label="t.label"
                        :value="t.value"
                      />
                    </el-select>
                  </el-form-item>
                </div>

                <el-form-item label="描述">
                  <el-input
                    v-model="draft.description"
                    type="textarea"
                    :rows="3"
                    maxlength="2000"
                    show-word-limit
                    placeholder="简单描述这个资源"
                  />
                </el-form-item>

                <el-button type="primary" :loading="publishing" @click="onPublish">
                  发布资源
                </el-button>
              </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AccessibilityPanel from '../components/AccessibilityPanel.vue'
import FavoritesPanel from '../components/FavoritesPanel.vue'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'
import { resourceApi } from '../api/resources'
import { invalidateCache } from '../api/client'
import { NETDISK_LABELS } from '../utils/filters'

const router = useRouter()
const auth = useAuthStore()
const app = useAppStore()

const tab = ref('favorites')
const publishForm = ref(null)
const publishing = ref(false)

const categories = [
  '佛经', '道藏', '周易', '风水', '八字', '古籍', '课程教程', '软件工具', '影视资料', '其他'
]
const netdiskTypes = Object.entries(NETDISK_LABELS).map(([value, label]) => ({ value, label }))

const draft = reactive({
  title: '',
  url: '',
  extractCode: '',
  category: '',
  netdiskType: '',
  description: ''
})

const publishRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  url: [{ required: true, message: '请输入网盘链接', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  netdiskType: [{ required: true, message: '请选择网盘类型', trigger: 'change' }]
}

const initial = computed(() => (auth.user?.username || 'U').charAt(0).toUpperCase())

async function onPublish() {
  const valid = await publishForm.value?.validate().catch(() => false)
  if (!valid) return

  publishing.value = true
  try {
    await resourceApi.create({ ...draft })
    invalidateCache('GET:/resources')

    ElMessage.success('发布成功')
    Object.assign(draft, {
      title: '', url: '', extractCode: '', category: '', netdiskType: '', description: ''
    })
  } catch (e) {
    ElMessage.error(e.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

async function onLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '确认', { type: 'warning' })
  } catch {
    return
  }

  await auth.logout()
  ElMessage.success('已退出登录')
  router.push({ name: 'home' })
}
</script>

<style scoped>
.profile__grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;
}

.profile__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile__card {
  padding: 22px;
  text-align: center;
}

.profile__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.profile__name {
  margin: 0 0 4px;
  font-size: 17px;
}

.profile__email {
  font-size: 13px;
  margin: 0 0 10px;
  word-break: break-all;
}

.profile__stats {
  display: flex;
  justify-content: center;
  gap: 26px;
  margin: 18px 0;
}

.profile__stats div {
  display: flex;
  flex-direction: column;
}

.profile__stats strong {
  font-size: 19px;
}

.profile__stats span {
  font-size: 12px;
  color: var(--text-3);
}

.profile__logout {
  width: 100%;
}

.history,
.publish {
  padding: 18px;
}

.history__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.history__head h4 {
  margin: 0;
  font-size: 15px;
}

.history__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.publish__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 860px) {
  .profile__grid {
    grid-template-columns: 1fr;
  }
  .profile__a11y {
    order: 2;
  }
}
</style>
