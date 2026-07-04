/**
 * EPUB 转 PDF 服务
 * 解析 EPUB 文件（ZIP 格式），提取 HTML 章节并渲染为 PDF 页面
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import JSZip from 'jszip'

interface EpubChapter {
  title: string
  html: string
}

async function parseEpub(file: File): Promise<EpubChapter[]> {
  const zip = await JSZip.loadAsync(file)
  const chapters: EpubChapter[] = []

  // 查找 container.xml 获取 opf 文件路径
  const containerFile = zip.file('META-INF/container.xml')
  if (!containerFile) {
    throw new Error('不是有效的 EPUB 文件：缺少 container.xml')
  }

  const containerXml = await containerFile.async('text')
  const opfMatch = containerXml.match(/full-path="([^"]+)"/)
  if (!opfMatch) {
    throw new Error('无法解析 EPUB 文件结构')
  }

  const opfPath = opfMatch[1]
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
  const opfFile = zip.file(opfPath)
  if (!opfFile) {
    throw new Error('无法找到 EPUB 的 OPF 文件')
  }

  const opfXml = await opfFile.async('text')

  // 解析 spine（阅读顺序）
  const spineMatch = opfXml.match(/<spine[^>]*>([\s\S]*?)<\/spine>/)
  if (!spineMatch) {
    throw new Error('无法解析 EPUB spine')
  }

  const spineContent = spineMatch[1]
  const idrefs = [...spineContent.matchAll(/idref="([^"]+)"/g)].map(m => m[1])

  // 解析 manifest（文件映射）
  const manifestMatch = opfXml.match(/<manifest>([\s\S]*?)<\/manifest>/)
  if (!manifestMatch) {
    throw new Error('无法解析 EPUB manifest')
  }

  const manifestContent = manifestMatch[1]
  const manifestItems = [...manifestContent.matchAll(/<item[^>]+>/g)].map(m => {
    const itemStr = m[0]
    const id = itemStr.match(/id="([^"]+)"/)?.[1] || ''
    const href = itemStr.match(/href="([^"]+)"/)?.[1] || ''
    return { id, href }
  })
  const idToHref = new Map<string, string>()
  for (const item of manifestItems) {
    idToHref.set(item.id, item.href)
  }

  // 解析 toc（目录，获取章节标题）
  const tocMap = new Map<string, string>()
  const tocMatch = opfXml.match(/<spine[^>]*toc="([^"]+)"[^>]*>/)
  if (tocMatch) {
    const tocId = tocMatch[1]
    const ncxHref = idToHref.get(tocId)
    if (ncxHref) {
      const ncxPath = opfDir + ncxHref
      const ncxFile = zip.file(ncxPath)
      if (ncxFile) {
        const ncxXml = await ncxFile.async('text')
        const navPoints = [...ncxXml.matchAll(/<navPoint[^>]*>[\s\S]*?<\/navPoint>/g)]
        for (const np of navPoints) {
          const npStr = np[0]
          const src = npStr.match(/content[^>]*src="([^"]+)"/)?.[1]?.split('#')[0] || ''
          const label = npStr.match(/<text>([^<]+)<\/text>/)?.[1]?.trim() || ''
          if (src && label) {
            tocMap.set(decodeURIComponent(src), label)
          }
        }
      }
    }
  }

  // 按 spine 顺序提取 HTML 章节内容
  for (let i = 0; i < idrefs.length; i++) {
    const idref = idrefs[i]
    const href = idToHref.get(idref)
    if (!href) continue

    const htmlPath = opfDir + href
    const htmlFile = zip.file(htmlPath)
    if (!htmlFile) continue

    const html = await htmlFile.async('text')
    const title = tocMap.get(href) || `Chapter ${i + 1}`

    // 简单去除 HTML 标签，提取纯文本
    const text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<h[1-6][^>]*>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (text) {
      chapters.push({ title, html: text })
    }
  }

  if (chapters.length === 0) {
    throw new Error('EPUB 文件中未找到可提取的文本内容')
  }

  return chapters
}

export async function convertEpubToPdf(
  file: File,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  onProgress?.(10)

  const chapters = await parseEpub(file)
  onProgress?.(40)

  const doc = await PDFDocument.create()

  // 嵌入字体
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await doc.embedFont(StandardFonts.TimesRoman)
  const chineseFont = await doc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 595  // A4 width in pt
  const pageHeight = 842 // A4 height in pt
  const margin = 50
  const contentWidth = pageWidth - margin * 2
  const titleSize = 16
  const bodySize = 11
  const lineHeight = 16

  const charsPerLine = Math.floor(contentWidth / (bodySize * 0.5))

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]
    const page = doc.addPage([pageWidth, pageHeight])

    // 绘制章节标题
    page.drawText(chapter.title, {
      x: margin,
      y: pageHeight - margin - titleSize,
      size: titleSize,
      font: titleFont,
      color: rgb(0.1, 0.1, 0.1),
    })

    // 绘制下划线
    page.drawLine({
      start: { x: margin, y: pageHeight - margin - titleSize - 8 },
      end: { x: pageWidth - margin, y: pageHeight - margin - titleSize - 8 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    })

    // 分页绘制文本内容
    let y = pageHeight - margin - titleSize - 30
    const paragraphs = chapter.html.split('\n')

    for (const para of paragraphs) {
      if (!para.trim()) {
        y -= lineHeight * 0.5
        continue
      }

      // 简单换行（按字符数估计）
      const lines: string[] = []
      let currentLine = ''
      for (const ch of para.trim()) {
        currentLine += ch
        if (currentLine.length >= charsPerLine) {
          lines.push(currentLine)
          currentLine = ''
        }
      }
      if (currentLine) lines.push(currentLine)

      for (const line of lines) {
        if (y < margin + lineHeight) {
          // 新建页面
          const newPage = doc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin - lineHeight
          newPage.drawText(line, {
            x: margin,
            y,
            size: bodySize,
            font: bodyFont,
            color: rgb(0.1, 0.1, 0.1),
          })
        } else {
          page.drawText(line, {
            x: margin,
            y,
            size: bodySize,
            font: /[\u4e00-\u9fff]/.test(line) ? chineseFont : bodyFont,
            color: rgb(0.1, 0.1, 0.1),
          })
        }
        y -= lineHeight
      }

      y -= lineHeight * 0.3 // 段落间距
    }

    onProgress?.(40 + Math.floor(((i + 1) / chapters.length) * 50))
  }

  onProgress?.(95)
  const pdfBytes = await doc.save()
  onProgress?.(100)

  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
