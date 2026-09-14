import { ref } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 剪贴板复制，带降级方案与用户反馈。
 * navigator.clipboard 在非 HTTPS 环境下不可用，故提供 textarea + execCommand 兜底。
 */
export function useClipboard() {
  const copied = ref(false)
  let timer = null

  async function copy(text, successMessage = '已复制到剪贴板') {
    if (!text) {
      ElMessage.warning('没有可复制的内容')
      return false
    }

    let ok = false

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        ok = true
      } else {
        // 降级方案
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      ok = false
    }

    if (ok) {
      copied.value = true
      ElMessage.success(successMessage)

      clearTimeout(timer)
      timer = setTimeout(() => {
        copied.value = false
      }, 2000)
    } else {
      ElMessage.error('复制失败，请手动选择复制')
    }

    return ok
  }

  return { copied, copy }
}

export default useClipboard
