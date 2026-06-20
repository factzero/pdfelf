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

function getDefaults(): StatsData {
  return { totalVisits: 0, dailyVisits: {}, uniqueVisitors: [], pageViews: {} }
}

function load(): StatsData {
  if (!existsSync(DATA_FILE)) {
    return getDefaults()
  }
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return getDefaults()
  }
}

function save(data: StatsData) {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('[StatsStore] Failed to write stats file:', err)
  }
}

/** 服务器启动时初始化数据文件（若不存在则创建） */
export function initStore() {
  if (!existsSync(DATA_FILE)) {
    save(getDefaults())
    console.log('[StatsStore] Created initial stats file:', DATA_FILE)
  } else {
    console.log('[StatsStore] Loaded existing stats file:', DATA_FILE)
  }
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
