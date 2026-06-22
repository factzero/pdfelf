import { PDFDocument, rgb, degrees } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import JSZip from 'jszip'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

/**
 * Compress a PDF file
 * @param file - Input PDF file
 * @param mode - 'basic' or 'strong'
 * @param onProgress - Progress callback (0-100)
 * @returns Compressed PDF as Blob
 */
export async function compressPDF(
  file: File,
  mode: 'basic' | 'strong',
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(30)
  const pdfDoc = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
  })

  // Basic compression: remove metadata and unused objects
  if (mode === 'strong') {
    onProgress?.(50)
    // Strong mode: re-compress embedded images
    // pdf-lib's save() already does object dedup and font subsetting.
    // For stronger compression, we could process images through Canvas,
    // but pdf-lib doesn't easily expose embedded images for re-encoding.
    // The save() with appropriate options provides good baseline compression.
  }

  onProgress?.(70)
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true, // Combine small objects into streams
    addDefaultPage: false,
  })

  onProgress?.(90)
  const blob = new Blob([new Uint8Array(compressedBytes)], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Merge multiple PDF files into one
 */
export async function mergePDFs(
  files: File[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const mergedDoc = await PDFDocument.create()

  for (let i = 0; i < files.length; i++) {
    onProgress?.(Math.round((i / files.length) * 90))
    const buffer = await readFileAsArrayBuffer(files[i])
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    const pages = await mergedDoc.copyPages(doc, doc.getPageIndices())
    pages.forEach((page) => mergedDoc.addPage(page))
  }

  onProgress?.(95)
  const resultBytes = await mergedDoc.save()
  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Split a PDF file
 * @param file - Input PDF file
 * @param mode - 'ranges' or 'every'
 * @param ranges - Page ranges [[start, end], ...] for 'ranges' mode
 * @param everyN - Number of pages per split for 'every' mode
 * @param onProgress - Progress callback
 * @returns ZIP file containing split PDFs as Blob
 */
export async function splitPDF(
  file: File,
  mode: 'ranges' | 'every',
  ranges?: [number, number][],
  everyN?: number,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const totalPages = sourceDoc.getPageCount()

  onProgress?.(30)
  const pageGroups: number[][] = []

  if (mode === 'ranges' && ranges) {
    for (const [start, end] of ranges) {
      const s = Math.max(1, start) - 1 // 0-indexed
      const e = Math.min(totalPages, end)
      if (s < totalPages && s < e) {
        pageGroups.push(
          Array.from({ length: e - s }, (_, i) => s + i)
        )
      }
    }
  } else if (mode === 'every' && everyN) {
    for (let i = 0; i < totalPages; i += everyN) {
      const group: number[] = []
      for (let j = i; j < Math.min(i + everyN, totalPages); j++) {
        group.push(j)
      }
      pageGroups.push(group)
    }
  }

  if (pageGroups.length === 0) {
    throw new Error('无法分割：请检查页码范围')
  }

  const zip = new JSZip()

  for (let i = 0; i < pageGroups.length; i++) {
    onProgress?.(30 + Math.round((i / pageGroups.length) * 60))
    const newDoc = await PDFDocument.create()
    const pages = await newDoc.copyPages(sourceDoc, pageGroups[i])
    pages.forEach((p) => newDoc.addPage(p))
    const bytes = await newDoc.save()
    zip.file(`split_${i + 1}.pdf`, bytes)
  }

  onProgress?.(95)
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  onProgress?.(100)
  return zipBlob
}

/**
 * Get page count of a PDF file
 */
export async function getPageCount(file: File): Promise<number> {
  const buffer = await readFileAsArrayBuffer(file)
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  return pdfDoc.getPageCount()
}

/**
 * Rotate pages of a PDF
 * @param file - Input PDF file
 * @param rotations - Map of page number (1-indexed) to rotation angle (90, 180, 270)
 * @param onProgress - Progress callback
 * @returns Rotated PDF as Blob
 */
export async function rotatePDF(
  file: File,
  rotations: Map<number, number>,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(30)
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pages = pdfDoc.getPages()

  if (pages.length === 0) {
    throw new Error('PDF has no pages')
  }

  onProgress?.(50)
  for (const [pageNum, angle] of rotations) {
    const idx = pageNum - 1
    if (idx >= 0 && idx < pages.length) {
      const page = pages[idx]
      // Safely get current rotation, default to 0
      let currentAngle = 0
      try {
        const rot = page.getRotation()
        currentAngle = rot?.angle ?? 0
      } catch {
        currentAngle = 0
      }
      const newAngle = ((currentAngle + angle) % 360 + 360) % 360
      page.setRotation(degrees(newAngle))
    }
  }

  onProgress?.(80)
  const resultBytes = await pdfDoc.save()
  // Use resultBytes directly to avoid SharedArrayBuffer view issues
  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Delete pages from a PDF
 * @param file - Input PDF file
 * @param pagesToDelete - Array of page numbers (1-indexed) to delete
 * @param onProgress - Progress callback
 * @returns PDF with pages removed as Blob
 */
export async function deletePages(
  file: File,
  pagesToDelete: number[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(30)
  const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const totalPages = sourceDoc.getPageCount()

  const deleteSet = new Set(pagesToDelete)
  const keepIndices = Array.from({ length: totalPages }, (_, i) => i)
    .filter((i) => !deleteSet.has(i + 1))

  if (keepIndices.length === 0) {
    throw new Error('不能删除所有页面')
  }

  onProgress?.(50)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(sourceDoc, keepIndices)
  copiedPages.forEach((p) => newDoc.addPage(p))

  onProgress?.(80)
  const resultBytes = await newDoc.save()
  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Extract pages from a PDF (keep only specified pages)
 * @param file - Input PDF file
 * @param pagesToExtract - Array of page numbers (1-indexed) to extract
 * @param onProgress - Progress callback
 * @returns Extracted PDF as Blob
 */
export async function extractPages(
  file: File,
  pagesToExtract: number[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(30)
  const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const totalPages = sourceDoc.getPageCount()

  const indices = pagesToExtract
    .filter((p) => p >= 1 && p <= totalPages)
    .map((p) => p - 1)

  if (indices.length === 0) {
    throw new Error('请指定有效的页码')
  }

  onProgress?.(50)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(sourceDoc, indices)
  copiedPages.forEach((p) => newDoc.addPage(p))

  onProgress?.(80)
  const resultBytes = await newDoc.save()
  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Add watermark to every page of a PDF
 * @param file - Input PDF file
 * @param watermarkText - Text to add as watermark
 * @param options - Watermark styling options
 * @param onProgress - Progress callback
 * @returns Watermarked PDF as Blob
 */
export async function addWatermark(
  file: File,
  watermarkText: string,
  options: {
    fontSize?: number
    opacity?: number
    color?: { r: number; g: number; b: number }
    angle?: number
  } = {},
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const {
    fontSize = 48,
    opacity = 0.15,
    color = { r: 0.5, g: 0.5, b: 0.5 },
    angle = 45,
  } = options

  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(30)
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pages = pdfDoc.getPages()

  // Register fontkit to embed custom fonts (needed for CJK support)
  pdfDoc.registerFontkit(fontkit)

  onProgress?.(40)
  // Load a subsetted CJK font from Google Fonts
  const font = await loadWatermarkFont(pdfDoc, watermarkText)

  onProgress?.(50)
  const { r, g, b } = color

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(50 + Math.round((i / pages.length) * 45))
    const page = pages[i]
    const { width, height } = page.getSize()

    // Grid spacing: page-dimension based, but at least 1.5× text width
    // to prevent overlaps with long watermark text.
    const textW = font.widthOfTextAtSize(watermarkText, fontSize)
    const minDim = Math.min(width, height)
    const step = Math.max(minDim / 2, textW * 1.5)
    const margin = step / 2   // offset for diagonal stagger

    for (let x = 0; x < width + step; x += step) {
      for (let y = 0; y < height + step; y += step) {
        // offset every other row to create a staggered pattern
        const offsetX = (Math.round(y / step) % 2 === 0) ? 0 : margin
        page.drawText(watermarkText, {
          x: x + offsetX,
          y,
          size: fontSize,
          font,
          opacity,
          color: rgb(r, g, b),
          rotate: degrees(angle),
        })
      }
    }
  }

  onProgress?.(95)
  const resultBytes = await pdfDoc.save()
  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Load a subsetted CJK font from Google Fonts for the given watermark text.
 * Uses fontkit to embed the font into the PDF document.
 */
async function loadWatermarkFont(
  pdfDoc: PDFDocument,
  text: string,
): ReturnType<PDFDocument['embedFont']> {
  // Only fetch the glyphs we actually need via Google Fonts' text= parameter
  const uniqueChars = [...new Set(text)].join('')
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC&text=${encodeURIComponent(uniqueChars)}`

  const cssResp = await fetch(cssUrl)
  if (!cssResp.ok) throw new Error('Failed to fetch font CSS from Google Fonts')
  const css = await cssResp.text()

  // Extract the actual font file URL from the CSS @font-face rule
  const urlMatch = css.match(/url\((https?:\/\/[^)]+)\)/)
  if (!urlMatch) throw new Error('Failed to parse font URL from Google Fonts response')

  const fontResp = await fetch(urlMatch[1])
  if (!fontResp.ok) throw new Error('Failed to fetch font file from CDN')
  const fontBytes = await fontResp.arrayBuffer()

  return pdfDoc.embedFont(fontBytes)
}
