/**
 * PDF 转 PDF/A 服务
 * 尽量生成符合 PDF/A-1b 标准的 PDF 文件
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function convertToPdfA(
  file: File,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pageCount = srcDoc.getPageCount()

  const newDoc = await PDFDocument.create()

  // 复制所有页面
  const pages = await newDoc.copyPages(srcDoc, Array.from({ length: pageCount }, (_, i) => i))
  for (const page of pages) {
    newDoc.addPage(page)
  }

  onProgress?.(30)

  // 嵌入标准字体（PDF/A 要求所有字体必须嵌入或使用标准字体）
  try {
    const font = await newDoc.embedFont(StandardFonts.Helvetica)
    // 添加一个不可见的标记，确保字体被嵌入
    for (const page of newDoc.getPages()) {
      const { height } = page.getSize()
      page.drawText('', { x: 0, y: height, size: 1, font, color: rgb(1, 1, 1) })
    }
  } catch { /* 忽略字体嵌入失败 */ }

  onProgress?.(60)

  // 从原文档复制元数据
  const srcTitle = srcDoc.getTitle() || ''
  const srcAuthor = srcDoc.getAuthor() || ''
  const srcSubject = srcDoc.getSubject() || ''
  const srcKeywords = srcDoc.getKeywords() || ''

  newDoc.setTitle(srcTitle || 'Untitled')
  newDoc.setAuthor(srcAuthor || 'PDF Elf')
  newDoc.setSubject(srcSubject)
  newDoc.setKeywords(srcKeywords ? srcKeywords.split(/,\s*/) : [])
  newDoc.setCreator('PDF Elf - PDF/A Converter')
  newDoc.setProducer('pdf-lib')

  onProgress?.(80)

  // 保存（不使用对象流以尽量符合 PDF/A 规范）
  const pdfBytes = await newDoc.save({ useObjectStreams: false })
  onProgress?.(100)

  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
