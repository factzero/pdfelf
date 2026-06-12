<template>
  <div class="home container">
    <div class="hero">
      <h1 class="hero__title">
        <span class="hero__icon">🧝</span>
        PDF Elf
      </h1>
      <p class="hero__subtitle">免费在线 PDF 工具 — 所有处理在浏览器本地完成</p>
    </div>
    <div class="tools-grid">
      <ToolCard
        v-for="tool in tools"
        :key="tool.route"
        :icon="tool.icon"
        :title="tool.title"
        :description="tool.description"
        :route="tool.route"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ToolCard from '@/components/ToolCard.vue'

const tools = [
  {
    icon: '🗜️',
    title: '压缩 PDF',
    description: '减小 PDF 文件大小，基本和强压缩两种模式',
    route: '/compress-pdf',
  },
  {
    icon: '🔗',
    title: '合并 PDF',
    description: '将多个 PDF 合并为一个文件，支持拖拽排序',
    route: '/merge-pdf',
  },
  {
    icon: '✂️',
    title: '分割 PDF',
    description: '按页面范围或每 N 页分割 PDF',
    route: '/split-pdf',
  },
  {
    icon: '📄',
    title: 'PDF 转 Word',
    description: '将 PDF 转换为可编辑的 Word 文档',
    route: '/pdf-to-word',
  },
  {
    icon: '🖼️',
    title: 'PDF 转图片',
    description: '将 PDF 页面导出为 PNG 或 JPEG 图片',
    route: '/pdf-to-image',
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

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-lg);
  max-width: 800px;
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
