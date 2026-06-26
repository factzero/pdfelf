/**
 * PDF 页面重排序服务
 * 使用 pdf-lib 加载 PDF，按新顺序复制页面到新文档
 */
import { PDFDocument } from 'pdf-lib'

export async function reorderPdf(
  file: File,
  newOrder: number[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pageCount = srcDoc.getPageCount()

  if (newOrder.length !== pageCount) {
    throw new Error('页面数量不匹配')
  }

  const newDoc = await PDFDocument.create()

  for (let i = 0; i < newOrder.length; i++) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [newOrder[i]])
    newDoc.addPage(copiedPage)
    onProgress?.(Math.round(((i + 1) / newOrder.length) * 100))
  }

  const pdfBytes = await newDoc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
