<template>
  <footer class="site-footer">
    <div class="footer__nav container">
      <div v-for="col in footerCols" :key="col.categoryKey" class="footer__col">
        <h4 class="footer__col-title">{{ $t(col.categoryKey) }}</h4>
        <ul class="footer__links">
          <li v-for="link in col.links" :key="link.route">
            <router-link :to="link.route">{{ $t(link.titleKey) }}</router-link>
          </li>
        </ul>
      </div>
    </div>
    <div class="trust-bar">
      <div class="trust-bar__inner container">
        <div class="trust-item">
          <span class="trust-item__icon">🔒</span>
          <span>{{ $t('trust.localProcessing') }}</span>
        </div>
        <div class="trust-item">
          <span class="trust-item__icon">☁️</span>
          <span>{{ $t('trust.noUpload') }}</span>
        </div>
        <div class="trust-item">
          <span class="trust-item__icon">🎉</span>
          <span>{{ $t('trust.free') }}</span>
        </div>
        <div v-if="stats" class="trust-item trust-item--stats">
          <span class="trust-item__icon">👁</span>
          <span>{{ $t('stats.totalVisits', { n: stats.totalVisits }) }}</span>
          <span class="trust-item__sep">·</span>
          <span>{{ $t('stats.todayVisits', { n: stats.todayVisits }) }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchStats } from '@/services/statsService'

interface StatsData {
  totalVisits: number
  todayVisits: number
  uniqueVisitors: number
}

const stats = ref<StatsData | null>(null)

onMounted(async () => {
  stats.value = await fetchStats()
})

const footerCols = [
  {
    categoryKey: 'footer.organize',
    links: [
      { titleKey: 'tools.compressPdf.title', route: '/compress-pdf' },
      { titleKey: 'tools.mergePdf.title', route: '/merge-pdf' },
      { titleKey: 'tools.splitPdf.title', route: '/split-pdf' },
      { titleKey: 'tools.rotatePdf.title', route: '/rotate-pdf' },
      { titleKey: 'tools.deletePages.title', route: '/delete-pages' },
      { titleKey: 'tools.extractPages.title', route: '/extract-pages' },
      { titleKey: 'tools.reorderPages.title', route: '/reorder-pages' },
    ],
  },
  {
    categoryKey: 'footer.convert',
    links: [
      { titleKey: 'tools.pdfToWord.title', route: '/pdf-to-word' },
      { titleKey: 'tools.pdfToExcel.title', route: '/pdf-to-excel' },
      { titleKey: 'tools.pdfToPpt.title', route: '/pdf-to-ppt' },
      { titleKey: 'tools.pdfToImage.title', route: '/pdf-to-image' },
      { titleKey: 'tools.pdfToJpg.title', route: '/pdf-to-jpg' },
      { titleKey: 'tools.pdfToPng.title', route: '/pdf-to-png' },
      { titleKey: 'tools.pdfToText.title', route: '/pdf-to-text' },
      { titleKey: 'tools.pdfToHtml.title', route: '/pdf-to-html' },
    ],
  },
  {
    categoryKey: 'footer.otherTools',
    links: [
      { titleKey: 'tools.wordToPdf.title', route: '/word-to-pdf' },
      { titleKey: 'tools.excelToPdf.title', route: '/excel-to-pdf' },
      { titleKey: 'tools.pptToPdf.title', route: '/ppt-to-pdf' },
      { titleKey: 'tools.imageToPdf.title', route: '/image-to-pdf' },
      { titleKey: 'tools.addWatermark.title', route: '/add-watermark' },
      { titleKey: 'tools.pdfToTiff.title', route: '/pdf-to-tiff' },
      { titleKey: 'tools.pdfToSvg.title', route: '/pdf-to-svg' },
      { titleKey: 'tools.pdfReader.title', route: '/pdf-reader' },
    ],
  },
]
</script>

<style scoped>
.site-footer {
  margin-top: auto;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.footer__nav {
  display: flex;
  justify-content: center;
  gap: var(--spacing-3xl);
  padding: var(--spacing-2xl) var(--spacing-md);
  flex-wrap: wrap;
}

.footer__col {
  min-width: 160px;
}

.footer__col-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.footer__links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer__links li {
  margin-bottom: 6px;
}

.footer__links a {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}

.footer__links a:hover {
  color: var(--color-primary);
}

.trust-bar {
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-lg) 0;
}

.trust-bar__inner {
  display: flex;
  justify-content: center;
  gap: var(--spacing-2xl);
}

.trust-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.trust-item__icon {
  font-size: 1rem;
}

.trust-item--stats {
  opacity: 0.8;
}

.trust-item__sep {
  margin: 0 2px;
  opacity: 0.4;
}

@media (max-width: 640px) {
  .footer__nav {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--spacing-xl);
  }

  .trust-bar__inner {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }
}
</style>
