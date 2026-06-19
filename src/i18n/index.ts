import { createI18n } from 'vue-i18n'
import zhCN from '@/locales/zh-CN'
import en from '@/locales/en'

const savedLang = localStorage.getItem('pdfelf-lang') || 'zh-CN'

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export default i18n
