import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import JSZip from 'jszip'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

export type ImageFormat = 'png' | 'jpeg' | 'bmp' | 'tiff'

/**
 * Encode canvas ImageData as 24-bit BMP
 * Format: BITMAPFILEHEADER (14) + BITMAPINFOHEADER (40) + bottom-up BGR pixel data
 */
function encodeBMP(imageData: ImageData): ArrayBuffer {
  const { width, height, data } = imageData
  const rowSize = ((width * 3 + 3) >> 2) << 2 // 4-byte aligned
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize
  const buf = new ArrayBuffer(fileSize)
  const view = new DataView(buf)
  let offset = 0

  // BITMAPFILEHEADER
  view.setUint16(offset, 0x4D42, true); offset += 2 // "BM"
  view.setUint32(offset, fileSize, true); offset += 4
  view.setUint16(offset, 0, true); offset += 2 // reserved1
  view.setUint16(offset, 0, true); offset += 2 // reserved2
  view.setUint32(offset, 54, true); offset += 4 // data offset

  // BITMAPINFOHEADER
  view.setUint32(offset, 40, true); offset += 4 // biSize
  view.setInt32(offset, width, true); offset += 4
  view.setInt32(offset, height, true); offset += 4 // positive = bottom-up
  view.setUint16(offset, 1, true); offset += 2 // planes
  view.setUint16(offset, 24, true); offset += 2 // bpp
  view.setUint32(offset, 0, true); offset += 4 // BI_RGB
  view.setUint32(offset, pixelDataSize, true); offset += 4
  view.setInt32(offset, 2835, true); offset += 4 // 72 DPI → 2835 ppm
  view.setInt32(offset, 2835, true); offset += 4
  view.setUint32(offset, 0, true); offset += 4
  view.setUint32(offset, 0, true); offset += 4

  // Pixel data: bottom-up, BGR
  const rowBytes = width * 4 // RGBA source
  const out = new Uint8Array(buf, 54)
  for (let y = height - 1; y >= 0; y--) {
    const srcRow = y * rowBytes
    const dstRow = (height - 1 - y) * rowSize
    for (let x = 0; x < width; x++) {
      const src = srcRow + x * 4
      const dst = dstRow + x * 3
      out[dst] = data[src + 2]     // B
      out[dst + 1] = data[src + 1] // G
      out[dst + 2] = data[src]     // R
    }
    // Padding bytes are already zero (ArrayBuffer is zero-initialized)
  }

  return buf
}

/**
 * Encode canvas ImageData as uncompressed baseline TIFF (RGB)
 */
