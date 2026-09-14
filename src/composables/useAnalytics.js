/**
 * 轻量用户行为分析（本地埋点）。
 * 事件写入 localStorage，超过 7 天或超过 200 条自动清理，避免无限制增长。
 */

const KEY = 'app:analytics'
const MAX_EVENTS = 200
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function write(events) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events))
  } catch {
    /* 忽略写入失败 */
  }
}

function prune(events) {
  const cutoff = Date.now() - MAX_AGE_MS
  return events.filter((e) => e.timestamp > cutoff).slice(-MAX_EVENTS)
}

export function track(event, payload = {}) {
  const events = read()

  events.push({
    event,
    payload,
    timestamp: Date.now(),
    path: location.pathname
  })

  write(prune(events))
}

export function useAnalytics() {
  return {
    track,

    /** 页面浏览 */
    trackPageView(name) {
      track('page_view', { name })
    },

    /** 资源搜索 */
    trackSearch(keyword, resultCount) {
      track('search', { keyword, resultCount })
    },

    /** 资源点击/复制 */
    trackResourceAction(action, resourceId) {
      track('resource_action', { action, resourceId })
    },

    getEvents() {
      return read()
    },

    /** 各事件类型计数 */
    summary() {
      const counts = {}
      for (const e of read()) {
        counts[e.event] = (counts[e.event] || 0) + 1
      }
      return counts
    },

    clear() {
      write([])
    }
  }
}

export default useAnalytics
