import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import JSZip from 'jszip'
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite'
import { decryptPDF } from '@pdfsmaller/pdf-decrypt-lite'
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

/**
 * Add page numbers to a PDF file.
 * @param file - Input PDF file
 * @param options - Page number formatting options
 * @param onProgress - Progress callback (0-100)
 * @returns PDF with page numbers as Blob
 */
export async function addPageNumbers(
  file: File,
  options: {
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
    fontSize?: number
    format?: 'page-only' | 'page-of-total' | 'page-slash-total'
    font?: 'Helvetica' | 'Times Roman' | 'Courier'
  } = {},
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const {
    position = 'bottom-center',
    fontSize = 12,
    format = 'page-of-total',
    font = 'Helvetica',
  } = options

  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(30)
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pages = pdfDoc.getPages()
  const totalPages = pages.length

  // Map font name to pdf-lib StandardFonts
  const fontMap: Record<string, StandardFonts> = {
    'Helvetica': StandardFonts.Helvetica,
    'Times Roman': StandardFonts.TimesRoman,
    'Courier': StandardFonts.Courier,
  }
  const selectedFont = fontMap[font] ?? StandardFonts.Helvetica
  const pdfFont = pdfDoc.embedStandardFont(selectedFont)

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(30 + Math.round((i / pages.length) * 65))
    const page = pages[i]
    const pageNum = i + 1
    const { width, height } = page.getSize()

    let label: string
    switch (format) {
      case 'page-only':
        label = `${pageNum}`
        break
      case 'page-slash-total':
        label = `${pageNum} / ${totalPages}`
        break
      case 'page-of-total':
      default:
        label = `Page ${pageNum} of ${totalPages}`
    }

    const textWidth = pdfFont.widthOfTextAtSize(label, fontSize)
    const textHeight = fontSize
    const margin = 28

    let x: number
    let y: number

    // Horizontal position
    if (position.includes('left')) {
      x = margin
    } else if (position.includes('right')) {
      x = width - textWidth - margin
    } else {
      x = (width - textWidth) / 2
    }

    // Vertical position (y flips: top is near height, bottom is near 0)
    if (position.startsWith('top')) {
      y = height - margin - textHeight
    } else {
      y = margin
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font: pdfFont,
      color: rgb(0.35, 0.35, 0.35),
    })
  }

  onProgress?.(95)
  const resultBytes = await pdfDoc.save()
  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Protect a PDF with password encryption.
 * Uses @pdfsmaller/pdf-encrypt-lite for real RC4 128-bit encryption per PDF spec.
 * Note: pdf-lib itself does NOT support encryption — its save() ignores ownerPassword/userPassword.
 */
