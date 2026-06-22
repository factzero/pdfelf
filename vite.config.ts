import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
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
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            const response = res as { headersSent?: boolean; writeHead: (code: number, headers: Record<string, string>) => void; end: (data: string) => void }
            if (response && !response.headersSent) {
              response.writeHead(502, { 'Content-Type': 'application/json' })
              response.end(JSON.stringify({ error: 'stats_unavailable', detail: err.message }))
            }
          })
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
  },
  worker: {
    format: 'es',
  },
})
