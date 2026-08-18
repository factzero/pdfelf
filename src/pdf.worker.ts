/**
 * pdf.js worker 兼容性垫片 + 真实 worker 初始化
 *
 * pdf.js 6.x 依赖 ES2024/ES2025 新特性（Uint8Array.prototype.toHex、
 * Map.prototype.getOrInsertComputed 等），部分旧浏览器/WebView 缺失会导致：
 *   - "a.toHex is not a function"
 *   - "this[#methodPromises].getOrInsertComputed is not a function"
 *
 * 本文件作为 pdf.js 的自定义 worker（Vite 以 worker 打包）：
 *   1. 先加载 polyfill（补齐缺失方法）
 *   2. 再加载真正的 pdf.js worker 逻辑（同线程直接运行）
 *
 * 注意：同时导出 WorkerMessageHandler，供主线程 fake worker 回退路径使用
 * （pdf.mjs 的 _setupFakeWorkerGlobal 会动态 import 本文件并读取该导出）。
 */

import '@/utils/polyfills'
import 'pdfjs-dist/build/pdf.worker.min.mjs'
export { WorkerMessageHandler } from 'pdfjs-dist/build/pdf.worker.min.mjs'

// 全局错误捕获：worker 初始化失败时，把真实错误通过 postMessage 回传主线程，
// 便于定位服务器上 worker 加载失败的具体原因。
self.addEventListener('error', (event) => {
  const detail = {
    type: 'worker-init-error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error ? String(event.error) : null,
    stack: event.error?.stack ?? null,
  }
  try {
    ;(self as any).postMessage(detail)
  } catch (_) {
    /* ignore */
  }
})

self.addEventListener('unhandledrejection', (event) => {
  try {
    ;(self as any).postMessage({
      type: 'worker-unhandled-rejection',
      reason: String(event.reason),
      stack: (event.reason as any)?.stack ?? null,
    })
  } catch (_) {
    /* ignore */
  }
})