export async function protectPDF(
  file: File,
  options: {
    ownerPassword: string
    userPassword?: string
  },
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const { ownerPassword, userPassword } = options
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  const pdfBytes = new Uint8Array(buffer)

  onProgress?.(50)
  const encryptedBytes = await encryptPDF(
    pdfBytes,
    userPassword || ownerPassword,
    ownerPassword || null,
  )

  onProgress?.(95)
  const blob = new Blob([encryptedBytes], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Remove password protection from a PDF file.
 * Uses @pdfsmaller/pdf-decrypt-lite for real RC4 40/128-bit decryption per PDF spec.
 */
export async function unlockPDF(
  file: File,
  password: string,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  const pdfBytes = new Uint8Array(buffer)

  onProgress?.(50)
  const decryptedBytes = await decryptPDF(pdfBytes, password)

  onProgress?.(95)
  const blob = new Blob([decryptedBytes], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Crop PDF pages by setting crop box.
 * Supports both margin-based cropping (top/bottom/left/right) and
 * visual region cropping (rect: x, y, width, height in PDF points).
 * When pageNumbers is provided, only those pages are cropped.
 */
export async function cropPDF(
  file: File,
  options: {
    top?: number
    bottom?: number
    left?: number
    right?: number
    /** Visual crop rectangle in PDF points (from top-left origin) */
    rect?: { x: number; y: number; width: number; height: number }
    /** Specific page numbers (1-based) to crop; if omitted, all pages are cropped */
    pageNumbers?: number[]
  } = {},
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const { top = 0, bottom = 0, left = 0, right = 0, rect, pageNumbers } = options
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(30)
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pages = pdfDoc.getPages()
  onProgress?.(50)

  if (rect) {
    // Visual region cropping: use rect coordinates (from top-left) to compute crop box
    const pageIndices = pageNumbers
      ? pageNumbers.map((n) => n - 1).filter((i) => i >= 0 && i < pages.length)
      : pages.map((_, i) => i)

    for (const i of pageIndices) {
      const page = pages[i]
      const { height: pageH } = page.getSize()
      // Convert: PDF y-axis points up, rect y points down from top
      const cropBottom = pageH - rect.y - rect.height
      const cropLeft = rect.x
      page.setCropBox(cropLeft, cropBottom, rect.width, rect.height)
    }
  } else {
    // Margin-based cropping (backward compatible)
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const { width, height } = page.getSize()
      const newWidth = width - left - right
      const newHeight = height - top - bottom
      if (newWidth > 0 && newHeight > 0) {
        page.setCropBox(left, bottom, newWidth, newHeight)
      }
    }
  }

  onProgress?.(80)
  const resultBytes = await pdfDoc.save()
  onProgress?.(95)
  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Extract embedded images from a PDF.
 *
 * Strategy:
 *  1. Find all /Subtype /Image objects via PDF structure parsing.
 *  2. For /DCTDecode — extract the raw JPEG stream (it IS the JPEG file).
 *  3. For /FlateDecode — decompress raw pixels, then create a valid BMP.
 *  4. Other filters are skipped (e.g. JPXDecode / JPEG2000).
 *
 * This avoids unreliable global binary scans that produce broken images.
 */

/** Magic bytes for the "endstream" keyword. */
const ENDSTREAM_MAGIC = new Uint8Array([0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d])
const STREAM_MAGIC = new Uint8Array([0x73, 0x74, 0x72, 0x65, 0x61, 0x6d])

export async function extractImages(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(5)
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(15)
  const bytes = new Uint8Array(buffer)
  const imageMap = new Map<string, { bytes: Uint8Array; width: number; height: number; format: string }>()

  const text = new TextDecoder('latin1').decode(bytes)
  let searchFrom = 0

  while (searchFrom < text.length) {
    // 1. 定位 /Subtype /Image
    const subIdx = text.indexOf('/Subtype /Image', searchFrom)
    if (subIdx === -1) break
    searchFrom = subIdx + 14

    onProgress?.(15 + Math.round((subIdx / text.length) * 20))

    // 2. 读取图片属性 (在 3000 字符窗口内)
    const ctxEnd = Math.min(text.length, subIdx + 3000)
    const ctx = text.substring(subIdx, ctxEnd)

    const width = parseInt(ctx.match(/\/Width\s+(\d+)/)?.[1] || '0', 10) || 0
    const height = parseInt(ctx.match(/\/Height\s+(\d+)/)?.[1] || '0', 10) || 0
    const bpc = parseInt(ctx.match(/\/BitsPerComponent\s+(\d+)/)?.[1] || '8', 10)

    // 3. 判断滤镜类型
    const isDCT = /\/Filter\s*\/DCTDecode/.test(ctx)
    const isFlate = /\/Filter\s*\/FlateDecode/.test(ctx)

    if (!isDCT && !isFlate) continue

    // 4. 提取 ColorSpace
    let colorSpace = 'DeviceRGB'
    const csMatch = ctx.match(/\/ColorSpace\s+(\/\w+)/)
    if (csMatch) {
      colorSpace = csMatch[1]
    }

    // 5. 提取流数据 —— 在字节层面操作, 避免文本搜索缺陷
    const streamResult = extractPdfStream(bytes, subIdx)
    if (!streamResult) continue

    const streamData = streamResult.data

    if (isDCT) {
      // ── DCTDecode: 流数据就是 JPEG ──────────────────────────────
      if (streamData.length < 500) continue
      const jpeg = extractValidJpeg(streamData)
      if (!jpeg) continue
      const key = `jpeg-${jpeg.length}-${subIdx}`
      imageMap.set(key, { bytes: jpeg, width, height, format: 'jpg' })

    } else if (isFlate) {
      // ── FlateDecode: 解压后生成 BMP ────────────────────────────
      if (streamData.length < 50 || streamData[0] !== 0x78) continue
      try {
        const raw = await inflateRaw(streamData)
        const bmp = createBMP(raw, width, height, colorSpace, bpc)
        if (!bmp) continue
        const key = `flate-${raw.length}-${subIdx}`
        imageMap.set(key, { bytes: bmp, width, height, format: 'bmp' })
      } catch { /* skip */ }
    }
  }

  // ── 打包 ZIP ─────────────────────────────────────────────────────────
  if (imageMap.size === 0) throw new Error('No images found in this PDF')
  onProgress?.(90)
  const zip = new JSZip()
  let idx = 0
  for (const [, img] of imageMap) {
    idx++
    const dim = img.width && img.height ? `_${img.width}x${img.height}` : ''
    zip.file(`image_${idx}${dim}.${img.format}`, img.bytes)
  }
  onProgress?.(98)
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  onProgress?.(100)
  return zipBlob
}

/**
 * Extract the raw bytes of a PDF stream starting near `dictOffset`.
 * Returns the data between `stream\n` and `\nendstream`.
 */
function extractPdfStream(bytes: Uint8Array, dictOffset: number): { data: Uint8Array } | null {
  // 在 dict 之后搜索 "stream" 关键字 (字节级, 最多搜 4096 字节)
  const streamStart = indexOfBytes(bytes, STREAM_MAGIC, dictOffset)
  if (streamStart === -1 || streamStart - dictOffset > 4096) return null

  let dataStart = streamStart + STREAM_MAGIC.length

  // 跳过 stream 后的换行: \r\n | \n | \r
  if (dataStart < bytes.length && bytes[dataStart] === 0x0d) dataStart++ // \r
  if (dataStart < bytes.length && bytes[dataStart] === 0x0a) dataStart++ // \n

  // 从 dataStart 向后搜索 "endstream" (字节级)
  const endstreamPos = indexOfBytes(bytes, ENDSTREAM_MAGIC, dataStart)
  if (endstreamPos === -1 || endstreamPos <= dataStart) return null

  // 去掉 endstream 前的换行符 (\r\n | \n | \r 可能被包含)
  let dataEnd = endstreamPos
  if (dataEnd > dataStart && bytes[dataEnd - 1] === 0x0a) dataEnd-- // \n
  if (dataEnd > dataStart && bytes[dataEnd - 1] === 0x0d) dataEnd-- // \r

  if (dataEnd <= dataStart) return null

  return { data: bytes.slice(dataStart, dataEnd) }
}

/** Find needle Uint8Array in haystack Uint8Array, starting at offset. */
function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, offset: number): number {
  const limit = haystack.length - needle.length
  for (let i = offset; i <= limit; i++) {
    let match = true
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) { match = false; break }
    }
    if (match) return i
  }
  return -1
}

/** Decompress a deflate-raw buffer using browser DecompressionStream. */
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

/**
 * Try to extract a valid JPEG from stream data.
 * DCTDecode streams may not include JFIF/EXIF headers — in that case
 * we look for the SOF (0xFF 0xC0/0xC2) marker to rebuild the JPEG.
 */
function extractValidJpeg(streamData: Uint8Array): Uint8Array | null {
  // Case 1: already has SOI marker at start → use directly
  if (streamData[0] === 0xff && streamData[1] === 0xd8) {
    // Find the EOI marker near the end
    const len = streamData.length
    for (let k = len - 2; k >= len - 100 && k >= 0; k--) {
      if (streamData[k] === 0xff && streamData[k + 1] === 0xd9) {
        return streamData.slice(0, k + 2)
      }
    }
    return null
  }

  // Case 2: starts with SOF marker (0xFF 0xC0) — no SOI, add one
  if ((streamData[0] === 0xff && streamData[1] === 0xc0) ||
      (streamData[0] === 0xff && streamData[1] === 0xc2)) {
    // Find EOI
    const len = streamData.length
    let eoi = -1
    for (let k = len - 2; k >= len - 100 && k >= 0; k--) {
      if (streamData[k] === 0xff && streamData[k + 1] === 0xd9) { eoi = k + 2; break }
    }
    if (eoi === -1) return null
    // Prepend SOI
    const result = new Uint8Array(eoi + 2)
    result[0] = 0xff; result[1] = 0xd8
    result.set(streamData.slice(0, eoi), 2)
    return result.slice(0, 2 + eoi)
  }

  // Case 3: starts with 0xFF 0xDB (DQT) or 0xFF 0xC4 (DHT) — headers only, no SOI
  if (streamData[0] === 0xff && (streamData[1] === 0xdb || streamData[1] === 0xc4 ||
       streamData[1] === 0xdd || streamData[1] === 0xfe)) {
    const len = streamData.length
    let eoi = -1
    for (let k = len - 2; k >= len - 100 && k >= 0; k--) {
      if (streamData[k] === 0xff && streamData[k + 1] === 0xd9) { eoi = k + 2; break }
    }
    if (eoi === -1) return null
    const result = new Uint8Array(eoi + 2)
    result[0] = 0xff; result[1] = 0xd8
    result.set(streamData.slice(0, eoi), 2)
    return result.slice(0, 2 + eoi)
  }

  return null
}

/**
 * Create a valid BMP file from raw decompressed pixel data.
 * Supports DeviceRGB (24-bit) and DeviceGray (8-bit indexed).
 */
function createBMP(
  raw: Uint8Array, width: number, height: number,
  colorSpace: string, bpc: number
): Uint8Array | null {
  if (!width || !height || width > 32767 || height > 32767) return null

  const isGray = colorSpace === '/DeviceGray'
  const expectedSize = isGray ? width * height : width * height * 3

  if (raw.length < expectedSize) return null

  if (isGray && bpc === 8) {
    return makeBMP8bitGray(raw, width, height)
  }

  // DeviceRGB: 24-bit BMP
  return makeBMP24bitRGB(raw, width, height)
}

/** 8-bit grayscale indexed BMP. */
function makeBMP8bitGray(raw: Uint8Array, width: number, height: number): Uint8Array {
  const rowSize = Math.floor((width + 3) / 4) * 4  // 4-byte aligned
  const paletteSize = 256 * 4                        // BGRA palette
  const pixelOffset = 14 + 40 + paletteSize
  const fileSize = pixelOffset + rowSize * height

  const buf = new Uint8Array(fileSize)
  const dv = new DataView(buf.buffer)

  // BMP header
  buf[0] = 0x42; buf[1] = 0x4d  // "BM"
  dv.setUint32(2, fileSize, true)
  dv.setUint32(10, pixelOffset, true)

  // DIB header (BITMAPINFOHEADER)
  dv.setUint32(14, 40, true)       // size
  dv.setInt32(18, width, true)     // width
  dv.setInt32(22, -height, true)   // negative height = top-down
  dv.setUint16(26, 1, true)        // planes
  dv.setUint16(28, 8, true)        // bpp
  dv.setUint32(30, 0, true)        // compression = BI_RGB
  dv.setUint32(34, rowSize * height, true)
  dv.setUint32(38, 2835, true)     // 72 DPI
  dv.setUint32(42, 2835, true)
  dv.setUint32(46, 256, true)      // colors used
  dv.setUint32(50, 256, true)      // important colors

  // Grayscale palette
  for (let i = 0; i < 256; i++) {
    const off = 54 + i * 4
    buf[off] = i; buf[off + 1] = i; buf[off + 2] = i; buf[off + 3] = 0
  }

  // Pixel data (top-down)
  for (let y = 0; y < height; y++) {
    const srcOff = y * width
    const dstOff = pixelOffset + y * rowSize
    buf.set(raw.subarray(srcOff, srcOff + width), dstOff)
  }

  return buf
}

/** 24-bit RGB BMP. */
function makeBMP24bitRGB(raw: Uint8Array, width: number, height: number): Uint8Array {
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4
  const pixelOffset = 14 + 40
  const fileSize = pixelOffset + rowSize * height

  const buf = new Uint8Array(fileSize)
  const dv = new DataView(buf.buffer)

  buf[0] = 0x42; buf[1] = 0x4d
  dv.setUint32(2, fileSize, true)
  dv.setUint32(10, pixelOffset, true)

  dv.setUint32(14, 40, true)
  dv.setInt32(18, width, true)
  dv.setInt32(22, -height, true)
  dv.setUint16(26, 1, true)
  dv.setUint16(28, 24, true)
  dv.setUint32(30, 0, true)
  dv.setUint32(34, rowSize * height, true)
  dv.setUint32(38, 2835, true)
  dv.setUint32(42, 2835, true)

  // Pixel data: RGB → BGR, top-down
  for (let y = 0; y < height; y++) {
    const dstOff = pixelOffset + y * rowSize
    const srcOff = y * width * 3
    for (let x = 0; x < width; x++) {
      const si = srcOff + x * 3
      const di = dstOff + x * 3
      buf[di]     = raw[si + 2]  // B
      buf[di + 1] = raw[si + 1]  // G
      buf[di + 2] = raw[si]      // R
    }
  }

  return buf
}

/**
 * Attempt to repair a damaged PDF file.
 *
 * Strategy (tried in order):
 *  1. Direct pdf-lib load+savedit — handles encryption, minor structure issues.
 *  2. Progressive tail-truncation — when the error is at EOF, trim incomplete
 *     trailing data in 256-byte steps until pdf-lib can parse it.
 *  3. pdf.js render-rebuild — render every page to a high-res image and
 *     assemble a new PDF (best-effort, loses text/searchability).
 */
export async function repairPDF(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(5)
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(15)

  // ── Strategy 1: direct load ──────────────────────────────────────
  const directResult = await tryLoadAndSave(buffer, 'direct')
  if (directResult) {
    onProgress?.(100)
    return directResult
  }

  // ── Strategy 2: progressive tail truncation ──────────────────────
  onProgress?.(25)
  const truncResult = await tryTruncationRepair(buffer, onProgress)
  if (truncResult) {
    onProgress?.(100)
    return truncResult
  }

  // ── Strategy 3: render-rebuild via pdf.js ────────────────────────
  onProgress?.(30)
  const rebuildResult = await tryRenderRebuild(file, onProgress)
  if (rebuildResult) {
    onProgress?.(100)
    return rebuildResult
  }

  throw new Error('Unable to repair this PDF — all strategies failed')
}

/** Try pdf-lib load → save. Returns Blob or null. */
async function tryLoadAndSave(
  buffer: ArrayBuffer,
  _label: string
): Promise<Blob | null> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    })
    const resultBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    })
    return new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  } catch {
    return null
  }
}

