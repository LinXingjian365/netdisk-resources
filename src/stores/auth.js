import { defineStore } from 'pinia'
import { authApi } from '../api/auth'

const TOKEN_KEY = 'accessToken'
const REFRESH_KEY = 'refreshToken'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem(TOKEN_KEY) || null,
    refreshToken: localStorage.getItem(REFRESH_KEY) || null,
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    isAdmin: (state) => state.user?.role === 'admin',
    username: (state) => state.user?.username || ''
  },

  actions: {
    /** @param {boolean} remember true 写入 localStorage，false 写入 sessionStorage */
    persist(remember = true) {
      const store = remember ? localStorage : sessionStorage

      if (this.token) store.setItem(TOKEN_KEY, this.token)
      if (this.refreshToken) store.setItem(REFRESH_KEY, this.refreshToken)
    },

    clearStorage() {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(REFRESH_KEY)
    },

    async login({ email, password, remember = true }) {
      this.loading = true
      try {
        const res = await authApi.login({ email, password })

        this.user = res.data.user
        this.token = res.data.token
        this.refreshToken = res.data.refreshToken
        this.persist(remember)

        return res.data.user
      } finally {
        this.loading = false
      }
    },

    async register(payload) {
      this.loading = true
      try {
        const res = await authApi.register(payload)

        this.user = res.data.user
        this.token = res.data.token
        this.refreshToken = res.data.refreshToken
        this.persist(true)

        return res.data.user
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        if (this.token) await authApi.logout()
      } catch {
        // 后端登出失败也要清理本地状态
      } finally {
        this.user = null
        this.token = null
        this.refreshToken = null
        this.clearStorage()
      }
    },

    /** 刷新页面后恢复会话 */
    async restore() {
      if (this.initialized) return
      this.initialized = true

      if (!this.token) return

      try {
        const res = await authApi.profile()
        this.user = res.data.user
      } catch {
        this.user = null
        this.token = null
        this.refreshToken = null
        this.clearStorage()
      }
    },

    async fetchProfile() {
      const res = await authApi.profile()
      this.user = res.data.user
      return this.user
    },

    async updateProfile(patch) {
      const res = await authApi.updateProfile(patch)
      this.user = res.data.user
      return this.user
    },

    async refreshAccessToken() {
      if (!this.refreshToken) return null

      try {
        const res = await authApi.refresh(this.refreshToken)
        this.token = res.data.token
        localStorage.setItem(TOKEN_KEY, this.token)
        return this.token
      } catch {
        this.user = null
        this.token = null
        this.refreshToken = null
        this.clearStorage()
        return null
      }
    }
  }
})

export default useAuthStore
