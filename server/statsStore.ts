import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'statsData.json')

interface StatsData {
  totalVisits: number
  dailyVisits: Record<string, number>
  uniqueVisitors: string[]
  pageViews: Record<string, number>
}

function load(): StatsData {
  if (!existsSync(DATA_FILE)) {
    return { totalVisits: 0, dailyVisits: {}, uniqueVisitors: [], pageViews: {} }
  }
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { totalVisits: 0, dailyVisits: {}, uniqueVisitors: [], pageViews: {} }
  }
}

function save(data: StatsData) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

export function getStats() {
  const data = load()
  const today = new Date().toISOString().slice(0, 10)
  return {
    totalVisits: data.totalVisits,
    todayVisits: data.dailyVisits[today] || 0,
    uniqueVisitors: data.uniqueVisitors.length,
  }
}

export function recordVisit(_ip: string, visitorId: string, path: string) {
  const data = load()
  const today = new Date().toISOString().slice(0, 10)

  data.totalVisits++
  data.dailyVisits[today] = (data.dailyVisits[today] || 0) + 1

  if (!data.uniqueVisitors.includes(visitorId)) {
    data.uniqueVisitors.push(visitorId)
  }

  data.pageViews[path] = (data.pageViews[path] || 0) + 1

  save(data)
  return getStats()
}
