// ========================================
// routes/resources.js - 资源管理API路由
// ========================================

import express from 'express'
import { check, validationResult } from 'express-validator'
import Resource from '../models/Resource.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// ============ 获取资源列表 ============

/**
 * GET /api/resources
 * 获取资源列表（支持分页、筛选、搜索）
 */
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      keyword, 
      netdisk_type,
      sort = '-created_at', 
      page = 1, 
      limit = 20 
    } = req.query

    // 构建查询条件
    let query = { 
      is_deleted: false, 
      is_approved: true 
    }

    // 按分类筛选
    if (category) {
      query.category = category
    }

    // 按网盘类型筛选
    if (netdisk_type) {
      query.netdisk_type = netdisk_type
    }

    // 按关键字搜索
    if (keyword) {
      query.$or = [
        { title: new RegExp(keyword, 'i') },
        { description: new RegExp(keyword, 'i') },
        { tags: keyword }
      ]
    }

    // 分页
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    // 查询资源
    const resources = await Resource
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user_id', 'username avatar_url')
      .lean()

    // 获取总数
    const total = await Resource.countDocuments(query)

    res.json({
      success: true,
      data: resources,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('获取资源列表失败:', error)
    res.status(500).json({ 
      success: false, 
      message: '获取资源列表失败' 
    })
  }
})

// ============ 获取单个资源详情 ============

/**
 * GET /api/resources/:id
 * 获取资源详情（增加浏览次数）
 */
router.get('/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('user_id', 'username avatar_url bio')

    if (!resource || resource.is_deleted) {
      return res.status(404).json({ 
        success: false, 
        message: '资源不存在' 
      })
    }

    // 非管理员只能查看已审批的资源
    if (!req.user?.isAdmin && !resource.is_approved) {
      return res.status(403).json({ 
        success: false, 
        message: '无权访问' 
      })
    }

    // 增加浏览次数
    resource.view_count = (resource.view_count || 0) + 1
    await resource.save()

    res.json({
      success: true,
      data: resource
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取资源详情失败' 
    })
  }
})

// ============ 上传资源 ============

/**
 * POST /api/resources
 * 创建新资源（需要认证）
 */
router.post('/', authenticate, [
  check('title').notEmpty().trim().isLength({ min: 1, max: 255 }),
  check('category').notEmpty().trim(),
  check('netdisk_type').isIn(['aliyun', 'baidu', 'tianyi']),
  check('resource_url').isURL(),
  check('password').optional().trim(),
  check('tags').optional().isArray(),
  check('file_count').optional().isInt(),
  check('file_size').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      })
    }

    const {
      title,
      description,
      category,
      netdisk_type,
      resource_url,
      password,
      tags,
      file_count,
      file_size
    } = req.body

    // 创建资源
    const newResource = await Resource.create({
      user_id: req.user.userId,
      title,
      description: description || '',
      category,
      netdisk_type,
      resource_url,
      password: password || null,
      tags: tags || [],
      file_count: file_count || null,
      file_size: file_size || null,
      is_approved: false // 需要管理员审批
    })

    // 填充用户信息
    await newResource.populate('user_id', 'username avatar_url')

    res.status(201).json({
      success: true,
      message: '资源创建成功，等待审批',
      data: newResource
    })
  } catch (error) {
    console.error('创建资源失败:', error)
    res.status(500).json({ 
      success: false, 
      message: '创建资源失败' 
    })
  }
})

// ============ 编辑资源 ============

/**
 * PUT /api/resources/:id
 * 编辑资源（只能编辑自己的资源）
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)

    if (!resource) {
      return res.status(404).json({ 
        success: false, 
        message: '资源不存在' 
      })
    }

    // 检查权限
    if (resource.user_id.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '无权修改此资源' 
      })
    }

    // 更新允许的字段
    const updateFields = [
      'title', 'description', 'category', 'tags', 
      'password', 'file_count', 'file_size'
    ]

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        resource[field] = req.body[field]
      }
    })

    resource.updated_at = new Date()
    await resource.save()

    res.json({
      success: true,
      message: '资源更新成功',
      data: resource
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '更新资源失败' 
    })
  }
})

// ============ 删除资源 ============

/**
 * DELETE /api/resources/:id
 * 删除资源（只能删除自己的资源）
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)

    if (!resource) {
      return res.status(404).json({ 
        success: false, 
        message: '资源不存在' 
      })
    }

    // 检查权限
    if (resource.user_id.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '无权删除此资源' 
      })
    }

    // 软删除
    resource.is_deleted = true
    resource.deleted_at = new Date()
    await resource.save()

    res.json({
      success: true,
      message: '资源已删除'
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '删除资源失败' 
    })
  }
})

// ============ 获取用户的资源 ============

/**
 * GET /api/resources/user/mine
 * 获取当前用户的所有资源
 */
