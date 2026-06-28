<template>
  <footer class="site-footer">
    <div class="footer__nav container">
      <div v-for="col in footerCols" :key="col.categoryKey" class="footer__col">
        <h4 class="footer__col-title">{{ $t(col.categoryKey) }}</h4>
        <ul class="footer__links">
          <li v-for="link in col.links" :key="link.route">
            <router-link :to="link.route">
              <component :is="link.icon" :size="14" :stroke-width="2" class="footer-link-icon" />
              {{ $t(link.titleKey) }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>
    <div class="trust-bar">
      <div class="trust-bar__inner container">
        <div class="trust-item">
          <Lock :size="16" :stroke-width="2" class="trust-item__icon" />
          <span>{{ $t('trust.localProcessing') }}</span>
        </div>
        <div class="trust-item">
          <Cloud :size="16" :stroke-width="2" class="trust-item__icon" />
          <span>{{ $t('trust.noUpload') }}</span>
        </div>
        <div class="trust-item">
          <Sparkles :size="16" :stroke-width="2" class="trust-item__icon" />
          <span>{{ $t('trust.free') }}</span>
        </div>
        <div v-if="stats" class="trust-item trust-item--stats">
          <Eye :size="16" :stroke-width="2" class="trust-item__icon" />
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
import {
  ArrowLeftRight,
  BookOpenText,
  Cloud,
  Combine,
  Copy,
  Crop,
  Eye,
  EyeOff,
  FileCode,
  FileImage,
  FileText,
  FileType,
  FlipVertical,
  FolderArchive,
  Globe,
  Hash,
  Image,
  Lock,
  LockOpen,
  Maximize,
  Palette,
  PenTool,
  Presentation,
  RotateCw,
  Scissors,
  Sparkles,
  Stamp,
  Table2,
  Trash2,
  Wrench,
} from 'lucide-vue-next'
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
      { icon: FolderArchive, titleKey: 'tools.compressPdf.title', route: '/compress-pdf' },
      { icon: Combine, titleKey: 'tools.mergePdf.title', route: '/merge-pdf' },
      { icon: Scissors, titleKey: 'tools.splitPdf.title', route: '/split-pdf' },
      { icon: RotateCw, titleKey: 'tools.rotatePdf.title', route: '/rotate-pdf' },
      { icon: Trash2, titleKey: 'tools.deletePages.title', route: '/delete-pages' },
      { icon: Copy, titleKey: 'tools.extractPages.title', route: '/extract-pages' },
      { icon: ArrowLeftRight, titleKey: 'tools.reorderPages.title', route: '/reorder-pages' },
    ],
  },
  {
    categoryKey: 'footer.edit',
    links: [
      { icon: Stamp, titleKey: 'tools.addWatermark.title', route: '/add-watermark' },
      { icon: Hash, titleKey: 'tools.addPageNumbers.title', route: '/add-page-numbers' },
      { icon: BookOpenText, titleKey: 'tools.headerFooter.title', route: '/add-header-footer' },
    ],
  },
  {
    categoryKey: 'footer.security',
    links: [
      { icon: Lock, titleKey: 'tools.protectPdf.title', route: '/protect-pdf' },
      { icon: LockOpen, titleKey: 'tools.unlockPdf.title', route: '/unlock-pdf' },
      { icon: Crop, titleKey: 'tools.cropPdf.title', route: '/crop-pdf' },
      { icon: Image, titleKey: 'tools.extractImages.title', route: '/extract-images' },
      { icon: Wrench, titleKey: 'tools.repairPdf.title', route: '/repair-pdf' },
    ],
  },
  {
    categoryKey: 'footer.fromPdf',
    links: [
      { icon: FileText, titleKey: 'tools.pdfToWord.title', route: '/pdf-to-word' },
      { icon: Table2, titleKey: 'tools.pdfToExcel.title', route: '/pdf-to-excel' },
      { icon: Presentation, titleKey: 'tools.pdfToPpt.title', route: '/pdf-to-ppt' },
      { icon: Image, titleKey: 'tools.pdfToImage.title', route: '/pdf-to-image' },
      { icon: FileImage, titleKey: 'tools.pdfToJpg.title', route: '/pdf-to-jpg' },
      { icon: FileImage, titleKey: 'tools.pdfToPng.title', route: '/pdf-to-png' },
      { icon: FileImage, titleKey: 'tools.pdfToTiff.title', route: '/pdf-to-tiff' },
      { icon: Maximize, titleKey: 'tools.pdfToSvg.title', route: '/pdf-to-svg' },
      { icon: FileType, titleKey: 'tools.pdfToText.title', route: '/pdf-to-text' },
      { icon: Globe, titleKey: 'tools.pdfToHtml.title', route: '/pdf-to-html' },
    ],
  },
  {
    categoryKey: 'footer.toPdf',
    links: [
      { icon: FileText, titleKey: 'tools.wordToPdf.title', route: '/word-to-pdf' },
      { icon: Table2, titleKey: 'tools.excelToPdf.title', route: '/excel-to-pdf' },
      { icon: Presentation, titleKey: 'tools.pptToPdf.title', route: '/ppt-to-pdf' },
      { icon: Image, titleKey: 'tools.imageToPdf.title', route: '/image-to-pdf' },
      { icon: Globe, titleKey: 'tools.htmlToPdf.title', route: '/html-to-pdf' },
    ],
  },
  {
    categoryKey: 'footer.reader',
    links: [
      { icon: BookOpenText, titleKey: 'tools.pdfReader.title', route: '/pdf-reader' },
    ],
  },
  {
    categoryKey: 'footer.moreTools',
    links: [
      { icon: FileCode, titleKey: 'tools.editMetadata.title', route: '/edit-metadata' },
      { icon: FlipVertical, titleKey: 'tools.flipPdf.title', route: '/flip-pdf' },
      { icon: Palette, titleKey: 'tools.grayscalePdf.title', route: '/grayscale-pdf' },
      { icon: Maximize, titleKey: 'tools.resizePdf.title', route: '/resize-pdf' },
      { icon: PenTool, titleKey: 'tools.signPdf.title', route: '/sign-pdf' },
      { icon: EyeOff, titleKey: 'tools.redactPdf.title', route: '/redact-pdf' },
      { icon: FileType, titleKey: 'tools.fillForm.title', route: '/fill-form' },
    ],
  },
]
</script>

