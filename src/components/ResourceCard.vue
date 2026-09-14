<template>
  <article class="rcard" :class="{ 'is-list': mode === 'list' }">
    <div class="rcard__cover">
      <LazyImage :src="resource.cover" :alt="resource.title" aspect="60%" :fallback-text="resource.category" />
    </div>

    <div class="rcard__body">
      <div class="rcard__tags">
        <span class="rcard__cat" :style="{ background: categoryColor(resource.category) }">
          {{ resource.category }}
        </span>
        <span class="rcard__net">{{ netdiskLabel(resource.netdiskType) }}</span>
      </div>

      <h3 class="rcard__title" :title="resource.title">
        <RouterLink :to="{ name: 'resource-detail', params: { id: resource.id } }">
          {{ resource.title }}
        </RouterLink>
      </h3>

      <p v-if="resource.description" class="rcard__desc">
        {{ resource.description }}
      </p>

      <div class="rcard__meta">
        <span><i class="dot" />{{ formatCount(resource.views || 0) }} 浏览</span>
        <span>{{ formatCount(resource.downloads || 0) }} 下载</span>
        <span>{{ fromNow(resource.createdAt) }}</span>
      </div>

      <div class="rcard__actions">
        <el-button size="small" type="primary" @click="open">
          查看资源
        </el-button>

        <el-button size="small" @click="copyLink">
          {{ copied ? '已复制' : '复制链接' }}
        </el-button>

        <el-button
          size="small"
          :type="favorited ? 'warning' : 'default'"
          @click="onToggleFavorite"
        >
          {{ favorited ? '已收藏' : '收藏' }}
        </el-button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import LazyImage from './LazyImage.vue'
import { useClipboard } from '../composables/useClipboard'
import { useAppStore } from '../stores/app'
import { netdiskLabel, categoryColor, formatCount, fromNow } from '../utils/filters'

const props = defineProps({
  resource: { type: Object, required: true },
  mode: { type: String, default: 'grid' }
})

const router = useRouter()
const app = useAppStore()
const { copied, copy } = useClipboard()

const favorited = computed(() => app.isFavorite(props.resource.id))

function open() {
  router.push({ name: 'resource-detail', params: { id: props.resource.id } })
}

function copyLink() {
  const text = props.resource.extractCode
    ? `${props.resource.url} 提取码: ${props.resource.extractCode}`
    : props.resource.url
  copy(text, '链接与提取码已复制')
}

function onToggleFavorite() {
  const added = app.toggleFavorite(props.resource)
  ElMessage.success(added ? '已加入收藏' : '已取消收藏')
}
</script>

<style scoped>
.rcard {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  height: 100%;
}

.rcard:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}

.rcard__cover {
  flex-shrink: 0;
}

.rcard__body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.rcard__tags {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.rcard__cat {
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
}

.rcard__net {
  font-size: 12px;
  color: var(--text-3);
}

.rcard__title {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rcard__title a:hover {
  color: var(--brand-600);
}

.rcard__desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rcard__meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-3);
  margin-top: auto;
}

.rcard__meta .dot {
  display: none;
}

.rcard__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 列表模式 */
.rcard.is-list {
  flex-direction: row;
  align-items: stretch;
}

.rcard.is-list .rcard__cover {
  width: 200px;
}

@media (max-width: 640px) {
  .rcard.is-list {
    flex-direction: column;
  }
  .rcard.is-list .rcard__cover {
    width: 100%;
  }
}
</style>
