import Resource, { RESOURCE_CATEGORIES, NETDISK_TYPES } from '../models/Resource.js'

/** GET /api/resources —— 支持关键词搜索、分类/网盘筛选、排序、分页 */
export async function listResources(req, res) {
  try {
    const {
      keyword = '',
      category = '',
      netdiskType = '',
      sort = 'latest',
      page = '1',
      pageSize = '12'
    } = req.query

    const filter = { isPublished: true }

    if (keyword.trim()) {
      // 中文友好的关键词匹配：转义正则元字符后做不区分大小写的模糊匹配
      const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'i')
      filter.$or = [{ title: re }, { description: re }, { tags: re }]
    }
    if (category) filter.category = category
    if (netdiskType) filter.netdiskType = netdiskType

    const sortMap = {
      latest: { createdAt: -1 },
      hottest: { views: -1 },
      mostDownloaded: { downloads: -1 },
      mostFavorited: { favorites: -1 }
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const size = Math.min(60, Math.max(1, Number(pageSize) || 12))

    const [items, total] = await Promise.all([
      Resource.find(filter)
        .sort(sortMap[sort] || sortMap.latest)
        .skip((pageNum - 1) * size)
        .limit(size)
        .lean(),
      Resource.countDocuments(filter)
    ])

    return res.status(200).json({
      success: true,
      data: {
        items: items.map((r) => ({
          ...r,
          id: r._id.toString(),
          _id: undefined
        })),
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size) || 1
        }
      }
    })
  } catch (error) {
    console.error('[listResources]', error)
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

/** GET /api/resources/:id */
export async function getResource(req, res) {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, isPublished: true }).lean()

    if (!resource) {
      return res.status(404).json({ success: false, message: '资源不存在' })
    }

    // 浏览量自增（不阻塞响应）
    Resource.updateOne({ _id: req.params.id }, { $inc: { views: 1 } }).catch(() => {})

    return res.status(200).json({
      success: true,
      data: { ...resource, id: resource._id.toString(), _id: undefined }
    })
  } catch (error) {
    console.error('[getResource]', error)
    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

/** GET /api/resources/meta/filters —— 返回筛选项元数据 */
export async function getFilterMeta(req, res) {
  return res.status(200).json({
    success: true,
    data: { categories: RESOURCE_CATEGORIES, netdiskTypes: NETDISK_TYPES }
  })
}

/** POST /api/resources —— 发布资源（需登录） */
export async function createResource(req, res) {
  try {
    const { title, description, category, netdiskType, url, extractCode, tags, cover, size } =
      req.body

    const resource = await Resource.create({
      title,
      description: description || '',
      category,
      netdiskType,
      url,
      extractCode: extractCode || '',
      tags: Array.isArray(tags) ? tags : [],
      cover: cover || null,
      size: size || null,
      author: req.user.id
    })

    return res.status(201).json({
      success: true,
      message: '资源发布成功',
      data: resource.toPublicJSON()
    })
  } catch (error) {
    console.error('[createResource]', error)

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: Object.values(error.errors).map((e) => e.message)
      })
    }

    return res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

export default { listResources, getResource, getFilterMeta, createResource }
