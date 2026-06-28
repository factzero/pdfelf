import { createI18n } from 'vue-i18n'
import zhCN from '@/locales/zh-CN'
import en from '@/locales/en'

function detectLocale(): string {
  // 1. 用户手动切换过的语言优先
  const saved = localStorage.getItem('pdfelf-lang')
  if (saved) return saved

  // 2. 检测浏览器语言：中文地区用中文，其他用英文
  const navLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase()
  if (navLang.startsWith('zh')) return 'zh-CN'

  // 3. 通过 IP 地理位置判断（国内 IP → 中文，国外 → 英文）
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (tz === 'Asia/Shanghai' || tz === 'Asia/Chongqing' || tz === 'Asia/Harbin' || tz === 'Asia/Urumqi') {
    return 'zh-CN'
  }

  return 'en'
}

const detectedLocale = detectLocale()

const i18n = createI18n({
  legacy: false,
  locale: detectedLocale,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export default i18n
