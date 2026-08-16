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

// 使用自定义 worker：先补齐 Uint8Array.prototype.toHex/toBase64（ES2024，旧浏览器缺失），
// 再加载真正的 pdf.js worker，避免 "a.toHex is not a function" 错误。
const pdfWorker = new Worker(new URL('../pdf.worker.ts', import.meta.url), { type: 'module' })
pdfjsLib.GlobalWorkerOptions.workerPort = pdfWorker

export { pdfjsLib }
