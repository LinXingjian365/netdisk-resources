<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="container hero__inner">
        <h1 class="hero__title">
          发现优质<span class="gradient-text">网络资源教程</span>
        </h1>
        <p class="hero__sub">
          汇聚佛经、道藏、周易、古籍、课程教程等分类资源，一键直达网盘链接。
        </p>

        <div class="hero__search">
          <el-input
            v-model="heroKeyword"
            size="large"
            placeholder="搜索你需要的资源…"
            clearable
            @keyup.enter="goSearch"
          >
            <template #append>
              <el-button type="primary" @click="goSearch">搜索</el-button>
            </template>
          </el-input>
        </div>

        <div v-if="app.searchHistory.length" class="hero__history">
          <span class="muted">最近搜索：</span>
          <el-tag
            v-for="kw in app.searchHistory.slice(0, 6)"
            :key="kw"
            size="small"
            effect="plain"
            closable
            @close="app.removeSearchHistory(kw)"
            @click="useHistory(kw)"
          >
            {{ kw }}
          </el-tag>
        </div>
      </div>
    </section>

    <!-- 资源列表 -->
    <section class="container">
      <h2 class="section-title">全部资源</h2>
      <ResourceList ref="listRef" :initial-keyword="activeKeyword" />
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ResourceList from '../components/ResourceList.vue'
import { useAppStore } from '../stores/app'
import { useAnalytics } from '../composables/useAnalytics'

const app = useAppStore()
const { trackPageView, trackSearch } = useAnalytics()

const heroKeyword = ref('')
const activeKeyword = ref('')
const listRef = ref(null)

function goSearch() {
  activeKeyword.value = heroKeyword.value.trim()

  if (activeKeyword.value) {
    app.pushSearchHistory(activeKeyword.value)
    trackSearch(activeKeyword.value)
  }

  listRef.value?.reload()
}

function useHistory(kw) {
  heroKeyword.value = kw
  goSearch()
}

onMounted(() => trackPageView('home'))
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
  border-bottom: 1px solid var(--border);
  padding: 52px 0 40px;
  margin-bottom: 28px;
}

.hero__inner {
  text-align: center;
}

.hero__title {
  font-size: 34px;
  font-weight: 800;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.hero__sub {
  color: var(--text-2);
  margin: 0 auto 26px;
  max-width: 620px;
  font-size: 15px;
}

.hero__search {
  max-width: 620px;
  margin: 0 auto;
}

.hero__history {
  max-width: 620px;
  margin: 16px auto 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.hero__history .el-tag {
  cursor: pointer;
}

@media (max-width: 640px) {
  .hero {
    padding: 34px 0 28px;
  }
  .hero__title {
    font-size: 25px;
  }
}
</style>
