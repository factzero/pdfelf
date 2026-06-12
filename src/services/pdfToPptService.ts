import * as pdfjsLib from 'pdfjs-dist'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

// Use bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Convert PDF to PowerPoint (.pptx)
 * Renders each PDF page as an image and embeds it into a PPTX slide.
 * Uses pptxgenjs for PowerPoint generation.
 */
export async function pdfToPpt(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(5)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(10)
  const loadingTask = pdfjsLib.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages

  // Dynamic import pptxgenjs
  const pptxgen = await import('pptxgenjs')
  const PptxGenJS = pptxgen.default
  const pres = new PptxGenJS()

  // Set slide size to standard 16:9
  pres.defineLayout({ name: 'CUSTOM', width: '13.333', height: '7.5' })
  pres.layout = 'CUSTOM'

  // Slide dimensions in inches (standard 16:9)
  const slideWidth = 13.333
  const slideHeight = 7.5

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(10 + Math.round((i / totalPages) * 80))
    const page = await pdf.getPage(i)

    // Render page to canvas at 150 DPI (good balance for PPT)
    const scale = 2 // ~150 DPI equivalent for standard display
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 1280
      canvas.height = 720
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 上下文创建失败')

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png')

    // Add slide with the rendered image
    const slide = pres.addSlide()

    // Calculate image dimensions to fit slide while maintaining aspect ratio
    const imgAspect = viewport.width / viewport.height
    const slideAspect = slideWidth / slideHeight

    let imgW: number, imgH: number
    if (imgAspect > slideAspect) {
      // Image is wider - fit to slide width
      imgW = slideWidth
      imgH = slideWidth / imgAspect
    } else {
      // Image is taller - fit to slide height
      imgH = slideHeight
      imgW = slideHeight * imgAspect
    }

    // Center the image
    const x = (slideWidth - imgW) / 2
    const y = (slideHeight - imgH) / 2

    slide.addImage({
      data: dataUrl,
      x,
      y,
      w: imgW,
      h: imgH,
    })

    // Add slide number
    slide.addText(`第 ${i} 页 / 共 ${totalPages} 页`, {
      x: 0,
      y: slideHeight - 0.4,
      w: slideWidth,
      h: 0.35,
      fontSize: 9,
      color: '888888',
      align: 'center',
      fontFace: 'Microsoft YaHei',
    })
  }

  onProgress?.(95)
  const pptBlob = (await pres.write({ outputType: 'blob' })) as Blob
  onProgress?.(100)
  return pptBlob
}
