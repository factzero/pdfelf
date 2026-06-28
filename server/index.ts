import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { getStats, recordVisit, initStore } from './statsStore'
import { initRatingStore, submitRating, getPageRatings, getUserRating, getAllSummaries } from './likeStore.js'
import { seoMap, enSeoMap, buildJsonLd, buildJsonLdEn, homeSeo, homeEnSeo } from './seoMeta.js'

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
      endpoints: ['GET /api/stats', 'POST /api/stats/visit', 'GET /api/ratings', 'POST /api/ratings', 'GET /api/ratings/user', 'GET /api/ratings/summary'],
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

// API: 获取某页面的评分与评论
app.get('/api/ratings', (req, res) => {
  const { path } = req.query
  if (!path) {
    res.status(400).json({ error: 'path required' })
    return
  }
  res.json(getPageRatings(path as string))
})

// API: 获取用户对某页面的已有评分
app.get('/api/ratings/user', (req, res) => {
  const { path, visitorId } = req.query
  if (!path || !visitorId) {
    res.status(400).json({ error: 'path and visitorId required' })
    return
  }
  res.json(getUserRating(path as string, visitorId as string))
})

// API: 所有页面的评分摘要（用于排名）
app.get('/api/ratings/summary', (_req, res) => {
  res.json(getAllSummaries())
})

// API: 提交评分+评论
app.post('/api/ratings', (req, res) => {
  const { path, visitorId, stars, review } = req.body
  if (!path || !visitorId) {
    res.status(400).json({ error: 'path and visitorId required' })
    return
  }
  if (typeof stars !== 'number' || stars < 1 || stars > 5) {
    res.status(400).json({ error: 'stars must be 1-5' })
    return
  }
  const result = submitRating(path, visitorId, stars, review || '')
  res.json(result)
})

