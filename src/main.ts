import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { recordPageVisit } from './services/statsService'
import './styles/global.css'

// 在 mount 前注册，确保首次加载也触发
router.afterEach((to) => {
  recordPageVisit(to.path)
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
