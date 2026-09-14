<template>
  <div ref="viewport" class="virtual-list" :style="{ height: `${height}px` }" @scroll="onScroll">
    <div class="virtual-list__spacer" :style="{ height: `${totalHeight}px` }">
      <div
        class="virtual-list__window"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div
          v-for="(item, i) in visibleItems"
          :key="itemKey ? item[itemKey] : startIndex + i"
          class="virtual-list__item"
          :style="{ height: `${itemHeight}px` }"
        >
          <slot :item="item" :index="startIndex + i" />
        </div>
      </div>
    </div>

    <div v-if="!items.length" class="virtual-list__empty">
      <slot name="empty">暂无数据</slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  itemHeight: { type: Number, default: 88 },
  height: { type: Number, default: 480 },
  buffer: { type: Number, default: 4 },
  itemKey: { type: String, default: 'id' }
})

const viewport = ref(null)
const scrollTop = ref(0)

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
}

const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer)
)

const visibleCount = computed(
  () => Math.ceil(props.height / props.itemHeight) + props.buffer * 2
)

const endIndex = computed(() =>
  Math.min(props.items.length, startIndex.value + visibleCount.value)
)

const visibleItems = computed(() => props.items.slice(startIndex.value, endIndex.value))

const offsetY = computed(() => startIndex.value * props.itemHeight)

defineExpose({
  scrollToTop() {
    if (viewport.value) viewport.value.scrollTop = 0
  }
})
</script>

<style scoped>
.virtual-list {
  overflow-y: auto;
  position: relative;
  will-change: transform;
}

.virtual-list__spacer {
  position: relative;
}

.virtual-list__window {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-list__empty {
  padding: 40px 0;
  text-align: center;
  color: #9ca3af;
}
</style>
