/**
 * 按书签拆分 PDF 服务
 * 根据 PDF 的目录/书签结构自动拆分为多个文件
 */
import { PDFDocument } from 'pdf-lib'

interface BookmarkPage {
  title: string
  startPage: number
  endPage: number
}

async function extractBookmarks(doc: any): Promise<BookmarkPage[]> {
  // 尝试多种方式获取书签/大纲
  const outlines: { title: string; page: number }[] = []

  try {
    // pdf-lib 没有直接获取书签的 API，但可以通过低级操作尝试
    // 这里尝试使用 doc.catalog 获取 outlines
    const catalog = doc.catalog
    if (catalog) {
      const outlinesRef = catalog.get('Outlines')
      if (outlinesRef) {
        const outlineObj = doc.context.lookup(outlinesRef)
        if (outlineObj && outlineObj.get('First')) {
          let current = outlineObj.get('First')
          while (current) {
            const obj = doc.context.lookup(current)
            const title = obj?.get('Title')?.toString() || ''
            const dest = obj.get('Dest')
            let pageNum = 0

            if (dest) {
              if (dest instanceof Array && dest.length > 0) {
                const pageRef = dest[0]
                if (pageRef) {
                  const pageObj = doc.context.lookup(pageRef)
                  if (pageObj) {
                    const pages = doc.getPages()
                    pageNum = pages.findIndex((p: any) => p === pageObj) + 1
                  }
                }
              }
            }

            if (title) {
              outlines.push({ title, page: pageNum || outlines.length + 1 })
            }

            current = obj?.get('Next')
          }
        }
      }
    }
  } catch {
    // 大纲解析失败时回退
  }

  // 如果没有获取到书签，尝试获取嵌套大纲
  if (outlines.length === 0) {
    const pageCount = doc.getPageCount()
    return [{ title: 'All Pages', startPage: 1, endPage: pageCount }]
  }

  // 构建页码范围
  const result: BookmarkPage[] = []
  for (let i = 0; i < outlines.length; i++) {
    const start = outlines[i].page
    const end = i < outlines.length - 1 ? outlines[i + 1].page - 1 : doc.getPageCount()
    result.push({ title: outlines[i].title, startPage: start, endPage: end })
  }

  return result
}

export async function splitByBookmarks(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ blob: Blob; count: number; fileName: string }> {
  const buffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pageCount = srcDoc.getPageCount()

  onProgress?.(10)

  const bookmarks = await extractBookmarks(srcDoc)
  onProgress?.(20)

  if (bookmarks.length === 0 || (bookmarks.length === 1 && bookmarks[0].title === 'All Pages')) {
    // 没有书签，抛出友好的错误
    throw new Error('此 PDF 没有可用的书签/目录信息')
  }

  // 创建 ZIP 包
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  const baseName = file.name.replace(/\.pdf$/i, '')

  for (let i = 0; i < bookmarks.length; i++) {
    const bm = bookmarks[i]
    const startIdx = Math.max(0, bm.startPage - 1)
    const endIdx = Math.min(pageCount - 1, bm.endPage - 1)

    if (startIdx > endIdx) continue

    const pagesToCopy = []
    for (let j = startIdx; j <= endIdx; j++) {
      pagesToCopy.push(j)
    }

    if (pagesToCopy.length === 0) continue

    const newDoc = await PDFDocument.create()
    const copiedPages = await newDoc.copyPages(srcDoc, pagesToCopy)
    for (const p of copiedPages) {
      newDoc.addPage(p)
    }

    const safeTitle = bm.title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50)
    const pdfBytes = await newDoc.save()
    const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

    zip.file(`${safeTitle}.pdf`, pdfBlob, { binary: true })

    onProgress?.(20 + Math.floor(((i + 1) / bookmarks.length) * 70))
  }

  // 作为 ZIP 返回
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  onProgress?.(100)

  return {
    blob: zipBlob,
    count: bookmarks.length,
    fileName: `${baseName}-bookmarks.zip`,
  }
}
