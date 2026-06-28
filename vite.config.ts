import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/

const proxyConfig = {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    ws: false,
    configure: (proxy: any) => {
      proxy.on('error', (err: any, _req: any, res: any) => {
        const response = res as { headersSent?: boolean; writeHead: (code: number, headers: Record<string, string>) => void; end: (data: string) => void }
        if (response && !response.headersSent) {
          response.writeHead(502, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify({ error: 'stats_unavailable', detail: err.message }))
        }
      })
    },
  },
}

/** 复制目录（递归） */
function copyDirSync(src: string, dst: string) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath)
    } else {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

/**
 * 插件：复制 pdfjs-dist cmaps 到输出目录
 *
 * pdfjs 加载中文字体时需要 cMap 二进制文件；如果不提供 cMapUrl，
 * 含 CJK 字体的 PDF 在渲染时会输出大量 "cMapUrl is not provided" 警告。
 *
 * - dev  模式：通过 configureServer 中间件直接从 node_modules 提供
 * - build 模式：在 closeBundle 中复制到 dist/cmaps/
 */
function copyCmapsPlugin(): Plugin {
  const CMAPS_SRC = resolve(__dirname, 'node_modules/pdfjs-dist/cmaps')

  return {
    name: 'copy-pdfjs-cmaps',
    configureServer(server) {
      // dev 模式下从 node_modules 提供 cmaps
      if (!fs.existsSync(CMAPS_SRC)) return
      server.middlewares.use('/cmaps', (_req, res, next) => {
        const url = new URL(_req.url!, 'http://localhost')
        const filePath = path.join(CMAPS_SRC, url.pathname)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          const mimeMap: Record<string, string> = {
            '.bcmap': 'application/octet-stream',
          }
          res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream')
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          fs.createReadStream(filePath).pipe(res)
        } else {
          next()
        }
      })
    },

    async closeBundle() {
      if (!fs.existsSync(CMAPS_SRC)) {
        console.warn('  [copy-cmaps] cmaps source not found, skip')
        return
      }
      const dst = resolve(__dirname, 'dist/cmaps')
      copyDirSync(CMAPS_SRC, dst)
      console.log(`  [copy-cmaps] copied cmaps to dist/cmaps/`)
    },
  }
}

/**
 * 插件：为 dev/preview 模式添加 COOP/COEP 头 + wasm MIME 类型
 *
 * - Pyodide 在 module worker 中通过 fetch 加载 9MB wasm，浏览器要求
 *   服务端返回正确的 Content-Type: application/wasm
 * - COOP/COEP 头确保跨域隔离环境下 WebAssembly 稳定工作
 */
function wasmHeadersPlugin(): Plugin {
  return {
    name: 'wasm-headers',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        // COOP/COEP：保障 Worker 内 WebAssembly 加载的稳定性
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')

        // 确保 .wasm 文件有正确的 Content-Type
        const url = _req.url || ''
        if (url.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm')
        } else if (url.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript')
        }

        next()
      })
    },
  }
}

// 插件：将构建产物中的 .mjs 重命名为 .js，彻底避免服务器 MIME 类型问题
function renameMjsPlugin(): Plugin {
  return {
    name: 'rename-mjs-to-js',
    apply: 'build',
    async closeBundle() {
      const dirs = ['dist/assets', 'dist']
      const replacements: [string, string][] = []

      for (const dir of dirs) {
        const fullDir = resolve(__dirname, dir)
        if (!fs.existsSync(fullDir)) continue
        const files = fs.readdirSync(fullDir)
        for (const f of files) {
          if (!f.endsWith('.mjs')) continue
          const oldName = f
          const newName = f.replace(/\.mjs$/, '.js')
          const oldPath = path.join(fullDir, oldName)
          const newPath = path.join(fullDir, newName)
          fs.renameSync(oldPath, newPath)
          replacements.push([oldName, newName])
          console.log(`  [rename-mjs] ${oldName} → ${newName}`)
        }
      }

      // 更新所有文件中对 .mjs 的引用
      if (replacements.length === 0) return
      for (const dir of dirs) {
        const fullDir = resolve(__dirname, dir)
        if (!fs.existsSync(fullDir)) continue
        const files = fs.readdirSync(fullDir)
        for (const f of files) {
          if (!/\.(js|css|html)$/.test(f)) continue
          const fp = path.join(fullDir, f)
          let content = fs.readFileSync(fp, 'utf8')
          let changed = false
          for (const [oldName, newName] of replacements) {
            if (content.includes(oldName)) {
              content = content.split(oldName).join(newName)
              changed = true
            }
          }
          if (changed) {
            fs.writeFileSync(fp, content)
            console.log(`  [rename-mjs] updated refs in ${f}`)
          }
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), copyCmapsPlugin(), wasmHeadersPlugin(), renameMjsPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // 低配服务器关闭 sourcemap，大幅减少内存占用
    sourcemap: false,
    // 限制并行 chunk 数，降低内存峰值
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: proxyConfig,
  },
  preview: {
    host: '0.0.0.0',
    proxy: proxyConfig,
  },
  worker: {
    format: 'iife',
  },
})
