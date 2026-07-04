/**
 * Bates 编号服务
 * 为法律文件添加 Bates 编号（批号印章）
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface BatesOptions {
  prefix?: string
  startNumber?: number
  digits?: number
  fontSize?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  marginX?: number
  marginY?: number
  includePageCount?: boolean
}

const POSITION_MAP: Record<string, (_w: number, _h: number, _tw: number, _th: number, _mx: number, _my: number) => { x: number; y: number }> = {
  'top-left': (_w, _h, _tw, th, mx, my) => ({ x: mx, y: _h - my - th }),
  'top-right': (_w, _h, tw, th, mx, my) => ({ x: _w - mx - tw, y: _h - my - th }),
  'top-center': (_w, _h, tw, th, _mx, my) => ({ x: (_w - tw) / 2, y: _h - my - th }),
  'bottom-left': (_w, _h, _tw, _th, mx, my) => ({ x: mx, y: my }),
  'bottom-right': (_w, _h, tw, _th, mx, my) => ({ x: _w - mx - tw, y: my }),
  'bottom-center': (_w, _h, tw, _th, _mx, my) => ({ x: (_w - tw) / 2, y: my }),
}

export async function addBatesNumbering(
  file: File,
  options: BatesOptions = {},
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const {
    prefix = 'BATES-',
    startNumber = 1,
    digits = 6,
    fontSize = 10,
    position = 'bottom-right',
    marginX = 30,
    marginY = 30,
    includePageCount = true,
  } = options

  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const pageCount = doc.getPageCount()

  onProgress?.(10)

  const font = await doc.embedFont(StandardFonts.Courier)

  for (let i = 0; i < pageCount; i++) {
    const page = doc.getPages()[i]
    const { width: w, height: h } = page.getSize()

    const currentNum = String(startNumber + i).padStart(digits, '0')
    const text = includePageCount
      ? `${prefix}${currentNum}  (${i + 1}/${pageCount})`
      : `${prefix}${currentNum}`

    const textWidth = font.widthOfTextAtSize(text, fontSize)
    const textHeight = fontSize

    const posFn = POSITION_MAP[position] || POSITION_MAP['bottom-right']
    const { x, y } = posFn(w, h, textWidth, textHeight, marginX, marginY)

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })

    onProgress?.(10 + Math.floor(((i + 1) / pageCount) * 80))
  }

  onProgress?.(95)
  doc.setProducer('PDF Elf - Bates Numbering')

  const pdfBytes = await doc.save()
  onProgress?.(100)

  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
