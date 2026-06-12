import { PDFDocument, PageSizes } from 'pdf-lib'

const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
  letter: [612, 792],
}

/**
 * Convert image(s) to PDF
 * @param files - Array of image files
 * @param pageSize - Output page size ('a4' | 'a3' | 'letter' | 'auto')
 * @param orientation - 'portrait' or 'landscape' (ignored when pageSize='auto')
 * @param onProgress - Progress callback
 * @returns PDF Blob
 */
export async function imagesToPdf(
  files: File[],
  pageSize: 'a4' | 'a3' | 'letter' | 'auto' = 'a4',
  orientation: 'portrait' | 'landscape' = 'portrait',
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(5)
  const pdfDoc = await PDFDocument.create()

  for (let i = 0; i < files.length; i++) {
    onProgress?.(5 + Math.round((i / files.length) * 85))
    const file = files[i]
    const imgData = await readFileAsDataURL(file)
    const img = await loadImage(imgData)

    let pageW: number, pageH: number

    if (pageSize === 'auto') {
      // Use image's natural dimensions (at 72 DPI)
      // Scale down if image is too large
      const maxDim = 595 // A4 width as max
      if (img.width > img.height) {
        // landscape
        const ratio = img.height / img.width
        pageW = Math.min(img.width, maxDim * 2)
        pageH = pageW * ratio
      } else {
        const ratio = img.width / img.height
        pageH = Math.min(img.height, maxDim * 2)
        pageW = pageH * ratio
      }
    } else {
      const [w, h] = PAGE_SIZES[pageSize]
      if (orientation === 'landscape') {
        pageW = h
        pageH = w
      } else {
        pageW = w
        pageH = h
      }
    }

    const page = pdfDoc.addPage([pageW, pageH])

    // Detect image format
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    let image
    if (ext === 'jpg' || ext === 'jpeg') {
      image = await pdfDoc.embedJpg(imgData)
    } else {
      image = await pdfDoc.embedPng(imgData)
    }

    // Calculate fit within page
    const imgRatio = image.width / image.height
    const pageRatio = pageW / pageH

    let drawW: number, drawH: number
    if (imgRatio > pageRatio) {
      // Image is wider relative to page — fit by width
      drawW = pageW - 40
      drawH = drawW / imgRatio
    } else {
      // Image is taller relative to page — fit by height
      drawH = pageH - 40
      drawW = drawH * imgRatio
    }

    // Center on page
    const x = (pageW - drawW) / 2
    const y = (pageH - drawH) / 2

    page.drawImage(image, { x, y, width: drawW, height: drawH })
  }

  onProgress?.(95)
  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}