// 静态信息页面（SEO 信任信号：隐私、联系、关于）
function staticPage(title: string, h1: string, content: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="index, follow" />
<title>${title} - PDF Elf</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;color:#333}h1{font-size:1.8em;margin-bottom:.5em}</style>
</head>
<body><h1>${h1}</h1>${content}</body>
</html>`
}

app.get('/privacy', (_req, res) => {
  res.type('html').send(staticPage(
    '隐私政策',
    '隐私政策',
    `<p>PDF Elf 高度重视您的隐私安全。</p>
<p><strong>文件不会上传：</strong>所有 PDF 处理均在您的浏览器本地完成，文件自始至终不会离开您的设备，不会被上传到任何服务器。</p>
<p><strong>收集的信息：</strong>我们仅通过 Plausible 匿名统计页面访问量（不设 Cookie、不追踪个人），用于了解功能使用情况。</p>
<p><strong>第三方服务：</strong>本站不使用任何第三方广告或追踪脚本。</p>
<p>如有疑问，请联系：pdfelf@proton.me</p>`
  ))
})

app.get('/contact', (_req, res) => {
  res.type('html').send(staticPage(
    '联系我们',
    '联系我们',
    `<p>如有反馈、建议或合作意向，欢迎通过以下方式联系：</p>
<p>📧 邮箱：<a href="mailto:pdfelf@proton.me">pdfelf@proton.me</a></p>
<p>🐙 GitHub：<a href="https://github.com/factzero/pdfelf" target="_blank">github.com/factzero/pdfelf</a></p>
<p>💡 功能建议或 Bug 反馈，也欢迎在 GitHub 提交 Issue。</p>`
  ))
})

app.get('/about', (_req, res) => {
  res.type('html').send(staticPage(
    '关于 PDF Elf',
    '关于 PDF Elf',
    `<p>PDF Elf 是一款完全免费的在线 PDF 处理工具，提供 20+ PDF 功能，包括压缩、合并、拆分、转换、旋转、提取、重排等。</p>
<p><strong>核心特色：</strong></p>
<ul>
<li>所有处理在浏览器本地完成，无需上传文件到服务器</li>
<li>集成 Pyodide，支持高级文档格式转换（Word/Excel/PPT 互转）</li>
<li>完全免费，无需注册，无需下载安装</li>
<li>支持桌面和移动端浏览器</li>
</ul>`
  ))
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

  /** 注入 hreflang 标签 — x-default 指向英文（Google 推荐：非中文用户默认英文）*/
  function injectHreflang(html: string, path: string, isEnglish = false): string {
    const basePath = path === '/' ? '/' : path
    const zhUrl = `https://pdfelf.online${basePath}`
    const enUrl = `https://pdfelf.online/en${basePath}`
    const canonicalUrl = isEnglish ? enUrl : zhUrl

    html = html.replace('__HREFLANG_ZH__', zhUrl)
    html = html.replace('__HREFLANG_EN__', enUrl)
    // x-default = English: non-Chinese users default to English
    html = html.replace('__HREFLANG_DEFAULT__', enUrl)

    // og:locale / og:locale:alternate
    if (isEnglish) {
      html = html.replace(/<meta property="og:locale" content="[^"]*"[^>]*>/,
        '<meta property="og:locale" content="en_US" />')
      html = html.replace('__OG_LOCALE_ALT__',
        '<meta property="og:locale:alternate" content="zh_CN" />')
    } else {
      html = html.replace('__OG_LOCALE_ALT__',
        '<meta property="og:locale:alternate" content="en_US" />')
    }

    return html
  }

  /** 根据请求 path 注入正确的路由级 meta（中文）*/
  function injectRouteMeta(rawHtml: string, path: string): string {
    const seo = seoMap.get(path)
    if (!seo) {
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

    // Twitter Card
    html = replaceInHtml(html, /<meta name="twitter:title" content="[^"]*"[^>]*>/,
      `<meta name="twitter:title" content="${seo.title}" />`)
    html = replaceInHtml(html, /<meta name="twitter:description" content="[^"]*"[^>]*>/,
      `<meta name="twitter:description" content="${seo.description}" />`)

    // JSON-LD
    html = injectJsonLd(html, path)

    // hreflang
    html = injectHreflang(html, path)

    return html
  }

  /** 根据请求 path 注入英文路由级 meta */
  function injectRouteMetaEn(rawHtml: string, path: string): string {
    const seo = enSeoMap.get(path)
    if (!seo) {
      let html = injectHreflang(rawHtml, path, true)
      html = html.replace('<html lang="zh-CN">', '<html lang="en">')
      html = injectJsonLdEn(html, '/')
      return html
    }

    let html = rawHtml

    // lang attribute
    html = html.replace('<html lang="zh-CN">', '<html lang="en">')

    // title
    html = replaceInHtml(html, /<title>.*?<\/title>/,
      `<title>${seo.title}</title>`)

    // meta description
    html = replaceInHtml(html, /<meta name="description" content="[^"]*"[^>]*>/,
      `<meta name="description" content="${seo.description}" />`)

    // meta keywords (English)
    const keywords = seo.applicationName.replace('PDF Elf — ', '') + ',PDF tools,PDF Elf,free PDF'
    html = replaceInHtml(html, /<meta name="keywords" content="[^"]*"[^>]*>/,
      `<meta name="keywords" content="${keywords}" />`)

    // canonical
    const canonicalUrl = `https://pdfelf.online/en${path === '/' ? '/' : path}`
    html = replaceInHtml(html, /<link rel="canonical" href="[^"]*"[^>]*>/,
      `<link rel="canonical" href="${canonicalUrl}" />`)

    // Open Graph
    html = replaceInHtml(html, /<meta property="og:title" content="[^"]*"[^>]*>/,
      `<meta property="og:title" content="${seo.title}" />`)
    html = replaceInHtml(html, /<meta property="og:description" content="[^"]*"[^>]*>/,
      `<meta property="og:description" content="${seo.description}" />`)
    html = replaceInHtml(html, /<meta property="og:url" content="[^"]*"[^>]*>/,
      `<meta property="og:url" content="${canonicalUrl}" />`)

    // Twitter Card
    html = replaceInHtml(html, /<meta name="twitter:title" content="[^"]*"[^>]*>/,
      `<meta name="twitter:title" content="${seo.title}" />`)
    html = replaceInHtml(html, /<meta name="twitter:description" content="[^"]*"[^>]*>/,
      `<meta name="twitter:description" content="${seo.description}" />`)

    // JSON-LD (English)
    html = injectJsonLdEn(html, path)

    // hreflang
    html = injectHreflang(html, path, true)

    return html
  }

  /** 注入英文 JSON-LD */
  function injectJsonLdEn(html: string, path: string): string {
    const seo = enSeoMap.get(path) || homeEnSeo
    const jsonLd = buildJsonLdEn(seo)
    return html.replace(
      '<!--JSON_LD_PLACEHOLDER-->',
      `<script type="application/ld+json">\n${jsonLd}\n    </script>`
    )
  }

  // 读取 index.html 一次（构建后不会再变）
  let cachedBaseHtml = ''
  try {
    cachedBaseHtml = readFileSync(indexHtmlPath, 'utf-8')
  } catch {
    // 首次启动时 dist 可能还不存在，会在第一次请求时再读
  }

  // 首页路由：先于 express.static 处理，注入 JSON-LD / hreflang 等 SEO 数据
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

  // 英文首页
  app.get('/en', (_req, res) => {
    if (!cachedBaseHtml) {
      try { cachedBaseHtml = readFileSync(indexHtmlPath, 'utf-8') } catch {
        res.status(503).send('Service Unavailable'); return
      }
    }
    const html = injectRouteMetaEn(cachedBaseHtml, '/')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  })

  // 英文子页面路由 /en/* 
  app.get('/en/*', (req, res) => {
    if (!cachedBaseHtml) {
      try { cachedBaseHtml = readFileSync(indexHtmlPath, 'utf-8') } catch {
        res.status(503).send('Service Unavailable'); return
      }
    }
    // 剥掉 /en 前缀获取实际路径
    const enPath = req.path.replace(/^\/en/, '') || '/'
    const html = injectRouteMetaEn(cachedBaseHtml, enPath)
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
initRatingStore()

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n📊 [Stats Server] http://localhost:${PORT}`)
})
