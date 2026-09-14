<template>
  <div class="lazy-image" :style="{ paddingTop: aspect }">
    <img
      v-if="visible && src"
      :src="src"
      :alt="alt"
      class="lazy-image__img"
      :class="{ 'is-loaded': loaded }"
      @load="loaded = true"
      @error="onError"
    />

    <div v-else class="lazy-image__placeholder">
      <slot name="placeholder">
        <span class="lazy-image__icon">{{ fallbackText }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  aspect: { type: String, default: '56.25%' },
  fallbackText: { type: String, default: '暂无封面' }
})

const visible = ref(false)
const loaded = ref(false)
const failed = ref(false)
const root = ref(null)
let observer = null

function onError() {
  failed.value = true
  loaded.value = false
}

function observe() {
  if (typeof IntersectionObserver === 'undefined') {
    visible.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visible.value = true
          observer.disconnect()
          observer = null
        }
      }
    },
    { rootMargin: '200px' }
  )

  if (root.value) observer.observe(root.value)
}

onMounted(observe)

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

// src 变化时重置状态
watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
    if (!visible.value) visible.value = true
  }
)
</script>

<style scoped>
.lazy-image {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #f1f5f9;
  border-radius: 8px;
}

.lazy-image__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lazy-image__img.is-loaded {
  opacity: 1;
}

.lazy-image__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
}
</style>
