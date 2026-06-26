import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { getStats, recordVisit, initStore } from './statsStore'
import { seoMap, buildJsonLd, homeSeo } from './seoMeta.js'

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

  /** 辅助：HTML 字符串替换（仅在 pattern 存在时替换）*/
  function replaceInHtml(html: string, pattern: RegExp, replacement: string): string {
    if (pattern.test(html)) {
      return html.replace(pattern, replacement)
    }
    return html
  }

  /** 注入路由级 JSON-LD */
  function injectJsonLd(html: string, path: string): string {
    const seo = seoMap.get(path) || homeSeo
    const jsonLd = buildJsonLd(seo)
    return html.replace(
      '<!--JSON_LD_PLACEHOLDER-->',
      `<script type="application/ld+json">\n${jsonLd}\n    </script>`
    )
  }

  /** 注入 hreflang 标签 */
  function injectHreflang(html: string, path: string): string {
    const canonicalUrl = `https://pdfelf.online${path === '/' ? '/' : path}`
    const enUrl = path === '/' 
      ? 'https://pdfelf.online/en/' 
      : `https://pdfelf.online/en${path}`

    html = html.replace('__HREFLANG_ZH__', canonicalUrl)
    html = html.replace('__HREFLANG_EN__', enUrl)
    html = html.replace('__HREFLANG_DEFAULT__', canonicalUrl)

    return html
  }

  /** 根据请求 path 注入正确的路由级 meta（title / description / canonical / OG / JSON-LD / hreflang），
   *  解决 SPA 对所有路由返回同一份首页 HTML 的 SEO 问题。 */
  function injectRouteMeta(rawHtml: string, path: string): string {
    const seo = seoMap.get(path)
    if (!seo) {
      // 未匹配到路由 → 注入 hreflang + JSON-LD（用首页兜底），不注入 title/description
      let html = injectHreflang(rawHtml, path)
      html = injectJsonLd(html, '/')
      return html
    }

    let html = rawHtml

    // title
    html = replaceInHtml(html, /<title>.*?<\/title>/,
      `<title>${seo.title}</title>`)

    // meta description
    html = replaceInHtml(html, /<meta name="description" content="[^"]*"[^>]*>/,
      `<meta name="description" content="${seo.description}" />`)

    // meta keywords (路由级)
    const keywords = seo.applicationName.replace('PDF Elf — ', '') + ',PDF工具,PDF Elf'
    html = replaceInHtml(html, /<meta name="keywords" content="[^"]*"[^>]*>/,
      `<meta name="keywords" content="${keywords}" />`)

    // canonical
    const canonicalUrl = `https://pdfelf.online${path === '/' ? '/' : path}`
    html = replaceInHtml(html, /<link rel="canonical" href="[^"]*"[^>]*>/,
      `<link rel="canonical" href="${canonicalUrl}" />`)

    // Open Graph
    html = replaceInHtml(html, /<meta property="og:title" content="[^"]*"[^>]*>/,
      `<meta property="og:title" content="${seo.title}" />`)
    html = replaceInHtml(html, /<meta property="og:description" content="[^"]*"[^>]*>/,
      `<meta property="og:description" content="${seo.description}" />`)
    html = replaceInHtml(html, /<meta property="og:url" content="[^"]*"[^>]*>/,
      `<meta property="og:url" content="${canonicalUrl}" />`)
    html = replaceInHtml(html, /<meta property="og:image" content="[^"]*"[^>]*>/,
      `<meta property="og:image" content="https://pdfelf.online/og-image.png" />`)

    // Twitter Card
    html = replaceInHtml(html, /<meta name="twitter:title" content="[^"]*"[^>]*>/,
      `<meta name="twitter:title" content="${seo.title}" />`)
    html = replaceInHtml(html, /<meta name="twitter:description" content="[^"]*"[^>]*>/,
      `<meta name="twitter:description" content="${seo.description}" />`)
    html = replaceInHtml(html, /<meta name="twitter:image" content="[^"]*"[^>]*>/,
      `<meta name="twitter:image" content="https://pdfelf.online/og-image.png" />`)

    // JSON-LD
    html = injectJsonLd(html, path)

    // hreflang
    html = injectHreflang(html, path)

    return html
  }

  // 读取 index.html 一次（构建后不会再变）
  let cachedBaseHtml = ''
  try {
    cachedBaseHtml = readFileSync(indexHtmlPath, 'utf-8')
  } catch {
    // 首次启动时 dist 可能还不存在，会在第一次请求时再读
  }

  // 首页路由：先于 express.static 处理，注入 JSON-LD / hreflang 等 SEO 数据
  // 如果不拦截，express.static 会直接返回 dist/index.html，绕过 injectRouteMeta
  app.get('/', (_req, res) => {
    if (!cachedBaseHtml) {
      try { cachedBaseHtml = readFileSync(indexHtmlPath, 'utf-8') } catch {
        res.status(503).send('Service Unavailable'); return
      }
    }
    const html = injectRouteMeta(cachedBaseHtml, '/')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  })

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

  // SPA fallback：对每一条路由注入独立的 title / description / canonical / OG / JSON-LD / hreflang
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
