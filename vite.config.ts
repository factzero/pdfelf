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
  plugins: [vue(), renameMjsPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
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
