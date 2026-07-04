/**
 * PDF 内容编辑服务 — 使用 pdf-lib 在 PDF 页面上绘制文字、图片、遮盖
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

// ---- 编辑元素类型 ----

export interface TextEdit {
  type: 'text'
  page: number
  /** Canvas 像素坐标 */
  x: number
  y: number
  text: string
  fontSize: number
  color: string // '#RRGGBB'
  fontFamily: string // 'Helvetica' | 'Times Roman' | 'Noto Sans SC'
}

export interface ImageEdit {
  type: 'image'
  page: number
  x: number
  y: number
  width: number
  height: number
  dataUrl: string // PNG/JPEG data URL
}

export interface WhiteoutEdit {
  type: 'whiteout'
  page: number
  x: number
  y: number
  width: number
  height: number
}

export type Edit = TextEdit | ImageEdit | WhiteoutEdit

// ---- CJK 字体缓存 ----

let _cjkFontBytes: ArrayBuffer | null = null
const CJK_FONT_URL = '/fonts/NotoSansSC-Regular.ttf'

async function loadCjkFontBytes(): Promise<ArrayBuffer> {
  if (_cjkFontBytes) return _cjkFontBytes
  const resp = await fetch(CJK_FONT_URL)
  if (!resp.ok) throw new Error(`加载中文字体失败: ${resp.status}`)
  _cjkFontBytes = await resp.arrayBuffer()
  return _cjkFontBytes!
}

/** 检查文本是否包含 CJK 字符 */
function containsCjk(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text)
}

/** 检查是否有任何文本编辑需要 CJK 字体 */
function anyNeedsCjk(edits: Edit[]): boolean {
  return edits.some((e) => e.type === 'text' && containsCjk(e.text))
}

// ---- 颜色解析 ----

function parseColor(hex: string): { r: number; g: number; b: number } {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (m) {
    return {
      r: parseInt(m[1], 16) / 255,
      g: parseInt(m[2], 16) / 255,
      b: parseInt(m[3], 16) / 255,
    }
  }
  return { r: 0, g: 0, b: 0 }
}

// ---- 坐标转换 ----

/**
 * 将 canvas 像素坐标转换为 PDF 点坐标。
 * Canvas: y=0 在顶部；PDF: y=0 在底部。
 * @param canvasCoord canvas 像素坐标
 * @param scale 渲染缩放比例
 * @param pdfPageHeight PDF 页面高度 (pt)
 * @param elementHeight 元素在 canvas 上的高度（用于计算 PDF 中的顶部位置）
 */
function toPdfCoord(
  canvasCoord: { x: number; y: number },
  scale: number,
  pdfPageHeight: number,
  elementHeight: number = 0,
): { x: number; y: number } {
  return {
    x: canvasCoord.x / scale,
    y: pdfPageHeight - (canvasCoord.y + elementHeight) / scale,
  }
}

// ---- 主处理函数 ----

export async function applyEdits(
  file: File,
  edits: Edit[],
  scale: number, // 渲染 scale，用于坐标转换
  pdfPageSizes: { width: number; height: number }[], // 每页 PDF 原始尺寸 (pt)
  onProgress?: (pct: number) => void,
  onStatus?: (text: string) => void,
): Promise<Blob> {
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.(5)

  onStatus?.('加载 PDF...')
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pages = pdfDoc.getPages()
  onProgress?.(10)

  // 预加载字体
  let cjkFont: any = null
  const standardFonts: Record<string, any> = {}

  if (anyNeedsCjk(edits)) {
    onStatus?.('加载中文字体...')
    pdfDoc.registerFontkit(fontkit)
    const cjkBytes = await loadCjkFontBytes()
    cjkFont = await pdfDoc.embedFont(cjkBytes)
    onProgress?.(20)
  }

  // 按页面分组编辑
  const editsByPage = new Map<number, Edit[]>()
  for (const edit of edits) {
    const list = editsByPage.get(edit.page) || []
    list.push(edit)
    editsByPage.set(edit.page, list)
  }

  onStatus?.('应用编辑...')
  const totalPages = pages.length

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1
    const page = pages[i]
    const { height: pageH } = pdfPageSizes[i] || page.getSize()
    const pageEdits = editsByPage.get(pageNum) || []

    onProgress?.(20 + Math.round((i / totalPages) * 70))

    for (const edit of pageEdits) {
      switch (edit.type) {
        case 'whiteout': {
          const pos = toPdfCoord({ x: edit.x, y: edit.y }, scale, pageH)
          page.drawRectangle({
            x: pos.x,
            y: pos.y,
            width: edit.width / scale,
            height: edit.height / scale,
            color: rgb(1, 1, 1),
          })
          break
        }

        case 'text': {
          const { r, g, b } = parseColor(edit.color)
          const needsCjk = containsCjk(edit.text)

          let font: any
          if (needsCjk && cjkFont) {
            font = cjkFont
          } else {
            const fam = edit.fontFamily || 'Helvetica'
            if (!standardFonts[fam]) {
              const stdName =
                fam === 'Times Roman' ? StandardFonts.TimesRoman :
                fam === 'Courier' ? StandardFonts.Courier :
                StandardFonts.Helvetica
              standardFonts[fam] = await pdfDoc.embedStandardFont(stdName)
            }
            font = standardFonts[fam]
          }

          const fontSizePt = edit.fontSize / scale
          // Text position: canvas y is top of text, convert to PDF baseline
          const pos = toPdfCoord({ x: edit.x, y: edit.y }, scale, pageH, 0)

          page.drawText(edit.text, {
            x: pos.x,
            y: pos.y - fontSizePt, // offset for baseline
            size: fontSizePt,
            font,
            color: rgb(r, g, b),
          })
          break
        }

        case 'image': {
          // Parse data URL to get image bytes
          const dataParts = edit.dataUrl.split(',')
          const mimeMatch = dataParts[0].match(/data:(image\/\w+);base64/)
          const isPng = mimeMatch?.[1] === 'image/png'
          const byteChars = atob(dataParts[1])
          const bytes = new Uint8Array(byteChars.length)
          for (let j = 0; j < byteChars.length; j++) {
            bytes[j] = byteChars.charCodeAt(j)
          }

          const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)

          const pos = toPdfCoord({ x: edit.x, y: edit.y }, scale, pageH, edit.height)
          page.drawImage(image, {
            x: pos.x,
            y: pos.y,
            width: edit.width / scale,
            height: edit.height / scale,
          })
          break
        }
      }
    }
  }

  onProgress?.(95)
  onStatus?.('保存 PDF...')
  const resultBytes = await pdfDoc.save()
  const blob = new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' })
  onProgress?.(100)

  return blob
}
