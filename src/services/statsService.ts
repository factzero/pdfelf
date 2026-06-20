function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // 回退方案：兼容非 HTTPS 或旧浏览器
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getVisitorId(): string {
  const key = 'pdfelf_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = generateUUID()
    localStorage.setItem(key, id)
  }
  return id
}

interface StatsResponse {
  totalVisits: number
  todayVisits: number
  uniqueVisitors: number
}

let lastRecordedPath = ''
let lastRecordTime = 0

/**
 * 记录一次页面访问，后端自动去重统计独立访客
 * 同一路径 1 秒内不重复上报，防止路由初始化重复触发
 */
export async function recordPageVisit(path: string) {
  const now = Date.now()
  if (path === lastRecordedPath && now - lastRecordTime < 1000) return
  lastRecordedPath = path
  lastRecordTime = now

  try {
    await fetch('/api/stats/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, visitorId: getVisitorId() }),
    })
  } catch {
    // 后端未启动时静默失败
  }
}

/**
 * 获取访问统计数据
 */
export async function fetchStats(): Promise<StatsResponse | null> {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) throw new Error('Failed to fetch stats')
    return await res.json()
  } catch {
    return null
  }
}
