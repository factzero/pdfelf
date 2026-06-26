<template>
  <div class="home container">
    <div class="hero">
      <p class="hero__subtitle">{{ $t('home.heroSubtitle') }}</p>
    </div>

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
import ToolCard from '@/components/ToolCard.vue'

const categories = [
  {
    nameKey: 'categories.organize',
    tools: [
      { icon: '🗜️', titleKey: 'tools.compressPdf.title', descKey: 'tools.compressPdf.desc', route: '/compress-pdf' },
      { icon: '🔗', titleKey: 'tools.mergePdf.title', descKey: 'tools.mergePdf.desc', route: '/merge-pdf' },
      { icon: '✂️', titleKey: 'tools.splitPdf.title', descKey: 'tools.splitPdf.desc', route: '/split-pdf' },
      { icon: '🔄', titleKey: 'tools.rotatePdf.title', descKey: 'tools.rotatePdf.desc', route: '/rotate-pdf' },
      { icon: '🗑️', titleKey: 'tools.deletePages.title', descKey: 'tools.deletePages.desc', route: '/delete-pages' },
      { icon: '📋', titleKey: 'tools.extractPages.title', descKey: 'tools.extractPages.desc', route: '/extract-pages' },
      { icon: '🔀', titleKey: 'tools.reorderPages.title', descKey: 'tools.reorderPages.desc', route: '/reorder-pages' },
    ],
  },
  {
    nameKey: 'categories.edit',
    tools: [
      { icon: '🔏', titleKey: 'tools.addWatermark.title', descKey: 'tools.addWatermark.desc', route: '/add-watermark' },
    ],
  },
  {
    nameKey: 'categories.fromPdf',
    tools: [
      { icon: '📄', titleKey: 'tools.pdfToWord.title', descKey: 'tools.pdfToWord.desc', route: '/pdf-to-word' },
      { icon: '📊', titleKey: 'tools.pdfToExcel.title', descKey: 'tools.pdfToExcel.desc', route: '/pdf-to-excel' },
      { icon: '📽️', titleKey: 'tools.pdfToPpt.title', descKey: 'tools.pdfToPpt.desc', route: '/pdf-to-ppt' },
      { icon: '🖼️', titleKey: 'tools.pdfToImage.title', descKey: 'tools.pdfToImage.desc', route: '/pdf-to-image' },
      { icon: '🖼️', titleKey: 'tools.pdfToJpg.title', descKey: 'tools.pdfToJpg.desc', route: '/pdf-to-jpg' },
      { icon: '🖼️', titleKey: 'tools.pdfToPng.title', descKey: 'tools.pdfToPng.desc', route: '/pdf-to-png' },
      { icon: '🖼️', titleKey: 'tools.pdfToTiff.title', descKey: 'tools.pdfToTiff.desc', route: '/pdf-to-tiff' },
      { icon: '📐', titleKey: 'tools.pdfToSvg.title', descKey: 'tools.pdfToSvg.desc', route: '/pdf-to-svg' },
      { icon: '📝', titleKey: 'tools.pdfToText.title', descKey: 'tools.pdfToText.desc', route: '/pdf-to-text' },
      { icon: '🌐', titleKey: 'tools.pdfToHtml.title', descKey: 'tools.pdfToHtml.desc', route: '/pdf-to-html' },
    ],
  },
  {
    nameKey: 'categories.toPdf',
    tools: [
      { icon: '📝', titleKey: 'tools.wordToPdf.title', descKey: 'tools.wordToPdf.desc', route: '/word-to-pdf' },
      { icon: '📊', titleKey: 'tools.excelToPdf.title', descKey: 'tools.excelToPdf.desc', route: '/excel-to-pdf' },
      { icon: '📽️', titleKey: 'tools.pptToPdf.title', descKey: 'tools.pptToPdf.desc', route: '/ppt-to-pdf' },
      { icon: '🖼️', titleKey: 'tools.imageToPdf.title', descKey: 'tools.imageToPdf.desc', route: '/image-to-pdf' },
    ],
  },
  {
    nameKey: 'categories.reader',
    tools: [
      { icon: '📖', titleKey: 'tools.pdfReader.title', descKey: 'tools.pdfReader.desc', route: '/pdf-reader' },
    ],
  },
]
</script>

<style scoped>
.home {
  text-align: center;
}

.hero {
  margin-bottom: var(--spacing-3xl);
}

.hero__icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: var(--spacing-sm);
}

.hero__title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.hero__subtitle {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
}

.category {
  margin-bottom: var(--spacing-3xl);
}

.category__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-lg);
  text-align: left;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-lg);
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .hero__title {
    font-size: 1.5rem;
  }
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
