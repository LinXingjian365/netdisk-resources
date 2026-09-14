<template>
  <section class="rlist">
    <!-- 搜索与筛选 -->
    <header class="rlist__toolbar card">
      <div class="rlist__search">
        <el-input
          v-model="keyword"
          placeholder="搜索标题、描述或标签"
          clearable
          size="large"
          @keyup.enter="doSearch"
          @clear="doSearch"
        >
          <template #append>
            <el-button :loading="loading" @click="doSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <div class="rlist__filters">
        <el-select v-model="category" placeholder="全部分类" clearable @change="reload">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>

        <el-select v-model="netdiskType" placeholder="全部网盘" clearable @change="reload">
          <el-option
            v-for="t in netdiskTypes"
            :key="t.value"
            :label="t.label"
            :value="t.value"
          />
        </el-select>

        <el-select v-model="sort" @change="reload">
          <el-option label="最新发布" value="latest" />
          <el-option label="最多浏览" value="hottest" />
          <el-option label="下载最多" value="mostDownloaded" />
          <el-option label="收藏最多" value="mostFavorited" />
        </el-select>

        <el-radio-group v-model="mode" size="default">
          <el-radio-button value="grid">网格</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
        </el-radio-group>
      </div>
    </header>

    <!-- 状态 -->
    <div v-if="loading" class="rlist__state">
      <el-skeleton :rows="4" animated />
    </div>

    <div v-else-if="error" class="rlist__state">
      <el-empty :description="error">
        <el-button type="primary" @click="reload">重试</el-button>
      </el-empty>
    </div>

    <div v-else-if="!items.length" class="rlist__state">
      <el-empty description="没有找到匹配的资源" />
    </div>

    <!-- 结果 -->
    <template v-else>
      <div class="rlist__grid" :class="`is-${mode}`">
        <ResourceCard
          v-for="item in items"
          :key="item.id"
          :resource="item"
          :mode="mode"
        />
      </div>

      <footer class="rlist__pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          background
          @current-change="reload"
        />
      </footer>
    </template>
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ResourceCard from './ResourceCard.vue'
import { resourceApi } from '../api/resources'
import { NETDISK_LABELS } from '../utils/filters'
import { useAppStore } from '../stores/app'

const props = defineProps({
  initialCategory: { type: String, default: '' },
  initialKeyword: { type: String, default: '' }
})

const app = useAppStore()

const items = ref([])
const loading = ref(false)
const error = ref('')

const keyword = ref(props.initialKeyword)
const category = ref(props.initialCategory)
const netdiskType = ref('')
const sort = ref('latest')
const mode = ref('grid')

const page = ref(1)
const pageSize = ref(12)
const total = ref(0)

const categories = ref([])
const netdiskTypes = Object.entries(NETDISK_LABELS).map(([value, label]) => ({ value, label }))

async function loadMeta() {
  try {
    const res = await resourceApi.filters()
    categories.value = res.data.categories
  } catch {
    // 后端不可用时用本地兜底，保证页面不白屏
    categories.value = ['佛经', '道藏', '周易', '风水', '八字', '古籍', '课程教程', '软件工具', '影视资料', '其他']
  }
}

async function reload() {
  loading.value = true
  error.value = ''

  try {
    const res = await resourceApi.list({
      keyword: keyword.value,
      category: category.value,
      netdiskType: netdiskType.value,
      sort: sort.value,
      page: page.value,
      pageSize: pageSize.value
    })

    items.value = (res.data.items || []).map((it) => ({ ...it, id: it.id || it._id }))
    total.value = res.data.pagination?.total || 0
  } catch (e) {
    items.value = []
    total.value = 0
    error.value = e.message || '加载失败'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

function doSearch() {
  page.value = 1
  if (keyword.value.trim()) app.pushSearchHistory(keyword.value)
  reload()
}

watch(sort, () => {
  page.value = 1
})

onMounted(async () => {
  await loadMeta()
  await reload()
})

defineExpose({ reload })
</script>

<style scoped>
.rlist__toolbar {
  padding: 16px;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rlist__filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.rlist__grid {
  display: grid;
  gap: 16px;
}

.rlist__grid.is-grid {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.rlist__grid.is-list {
  grid-template-columns: 1fr;
}

.rlist__state {
  padding: 30px 0;
}

.rlist__pager {
  display: flex;
  justify-content: center;
  margin-top: 26px;
}

@media (max-width: 480px) {
  .rlist__grid.is-grid {
    grid-template-columns: 1fr;
  }
}
</style>
