/**
 * OCR 识别服务 — 使用 Tesseract.js 在浏览器本地运行
 * 将扫描件/图片型 PDF 每一页转为可识别文字
 */

import Tesseract from 'tesseract.js'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'

export type OcrLanguage = 'eng' | 'chi_sim' | 'eng+chi_sim'

export interface OcrPageResult {
  pageNumber: number
  text: string
  confidence: number
}

export interface OcrResult {
  pages: OcrPageResult[]
  totalConfidence: number
  fullText: string
}

/**
 * 将 PDF 的指定页面渲染为 canvas，然后导出为 PNG data URL（供 Tesseract 使用）
 * 使用 data URL 比直接传 ImageData 更可靠
 */
async function renderPageToDataUrl(
  pdf: any,
  pageIndex: number,
  scale: number = 2.5
): Promise<string> {
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport, canvas }).promise
  page.cleanup()
  // 导出为 PNG data URL，Tesseract.js 对此格式支持最为稳定
  return canvas.toDataURL('image/png')
}

/**
 * 对单个 PDF 页面执行 OCR 识别
 */
async function ocrPage(
  imageUrl: string,
  pageIndex: number,
  langs: string,
  onProgress?: (pageProgress: number) => void
): Promise<OcrPageResult> {
  const result = await Tesseract.recognize(imageUrl, langs, {
    logger: (info) => {
      if (info.progress && onProgress) {
        onProgress(Math.round(info.progress * 100))
      }
    },
  })

  return {
    pageNumber: pageIndex + 1,
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  }
}

/**
 * OCR 识别 PDF
 * @param file PDF 文件
 * @param language OCR 语言
 * @param onProgress 整体进度回调 (0-100)
 * @param onStatus 状态文本回调
 */
export async function ocrPdf(
  file: File | ArrayBuffer,
  language: OcrLanguage = 'eng',
  onProgress?: (pct: number) => void,
  onStatus?: (text: string) => void
): Promise<OcrResult> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file

  onStatus?.('加载 PDF...')
  onProgress?.(0)

  const pdf = (await pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS }).promise) as any
  const totalPages = pdf.numPages

  if (totalPages === 0) {
    throw new Error('PDF 文件无页面')
  }

  const pages: OcrPageResult[] = []
  let totalConfidence = 0

  for (let i = 0; i < totalPages; i++) {
    const pageBaseProgress = Math.round((i / totalPages) * 90)
    onProgress?.(pageBaseProgress)
    onStatus?.(`正在识别第 ${i + 1} / ${totalPages} 页...`)

    try {
      const dataUrl = await renderPageToDataUrl(pdf, i, 2.5)
      const pageResult = await ocrPage(dataUrl, i, language, (pageProgress) => {
        const overall = pageBaseProgress + Math.round((pageProgress / totalPages) * 0.9)
        onProgress?.(Math.min(overall, 99))
      })

      pages.push(pageResult)
      totalConfidence += pageResult.confidence
    } catch (err) {
      // 单页失败不中断全部
      pages.push({ pageNumber: i + 1, text: '', confidence: 0 })
    }
  }

  pdf.cleanup()

  const fullText = pages
    .map((p) => (p.text ? `--- 第 ${p.pageNumber} 页 ---\n${p.text}` : `--- 第 ${p.pageNumber} 页 ---\n(未识别到文字)`))
    .join('\n\n')

  onProgress?.(100)
  onStatus?.('识别完成')

  return {
    pages,
    totalConfidence: pages.length > 0 ? Math.round(totalConfidence / pages.length) : 0,
    fullText,
  }
}

/**
 * 检查 Tesseract 语言数据是否已缓存
 */
export function getCachedLanguages(): string[] {
  // Tesseract.js v5 自动缓存，这里返回可用语言列表用于 UI
  return ['eng', 'chi_sim']
}

/**
 * 预加载语言包（可在工具页 mounted 时调用以加速首次识别）
 */
export async function preloadLanguage(lang: string): Promise<void> {
  await Tesseract.createWorker(lang, 1, {
    logger: () => {},
  })
}