<style scoped>
.site-footer {
  margin-top: auto;
  background: linear-gradient(135deg, #f0f4ff 0%, #f8fafc 40%, #f1f5f9 100%);
  border-top: 2px solid var(--color-border);
  position: relative;
  overflow: hidden;
}

.site-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary) 0%, #8b5cf6 25%, #06b6d4 50%, #8b5cf6 75%, var(--color-primary) 100%);
  opacity: 0.5;
}

.footer__nav {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--spacing-md);
  padding: var(--spacing-2xl) var(--spacing-md);
  padding-bottom: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.footer__col {
  min-width: 0;
}

.footer__col-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.85;
}

.footer__links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer__links li {
  margin-bottom: 4px;
}

.footer__links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #475569;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
  padding: 2px 4px;
  border-radius: 4px;
}

.footer__links a:hover {
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.06);
  transform: translateX(2px);
}

.footer-link-icon {
  flex-shrink: 0;
  color: var(--color-primary);
  opacity: 0.55;
  transition: opacity 0.2s ease;
}

.footer__links a:hover .footer-link-icon {
  opacity: 1;
}

.trust-bar {
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-lg) 0;
  background: rgba(255, 255, 255, 0.5);
  position: relative;
  z-index: 1;
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
  color: #475569;
  font-weight: 500;
}

.trust-item__icon {
  flex-shrink: 0;
}

.trust-item:nth-child(1) .trust-item__icon {
  color: #2563eb;
}

.trust-item:nth-child(2) .trust-item__icon {
  color: #7c3aed;
}

.trust-item:nth-child(3) .trust-item__icon {
  color: #f59e0b;
}

.trust-item--stats .trust-item__icon {
  color: #10b981 !important;
}

.trust-item__sep {
  margin: 0 4px;
  opacity: 0.3;
  color: var(--color-text-muted);
}

@media (max-width:1200px) {
  .footer__nav {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .footer__nav {
    grid-template-columns: repeat(2, 1fr);
    text-align: center;
  }

  .footer__links a {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .footer__nav {
    grid-template-columns: 1fr;
    align-items: center;
    gap: var(--spacing-xl);
  }

  .trust-bar__inner {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }
}
</style>
