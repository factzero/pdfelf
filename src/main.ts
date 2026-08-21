// 最先加载 polyfill：补齐 pdf.js 依赖的 ES2024/ES2025 方法
// （Uint8Array.prototype.toHex/toBase64、Map.prototype.getOrInsertComputed）
import './utils/polyfills'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { recordPageVisit } from './services/statsService'
import './styles/global.css'

// 检测 /en 路由前缀，设置语言为英文（不做重定向，alias 直接匹配）
router.beforeEach((to) => {
  if (to.path === '/en' || to.path.startsWith('/en/')) {
    i18n.global.locale.value = 'en'
    localStorage.setItem('pdfelf-lang', 'en')
  }
})

// 在 mount 前注册，确保首次加载也触发
router.afterEach((to) => {
  recordPageVisit(to.path)

  // 动态设置页面 title 和 meta description
  const { t, te } = i18n.global
  const titleKey = to.meta?.titleKey as string | undefined
  const descKey = to.meta?.descKey as string | undefined

  if (titleKey && te(titleKey)) {
    document.title = t(titleKey)
  }
  if (descKey && te(descKey)) {
    const desc = t(descKey)
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', desc as string)
  }
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')

// 空闲时预热 pdf.js worker（动态 import，不增加首屏 bundle；warmUpPdfjs 幂等）。
// 首次访问时 worker core（约 1.2MB）下载 + 启动较慢，提前加载可避免
// 用户首次压缩/预览时在超时窗口内冷启动。
window.setTimeout(() => {
  import('./utils/pdfjs')
    .then(({ warmUpPdfjs }) => warmUpPdfjs())
    .catch(() => {})
}, 3000)
