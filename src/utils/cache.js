/**
 * 轻量内存缓存（带 TTL），用于 GET 请求结果。
 * 页面刷新即失效，不做持久化，避免脏数据。
 */

const store = new Map()

export function cacheGet(key) {
  const hit = store.get(key)
  if (!hit) return undefined

  if (Date.now() > hit.expiresAt) {
    store.delete(key)
    return undefined
  }

  return hit.value
}

export function cacheSet(key, value, ttl = 5 * 60 * 1000) {
  store.set(key, { value, expiresAt: Date.now() + ttl })

  // 防止无限增长
  if (store.size > 200) {
    const oldestKey = store.keys().next().value
    if (oldestKey) store.delete(oldestKey)
  }

  return value
}

/** 支持精确删除与前缀删除 */
export function cacheDel(keyOrPrefix) {
  if (store.has(keyOrPrefix)) {
    store.delete(keyOrPrefix)
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(keyOrPrefix)) store.delete(key)
  }
}

export function clearCache() {
  store.clear()
}

export default { cacheGet, cacheSet, cacheDel, clearCache }
