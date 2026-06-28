import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'ratingData.json')

// ═════════ 数据结构 ═════════

export interface RatingEntry {
  visitorId: string
  stars: number       // 1-5
  review: string      // 评论文本（可为空）
  createdAt: string   // ISO 时间戳
}

interface PageRatings {
  ratings: RatingEntry[]
}

interface RatingData {
  pages: Record<string, PageRatings>
}

// ═════════ 存储读写 ═════════

function getDefaults(): RatingData {
  return { pages: {} }
}

function load(): RatingData {
  if (!existsSync(DATA_FILE)) return getDefaults()
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return getDefaults()
  }
}

function save(data: RatingData) {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('[RatingStore] Failed to write:', err)
  }
}

// ═════════ 公开 API ═════════

export function initRatingStore() {
  if (!existsSync(DATA_FILE)) {
    save(getDefaults())
    console.log('[RatingStore] Created:', DATA_FILE)
  } else {
    console.log('[RatingStore] Loaded:', DATA_FILE)
  }
}

/** 提交评分+评论（同一 visitor 对同一页面只能有一条，覆盖旧记录） */
export function submitRating(
  path: string,
  visitorId: string,
  stars: number,
  review: string
): { submitted: boolean; avgStars: number; totalRatings: number } {
  const data = load()
  if (!data.pages[path]) data.pages[path] = { ratings: [] }

  // 查找已有记录
  const existing = data.pages[path].ratings.find(r => r.visitorId === visitorId)
  const now = new Date().toISOString()

  if (existing) {
    existing.stars = stars
    existing.review = review
    existing.createdAt = now
  } else {
    data.pages[path].ratings.push({ visitorId, stars, review, createdAt: now })
  }

  // 只保留最新 500 条记录以防文件过大
  if (data.pages[path].ratings.length > 500) {
    data.pages[path].ratings = data.pages[path].ratings.slice(-500)
  }

  save(data)

  const summary = calcSummary(data.pages[path])
  return { submitted: true, ...summary }
}

/** 获取某页面的评分详情（含所有评论，按时间倒序） */
export function getPageRatings(path: string): {
  ratings: RatingEntry[]
  avgStars: number
  totalRatings: number
} {
  const data = load()
  const page = data.pages[path]
  if (!page || page.ratings.length === 0) {
    return { ratings: [], avgStars: 0, totalRatings: 0 }
  }
  // 时间倒序
  const sorted = [...page.ratings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return { ratings: sorted, ...calcSummary(page) }
}

/** 获取用户对该页面的已有评分 */
export function getUserRating(
  path: string,
  visitorId: string
): { hasRated: boolean; stars: number; review: string } {
  const data = load()
  const page = data.pages[path]
  if (!page) return { hasRated: false, stars: 0, review: '' }
  const entry = page.ratings.find(r => r.visitorId === visitorId)
  if (!entry) return { hasRated: false, stars: 0, review: '' }
  return { hasRated: true, stars: entry.stars, review: entry.review }
}

/** 所有页面的评分摘要（用于排名） */
export function getAllSummaries(): Record<string, { avgStars: number; totalRatings: number }> {
  const data = load()
  const result: Record<string, { avgStars: number; totalRatings: number }> = {}
  for (const [path, page] of Object.entries(data.pages)) {
    if (page.ratings.length > 0) {
      result[path] = calcSummary(page)
    }
  }
  return result
}

// ═════════ 内部工具 ═════════

function calcSummary(page: PageRatings): { avgStars: number; totalRatings: number } {
  const total = page.ratings.length
  if (total === 0) return { avgStars: 0, totalRatings: 0 }
  const sum = page.ratings.reduce((s, r) => s + r.stars, 0)
  return { avgStars: Math.round((sum / total) * 10) / 10, totalRatings: total }
}
