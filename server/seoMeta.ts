/**
 * 共享 SEO 元数据 — 用于服务端注入路由级别的 title / description / canonical / OG 标签。
 * 这样即使 Googlebot 不执行 JS，也能看到每个页面的独立信息，而不是所有页面都是首页 HTML。
 */
export interface SeoEntry {
  path: string
  title: string
  description: string
}

export const homeSeo: SeoEntry = {
  path: '/',
  title: 'PDF Elf — 免费在线 PDF 工具 | 在线压缩合并拆分转换',
  description:
    'PDF Elf 是一款免费在线 PDF 处理工具，支持压缩、合并、拆分、转换、旋转、提取、重排页面等 20+ 功能，所有处理在浏览器本地完成，无需上传文件，保护隐私安全。',
}

/** 所有工具页的 SEO 元数据（中文为主，Google 索引优先 zh-CN） */
export const toolSeos: SeoEntry[] = [
  // 整理 PDF
  { path: '/compress-pdf',  title: '压缩 PDF - PDF Elf',             description: '减小 PDF 文件大小，基本和强压缩两种模式' },
  { path: '/merge-pdf',     title: '合并 PDF - PDF Elf',             description: '将多个 PDF 合并为一个文件，支持拖拽排序' },
  { path: '/split-pdf',     title: '分割 PDF - PDF Elf',             description: '按页面范围或每 N 页分割 PDF' },
  { path: '/rotate-pdf',    title: '旋转 PDF - PDF Elf',             description: '旋转 PDF 页面，每页独立设置角度' },
  { path: '/delete-pages',  title: '删除 PDF 页面 - PDF Elf',        description: '从 PDF 中删除不需要的页面' },
  { path: '/extract-pages',  title: '提取 PDF 页面 - PDF Elf',        description: '从 PDF 中提取指定页面为新文件' },
  { path: '/reorder-pages',  title: '重排 PDF 页面顺序 - PDF Elf',    description: '拖拽调整 PDF 页面顺序后重新导出' },

  // 编辑 PDF
  { path: '/add-watermark', title: 'PDF 添加水印 - PDF Elf',         description: '给 PDF 每一页添加文字水印' },

  // 从 PDF 转换
  { path: '/pdf-to-word',   title: 'PDF 转 Word - PDF Elf',          description: '将 PDF 转换为可编辑的 Word 文档' },
  { path: '/pdf-to-excel',  title: 'PDF 转 Excel - PDF Elf',         description: '将 PDF 转换为 Excel 电子表格' },
  { path: '/pdf-to-ppt',    title: 'PDF 转 PPT - PDF Elf',           description: '将 PDF 转换为 PowerPoint 演示文稿' },
  { path: '/pdf-to-image',  title: 'PDF 转图片 - PDF Elf',           description: '将 PDF 页面导出为 PNG 或 JPEG' },
  { path: '/pdf-to-jpg',    title: 'PDF 转 JPG - PDF Elf',           description: '将 PDF 页面导出为高质量 JPG 图片' },
  { path: '/pdf-to-png',    title: 'PDF 转 PNG - PDF Elf',           description: '将 PDF 页面导出为无损 PNG 图片' },
  { path: '/pdf-to-tiff',   title: 'PDF 转 TIFF - PDF Elf',          description: '将 PDF 页面导出为 TIFF 格式图片' },
  { path: '/pdf-to-svg',    title: 'PDF 转 SVG - PDF Elf',           description: '将 PDF 全部页面合并导出为一个 SVG 文件' },
  { path: '/pdf-to-text',   title: 'PDF 转文本 - PDF Elf',           description: '从 PDF 中提取文字内容，保留排版结构' },
  { path: '/pdf-to-html',   title: 'PDF 转 HTML - PDF Elf',          description: '将 PDF 转换为 HTML，尽量还原原始布局' },

  // 转换成 PDF
  { path: '/word-to-pdf',   title: 'Word 转 PDF - PDF Elf',          description: '将 Word 文档 (.docx) 转为 PDF' },
  { path: '/excel-to-pdf',  title: 'Excel 转 PDF - PDF Elf',         description: '将 Excel 表格 (.xlsx) 转为 PDF' },
  { path: '/ppt-to-pdf',    title: 'PPT 转 PDF - PDF Elf',           description: '将 PowerPoint (.pptx) 转为 PDF' },
  { path: '/image-to-pdf',  title: '图片转 PDF - PDF Elf',           description: '将图片合并转换为 PDF 文件' },

  // 阅读器
  { path: '/pdf-reader',    title: 'PDF 阅读器 - PDF Elf',           description: '在浏览器中在线阅读 PDF 文件' },
]

/** path → SeoEntry 快速查找表 */
export const seoMap = new Map<string, SeoEntry>()
for (const entry of [homeSeo, ...toolSeos]) {
  seoMap.set(entry.path, entry)
}
