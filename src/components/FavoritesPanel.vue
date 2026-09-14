<template>
  <div class="fav">
    <header class="fav__head">
      <h4 class="fav__title">我的收藏（{{ app.favoriteCount }}）</h4>
      <el-button v-if="app.favoriteCount" size="small" text type="danger" @click="onClear">
        清空
      </el-button>
    </header>

    <el-empty v-if="!app.favoriteCount" description="还没有收藏任何资源" :image-size="90" />

    <ul v-else class="fav__list">
      <li v-for="item in app.favorites" :key="item.id" class="fav__item">
        <div class="fav__info">
          <RouterLink
            :to="{ name: 'resource-detail', params: { id: item.id } }"
            class="fav__name"
          >
            {{ item.title }}
          </RouterLink>
          <div class="fav__meta">
            <span>{{ item.category }}</span>
            <span>{{ netdiskLabel(item.netdiskType) }}</span>
            <span>{{ fromNow(item.addedAt) }}</span>
          </div>
        </div>

        <div class="fav__ops">
          <el-button size="small" @click="copy(item.url)">复制链接</el-button>
          <el-button size="small" type="danger" text @click="app.removeFavorite(item.id)">
            移除
          </el-button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '../stores/app'
import { useClipboard } from '../composables/useClipboard'
import { netdiskLabel, fromNow } from '../utils/filters'

const app = useAppStore()
const { copy } = useClipboard()

async function onClear() {
  try {
    await ElMessageBox.confirm('确定要清空全部收藏吗？此操作不可撤销。', '确认', {
      type: 'warning'
    })
    app.clearFavorites()
    ElMessage.success('已清空收藏')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.fav {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}

.fav__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.fav__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.fav__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.fav__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.fav__item:last-child {
  border-bottom: none;
}

.fav__name {
  font-size: 14px;
  font-weight: 500;
}

.fav__name:hover {
  color: var(--brand-600);
}

.fav__meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-3);
  margin-top: 4px;
}

.fav__ops {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .fav__item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
