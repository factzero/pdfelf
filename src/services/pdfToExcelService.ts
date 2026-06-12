import * as pdfjsLib from 'pdfjs-dist'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

// Use bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Convert PDF to Excel (.xlsx)
 * Uses pdfjs-dist to extract text and SheetJS (xlsx) to build the spreadsheet.
 * Each PDF page becomes a separate sheet in the workbook.
 */
export async function pdfToExcel(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10)
  const buffer = await readFileAsArrayBuffer(file)

  onProgress?.(20)
  const loadingTask = pdfjsLib.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages

  // Dynamic import xlsx
  const XLSX = await import('xlsx')

  // Create workbook
  const workbook = XLSX.utils.book_new()

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(20 + Math.round((i / totalPages) * 70))
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Group text items by their approximate Y position (lines)
    const lines: Map<number, { text: string; x: number }[]> = new Map()
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const y = Math.round((item as any).transform?.[5] || 0)
        const x = Math.round((item as any).transform?.[4] || 0)
        const line = lines.get(y) || []
        line.push({ text: (item as any).str, x })
        lines.set(y, line)
      }
    }

    // Sort lines by Y position (top to bottom) and build rows
    const sortedYs = [...lines.keys()].sort((a, b) => b - a)
    const rows: string[][] = []
    for (const y of sortedYs) {
      const lineItems = lines.get(y)!
      // Sort items within a line by X position (left to right)
      lineItems.sort((a, b) => a.x - b.x)
      // Heuristic: if gap between items is large (>20pt), treat as separate columns
      const row: string[] = []
      for (const item of lineItems) {
        row.push(item.text)
      }
      rows.push(row)
    }

    // Create worksheet
    const sheetName =
      totalPages > 1 ? `第${i}页` : 'Sheet1'
    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Auto-fit column widths
    const colWidths: { wch: number }[] = []
    for (const row of rows) {
      for (let ci = 0; ci < row.length; ci++) {
        const len = row[ci].length
        while (colWidths.length <= ci) colWidths.push({ wch: 10 })
        colWidths[ci].wch = Math.max(colWidths[ci].wch, Math.min(len * 2 + 4, 40))
      }
    }
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(workbook, ws, sheetName)
  }

  onProgress?.(95)
  const excelData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  onProgress?.(100)
  return blob
}
