<template>
  <div class="container detail">
    <el-button link class="back" @click="$router.back()">← 返回</el-button>

    <div v-if="loading" class="detail__state">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else-if="error" class="detail__state">
      <el-empty :description="error">
        <el-button type="primary" @click="load">重试</el-button>
      </el-empty>
    </div>

    <article v-else class="detail__body card">
      <header class="detail__head">
        <span class="detail__cat" :style="{ background: categoryColor(resource.category) }">
          {{ resource.category }}
        </span>
        <h1 class="detail__title">{{ resource.title }}</h1>

        <div class="detail__meta">
          <span>{{ netdiskLabel(resource.netdiskType) }}</span>
          <span>{{ formatCount(resource.views || 0) }} 浏览</span>
          <span>{{ formatCount(resource.downloads || 0) }} 下载</span>
          <span>{{ formatDate(resource.createdAt) }}</span>
        </div>
      </header>

      <p v-if="resource.description" class="detail__desc">{{ resource.description }}</p>

      <div v-if="resource.tags?.length" class="detail__tags">
        <el-tag v-for="t in resource.tags" :key="t" size="small" effect="plain">
          {{ t }}
        </el-tag>
      </div>

      <el-divider />

      <section class="detail__link">
        <div class="detail__linkbox">
          <div class="detail__linkrow">
            <span class="label">链接</span>
            <a :href="resource.url" target="_blank" rel="noopener" class="url">
              {{ resource.url }}
            </a>
          </div>

          <div v-if="resource.extractCode" class="detail__linkrow">
            <span class="label">提取码</span>
            <code class="code">{{ resource.extractCode }}</code>
          </div>
        </div>

        <div class="detail__ops">
          <el-button type="primary" @click="copyAll">复制链接与提取码</el-button>
          <el-button :type="favorited ? 'warning' : 'default'" @click="toggleFav">
            {{ favorited ? '已收藏' : '收藏' }}
          </el-button>
          <el-button @click="openLink">打开网盘</el-button>
        </div>
      </section>

      <el-alert type="info" :closable="false" show-icon class="tip">
        资源链接来自用户分享，请遵守相关平台规则。如链接失效，欢迎在联系页面反馈。
      </el-alert>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { resourceApi } from '../api/resources'
import { useAppStore } from '../stores/app'
import { useClipboard } from '../composables/useClipboard'
import { netdiskLabel, categoryColor, formatCount, formatDate } from '../utils/filters'

const route = useRoute()
const app = useAppStore()
const { copy } = useClipboard()

const resource = ref(null)
const loading = ref(false)
const error = ref('')

const favorited = computed(() => (resource.value ? app.isFavorite(resource.value.id) : false))

async function load() {
  loading.value = true
  error.value = ''

  try {
    const res = await resourceApi.detail(route.params.id)
    resource.value = { ...res.data, id: res.data.id || res.data._id }
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function copyAll() {
  const text = resource.value.extractCode
    ? `${resource.value.url} 提取码: ${resource.value.extractCode}`
    : resource.value.url
  copy(text)
}

function toggleFav() {
  const added = app.toggleFavorite(resource.value)
  ElMessage.success(added ? '已加入收藏' : '已取消收藏')
}

function openLink() {
  window.open(resource.value.url, '_blank', 'noopener')
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<style scoped>
.detail {
  max-width: 900px;
}

.back {
  margin-bottom: 14px;
}

.detail__state {
  padding: 30px 0;
}

.detail__body {
  padding: 26px;
}

.detail__cat {
  display: inline-block;
  color: #fff;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
}

.detail__title {
  margin: 0 0 12px;
  font-size: 26px;
  line-height: 1.4;
}

.detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--text-3);
}

.detail__desc {
  margin: 20px 0 0;
  color: var(--text-2);
  white-space: pre-wrap;
}

.detail__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.detail__link {
  margin: 8px 0 20px;
}

.detail__linkbox {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 16px;
}

.detail__linkrow {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.detail__linkrow:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 13px;
  color: var(--text-3);
  flex-shrink: 0;
  width: 56px;
}

.url {
  color: var(--brand-600);
  word-break: break-all;
}

.code {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 10px;
  font-weight: 600;
  letter-spacing: 1px;
}

.detail__ops {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tip {
  margin-top: 6px;
}

@media (max-width: 640px) {
  .detail__body {
    padding: 18px;
  }
  .detail__title {
    font-size: 21px;
  }
}
</style>
