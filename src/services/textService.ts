import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

interface TextItem {
  str: string
  dir: string
  width: number
  height: number
  transform: number[]
  fontName: string
}

/**
 * Extract text from PDF with layout preservation.
 * Groups text items by vertical position into lines,
 * then groups lines by spacing into paragraphs.
 */
export async function pdfToText(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ text: string; totalPages: number }> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(20)
  const loadingTask = pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS })
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages
  const pagesText: string[] = []

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(20 + Math.round((i / totalPages) * 70))
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const items = textContent.items as unknown as TextItem[]

    if (items.length === 0) {
      pagesText.push(`[Page ${i}]\n(No text content)\n`)
      continue
    }

    // Calculate line height from first item's height, or default
    const avgHeight = items.reduce((sum, item) => sum + item.height, 0) / items.length || 12

    // Sort items: top-to-bottom, left-to-right
    const sorted = [...items].sort((a, b) => {
      const yDiff = a.transform[5] - b.transform[5] // PDF y-axis goes bottom-to-top
      if (Math.abs(yDiff) < avgHeight * 0.3) {
        return a.transform[4] - b.transform[4] // same line: left-to-right
      }
      return yDiff
    })

    // Group into lines
    const lines: { y: number; items: TextItem[] }[] = []
    for (const item of sorted) {
      const y = item.transform[5]
      const lastLine = lines.at(-1)
      if (lastLine && Math.abs(y - lastLine.y) < avgHeight * 0.3) {
        // Same line: insert in correct horizontal position
        const insertAt = lastLine.items.findIndex(
          (li) => li.transform[4] > item.transform[4]
        )
        if (insertAt === -1) {
          lastLine.items.push(item)
        } else {
          lastLine.items.splice(insertAt, 0, item)
        }
      } else {
        lines.push({ y, items: [item] })
      }
    }

    // Build text for page
    let pageText = `--- Page ${i} ---\n`
    let prevY = lines[0]?.y ?? 0

    for (const line of lines) {
      // Detect paragraph break: gap larger than 1.8x line height
      const gap = prevY - line.y // PDF y decreases downward
      if (gap > avgHeight * 1.8 && prevY !== line.y) {
        pageText += '\n'
      }

      // Join items on same line, inserting spaces between words
      let lineStr = ''
      for (const item of line.items) {
        const str = item.str ?? ''
        if (lineStr.length > 0 && !str.startsWith(' ') && !lineStr.endsWith(' ')) {
          // Check horizontal gap: if > 1 char width, add space
          const prevItem = line.items[line.items.indexOf(item) - 1]
          if (prevItem) {
            const prevEnd = prevItem.transform[4] + (prevItem.width ?? 0)
            const currStart = item.transform[4]
            const charWidth = item.width / Math.max(1, str.length)
            if (currStart - prevEnd > charWidth) {
              lineStr += ' '
            }
          }
        }
        lineStr += str
      }
      pageText += lineStr.trimEnd() + '\n'
      prevY = line.y
    }

    pagesText.push(pageText)
  }

  onProgress?.(100)
  const text = pagesText.join('\n')
  return { text, totalPages }
}

/**
 * Generate a text Blob from extracted content
 */
export function textToBlob(text: string): Blob {
  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}
