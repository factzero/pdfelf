import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import prerender from 'vite-plugin-prerender'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    prerender({
      staticDir: 'dist',
      routes: [
        '/',
        '/compress-pdf',
        '/merge-pdf',
        '/split-pdf',
        '/rotate-pdf',
        '/delete-pages',
        '/extract-pages',
        '/add-watermark',
        '/pdf-to-word',
        '/pdf-to-excel',
        '/pdf-to-ppt',
        '/pdf-to-image',
        '/word-to-pdf',
        '/excel-to-pdf',
        '/ppt-to-pdf',
        '/image-to-pdf',
        '/pdf-reader',
      ],
      renderer: new prerender.PuppeteerRenderer({
        headless: true,
      }),
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  worker: {
    format: 'es',
  },
})
