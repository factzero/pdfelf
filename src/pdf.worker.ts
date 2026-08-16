/**
 * pdf.js worker 兼容性垫片 + 真实 worker 初始化
 *
 * pdf.js 6.x 依赖 ES2024/ES2025 新特性（Uint8Array.prototype.toHex、
 * Map.prototype.getOrInsertComputed 等），部分旧浏览器/WebView 缺失会导致：
 *   - "a.toHex is not a function"
 *   - "this[#methodPromises].getOrInsertComputed is not a function"
 *
 * 本文件作为 pdf.js 的自定义 worker（通过 GlobalWorkerOptions.workerPort 注入，
 * Vite 以 worker 打包）：
 *   1. 先加载 polyfill（补齐缺失方法）
 *   2. 再加载真正的 pdf.js worker 逻辑（同线程直接运行）
 */

import '@/utils/polyfills'
import 'pdfjs-dist/build/pdf.worker.min.mjs'

export {}
