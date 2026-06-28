<template>
  <div class="home container">
    <div class="hero">
      <h1 class="hero__title">{{ $t('home.heroTitle') }}</h1>
      <p class="hero__subtitle">{{ $t('home.heroSubtitle') }}</p>
    </div>

    <section class="intro-section">
      <p class="intro__text" v-html="$t('home.introText')" />
    </section>

    <section v-for="category in categories" :key="category.nameKey" class="category">
      <h2 class="category__title">{{ $t(category.nameKey) }}</h2>
      <div class="tools-grid">
        <ToolCard
          v-for="tool in category.tools"
          :key="tool.route"
          :icon="tool.icon"
          :title="$t(tool.titleKey)"
          :description="$t(tool.descKey)"
          :route="tool.route"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftRight,
  BookOpenText,
  Combine,
  Copy,
  Crop,
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
  Stamp,
  Table2,
  Trash2,
  Wrench,
} from 'lucide-vue-next'
import ToolCard from '@/components/ToolCard.vue'

const categories = [
  {
    nameKey: 'categories.organize',
    tools: [
      { icon: FolderArchive, titleKey: 'tools.compressPdf.title', descKey: 'tools.compressPdf.desc', route: '/compress-pdf' },
      { icon: Combine, titleKey: 'tools.mergePdf.title', descKey: 'tools.mergePdf.desc', route: '/merge-pdf' },
      { icon: Scissors, titleKey: 'tools.splitPdf.title', descKey: 'tools.splitPdf.desc', route: '/split-pdf' },
      { icon: RotateCw, titleKey: 'tools.rotatePdf.title', descKey: 'tools.rotatePdf.desc', route: '/rotate-pdf' },
      { icon: Trash2, titleKey: 'tools.deletePages.title', descKey: 'tools.deletePages.desc', route: '/delete-pages' },
      { icon: Copy, titleKey: 'tools.extractPages.title', descKey: 'tools.extractPages.desc', route: '/extract-pages' },
      { icon: ArrowLeftRight, titleKey: 'tools.reorderPages.title', descKey: 'tools.reorderPages.desc', route: '/reorder-pages' },
    ],
  },
  {
    nameKey: 'categories.edit',
    tools: [
      { icon: Stamp, titleKey: 'tools.addWatermark.title', descKey: 'tools.addWatermark.desc', route: '/add-watermark' },
      { icon: Hash, titleKey: 'tools.addPageNumbers.title', descKey: 'tools.addPageNumbers.desc', route: '/add-page-numbers' },
      { icon: BookOpenText, titleKey: 'tools.headerFooter.title', descKey: 'tools.headerFooter.desc', route: '/add-header-footer' },
    ],
  },
  {
    nameKey: 'categories.security',
    tools: [
      { icon: Lock, titleKey: 'tools.protectPdf.title', descKey: 'tools.protectPdf.desc', route: '/protect-pdf' },
      { icon: LockOpen, titleKey: 'tools.unlockPdf.title', descKey: 'tools.unlockPdf.desc', route: '/unlock-pdf' },
      { icon: Crop, titleKey: 'tools.cropPdf.title', descKey: 'tools.cropPdf.desc', route: '/crop-pdf' },
      { icon: Image, titleKey: 'tools.extractImages.title', descKey: 'tools.extractImages.desc', route: '/extract-images' },
      { icon: Wrench, titleKey: 'tools.repairPdf.title', descKey: 'tools.repairPdf.desc', route: '/repair-pdf' },
    ],
  },
  {
    nameKey: 'categories.fromPdf',
    tools: [
      { icon: FileText, titleKey: 'tools.pdfToWord.title', descKey: 'tools.pdfToWord.desc', route: '/pdf-to-word' },
      { icon: Table2, titleKey: 'tools.pdfToExcel.title', descKey: 'tools.pdfToExcel.desc', route: '/pdf-to-excel' },
      { icon: Presentation, titleKey: 'tools.pdfToPpt.title', descKey: 'tools.pdfToPpt.desc', route: '/pdf-to-ppt' },
      { icon: Image, titleKey: 'tools.pdfToImage.title', descKey: 'tools.pdfToImage.desc', route: '/pdf-to-image' },
      { icon: FileImage, titleKey: 'tools.pdfToJpg.title', descKey: 'tools.pdfToJpg.desc', route: '/pdf-to-jpg' },
      { icon: FileImage, titleKey: 'tools.pdfToPng.title', descKey: 'tools.pdfToPng.desc', route: '/pdf-to-png' },
      { icon: FileImage, titleKey: 'tools.pdfToTiff.title', descKey: 'tools.pdfToTiff.desc', route: '/pdf-to-tiff' },
      { icon: Maximize, titleKey: 'tools.pdfToSvg.title', descKey: 'tools.pdfToSvg.desc', route: '/pdf-to-svg' },
      { icon: FileType, titleKey: 'tools.pdfToText.title', descKey: 'tools.pdfToText.desc', route: '/pdf-to-text' },
      { icon: Globe, titleKey: 'tools.pdfToHtml.title', descKey: 'tools.pdfToHtml.desc', route: '/pdf-to-html' },
    ],
  },
  {
    nameKey: 'categories.toPdf',
    tools: [
      { icon: FileText, titleKey: 'tools.wordToPdf.title', descKey: 'tools.wordToPdf.desc', route: '/word-to-pdf' },
      { icon: Table2, titleKey: 'tools.excelToPdf.title', descKey: 'tools.excelToPdf.desc', route: '/excel-to-pdf' },
      { icon: Presentation, titleKey: 'tools.pptToPdf.title', descKey: 'tools.pptToPdf.desc', route: '/ppt-to-pdf' },
      { icon: Image, titleKey: 'tools.imageToPdf.title', descKey: 'tools.imageToPdf.desc', route: '/image-to-pdf' },
      { icon: Globe, titleKey: 'tools.htmlToPdf.title', descKey: 'tools.htmlToPdf.desc', route: '/html-to-pdf' },
    ],
  },
  {
    nameKey: 'categories.reader',
    tools: [
      { icon: BookOpenText, titleKey: 'tools.pdfReader.title', descKey: 'tools.pdfReader.desc', route: '/pdf-reader' },
    ],
  },
  {
    nameKey: 'categories.moreTools',
    tools: [
      { icon: FileCode, titleKey: 'tools.editMetadata.title', descKey: 'tools.editMetadata.desc', route: '/edit-metadata' },
      { icon: FlipVertical, titleKey: 'tools.flipPdf.title', descKey: 'tools.flipPdf.desc', route: '/flip-pdf' },
      { icon: Palette, titleKey: 'tools.grayscalePdf.title', descKey: 'tools.grayscalePdf.desc', route: '/grayscale-pdf' },
      { icon: Maximize, titleKey: 'tools.resizePdf.title', descKey: 'tools.resizePdf.desc', route: '/resize-pdf' },
      { icon: PenTool, titleKey: 'tools.signPdf.title', descKey: 'tools.signPdf.desc', route: '/sign-pdf' },
      { icon: EyeOff, titleKey: 'tools.redactPdf.title', descKey: 'tools.redactPdf.desc', route: '/redact-pdf' },
      { icon: FileType, titleKey: 'tools.fillForm.title', descKey: 'tools.fillForm.desc', route: '/fill-form' },
    ],
  },
]
</script>

<style scoped>
.home {
  text-align: center;
}

.hero {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-md);
  background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf2f8 100%);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(37, 99, 235, 0.08);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -40px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%);
  border-radius: 50%;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: -40px;
  left: -30px;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
  border-radius: 50%;
}

.hero__icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: var(--spacing-sm);
}

.hero__title {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.3;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 2px;
  position: relative;
  z-index: 1;
}

.hero__subtitle {
  font-size: 0.9375rem;
  color: #475569;
  position: relative;
  z-index: 1;
}

.intro-section {
  max-width: none;
  margin: 0 auto var(--spacing-md);
  text-align: center;
}

.intro__text {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.intro__text :deep(strong),
.intro__text :deep(b) {
  color: var(--color-primary);
  font-weight: 700;
}

.category {
  margin-bottom: var(--spacing-xl);
}

.category__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  text-align: left;
  padding-left: 12px;
  border-left: 3px solid var(--color-primary);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-md);
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .hero {
    padding: var(--spacing-md) var(--spacing-md);
    border-radius: var(--radius-lg);
  }

  .hero__title {
    font-size: 1.375rem;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
