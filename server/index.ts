import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getStats, recordVisit, initStore } from './statsStore'

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

// 生产环境：托管前端静态文件
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist')
  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      // Express 默认不识别 .mjs / .wasm 的 MIME 类型
      if (filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript')
      } else if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm')
        // .wasm 是二进制文件，不应被压缩（保持 WebAssembly.instantiateStreaming 兼容）
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else if (filePath.endsWith('.zip')) {
        // python_stdlib.zip / whl 文件
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }

      // COOP/COEP 头：保障 module worker 中 WebAssembly 加载稳定
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    },
  }))
  app.use((_req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

// 初始化统计存储文件（不存在则自动创建）
initStore()

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n📊 [Stats Server] http://localhost:${PORT}`)
})
