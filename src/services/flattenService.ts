/**
 * 拼合 PDF 服务
 * 将可填写表单转为只读，表单字段变为普通页面内容
 */
import { PDFDocument } from 'pdf-lib'

export async function flattenPdf(
  file: File,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })

  onProgress?.(30)

  const form = doc.getForm()
  const fields = form.getFields()

  if (fields.length === 0) {
    // 没有表单字段，直接返回原文件
    onProgress?.(100)
    return new Blob([buffer], { type: 'application/pdf' })
  }

  // 拼合所有表单字段
  form.flatten()
  onProgress?.(70)

  const pdfBytes = await doc.save()
  onProgress?.(100)

  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
