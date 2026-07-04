import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORE_PATH = join(__dirname, 'feedbackData.json')

interface FeedbackEntry {
  type: 'bug' | 'feature' | 'general'
  message: string
  email?: string
  page: string
  userAgent: string
  createdAt: string
}

interface FeedbackStore {
  feedbacks: FeedbackEntry[]
}

function loadStore(): FeedbackStore {
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    // corrupted file — start fresh
  }
  return { feedbacks: [] }
}

function saveStore(store: FeedbackStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

export function initFeedbackStore(): void {
  if (!existsSync(STORE_PATH)) {
    saveStore({ feedbacks: [] })
  }
}

export interface SubmitFeedbackInput {
  type: 'bug' | 'feature' | 'general'
  message: string
  email?: string
  page: string
  userAgent: string
}

export function submitFeedback(input: SubmitFeedbackInput): FeedbackEntry {
  const store = loadStore()
  const entry: FeedbackEntry = {
    ...input,
    createdAt: new Date().toISOString(),
  }
  store.feedbacks.push(entry)
  saveStore(store)
  return entry
}

export function getFeedbackStats(): { total: number; byType: Record<string, number> } {
  const store = loadStore()
  const byType: Record<string, number> = { bug: 0, feature: 0, general: 0 }
  for (const f of store.feedbacks) {
    byType[f.type] = (byType[f.type] || 0) + 1
  }
  return { total: store.feedbacks.length, byType }
}
