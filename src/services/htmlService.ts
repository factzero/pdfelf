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

interface PageItem {
  pageNum: number
  width: number
  height: number
  items: TextItem[]
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Convert PDF to HTML, attempting to recreate the original layout.
 * Extracts text with exact positions and uses absolute positioning to match the PDF layout.
 */
export async function pdfToHtml(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ html: string; totalPages: number }> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(20)
  const loadingTask = pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS })
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages

  // Use a fixed scale for consistent text positions (1.5 = ~108 DPI)
  const scale = 1.5

  const pagesData: PageItem[] = []

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(20 + Math.round((i / totalPages) * 65))
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const textContent = await page.getTextContent()
    const items = textContent.items as unknown as TextItem[]

    pagesData.push({
      pageNum: i,
      width: viewport.width,
      height: viewport.height,
      items,
    })
  }

  // Build HTML
  const bodyParts: string[] = []
  for (const { pageNum, width, height, items } of pagesData) {
    bodyParts.push(
      `  <div class="pdf-page" style="width:${Math.round(width)}px;height:${Math.round(height)}px;">`
    )
    bodyParts.push(`    <div class="page-label">Page ${pageNum}</div>`)

    for (const item of items) {
      const x = item.transform[4]
      // PDF y-axis is bottom-to-top; convert to top-to-bottom
      const y = height - item.transform[5]
      const fontSize = Math.abs(item.transform[3]) || item.height || 12

      const escaped = escapeHtml(item.str)
      if (!escaped.trim()) continue

      bodyParts.push(
        `    <span style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;font-size:${fontSize.toFixed(1)}px;font-family:serif;white-space:pre;color:#000;">${escaped}</span>`
      )
    }

    bodyParts.push('  </div>')
  }

  onProgress?.(90)

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>PDF to HTML</title>',
    '<style>',
    '  * { margin:0; padding:0; box-sizing:border-box; }',
    '  body { background:#f0f0f0; padding:20px; font-family:serif; }',
    '  .pdf-page { position:relative; background:#fff; margin:0 auto 16px auto;',
    '              box-shadow:0 2px 8px rgba(0,0,0,0.12); overflow:hidden; }',
    '  .page-label { position:absolute; top:4px; right:8px; font-size:10px;',
    '                color:#999; font-family:sans-serif; z-index:10;',
    '                background:rgba(255,255,255,0.85); padding:2px 6px;',
    '                border-radius:3px; }',
    '</style>',
    '</head>',
    '<body>',
    bodyParts.join('\n'),
    '</body>',
    '</html>',
  ].join('\n')

  onProgress?.(100)
  return { html, totalPages }
}

/**
 * Generate an HTML Blob
 */
export function htmlToBlob(html: string): Blob {
  return new Blob([html], { type: 'text/html;charset=utf-8' })
}
