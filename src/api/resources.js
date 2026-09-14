import http, { cachedGet } from './client'

export const resourceApi = {
  /** 列表查询，默认缓存 5 分钟 */
  list(params = {}) {
    return cachedGet('/resources', { params }, 5 * 60 * 1000)
  },

  detail(id) {
    return http.get(`/resources/${id}`)
  },

  create(payload) {
    return http.post('/resources', payload)
  },

  /** 筛选项元数据，缓存 1 小时 */
  filters() {
    return cachedGet('/resources/meta/filters', {}, 60 * 60 * 1000)
  }
}

export default resourceApi
