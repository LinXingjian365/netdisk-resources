<template>
  <div class="container">
    <h1 class="section-title">分类浏览</h1>

    <div class="cats">
      <button
        v-for="c in categories"
        :key="c"
        class="cat"
        :class="{ 'is-active': active === c }"
        :style="{ '--cat-color': categoryColor(c) }"
        @click="select(c)"
      >
        {{ c }}
      </button>
    </div>

    <ResourceList :key="active" :initial-category="active" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ResourceList from '../components/ResourceList.vue'
import { categoryColor } from '../utils/filters'

const categories = [
  '佛经',
  '道藏',
  '周易',
  '风水',
  '八字',
  '古籍',
  '课程教程',
  '软件工具',
  '影视资料',
  '其他'
]

const active = ref('')

function select(c) {
  active.value = active.value === c ? '' : c
}
</script>

<style scoped>
.cats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 22px;
}

.cat {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text-2);
  border-radius: 999px;
  padding: 7px 18px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.cat:hover {
  border-color: var(--cat-color);
  color: var(--cat-color);
}

.cat.is-active {
  background: var(--cat-color);
  border-color: var(--cat-color);
  color: #fff;
  font-weight: 600;
}
</style>
