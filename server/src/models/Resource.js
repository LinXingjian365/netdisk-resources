import mongoose from 'mongoose'

const { Schema } = mongoose

/** 网盘类型枚举，与前端筛选选项保持一致 */
export const NETDISK_TYPES = ['baidu', 'aliyun', 'tianyi', 'quark', 'xunlei', '115', 'other']

export const RESOURCE_CATEGORIES = [
  '佛经',
  '道藏',
  '周易',
  '风水',
  '八字',
  '古籍',
  '课程教程',
  '软件工具',
  '影视资料',
  '其他'
]

const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, '标题不能为空'],
      trim: true,
      maxlength: 120,
      index: true
    },
    description: { type: String, default: '', maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: RESOURCE_CATEGORIES,
      default: '其他',
      index: true
    },
    netdiskType: {
      type: String,
      required: true,
      enum: NETDISK_TYPES,
      default: 'other',
      index: true
    },
    url: { type: String, required: [true, '链接不能为空'], trim: true },
    extractCode: { type: String, default: '', trim: true, maxlength: 20 },
    cover: { type: String, default: null },
    tags: { type: [String], default: [], index: true },
    size: { type: String, default: null },

    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },

    author: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

// 说明：这里不使用 MongoDB 的 text index。
// 原因：$text 对中文（CJK）不会按词切分，"集成测试" 这类查询命中率为 0。
// 改用大小写不敏感的正则匹配 title / description / tags，中文检索结果才可靠。
resourceSchema.index({ createdAt: -1 })
resourceSchema.index({ views: -1 })

resourceSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    category: this.category,
    netdiskType: this.netdiskType,
    url: this.url,
    extractCode: this.extractCode,
    cover: this.cover,
    tags: this.tags,
    size: this.size,
    views: this.views,
    downloads: this.downloads,
    favorites: this.favorites,
    author: this.author ? this.author.toString() : null,
    publishedAt: this.publishedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  }
}

export default mongoose.model('Resource', resourceSchema)
