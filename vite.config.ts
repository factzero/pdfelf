import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

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

export default defineConfig({
  plugins: [vue()],
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
    format: 'es',
  },
})