router.get('/user/mine', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = '-created_at' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const resources = await Resource
      .find({ user_id: req.user.userId })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Resource.countDocuments({ user_id: req.user.userId })

    res.json({
      success: true,
      data: resources,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取用户资源失败' 
    })
  }
})

// ============ 资源审核 (仅管理员) ============

/**
 * PUT /api/resources/:id/approve
 * 审批资源（管理员）
 */
router.put('/:id/approve', authenticate, async (req, res) => {
  try {
    // 检查是否为管理员
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '仅管理员可操作' 
      })
    }

    const resource = await Resource.findById(req.params.id)
    if (!resource) {
      return res.status(404).json({ 
        success: false, 
        message: '资源不存在' 
      })
    }

    resource.is_approved = true
    await resource.save()

    res.json({
      success: true,
      message: '资源已审批',
      data: resource
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '审批失败' 
    })
  }
})

// ============ 获取热门资源 ============

/**
 * GET /api/resources/hot/trending
 * 获取热门资源（按浏览次数和收藏数排序）
 */
router.get('/hot/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query

    const hotResources = await Resource
      .find({ is_deleted: false, is_approved: true })
      .sort({ 
        view_count: -1, 
        like_count: -1, 
        created_at: -1 
      })
      .limit(parseInt(limit))
      .populate('user_id', 'username avatar_url')

    res.json({
      success: true,
      data: hotResources
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取热门资源失败' 
    })
  }
})

// ============ 获取资源分类列表 ============

/**
 * GET /api/resources/categories
 * 获取所有资源分类
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await Resource.distinct('category')
    
    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取分类失败' 
    })
  }
})

export default router

// ========================================
// routes/favorites.js - 收藏管理API
// ========================================

import express from 'express'
import UserFavorite from '../models/UserFavorite.js'
import Resource from '../models/Resource.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/favorites
 * 获取用户收藏列表
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const favorites = await UserFavorite
      .find({ user_id: req.user.userId })
      .sort('-created_at')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('resource_id')

    const total = await UserFavorite.countDocuments({ 
      user_id: req.user.userId 
    })

    res.json({
      success: true,
      data: favorites,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取收藏列表失败' 
    })
  }
})

/**
 * POST /api/favorites
 * 添加收藏
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { resource_id } = req.body

    if (!resource_id) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少resource_id' 
      })
    }

    // 检查资源是否存在
    const resource = await Resource.findById(resource_id)
    if (!resource) {
      return res.status(404).json({ 
        success: false, 
        message: '资源不存在' 
      })
    }

    // 检查是否已收藏
    const existing = await UserFavorite.findOne({
      user_id: req.user.userId,
      resource_id
    })

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: '已添加到收藏' 
      })
    }

    // 添加收藏
    const favorite = await UserFavorite.create({
      user_id: req.user.userId,
      resource_id
    })

    // 增加资源的收藏计数
    await Resource.findByIdAndUpdate(resource_id, {
      $inc: { like_count: 1 }
    })

    res.status(201).json({ 
      success: true, 
      message: '已添加到收藏',
      data: favorite
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '添加收藏失败' 
    })
  }
})

/**
 * DELETE /api/favorites/:id
 * 删除收藏
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const favorite = await UserFavorite.findById(req.params.id)

    if (!favorite) {
      return res.status(404).json({ 
        success: false, 
        message: '收藏不存在' 
      })
    }

    // 检查权限
    if (favorite.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: '无权删除' 
      })
    }

    // 删除收藏
    await UserFavorite.deleteOne({ _id: req.params.id })

    // 减少资源的收藏计数
    await Resource.findByIdAndUpdate(favorite.resource_id, {
      $inc: { like_count: -1 }
    })

    res.json({ 
      success: true, 
      message: '已取消收藏' 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '删除收藏失败' 
    })
  }
})

/**
 * GET /api/favorites/check/:resourceId
 * 检查是否已收藏某个资源
 */
router.get('/check/:resourceId', authenticate, async (req, res) => {
  try {
    const isFavorited = await UserFavorite.findOne({
      user_id: req.user.userId,
      resource_id: req.params.resourceId
    })

    res.json({
      success: true,
      isFavorited: !!isFavorited,
      favoriteId: isFavorited?._id
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '检查失败' 
    })
  }
})

export default router
