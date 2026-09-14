import { Router } from 'express'
import { body, query } from 'express-validator'
import { validateInput, authenticate } from '../middleware/index.js'
import { NETDISK_TYPES, RESOURCE_CATEGORIES } from '../models/Resource.js'
import {
  listResources,
  getResource,
  getFilterMeta,
  createResource
} from '../controllers/resourceController.js'

const router = Router()

// 元数据路由必须放在 /:id 之前，否则 "meta" 会被当作 id 匹配
router.get('/meta/filters', getFilterMeta)

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page 必须是正整数'),
    query('pageSize').optional().isInt({ min: 1, max: 60 }).withMessage('pageSize 范围 1-60'),
    validateInput
  ],
  listResources
)

router.get('/:id', getResource)

router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('标题不能为空').isLength({ max: 120 }),
    body('url').trim().notEmpty().withMessage('链接不能为空'),
    body('category').isIn(RESOURCE_CATEGORIES).withMessage('分类不合法'),
    body('netdiskType').isIn(NETDISK_TYPES).withMessage('网盘类型不合法'),
    body('description').optional().isLength({ max: 2000 }).withMessage('描述最多 2000 字符'),
    body('extractCode').optional().isLength({ max: 20 }).withMessage('提取码过长'),
    body('tags').optional().isArray().withMessage('tags 必须是数组'),
    validateInput
  ],
  createResource
)

export default router