function encodeTIFF(imageData: ImageData): ArrayBuffer {
  const { width, height, data } = imageData
  const samplesPerPixel = 3 // RGB
  const compression = 1 // uncompressed

  // Convert RGBA → RGB pixel data
  const pixelCount = width * height
  const rgbData = new Uint8Array(pixelCount * 3)
  for (let i = 0; i < pixelCount; i++) {
    const src = i * 4
    const dst = i * 3
    rgbData[dst] = data[src]       // R
    rgbData[dst + 1] = data[src + 1] // G
    rgbData[dst + 2] = data[src + 2] // B
  }

  const stripByteCount = rgbData.length
  const numDirEntries = 12
  const ifdSize = 2 + numDirEntries * 12 + 4
  const headerSize = 8

  // Calculate IFD value offset (right after IFD)
  const ifdOffset = headerSize
  let valueOffset = ifdOffset + ifdSize

  // We need space for: BitsPerSample (3 SHORTs = 6 bytes), XResolution (8), YResolution (8)
  // plus potential padding for word alignment
  const bitsPerSampleOffset = valueOffset; valueOffset += 6
  const xResOffset = valueOffset; valueOffset += 8
  const yResOffset = valueOffset; valueOffset += 8
  valueOffset += 4 // stripOffsets (4 bytes, written inline in IFD)
  const dataOffset = valueOffset // pixel data starts here

  const totalSize = dataOffset + stripByteCount
  const buf = new ArrayBuffer(totalSize)
  const view = new DataView(buf)
  const u8 = new Uint8Array(buf)

  // TIFF Header (little-endian)
  view.setUint16(0, 0x4949, true) // "II"
  view.setUint16(2, 42, true)     // magic
  view.setUint32(4, ifdOffset, true)

  // IFD
  let pos = ifdOffset
  view.setUint16(pos, numDirEntries, true); pos += 2

  // Helper to write IFD entry
  function writeEntry(tag: number, type: number, count: number, value: number) {
    view.setUint16(pos, tag, true); pos += 2
    view.setUint16(pos, type, true); pos += 2
    view.setUint32(pos, count, true); pos += 4
    // If value fits in 4 bytes, put it inline; otherwise it's an offset
    const byteLen = count * (type === 3 ? 2 : type === 4 ? 4 : type === 5 ? 8 : 1)
    if (byteLen <= 4) {
      view.setUint32(pos, value, true)
    } else {
      view.setUint32(pos, value, true) // offset
    }
    pos += 4
  }

  writeEntry(256, 4, 1, width)                        // ImageWidth
  writeEntry(257, 4, 1, height)                       // ImageLength
  writeEntry(258, 3, 3, bitsPerSampleOffset)          // BitsPerSample
  writeEntry(259, 3, 1, compression)                  // Compression
  writeEntry(262, 3, 1, 2)                            // PhotometricInterpretation (RGB)
  writeEntry(273, 4, 1, dataOffset)                   // StripOffsets
  writeEntry(277, 3, 1, samplesPerPixel)              // SamplesPerPixel
  writeEntry(278, 4, 1, height)                       // RowsPerStrip
  writeEntry(279, 4, 1, stripByteCount)               // StripByteCounts
  writeEntry(282, 5, 1, xResOffset)                   // XResolution
  writeEntry(283, 5, 1, yResOffset)                   // YResolution
  writeEntry(296, 3, 1, 2)                            // ResolutionUnit (inches)

  view.setUint32(pos, 0, true) // Next IFD = null

  // BitsPerSample values
  view.setUint16(bitsPerSampleOffset, 8, true)
  view.setUint16(bitsPerSampleOffset + 2, 8, true)
  view.setUint16(bitsPerSampleOffset + 4, 8, true)

  // XResolution = 72 DPI (numerator=72, denominator=1)
  view.setUint32(xResOffset, 72, true)
  view.setUint32(xResOffset + 4, 1, true)
  // YResolution
  view.setUint32(yResOffset, 72, true)
  view.setUint32(yResOffset + 4, 1, true)

  // Pixel data
  u8.set(rgbData, dataOffset)

  return buf
}

/**
 * Render a single PDF page to an image Blob
 */
async function renderPageToBlob(
  page: pdfjsLib.PDFPageProxy,
  scale: number,
  format: ImageFormat
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

  const needsAlpha = format === 'png'
  const ctx = canvas.getContext('2d', { alpha: needsAlpha })
  if (!ctx) throw new Error('无法获取 Canvas 2D 上下文')

  // Fill white background for formats without alpha
  if (!needsAlpha) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  await page.render({ canvas, canvasContext: ctx, viewport }).promise

  // BMP / TIFF need manual encoding from pixel data
  if (format === 'bmp' || format === 'tiff') {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const buffer = format === 'bmp' ? encodeBMP(imageData) : encodeTIFF(imageData)
    const mimeType = format === 'bmp' ? 'image/bmp' : 'image/tiff'
    return new Blob([buffer], { type: mimeType })
  }

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
function formatExt(format: ImageFormat): string {
  const map: Record<ImageFormat, string> = { png: 'png', jpeg: 'jpg', bmp: 'bmp', tiff: 'tiff' }
  return map[format]
}

export async function pdfToImage(
  file: File,
  format: ImageFormat = 'png',
  dpi: number = 150,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; isSingle: boolean; ext: string; totalPages: number }> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(20)
  const loadingTask = pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS })
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages

  const scale = dpi / 72 // PDF default is 72 DPI
  const ext = formatExt(format)

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
