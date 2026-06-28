import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { recordPageVisit } from './services/statsService'
import './styles/global.css'

// 处理 /en/ 路由前缀：剥掉 /en/ 并设置英文
router.beforeEach((to) => {
  if (to.path === '/en') {
    i18n.global.locale.value = 'en'
    localStorage.setItem('pdfelf-lang', 'en')
    return '/'
  }
  if (to.path.startsWith('/en/')) {
    i18n.global.locale.value = 'en'
    localStorage.setItem('pdfelf-lang', 'en')
    return to.path.replace(/^\/en/, '') || '/'
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
