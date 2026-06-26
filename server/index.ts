import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { getStats, recordVisit, initStore } from './statsStore'
import { seoMap } from './seoMeta.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// 开发模式：根路径显示服务状态（生产环境由静态文件托管处理）
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (_req, res) => {
    res.json({
      service: 'PDF Elf Stats Server',
      status: 'running',
      endpoints: ['GET /api/stats', 'POST /api/stats/visit'],
    })
  })
}

// API: 获取访问统计
app.get('/api/stats', (_req, res) => {
  res.json(getStats())
})

// API: 记录一次页面访问
app.post('/api/stats/visit', (req, res) => {
  const { path = '/', visitorId = 'anonymous' } = req.body
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const stats = recordVisit(ip, visitorId, path)
  res.json(stats)
})

// 生产环境：托管前端静态文件（nginx 在前面做了主要托管，这里仅作为 API 兜底）
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist')
  const indexHtmlPath = join(distPath, 'index.html')

  /** 根据请求 path 注入正确的路由级 meta（title / description / canonical / OG），
   *  解决 SPA 对所有路由返回同一份首页 HTML 的 SEO 问题。 */
  function injectRouteMeta(rawHtml: string, path: string): string {
    const seo = seoMap.get(path)
    if (!seo) return rawHtml

    let html = rawHtml

    // === 注入函数 ===
    const replaceTag = (tag: string, pattern: RegExp, replacement: string) => {
      if (pattern.test(html)) {
        html = html.replace(pattern, replacement)
      }
    }

    // title
    replaceTag('title', /<title>.*?<\/title>/,
      `<title>${seo.title}</title>`)

    // meta description
    replaceTag('description', /<meta name="description" content="[^"]*"[^>]*>/,
      `<meta name="description" content="${seo.description}" />`)

    // canonical
    const canonicalUrl = `https://pdfelf.online${path === '/' ? '/' : path}`
    replaceTag('canonical', /<link rel="canonical" href="[^"]*"[^>]*>/,
      `<link rel="canonical" href="${canonicalUrl}" />`)

    // Open Graph
    replaceTag('og:title', /<meta property="og:title" content="[^"]*"[^>]*>/,
      `<meta property="og:title" content="${seo.title}" />`)
    replaceTag('og:description', /<meta property="og:description" content="[^"]*"[^>]*>/,
      `<meta property="og:description" content="${seo.description}" />`)
    replaceTag('og:url', /<meta property="og:url" content="[^"]*"[^>]*>/,
      `<meta property="og:url" content="${canonicalUrl}" />`)

    // Twitter Card
    replaceTag('twitter:title', /<meta name="twitter:title" content="[^"]*"[^>]*>/,
      `<meta name="twitter:title" content="${seo.title}" />`)
    replaceTag('twitter:description', /<meta name="twitter:description" content="[^"]*"[^>]*>/,
      `<meta name="twitter:description" content="${seo.description}" />`)

    return html
  }

  // 读取 index.html 一次（构建后不会再变）
  let cachedBaseHtml = ''
  try {
    cachedBaseHtml = readFileSync(indexHtmlPath, 'utf-8')
  } catch {
    // 首次启动时 dist 可能还不存在，会在第一次请求时再读
  }

  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      // Express 默认不识别 .mjs / .wasm 的 MIME 类型
      if (filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript')
      } else if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm')
      }
    },
  }))

  // SPA fallback：对每一条路由注入独立的 title / description / canonical / OG
  app.use((req, res) => {
    if (!cachedBaseHtml) {
      try {
        cachedBaseHtml = readFileSync(indexHtmlPath, 'utf-8')
      } catch {
        res.status(503).send('Service Unavailable')
        return
      }
    }
    const path = req.path || '/'
    const html = injectRouteMeta(cachedBaseHtml, path)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  })
}

// 初始化统计存储文件（不存在则自动创建）
initStore()

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n📊 [Stats Server] http://localhost:${PORT}`)
})
