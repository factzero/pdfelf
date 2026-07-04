/**
 * N-up 排版服务
 * 将多个 PDF 页面缩放到一页纸上
 */
import { PDFDocument, PageSizes } from 'pdf-lib'

export type NupLayout = '2x1' | '2x2' | '3x2' | '3x3' | '4x2' | '4x4'

const LAYOUT_MAP: Record<NupLayout, { cols: number; rows: number }> = {
  '2x1': { cols: 2, rows: 1 },
  '2x2': { cols: 2, rows: 2 },
  '3x2': { cols: 3, rows: 2 },
  '3x3': { cols: 3, rows: 3 },
  '4x2': { cols: 4, rows: 2 },
  '4x4': { cols: 4, rows: 4 },
}

export async function createNupPdf(
  file: File,
  layout: NupLayout = '2x2',
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const srcPageCount = srcDoc.getPageCount()

  onProgress?.(15)

  const { cols, rows } = LAYOUT_MAP[layout]
  const nPerPage = cols * rows
  const outputPages = Math.ceil(srcPageCount / nPerPage)

  const newDoc = await PDFDocument.create()

  // 使用 A4 横向作为默认输出页面
  const A4_LANDSCAPE: [number, number] = [PageSizes.A4[1], PageSizes.A4[0]]
  const pageW = A4_LANDSCAPE[0]
  const pageH = A4_LANDSCAPE[1]

  // 实际可用区域（留边距）
  const margin = 20
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2
  const cellW = usableW / cols
  const cellH = usableH / rows

  for (let i = 0; i < outputPages; i++) {
    const page = newDoc.addPage([pageW, pageH])

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const srcIndex = i * nPerPage + r * cols + c
        if (srcIndex >= srcPageCount) break

        const [srcPage] = await newDoc.copyPages(srcDoc, [srcIndex])
        const { width: sw, height: sh } = srcPage.getSize()

        // 计算缩放比例，保持宽高比
        const scale = Math.min(cellW / sw, cellH / sh) * 0.9
        const drawW = sw * scale
        const drawH = sh * scale

        // 左上角 x, y
        const x = margin + c * cellW + (cellW - drawW) / 2
        const y = pageH - margin - (r + 1) * cellH + (cellH - drawH) / 2

        const embeddedPage = await newDoc.embedPage(srcPage)
        page.drawPage(embeddedPage, { x, y, width: drawW, height: drawH })
      }
    }

    onProgress?.(15 + Math.floor(((i + 1) / outputPages) * 75))
  }

  const pdfBytes = await newDoc.save()
  onProgress?.(100)

  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
