<template>
  <div class="a11y">
    <h4 class="a11y__title">无障碍设置</h4>

    <div class="a11y__item">
      <div class="a11y__label">
        <span>高对比度</span>
        <small>增强文字与背景的对比</small>
      </div>
      <el-switch
        :model-value="settings.highContrast"
        @update:model-value="(v) => update('highContrast', v)"
      />
    </div>

    <div class="a11y__item">
      <div class="a11y__label">
        <span>大字号</span>
        <small>整体放大页面文字</small>
      </div>
      <el-switch
        :model-value="settings.largeText"
        @update:model-value="(v) => update('largeText', v)"
      />
    </div>

    <div class="a11y__item">
      <div class="a11y__label">
        <span>减少动画</span>
        <small>降低过渡与动画效果</small>
      </div>
      <el-switch
        :model-value="settings.reduceMotion"
        @update:model-value="(v) => update('reduceMotion', v)"
      />
    </div>

    <el-button size="small" text class="a11y__reset" @click="reset">恢复默认</el-button>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '../stores/app'

const app = useAppStore()

const settings = computed(() => app.settings)

function update(key, value) {
  app.updateSetting(key, value)
}

function reset() {
  app.updateSetting('highContrast', false)
  app.updateSetting('largeText', false)
  app.updateSetting('reduceMotion', false)
  ElMessage.success('已恢复默认设置')
}

onMounted(() => {
  app.applySettings()
})
</script>

<style scoped>
.a11y {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}

.a11y__title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
}

.a11y__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.a11y__item:last-of-type {
  border-bottom: none;
}

.a11y__label {
  display: flex;
  flex-direction: column;
}

.a11y__label span {
  font-size: 14px;
}

.a11y__label small {
  color: var(--text-3);
  font-size: 12px;
}

.a11y__reset {
  margin-top: 12px;
  padding-left: 0;
}
</style>
