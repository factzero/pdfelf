/**
 * PDF 转换服务（Word / Excel）
 *
 * 将 pyodide 转换在后端 Web Worker 中运行，避免长时间转换阻塞主线程，
 * 防止浏览器对大型 PDF 显示"页面无响应"警告。
 */

// ---- 进度类型（与 UI / i18n 对齐） ----------------------------------------

export type ProgressStage =
  | 'preparing'
  | 'loadingDeps'
  | 'readingPdf'
  | 'openingDoc'
  | 'analyzingDoc'
  | 'parsingPages'
  | 'creatingDocx'
  | 'finalizing'

export interface ProgressInfo {
  percent: number
  stage: ProgressStage
  params?: Record<string, unknown>
}

// ---- MIME 类型 ----------------------------------------------------------

const MIME_WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MIME_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// ---- Worker 管理 --------------------------------------------------------

interface PendingRequest {
  resolve: (blob: Blob) => void
  reject: (err: Error) => void
  onProgress?: (info: ProgressInfo) => void
  mimeType: string
}

let worker: Worker | null = null
let workerReady = false
let initResolve: (() => void) | null = null
let initReject: ((err: Error) => void) | null = null
let initTimer: ReturnType<typeof setTimeout> | null = null
const INIT_TIMEOUT = 120_000 // 2 分钟超时（首次加载 pyodide + 包安装较慢）
let requestId = 0
const pending = new Map<string, PendingRequest>()

function clearInitState(reason?: string) {
  if (initTimer) { clearTimeout(initTimer); initTimer = null }
  if (initReject) {
    initReject(new Error(reason ?? 'Worker init aborted'))
    initResolve = null
    initReject = null
  }
}

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker('/convertWorker.js', { type: 'module' })

  worker.onmessage = (e: MessageEvent) => {
    const { type, id, data, message, percent, stage, params } = e.data as {
      type: string
      id: string
      data?: ArrayBuffer
      message?: string
      percent?: number
      stage?: ProgressStage
      params?: Record<string, unknown>
    }

    if (type === 'ready') {
      workerReady = true
      if (initTimer) { clearTimeout(initTimer); initTimer = null }
      initResolve?.()
      initResolve = null
      initReject = null
      return
    }

    // 处理 init 期间的 error（id 可能为 undefined 或 '__init__'）
    if (type === 'error' && (!id || id === '__init__')) {
      clearInitState(message ?? 'Worker init failed')
      return
    }

    if (id === '__init__') {
      // 初始化阶段的进度消息，忽略
      return
    }

    const req = pending.get(id)
    if (!req) return

    if (type === 'progress') {
      req.onProgress?.({ percent: percent ?? 0, stage: stage ?? 'preparing', params })
    } else     if (type === 'result') {
      pending.delete(id)
      if (data) {
        req.resolve(new Blob([data], { type: req.mimeType }))
      } else {
        req.reject(new Error('Worker returned empty result'))
      }
    } else if (type === 'error') {
      pending.delete(id)
      req.reject(new Error(message ?? 'Unknown worker error'))
    }
  }

  worker.onerror = (e: ErrorEvent) => {
    const msg = e.message || 'Worker crashed'
    clearInitState(msg)

    // 拒绝所有正在等待的请求
    for (const [, req] of pending) {
      req.reject(new Error(msg))
    }
    pending.clear()

    // 清空 worker 以便下次重建
    worker = null
    workerReady = false
  }

  return worker
}

/** 确保 Worker 中的 pyodide 已初始化（预加载用） */
export function ensureWorker(): Promise<void> {
  const w = getWorker()
  if (workerReady) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    initResolve = resolve
    initReject = reject
    // 超时保护：如果 Worker 长时间没返回 ready，自动失败
    initTimer = setTimeout(() => {
      clearInitState('Worker init timed out (pyodide loading may have stalled)')
    }, INIT_TIMEOUT)
    w.postMessage({ type: 'init' })
  })
}

// ---- 公开 API -----------------------------------------------------------

/**
 * 将 PDF File 转换为 Word Blob
 * @param file PDF 文件
 * @param onProgress 进度回调（可选）
 * @returns Word 文档的 Blob
 */
export async function pdfToWord(
  file: File,
  onProgress?: (info: ProgressInfo) => void,
): Promise<Blob> {
  await ensureWorker()
  const pdfBuffer = await file.arrayBuffer()
  const id = `req_${++requestId}`

  return new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress, mimeType: MIME_WORD })
    const w = getWorker()
    w.postMessage({ type: 'convert', id, data: pdfBuffer, convertType: 'word' }, [pdfBuffer])
  })
}

/**
 * 将 PDF File 转换为 Excel Blob（通过 pyodide Worker）
 */
export async function pdfToExcel(
  file: File,
  onProgress?: (info: ProgressInfo) => void,
): Promise<Blob> {
  await ensureWorker()
  const pdfBuffer = await file.arrayBuffer()
  const id = `req_${++requestId}`

  return new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress, mimeType: MIME_EXCEL })
    const w = getWorker()
    w.postMessage({ type: 'convert', id, data: pdfBuffer, convertType: 'excel' }, [pdfBuffer])
  })
}
