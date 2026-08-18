/**
 * pdfjs-dist 共享配置
 *
 * 集中管理 workerSrc 和 cMapUrl，所有页面/服务统一引用此模块。
 * 需要中文字体支持的 PDF 必须配置 cMapUrl，否则会出现 "cMapUrl is not provided" 警告。
 */

import * as pdfjsLib from 'pdfjs-dist'
import { WorkerMessageHandler } from 'pdfjs-dist/build/pdf.worker.min.mjs'

// 双保险：把 WorkerMessageHandler 挂到 globalThis.pdfjsWorker。
//
// 当真实 Web Worker 因 COEP/CSP 等原因加载失败时，pdf.js 会回退到主线程
// fake worker 模式（详见 pdf.mjs 的 #mainThreadWorkerMessageHandler getter），
// 此时直接从 globalThis.pdfjsWorker 读取 handler，避免再动态 import(workerSrc)
// 导致 "Cannot read properties of undefined (reading 'setup')" 崩溃。
;(globalThis as any).pdfjsWorker = { WorkerMessageHandler }

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
// 注意：生产环境 nginx 需要给 /assets/ 下的 worker 脚本加
// `Cross-Origin-Resource-Policy: same-origin` 响应头，
// 否则在页面 COEP: require-corp 策略下，模块 worker 会被浏览器拦截加载。
import workerUrl from '../pdf.worker.ts?worker&url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjsLib }
