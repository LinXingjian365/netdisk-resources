import { defineStore } from 'pinia'

const SETTINGS_KEY = 'app:settings'
const FAVORITES_KEY = 'app:favorites'
const HISTORY_KEY = 'app:searchHistory'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 忽略隐私模式下的写入失败 */
  }
}

const defaultSettings = {
  highContrast: false,
  largeText: false,
  reduceMotion: false
}

export const useAppStore = defineStore('app', {
  state: () => ({
    settings: { ...defaultSettings, ...load(SETTINGS_KEY, {}) },
    favorites: load(FAVORITES_KEY, []),
    searchHistory: load(HISTORY_KEY, []),
    globalLoading: false
  }),

  getters: {
    favoriteCount: (state) => state.favorites.length,
    isFavorite: (state) => (id) => state.favorites.some((f) => f.id === id)
  },

  actions: {
    // ---------- 无障碍设置 ----------
    updateSetting(key, value) {
      this.settings[key] = value
      save(SETTINGS_KEY, this.settings)
      this.applySettings()
    },

    applySettings() {
      const root = document.documentElement
      root.classList.toggle('high-contrast', this.settings.highContrast)
      root.classList.toggle('large-text', this.settings.largeText)
    },

    // ---------- 收藏 ----------
    toggleFavorite(resource) {
      const index = this.favorites.findIndex((f) => f.id === resource.id)

      if (index >= 0) {
        this.favorites.splice(index, 1)
      } else {
        this.favorites.unshift({
          id: resource.id,
          title: resource.title,
          category: resource.category,
          netdiskType: resource.netdiskType,
          url: resource.url,
          addedAt: new Date().toISOString()
        })
      }

      save(FAVORITES_KEY, this.favorites)
      return index < 0
    },

    removeFavorite(id) {
      this.favorites = this.favorites.filter((f) => f.id !== id)
      save(FAVORITES_KEY, this.favorites)
    },

    clearFavorites() {
      this.favorites = []
      save(FAVORITES_KEY, this.favorites)
    },

    // ---------- 搜索历史 ----------
    pushSearchHistory(keyword) {
      const kw = String(keyword || '').trim()
      if (!kw) return

      this.searchHistory = [kw, ...this.searchHistory.filter((k) => k !== kw)].slice(0, 10)
      save(HISTORY_KEY, this.searchHistory)
    },

    removeSearchHistory(keyword) {
      this.searchHistory = this.searchHistory.filter((k) => k !== keyword)
      save(HISTORY_KEY, this.searchHistory)
    },

    clearSearchHistory() {
      this.searchHistory = []
      save(HISTORY_KEY, this.searchHistory)
    }
  }
})

export default useAppStore
