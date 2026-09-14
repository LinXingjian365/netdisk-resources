import axios from 'axios'
import { cacheGet, cacheSet, cacheDel } from '../utils/cache'

export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// ---------- 请求拦截：附带令牌 ----------
http.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---------- 响应拦截：统一解包 + 错误规范化 ----------
http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请稍后重试'))
    }

    if (!error.response) {
      return Promise.reject(
        new Error('无法连接到服务器，请确认后端服务已启动（默认 http://localhost:3000）')
      )
    }

    const { status, data } = error.response

    if (status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
    }

    const message =
      (data && (data.message || data.error)) ||
      (status === 429 ? '请求过于频繁，请稍后再试' : `请求失败（${status}）`)

    return Promise.reject(Object.assign(new Error(message), { status, data }))
  }
)

/**
 * 带缓存的 GET。
 * @param {string} url
 * @param {object} config
 * @param {number} ttl 缓存有效期，默认 5 分钟
 */
export async function cachedGet(url, config = {}, ttl = 5 * 60 * 1000) {
  const key = `GET:${url}:${JSON.stringify(config.params || {})}`

  const hit = cacheGet(key)
  if (hit) return hit

  const data = await http.get(url, config)
  cacheSet(key, data, ttl)
  return data
}

/** 失效某个前缀下的缓存（例如在发布资源后刷新列表） */
export function invalidateCache(prefix) {
  cacheDel(prefix)
}

export default http
