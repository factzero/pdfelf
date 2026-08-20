/**
 * pdfjs-dist 共享配置
 *
 * 集中管理 workerSrc 和 cMapUrl，所有页面/服务统一引用此模块。
 * 需要中文字体支持的 PDF 必须配置 cMapUrl，否则会出现 "cMapUrl is not provided" 警告。
 */

import * as pdfjsLib from 'pdfjs-dist'

/** cMap 文件的基础 URL，用于加载中文字体映射表 */
export const C_MAP_URL = '/cmaps/'

/** 推荐使用的 getDocument 参数默认值 */
export const DEFAULT_PDF_OPTIONS = {
  cMapUrl: C_MAP_URL,
  cMapPacked: true,
}

// 使用独立 ES 模块 worker（public/pdf.worker.js，由 syncPdfWorkerPlugin 生成）。
//
// 关键：不能用 Vite 的 `?worker&url` 打包 —— 它会把 worker 打包成副作用脚本，
// 吞掉 `export { WorkerMessageHandler }`，导致 pdf.js 真实 worker 加载失败后
// 回退 fake worker 时 `import(workerSrc)` 读不到导出而崩溃。
//
// public/pdf.worker.js 是独立 ES 模块：内联 ES2024/2025 polyfill，
// 并 `export { WorkerMessageHandler }`（re-export 自 pdf.worker.core.js），
// 因此无论走真实 worker 还是 fake worker 回退都能正常工作。
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js'

export { pdfjsLib }
