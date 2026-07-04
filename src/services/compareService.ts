/**
 * PDF 对比服务
 * 提取两个 PDF 的文本内容，进行逐行对比，返回差异结果
 */
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'

export interface DiffLine {
  /** 行号（对应原始文件的页码+行号） */
  lineNo: number
  text: string
  /** 'added' | 'deleted' | 'unchanged' */
  type: 'added' | 'deleted' | 'unchanged'
}

export interface PageText {
  pageNum: number
  lines: string[]
}

export interface CompareResult {
  /** 左侧 PDF 的总页数 */
  leftPages: number
  /** 右侧 PDF 的总页数 */
  rightPages: number
  /** 左侧 PDF 每一页的文本 */
  leftTexts: PageText[]
  /** 右侧 PDF 每一页的文本 */
  rightTexts: PageText[]
  /** diff 结果 - 左侧行索引 */
  diffLines: DiffLine[]
  /** 相同的行数 */
  sameCount: number
  /** 新增的行数 */
  addedCount: number
  /** 删除的行数 */
  deletedCount: number
}

/**
 * 从 PDF 文件提取全部页面的文本
 */
export async function extractPdfText(
  file: File,
  onProgress?: (pct: number) => void
): Promise<PageText[]> {
  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS })
  const pdf = await loadingTask.promise

  const totalPages = pdf.numPages
  const pages: PageText[] = []

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()

    // 将 text items 合并成行
    const lines: string[] = []
    let currentLine = ''
    let lastY: number | null = null

    for (const item of textContent.items) {
      if ('str' in item) {
        const y = Math.round((item as any).transform[5])
        if (lastY !== null && Math.abs(y - lastY) > 3) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim())
          }
          currentLine = (item as any).str
        } else {
          currentLine += (item as any).str
        }
        lastY = y
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim())
    }

    pages.push({ pageNum: i, lines })
    onProgress?.(Math.round((i / totalPages) * 100))
  }

  return pages
}

/**
 * 简单的逐行 diff 算法（LCS 实现）
 * 返回合并后的 diff 行序列
 */
function computeDiff(origLines: string[], newLines: string[]): DiffLine[] {
  const m = origLines.length
  const n = newLines.length

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = []
  let i = m, j = n
  let lineNo = 0

  const backtracked: { type: 'added' | 'deleted' | 'unchanged', text: string }[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === newLines[j - 1]) {
      backtracked.unshift({ type: 'unchanged', text: origLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      backtracked.unshift({ type: 'added', text: newLines[j - 1] })
      j--
    } else {
      backtracked.unshift({ type: 'deleted', text: origLines[i - 1] })
      i--
    }
  }

  for (const item of backtracked) {
    lineNo++
    result.push({ lineNo, text: item.text, type: item.type })
  }

  return result
}

/**
 * 对比两个 PDF 文件
 * @param leftPdf 原始 PDF（左侧）
 * @param rightPdf 修改后的 PDF（右侧）
 * @param onProgress 进度回调 (0-100)
 */
export async function comparePdfs(
  leftPdf: File,
  rightPdf: File,
  onProgress?: (pct: number) => void
): Promise<CompareResult> {
  // 并行提取两个 PDF 的文本
  onProgress?.(5)
  const [leftTexts, rightTexts] = await Promise.all([
    extractPdfText(leftPdf, (p) => onProgress?.(5 + Math.round(p * 0.4))),
    extractPdfText(rightPdf, (p) => onProgress?.(5 + Math.round(p * 0.4))),
  ])

  onProgress?.(50)

  // 合并所有左侧行和右侧行
  const allLeftLines: string[] = []
  const allRightLines: string[] = []

  for (const page of leftTexts) {
    allLeftLines.push(...page.lines)
  }
  for (const page of rightTexts) {
    allRightLines.push(...page.lines)
  }

  onProgress?.(60)

  // 计算 diff
  const diffLines = computeDiff(allLeftLines, allRightLines)

  onProgress?.(90)

  const sameCount = diffLines.filter(l => l.type === 'unchanged').length
  const addedCount = diffLines.filter(l => l.type === 'added').length
  const deletedCount = diffLines.filter(l => l.type === 'deleted').length

  onProgress?.(100)

  return {
    leftPages: leftTexts.length,
    rightPages: rightTexts.length,
    leftTexts,
    rightTexts,
    diffLines,
    sameCount,
    addedCount,
    deletedCount,
  }
}
