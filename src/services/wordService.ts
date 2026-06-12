import * as pdfjsLib from 'pdfjs-dist'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

// Use bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Convert PDF to Word (.docx)
 * Uses pdfjs to extract text and docx.js to rebuild the document
 */
export async function pdfToWord(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(20)
  const loadingTask = pdfjsLib.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages

  const allText: string[] = []

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(20 + Math.round((i / totalPages) * 60))
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Group text items by their approximate Y position (lines)
    const lines: Map<number, string[]> = new Map()
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const y = Math.round((item as any).transform?.[5] || 0)
        const line = lines.get(y) || []
        line.push((item as any).str)
        lines.set(y, line)
      }
    }

    // Sort lines by Y position (top to bottom) and join
    const sortedYs = [...lines.keys()].sort((a, b) => b - a)
    for (const y of sortedYs) {
      const line = lines.get(y)!
      allText.push(line.join(' '))
    }

    // Add page break marker between pages
    if (i < totalPages) {
      allText.push('')
      allText.push(`--- 第 ${i + 1} 页 ---`)
      allText.push('')
    }
  }

  onProgress?.(85)

  // Build Word document with docx.js
  const doc = new Document({
    sections: [
      {
        children: allText.map(
          (text) =>
            new Paragraph({
              children: [
                new TextRun({
                  text: text || ' ',
                  size: 24, // 12pt
                }),
              ],
              spacing: {
                after: 120, // 6pt after paragraph
              },
            })
        ),
      },
    ],
  })

  onProgress?.(95)
  const docxBlob = await Packer.toBlob(doc)
  onProgress?.(100)
  return docxBlob
}
