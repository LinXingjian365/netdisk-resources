/** 网盘类型展示名 */
export const NETDISK_LABELS = {
  baidu: '百度网盘',
  aliyun: '阿里云盘',
  tianyi: '天翼云盘',
  quark: '夸克网盘',
  xunlei: '迅雷网盘',
  '115': '115网盘',
  other: '其他网盘'
}

/** 分类配色 */
export const CATEGORY_COLORS = {
  佛经: '#f59e0b',
  道藏: '#10b981',
  周易: '#6366f1',
  风水: '#06b6d4',
  八字: '#8b5cf6',
  古籍: '#a16207',
  课程教程: '#3b82f6',
  软件工具: '#64748b',
  影视资料: '#ec4899',
  其他: '#94a3b8'
}

export function netdiskLabel(type) {
  return NETDISK_LABELS[type] || '其他网盘'
}

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || '#94a3b8'
}

/** 日期格式化：2026-09-14 16:30 */
export function formatDate(input) {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return '-'

  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

/** 相对时间：3 分钟前 */
export function fromNow(input) {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return '-'

  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)

  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`

  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`

  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`

  return formatDate(input).slice(0, 10)
}

/** 数字缩写：12000 -> 1.2万 */
export function formatCount(n) {
  const num = Number(n) || 0
  if (num < 10000) return String(num)
  return `${(num / 10000).toFixed(1)}万`
}

/** 邮箱脱敏：abc***@qq.com */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || ''
  const [name, domain] = email.split('@')
  const visible = name.slice(0, Math.min(3, name.length))
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`
}

export default {
  NETDISK_LABELS,
  CATEGORY_COLORS,
  netdiskLabel,
  categoryColor,
  formatDate,
  fromNow,
  formatCount,
  maskEmail
}