/**
 * When the error is at/near EOF, we try progressively removing bytes
 * from the tail, hoping to land on a clean object boundary.
 */
async function tryTruncationRepair(
  buffer: ArrayBuffer,
  onProgress?: (percent: number) => void
): Promise<Blob | null> {
  const bytes = new Uint8Array(buffer)
  const maxTrim = Math.min(bytes.length - 1024, 32768) // don't trim more than 32 KB
  if (maxTrim <= 0) return null

  // Trim in 256-byte steps from the end
  for (let trim = 0; trim <= maxTrim; trim += 256) {
    const chunk = bytes.slice(0, bytes.length - trim)
    const result = await tryLoadAndSave(chunk.buffer, `trim-${trim}`)
    if (result) {
      // Update progress: 25 → 50
      onProgress?.(25 + Math.round((trim / maxTrim) * 25))
      return result
    }
    // Throttle: don't freeze the UI
    if (trim % 2048 === 0) {
      onProgress?.(25 + Math.round((trim / maxTrim) * 25))
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  return null
}

/**
 * Render each page via pdf.js (which is more lenient) and build a
 * fresh PDF from the page images.  Loses text layer / searchability
 * but preserves visual content.
 */
async function tryRenderRebuild(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob | null> {
  try {
    const { pdfjsLib, DEFAULT_PDF_OPTIONS } = await import('@/utils/pdfjs')
    const buffer = await readFileAsArrayBuffer(file)

    const loadingTask = pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS })
    const pdf = await loadingTask.promise
    const pageCount = pdf.numPages

    if (pageCount === 0) {
      pdf.cleanup()
      return null
    }

    const scale = 2.0 // high-res render
    const newDoc = await PDFDocument.create()

    for (let i = 1; i <= pageCount; i++) {
      const baseProg = 50 + Math.round((i / pageCount) * 40) // 50→90
      onProgress?.(baseProg)

      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      await page.render({ canvasContext: ctx, viewport }).promise

      // Canvas → PNG blob → embed into new PDF
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
      })
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())

      const image = await newDoc.embedPng(pngBytes)
      const newPage = newDoc.addPage([viewport.width, viewport.height])
      newPage.drawImage(image, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      })

      // Yield to keep UI responsive
      await new Promise((r) => setTimeout(r, 0))
    }

    pdf.cleanup()

    onProgress?.(90)
    const resultBytes = await newDoc.save({ useObjectStreams: true })
    onProgress?.(95)
    return new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  } catch {
    return null
  }
}
