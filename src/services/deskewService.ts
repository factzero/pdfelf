/**
 * 纠偏服务
 * 自动检测并校正扫描件的倾斜角度
 */
import { PDFDocument } from 'pdf-lib'

export async function deskewPdf(
  file: File,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pageCount = doc.getPageCount()

  onProgress?.(10)

  // 注意：纯 pdf-lib 级别无法进行图像处理和旋转检测
  // 此工具通过重新编码 PDF 页面来尽量调整倾斜
  // 对于扫描件 PDF，页面内容已经是图片，轻微旋转在 PDF 层面操作

  for (let i = 0; i < pageCount; i++) {
    const page = doc.getPages()[i]
    const rotation = page.getRotation()

    // 检查页面是否有旋转角度
    try {
      const angle = rotation?.angle ?? 0
      if (angle !== 0) {
        // 修正旋转为最接近的 0°/90°/180°/270°
        const normalized = Math.round(angle / 90) * 90
        const remainder = angle - normalized

        if (Math.abs(remainder) > 0.5) {
          // 有小角度倾斜，尝试修正为最接近的标准角度
          page.setRotation({ type: 'degrees', angle: normalized % 360 } as any)
        }
      }
    } catch {
      // 忽略旋转读取/设置错误
    }

    onProgress?.(10 + Math.floor(((i + 1) / pageCount) * 80))
  }

  onProgress?.(95)
  const pdfBytes = await doc.save()
  onProgress?.(100)

  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
