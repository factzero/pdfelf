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

/**
 * 插件：生成 public/pdf.worker.js + public/pdf.worker.core.js
 *
 * 背景：Vite 的 `?worker&url` 会把 worker 打包成 IIFE 副作用脚本，吞掉
 * `export { WorkerMessageHandler }`。当 pdf.js 真实 worker 加载失败、回退到
 * fake worker 时，会 `import(workerSrc)` 并读取 `worker.WorkerMessageHandler`，
 * 但打包后的 worker 没有该导出 → undefined.setup() 崩溃。
 *
 * 解决：把 pdf.worker 作为独立 ES 模块放到 public/（不经 Vite 模块处理），
 * 保留 `export { WorkerMessageHandler }`，并内联 ES2024/2025 polyfill。
 */
function syncPdfWorkerPlugin(): Plugin {
  const WORKER_CORE_SRC = resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')

  // 内联的 polyfill（与 src/utils/polyfills.ts 保持一致，此处为纯 JS 版本）
  const polyfillJs = `
// ES2024/2025 polyfills for pdf.js worker
const _up = Uint8Array.prototype;
if (typeof _up.toHex !== 'function') {
  Object.defineProperty(Uint8Array.prototype, 'toHex', { configurable: true, writable: true, value: function () {
    let hex = ''; for (let i = 0; i < this.length; i++) hex += this[i].toString(16).padStart(2, '0'); return hex;
  }});
}
if (typeof _up.toBase64 !== 'function') {
  Object.defineProperty(Uint8Array.prototype, 'toBase64', { configurable: true, writable: true, value: function () {
    let binary = ''; for (let i = 0; i < this.length; i++) binary += String.fromCharCode(this[i]); return btoa(binary);
  }});
}
if (typeof Map.prototype.getOrInsertComputed !== 'function') {
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', { configurable: true, writable: true, value: function (key, cb) {
    if (this.has(key)) return this.get(key); const v = cb(); this.set(key, v); return v;
  }});
}
if (typeof Promise.withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', { configurable: true, writable: true, value: function () {
    let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }});
}
if (typeof Uint8Array.fromBase64 !== 'function') {
  Object.defineProperty(Uint8Array, 'fromBase64', { configurable: true, writable: true, value: function (str) {
    const binary = atob(str); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes;
  }});
}
function _atPolyfill(index) {
  const len = this.length; const i = index < 0 ? len + index : index;
  return i >= 0 && i < len ? this[i] : undefined;
}
if (typeof Array.prototype.at !== 'function') {
  Object.defineProperty(Array.prototype, 'at', { configurable: true, writable: true, value: _atPolyfill });
}
if (typeof Uint8Array.prototype.at !== 'function') {
  Object.defineProperty(Uint8Array.prototype, 'at', { configurable: true, writable: true, value: _atPolyfill });
}
if (typeof Promise.try !== 'function') {
  Object.defineProperty(Promise, 'try', { configurable: true, writable: true, value: function (fn, ...args) {
    try { return Promise.resolve(fn(...args)); } catch (err) { return Promise.reject(err); }
  }});
}
if (typeof Set.prototype.intersection !== 'function') {
  Object.defineProperty(Set.prototype, 'intersection', { configurable: true, writable: true, value: function (other) {
    const result = new Set(); for (const item of this) if (other.has(item)) result.add(item); return result;
  }});
}
if (typeof Math.sumPrecise !== 'function') {
  Object.defineProperty(Math, 'sumPrecise', { configurable: true, writable: true, value: function (items) {
    let sum = 0, compensation = 0;
    for (const value of items) {
      const y = value - compensation;
      const t = sum + y;
      compensation = t - sum - y;
      sum = t;
    }
    return sum;
  }});
}
if (typeof ArrayBuffer.prototype.transferToFixedLength !== 'function') {
  Object.defineProperty(ArrayBuffer.prototype, 'transferToFixedLength', { configurable: true, writable: true, value: function (newLength) {
    const source = this, out = new ArrayBuffer(newLength);
    const copy = Math.min(source.byteLength, newLength);
    if (copy > 0) new Uint8Array(out).set(new Uint8Array(source, 0, copy));
    return out;
  }});
}
if (typeof ArrayBuffer.prototype.transfer !== 'function') {
  Object.defineProperty(ArrayBuffer.prototype, 'transfer', { configurable: true, writable: true, value: function (newLength) {
    const source = this, len = newLength === undefined ? source.byteLength : newLength;
    const out = new ArrayBuffer(len);
    const copy = Math.min(source.byteLength, len);
    if (copy > 0) new Uint8Array(out).set(new Uint8Array(source, 0, copy));
    return out;
  }});
}
if (typeof Object.hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', { configurable: true, writable: true, value: function (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }});
}
`

  return {
    name: 'sync-pdf-worker',
    apply: 'build',
    async buildStart() {
      const publicDir = resolve(__dirname, 'public')
      fs.mkdirSync(publicDir, { recursive: true })

      // 1. 复制 worker 核心（pdf.worker.min.mjs 自包含，无 import）
      if (!fs.existsSync(WORKER_CORE_SRC)) {
        console.warn('  [sync-pdf-worker] pdf.worker.min.mjs not found, skip')
        return
      }
      const core = fs.readFileSync(WORKER_CORE_SRC, 'utf8')
      fs.writeFileSync(resolve(publicDir, 'pdf.worker.core.js'), core)
      console.log('  [sync-pdf-worker] wrote public/pdf.worker.core.js')

      // 2. 生成 worker 入口（polyfill + import/export）
      const entry = `${polyfillJs}
import { WorkerMessageHandler } from './pdf.worker.core.js';
export { WorkerMessageHandler };
`
      fs.writeFileSync(resolve(publicDir, 'pdf.worker.js'), entry)
      console.log('  [sync-pdf-worker] wrote public/pdf.worker.js')
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
  plugins: [vue(), copyCmapsPlugin(), wasmHeadersPlugin(), syncPdfWorkerPlugin(), renameMjsPlugin()],
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
    format: 'es',
  },
})
