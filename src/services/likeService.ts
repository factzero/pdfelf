function getVisitorId(): string {
  const key = 'pdfelf_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID()
    } else {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }
    localStorage.setItem(key, id)
  }
  return id
}

// ═══════ 类型 ═══════

export interface RatingEntry {
  visitorId: string
  stars: number
  review: string
  createdAt: string
}

export interface PageRatings {
  ratings: RatingEntry[]
  avgStars: number
  totalRatings: number
}

export interface UserRating {
  hasRated: boolean
  stars: number
  review: string
}

export interface RatingSummary {
  [path: string]: { avgStars: number; totalRatings: number }
}

// ═══════ API 调用 ═══════

/** 获取某页面的评分和评论 */
export async function fetchPageRatings(path: string): Promise<PageRatings> {
  try {
    const res = await fetch(`/api/ratings?path=${encodeURIComponent(path)}`)
    if (!res.ok) throw new Error('Failed')
    return await res.json()
  } catch {
    return { ratings: [], avgStars: 0, totalRatings: 0 }
  }
}

/** 获取用户对某页面的已有评分 */
export async function fetchUserRating(path: string): Promise<UserRating> {
  try {
    const vid = getVisitorId()
    const res = await fetch(
      `/api/ratings/user?path=${encodeURIComponent(path)}&visitorId=${encodeURIComponent(vid)}`
    )
    if (!res.ok) return { hasRated: false, stars: 0, review: '' }
    return await res.json()
  } catch {
    return { hasRated: false, stars: 0, review: '' }
  }
}

/** 提交评分+评论 */
export async function submitRating(
  path: string,
  stars: number,
  review: string
): Promise<{ submitted: boolean; avgStars: number; totalRatings: number }> {
  try {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, visitorId: getVisitorId(), stars, review }),
    })
    if (!res.ok) throw new Error('Failed')
    return await res.json()
  } catch {
    return { submitted: false, avgStars: 0, totalRatings: 0 }
  }
}
