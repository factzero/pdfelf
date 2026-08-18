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

// 使用自定义 worker（内部先补齐 ES2024/2025 polyfill 再加载 pdf.js worker）。
// 通过 workerSrc 交给 pdf.js 自己创建 Worker，这样当 worker 加载失败时，
// pdf.js 会自动回退到主线程模式（#setupFakeWorker），不会卡死。
//
// 之前用 workerPort 方式：pdf.js 拿到外部 Worker 后，加载失败时【不会】自动回退，
// 导致服务器 HTTPS 环境下 worker 加载失败时 getDocument 永久挂起。
import workerUrl from '../pdf.worker.ts?worker&url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjsLib }
