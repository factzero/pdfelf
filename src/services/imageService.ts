import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

// Use bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Render a single PDF page to an image Blob
 */
async function renderPageToBlob(
  page: pdfjsLib.PDFPageProxy,
  scale: number,
  format: 'png' | 'jpeg'
): Promise<Blob> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  // Ensure canvas has valid dimensions
  if (canvas.width === 0 || canvas.height === 0) {
    canvas.width = 1
    canvas.height = 1
  }

  const ctx = canvas.getContext('2d', {
    alpha: format === 'jpeg' ? false : true,
  })
  if (!ctx) throw new Error('无法获取 Canvas 2D 上下文')

  // Fill white background for JPEG (no alpha support)
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  await page.render({ canvas, canvasContext: ctx, viewport }).promise

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
  const quality = format === 'jpeg' ? 0.92 : undefined

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => {
        if (b && b.size > 0) {
          resolve(b)
        } else {
          // Fallback: convert via data URL
          const dataUrl = canvas.toDataURL(mimeType, quality)
          const byteString = atob(dataUrl.split(',')[1])
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
          }
          resolve(new Blob([ab], { type: mimeType }))
        }
      },
      mimeType,
      quality
    )
  })
}

/**
 * Convert PDF pages to images
 * @param file - Input PDF file
 * @param format - Output image format
 * @param dpi - Output resolution (72, 150, 300)
 * @param onProgress - Progress callback
 * @returns Object containing blob and metadata (isSingle, ext, totalPages)
 */
export async function pdfToImage(
  file: File,
  format: 'png' | 'jpeg' = 'png',
  dpi: number = 150,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; isSingle: boolean; ext: string; totalPages: number }> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(20)
  const loadingTask = pdfjsLib.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages

  const scale = dpi / 72 // PDF default is 72 DPI
  const ext = format === 'png' ? 'png' : 'jpg'

  // Single page → single image
  if (totalPages === 1) {
    onProgress?.(30)
    const page = await pdf.getPage(1)
    onProgress?.(50)
    const blob = await renderPageToBlob(page, scale, format)
    onProgress?.(100)
    return { blob, isSingle: true, ext, totalPages }
  }

  // Multiple pages → ZIP
  const zip = new JSZip()

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(20 + Math.round((i / totalPages) * 70))
    const page = await pdf.getPage(i)
    const blob = await renderPageToBlob(page, scale, format)
    zip.file(`page_${String(i).padStart(3, '0')}.${ext}`, blob)
  }

  onProgress?.(95)
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  onProgress?.(100)
  return { blob: zipBlob, isSingle: false, ext: 'zip', totalPages }
}
