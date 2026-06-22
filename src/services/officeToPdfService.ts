import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import mammoth from 'mammoth'

/**
 * Convert Word (.docx) to PDF
 * Uses mammoth.js to extract text content, then lays it out with pdf-lib.
 * Note: This preserves text content but not complex formatting.
 */
export async function wordToPdf(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(30)
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  const text = result.value

  if (!text.trim()) {
    throw new Error('文档内容为空，无法转换')
  }

  onProgress?.(50)
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageWidth = PageSizes.A4[0]
  const pageHeight = PageSizes.A4[1]
  const margin = 60
  const contentWidth = pageWidth - margin * 2
  const fontSize = 11
  const lineHeight = fontSize * 1.5
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight)

  // Split text into paragraphs, then into lines
  const paragraphs = text.split(/\n\s*\n/)
  const allLines: string[] = []

  for (const para of paragraphs) {
    const words = para.replace(/\n/g, ' ').trim().split(/\s+/)
    if (words.length === 0 || words[0] === '') {
      allLines.push('') // empty line for paragraph break
      continue
    }
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)
      if (testWidth > contentWidth && currentLine) {
        allLines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) allLines.push(currentLine)
    allLines.push('') // paragraph separator
  }

  onProgress?.(70)

  const totalPages = Math.ceil(allLines.length / linesPerPage) || 1

  for (let p = 0; p < totalPages; p++) {
    onProgress?.(70 + Math.round((p / totalPages) * 25))
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    const startLine = p * linesPerPage
    const endLine = Math.min(startLine + linesPerPage, allLines.length)
    const pageLines = allLines.slice(startLine, endLine)

    for (let i = 0; i < pageLines.length; i++) {
      const y = pageHeight - margin - (i + 1) * lineHeight
      page.drawText(pageLines[i], {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
    }

    // Page number
    page.drawText(`${p + 1}`, {
      x: pageWidth / 2,
      y: margin / 2,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  onProgress?.(98)
  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Convert Excel (.xlsx) to PDF
 * Uses SheetJS (xlsx) to parse data, then renders as a table in pdf-lib.
 * Note: xlsx is loaded dynamically to reduce bundle size.
 */
export async function excelToPdf(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)

  // Dynamic import xlsx
  const XLSX = await import('xlsx')

  onProgress?.(30)
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  }) as string[][]

  if (data.length === 0) {
    throw new Error('工作表内容为空')
  }

  onProgress?.(50)

  // Determine column widths based on content
  const maxCols = Math.max(...data.map((row) => row.length))
  const colWidths: number[] = []
  for (let c = 0; c < maxCols; c++) {
    let maxLen = 3
    for (const row of data) {
      const cell = String(row[c] || '')
      maxLen = Math.max(maxLen, cell.length)
    }
    colWidths.push(Math.min(maxLen * 7 + 20, 180))
  }

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 9
  const rowHeight = 18
  const margin = 30

  const pageWidth = Math.max(
    PageSizes.A4[0],
    margin * 2 + colWidths.reduce((s, w) => s + w, 0) + 10
  )
  const pageHeight = PageSizes.A4[1]
  const headerRows = 1 // first row as header
  const bodyRowsPerPage = Math.floor((pageHeight - margin * 2 - headerRows * rowHeight) / rowHeight)

  const totalBodyRows = data.length - headerRows
  const totalPages = Math.ceil(Math.max(totalBodyRows, 1) / bodyRowsPerPage)

  for (let p = 0; p < totalPages; p++) {
    onProgress?.(50 + Math.round((p / totalPages) * 45))
    const page = pdfDoc.addPage([pageWidth, pageHeight])

    const startBodyRow = p * bodyRowsPerPage + headerRows
    const endBodyRow = Math.min(startBodyRow + bodyRowsPerPage, data.length)
    const visibleRows = [data[0], ...data.slice(startBodyRow, endBodyRow)]

    // Draw grid
    for (let ri = 0; ri < visibleRows.length; ri++) {
      const y = pageHeight - margin - (ri + 1) * rowHeight
      let x = margin

      for (let ci = 0; ci < maxCols; ci++) {
        const cellText = String(visibleRows[ri][ci] || '')
        const w = colWidths[ci]

        // Cell background
        if (ri === 0) {
          page.drawRectangle({
            x,
            y,
            width: w,
            height: rowHeight,
            color: rgb(0.85, 0.85, 0.85),
          })
        }

        // Cell border
        page.drawRectangle({
          x,
          y,
          width: w,
          height: rowHeight,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 0.5,
        })

        // Cell text (truncated)
        const displayText = cellText.length > 25 ? cellText.slice(0, 22) + '...' : cellText
        page.drawText(displayText, {
          x: x + 3,
          y: y + 4,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })

        x += w
      }
    }
  }

  onProgress?.(98)
  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}

/**
 * Convert PowerPoint (.pptx) to PDF
 * Uses pptx2json approach - extracts text and layouts from slides.
 * Note: This is a simplified conversion that preserves text content.
 */
export async function pptToPdf(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(30)
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)

  // Read slide XML files
  const slideFiles: string[] = []
  zip.folder('ppt/slides')?.forEach((relativePath) => {
    if (relativePath.startsWith('slide') && relativePath.endsWith('.xml')) {
      slideFiles.push(`ppt/slides/${relativePath}`)
    }
  })

  // Sort slides numerically
  slideFiles.sort((a, b) => {
    const na = parseInt(a.match(/slide(\d+)/)?.[1] || '0')
    const nb = parseInt(b.match(/slide(\d+)/)?.[1] || '0')
    return na - nb
  })

  if (slideFiles.length === 0) {
    throw new Error('未找到幻灯片内容')
  }

  onProgress?.(50)

  // Extract text from each slide using regex
  const slides: string[] = []
  for (let i = 0; i < slideFiles.length; i++) {
    onProgress?.(50 + Math.round((i / slideFiles.length) * 30))
    const xmlContent = await zip.file(slideFiles[i])?.async('text') || ''
    // Extract text between <a:t> tags
    const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || []
    const texts = textMatches.map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
    slides.push(texts.join('\n'))
  }

  onProgress?.(80)

  // Create PDF with one page per slide
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pageWidth = PageSizes.A4[0]
  const pageHeight = PageSizes.A4[1]
  const margin = 50
  const fontSize = 12
  const lineHeight = 18

  for (let i = 0; i < slides.length; i++) {
    onProgress?.(80 + Math.round((i / slides.length) * 18))
    const page = pdfDoc.addPage([pageWidth, pageHeight])

    // Slide number
    page.drawText(`幻灯片 ${i + 1}`, {
      x: margin,
      y: pageHeight - margin,
      size: 16,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    })

    // Divider line
    page.drawLine({
      start: { x: margin, y: pageHeight - margin - 8 },
      end: { x: pageWidth - margin, y: pageHeight - margin - 8 },
      color: rgb(0.7, 0.7, 0.7),
      thickness: 1,
    })

    // Slide content
    const lines = slides[i].split('\n')
    let y = pageHeight - margin - 30
    for (const line of lines) {
      if (y < margin) break // page overflow
      // Word wrap
      const words = line.split(/\s+/)
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, fontSize)
        if (testWidth > pageWidth - margin * 2 && currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          })
          y -= lineHeight
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine && y >= margin) {
        page.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
        y -= lineHeight
      }
      y -= 4 // extra spacing between original lines
    }

    // Footer with page number
    page.drawText(`${i + 1} / ${slides.length}`, {
      x: pageWidth / 2 - 20,
      y: margin - 10,
      size: 8,
      font,
      color: rgb(0.6, 0.6, 0.6),
    })
  }

  onProgress?.(99)
  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  onProgress?.(100)
  return blob
}
