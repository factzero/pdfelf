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

/** getDocument 默认超时（毫秒）。60s 仅作为防挂死保险，不是性能指标：
 *  首次访问需下载约 1.2MB 的 worker core，在服务器带宽受限/慢网络下可能耗时数十秒，
 *  激进超时（如 10s）会在冷启动阶段误报。 */
export const OPEN_PDF_TIMEOUT_MS = 60_000

/**
 * 统一的 getDocument 封装：
 *  - 带超时保护；超时或失败时自动 destroy loadingTask，
 *    终止后台解析并清理 worker 引用，避免 unhandledrejection 与 worker 泄漏。
 *
 * @param data      PDF 字节（ArrayBuffer / Uint8Array）
 * @param timeoutMs 超时毫秒数，默认 OPEN_PDF_TIMEOUT_MS
 * @param copy      true 时拷贝一份再交给 pdf.js（pdf.js 会把 data transfer 给 worker，
 *                  导致原 buffer 被 detach；需要保留原 buffer 时传 true）
 */
export async function openPdfDocument(
  data: ArrayBuffer | Uint8Array,
  timeoutMs: number = OPEN_PDF_TIMEOUT_MS,
  copy: boolean = false,
): Promise<pdfjsLib.PDFDocumentProxy> {
  const input = copy && data instanceof ArrayBuffer ? data.slice(0) : data

  const loadingTask = pdfjsLib.getDocument({ data: input, ...DEFAULT_PDF_OPTIONS })

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const pdf = await Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `[timeout] PDF 解析超时（${Math.round(timeoutMs / 1000)} 秒）。` +
                '若为首次使用，解析引擎可能仍在加载，请稍后重试。'
            )
          )
        }, timeoutMs)
      }),
    ])
    return pdf
  } catch (err) {
    // 超时或解析失败：销毁 loadingTask，终止后台解析并清理 worker 引用。
    loadingTask.destroy().catch(() => {})
    throw err
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

// ---- worker 预热 ----
// 首次 getDocument 会触发 worker core（约 1.2MB）下载 + 模块解析，
// 冷启动可能耗时数十秒。在应用空闲时提前执行一次，让用户真正使用时
// worker core 已缓存、worker 已就绪，避免首次操作撞上加载窗口。

/** 最小的合法单页 PDF（空白 A4，612x792pt），仅用于启动 pdf.js worker。 */
const MINIMAL_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000133 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
208
%%EOF
`

let _warmPromise: Promise<void> | null = null

/**
 * 预热 pdf.js worker（幂等，可安全重复调用）：
 * 提前下载 worker core 并完成首次启动，之后真实 getDocument 可复用。
 * 预热失败不抛出 —— 只是没能提前加载，后续真实调用仍会正常尝试。
 */
export function warmUpPdfjs(): Promise<void> {
  if (_warmPromise) return _warmPromise
  _warmPromise = (async () => {
    try {
      const bytes = new TextEncoder().encode(MINIMAL_PDF)
      const data = bytes.buffer.slice(0) as ArrayBuffer
      // pdfjs-dist v6 的销毁 API 在 PDFDocumentLoadingTask 上。
      const loadingTask = pdfjsLib.getDocument({ data, ...DEFAULT_PDF_OPTIONS })
      await loadingTask.promise // 触发 worker core 下载/启动与解析
      await loadingTask.destroy() // 预热完成后销毁，释放 worker 资源
    } catch (err) {
      // 允许下次重试
      _warmPromise = null
      console.warn('[pdfjs] worker warm-up failed:', err)
    }
  })()
  return _warmPromise
}

export { pdfjsLib }
