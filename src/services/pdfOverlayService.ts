/**
 * PDF 叠加服务
 * 将两个 PDF 的相同页码叠在一起（第二个 PDF 覆盖在第一个之上）
 */
import { PDFDocument } from 'pdf-lib'

export async function overlayPdfs(
  baseFile: File,
  overlayFile: File,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  onProgress?.(5)

  const baseBuffer = await baseFile.arrayBuffer()
  const overlayBuffer = await overlayFile.arrayBuffer()

  onProgress?.(10)

  const baseDoc = await PDFDocument.load(baseBuffer, { ignoreEncryption: true })
  const overlayDoc = await PDFDocument.load(overlayBuffer, { ignoreEncryption: true })

  onProgress?.(30)

  const basePages = baseDoc.getPageCount()
  const overlayPages = overlayDoc.getPageCount()
  const maxPages = Math.max(basePages, overlayPages)

  const mergedDoc = await PDFDocument.create()

  for (let i = 0; i < maxPages; i++) {
    // 复制基础页面
    if (i < basePages) {
      const [basePage] = await mergedDoc.copyPages(baseDoc, [i])
      mergedDoc.addPage(basePage)
    } else {
      mergedDoc.addPage()
    }

    // 复制叠加页面内容
    if (i < overlayPages) {
      const [overlayPageCopy] = await mergedDoc.copyPages(overlayDoc, [i])
      const currentPage = mergedDoc.getPages()[mergedDoc.getPageCount() - 1]

      // 将叠加页面的内容画到当前页面（通过复制内容实现叠加）
      const { width, height } = currentPage.getSize()
      const embeddedPage = await mergedDoc.embedPage(overlayPageCopy)
      currentPage.drawPage(embeddedPage, {
        x: 0,
        y: 0,
        width,
        height,
      })
    }

    onProgress?.(30 + Math.floor(((i + 1) / maxPages) * 60))
  }

  onProgress?.(95)
  const pdfBytes = await mergedDoc.save()
  onProgress?.(100)

  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
