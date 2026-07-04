/**
 * TXT 转 PDF 服务
 * 将纯文本文件转换为格式化的 PDF 文档
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface TxtToPdfOptions {
  fontSize?: number
  fontFamily?: 'helvetica' | 'times' | 'courier'
  pageSize?: 'a4' | 'letter'
  lineSpacing?: number
  margin?: number
}

const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595, 842],
  letter: [612, 792],
}

const FONT_MAP: Record<string, StandardFonts> = {
  helvetica: StandardFonts.Helvetica,
  times: StandardFonts.TimesRoman,
  courier: StandardFonts.Courier,
}

export async function convertTxtToPdf(
  file: File,
  options: TxtToPdfOptions = {},
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const {
    fontSize = 11,
    fontFamily = 'helvetica',
    pageSize = 'a4',
    lineSpacing = 1.5,
    margin = 50,
  } = options

  onProgress?.(10)

  const text = await file.text()
  onProgress?.(20)

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(FONT_MAP[fontFamily])
  const [pageWidth, pageHeight] = PAGE_SIZES[pageSize]

  const contentWidth = pageWidth - margin * 2
  const lineHeight = fontSize * lineSpacing

  // 估算每行字符数（根据字体宽度）
  const charWidths: Record<string, number> = {
    helvetica: fontSize * 0.5,
    times: fontSize * 0.48,
    courier: fontSize * 0.6,
  }
  const charWidth = charWidths[fontFamily]
  const charsPerLine = Math.floor(contentWidth / charWidth)

  onProgress?.(30)

  const lines = text.split(/\r?\n/)
  const totalLines = lines.length

  let page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin - fontSize

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i]

    if (!line.trim()) {
      // 空行
      y -= lineHeight
      if (y < margin) {
        page = doc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin - fontSize
      }
      continue
    }

    // 自动换行
    let remaining = line
    while (remaining.length > 0) {
      const chunk = remaining.substring(0, charsPerLine)
      remaining = remaining.substring(charsPerLine)

      page.drawText(chunk.trimStart(), {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
        lineHeight: lineHeight,
      })

      y -= lineHeight

      if (y < margin) {
        page = doc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin - fontSize
      }
    }

    // 更新进度
    if (i % 50 === 0) {
      onProgress?.(30 + Math.floor((i / totalLines) * 60))
    }
  }

  onProgress?.(95)

  // 设置元数据
  const fileName = file.name.replace(/\.(txt|text)$/i, '')
  doc.setTitle(fileName)
  doc.setCreator('PDF Elf - TXT to PDF Converter')

  const pdfBytes = await doc.save()
  onProgress?.(100)

  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
