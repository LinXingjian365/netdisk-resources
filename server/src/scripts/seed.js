/**
 * 演示数据初始化脚本
 * 用法： npm run seed   （在 server 目录下）
 *
 * 会清空并重建 Resource 集合，用于本地开发与演示。
 */

import mongoose from 'mongoose'
import Resource from '../models/Resource.js'
import connectMongo, { disconnectMongo } from '../db/mongo.js'
import env from '../config/env.js'

const demo = [
  {
    title: '金刚经集注（全本扫描版）',
    description: '历代高僧对金刚经的集注汇编，高清扫描 PDF，适合深入研读。',
    category: '佛经',
    netdiskType: 'baidu',
    url: 'https://pan.baidu.com/s/demo-jingangjing',
    extractCode: 'fg8k',
    tags: ['金刚经', '集注', 'PDF'],
    size: '286MB',
    views: 1820,
    downloads: 640,
    favorites: 210
  },
  {
    title: '大藏经检索数据库（离线版）',
    description: '收录汉传佛教大藏经全文，支持离线关键词检索，研究佛学的利器。',
    category: '佛经',
    netdiskType: 'aliyun',
    url: 'https://www.aliyundrive.com/s/demo-dazangjing',
    extractCode: 'dz66',
    tags: ['大藏经', '检索', '数据库'],
    size: '3.2GB',
    views: 960,
    downloads: 310,
    favorites: 145
  },
  {
    title: '正统道藏（涵芬楼影印本）',
    description: '明代正统道藏影印本，共 36 册，道教文献研究的基础资料。',
    category: '道藏',
    netdiskType: 'baidu',
    url: 'https://pan.baidu.com/s/demo-daozang',
    extractCode: 'dz12',
    tags: ['道藏', '影印', '古籍'],
    size: '5.6GB',
    views: 1240,
    downloads: 420,
    favorites: 188
  },
  {
    title: '周易正义 + 周易集解 合刊',
    description: '孔颖达《周易正义》与李鼎祚《周易集解》合刊本，易学研究必备。',
    category: '周易',
    netdiskType: 'quark',
    url: 'https://pan.quark.cn/s/demo-zhouyi',
    extractCode: 'zy88',
    tags: ['周易', '正义', '集解'],
    size: '420MB',
    views: 2100,
    downloads: 880,
    favorites: 365
  },
  {
    title: '梅花易数入门到精通（视频 42 讲）',
    description: '系统讲解梅花易数起卦、断卦方法，含大量实战案例。',
    category: '周易',
    netdiskType: 'xunlei',
    url: 'https://pan.xunlei.com/s/demo-meihua',
    extractCode: 'mh42',
    tags: ['梅花易数', '视频', '入门'],
    size: '8.1GB',
    views: 3560,
    downloads: 1420,
    favorites: 690
  },
  {
    title: '沈氏玄空学（完整注释版）',
    description: '玄空风水经典著作，含现代注释与图解，风水学习核心读物。',
    category: '风水',
    netdiskType: 'baidu',
    url: 'https://pan.baidu.com/s/demo-xuankong',
    extractCode: 'xk33',
    tags: ['玄空', '风水', '沈氏'],
    size: '310MB',
    views: 1680,
    downloads: 720,
    favorites: 298
  },
  {
    title: '子平真诠评注 + 滴天髓 合集',
    description: '八字命理两大经典合集，附名家评注，学习命理的必读资料。',
    category: '八字',
    netdiskType: 'aliyun',
    url: 'https://www.aliyundrive.com/s/demo-bazi',
    extractCode: 'bz77',
    tags: ['八字', '子平', '滴天髓'],
    size: '256MB',
    views: 2890,
    downloads: 1180,
    favorites: 520
  },
  {
    title: '四库全书珍本初集（影印）',
    description: '四库全书珍本初集影印版，涵盖经史子集四部珍稀文献。',
    category: '古籍',
    netdiskType: 'tianyi',
    url: 'https://cloud.189.cn/t/demo-siku',
    extractCode: 'sk99',
    tags: ['四库全书', '珍本', '影印'],
    size: '12.4GB',
    views: 1420,
    downloads: 530,
    favorites: 240
  },
  {
    title: 'Vue 3 + TypeScript 全栈开发实战',
    description: '从零搭建企业级前端应用，覆盖组合式 API、状态管理、性能优化。',
    category: '课程教程',
    netdiskType: 'quark',
    url: 'https://pan.quark.cn/s/demo-vue3',
    extractCode: 'v3ts',
    tags: ['Vue3', 'TypeScript', '前端'],
    size: '6.8GB',
    views: 5420,
    downloads: 2310,
    favorites: 1180
  },
  {
    title: 'Python 数据分析与可视化（完整版）',
    description: 'pandas / numpy / matplotlib 系统教程，含数据集与实战项目。',
    category: '课程教程',
    netdiskType: 'baidu',
    url: 'https://pan.baidu.com/s/demo-python',
    extractCode: 'py24',
    tags: ['Python', '数据分析', '可视化'],
    size: '4.5GB',
    views: 4180,
    downloads: 1960,
    favorites: 890
  },
  {
    title: '效率工具箱合集（Win / Mac）',
    description: '常用效率软件绿色版合集，含截图、剪贴板、启动器等工具。',
    category: '软件工具',
    netdiskType: '115',
    url: 'https://115.com/s/demo-tools',
    extractCode: 'tl11',
    tags: ['工具', '效率', '绿色版'],
    size: '2.1GB',
    views: 2260,
    downloads: 1340,
    favorites: 410
  },
  {
    title: '经典纪录片合集（1080P 中字）',
    description: '人文历史类经典纪录片 60 部，1080P 画质，内嵌中文字幕。',
    category: '影视资料',
    netdiskType: 'xunlei',
    url: 'https://pan.xunlei.com/s/demo-doc',
    extractCode: 'dc60',
    tags: ['纪录片', '1080P', '中字'],
    size: '86GB',
    views: 6720,
    downloads: 3240,
    favorites: 1560
  }
]

async function main() {
  console.log('连接数据库:', env.MONGO_URI)
  await connectMongo()

  // 同步索引：模型变更后清理残留的旧索引（例如已废弃的 text index）
  await Resource.syncIndexes()
  console.log('已同步索引')

  await Resource.deleteMany({})
  console.log('已清空 Resource 集合')

  const docs = await Resource.insertMany(demo)
  console.log(`已插入 ${docs.length} 条演示资源`)

  for (const d of docs.slice(0, 3)) {
    console.log(`  - [${d.category}] ${d.title}`)
  }

  await disconnectMongo()
  console.log('种子数据初始化完成')
}

main().catch(async (error) => {
  console.error('初始化失败:', error)
  await disconnectMongo().catch(() => {})
  process.exit(1)
})
