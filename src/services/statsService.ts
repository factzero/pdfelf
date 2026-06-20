function getVisitorId(): string {
  const key = 'pdfelf_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

interface StatsResponse {
  totalVisits: number
  todayVisits: number
  uniqueVisitors: number
}

let lastRecordTimestamp = 0
const RECORD_THROTTLE_MS = 2000

/**
 * 记录一次页面访问，后端自动去重统计独立访客
 * 2 秒内同一路径不去重上报，防止路由初始化时重复触发
 */
export async function recordPageVisit(path: string) {
  const now = Date.now()
  if (now - lastRecordTimestamp < RECORD_THROTTLE_MS) return
  lastRecordTimestamp = now

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
