<template>
  <div class="home container">
    <div class="hero">
      <h1 class="hero__title">
        <span class="hero__icon">🧝</span>
        PDF Elf
      </h1>
      <p class="hero__subtitle">免费在线 PDF 工具 — 所有处理在浏览器本地完成</p>
    </div>

    <section v-for="category in categories" :key="category.name" class="category">
      <h2 class="category__title">{{ category.name }}</h2>
      <div class="tools-grid">
        <ToolCard
          v-for="tool in category.tools"
          :key="tool.route"
          :icon="tool.icon"
          :title="tool.title"
          :description="tool.description"
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
    name: '📂 整理 PDF',
    tools: [
      { icon: '🗜️', title: '压缩 PDF', description: '减小 PDF 文件大小，基本和强压缩两种模式', route: '/compress-pdf' },
      { icon: '🔗', title: '合并 PDF', description: '将多个 PDF 合并为一个文件，支持拖拽排序', route: '/merge-pdf' },
      { icon: '✂️', title: '分割 PDF', description: '按页面范围或每 N 页分割 PDF', route: '/split-pdf' },
      { icon: '🔄', title: '旋转 PDF', description: '旋转 PDF 页面，每页独立设置角度', route: '/rotate-pdf' },
      { icon: '🗑️', title: '删除页面', description: '从 PDF 中删除不需要的页面', route: '/delete-pages' },
      { icon: '📋', title: '提取页面', description: '从 PDF 中提取指定页面为新文件', route: '/extract-pages' },
    ],
  },
  {
    name: '✏️ 编辑 PDF',
    tools: [
      { icon: '🔏', title: '添加水印', description: '给 PDF 每一页添加文字水印', route: '/add-watermark' },
    ],
  },
  {
    name: '🔄 从 PDF 转换',
    tools: [
      { icon: '📄', title: 'PDF 转 Word', description: '将 PDF 转换为可编辑的 Word 文档', route: '/pdf-to-word' },
      { icon: '📊', title: 'PDF 转 Excel', description: '将 PDF 转换为 Excel 电子表格', route: '/pdf-to-excel' },
      { icon: '📽️', title: 'PDF 转 PPT', description: '将 PDF 转换为 PowerPoint 演示文稿', route: '/pdf-to-ppt' },
      { icon: '🖼️', title: 'PDF 转图片', description: '将 PDF 页面导出为 PNG 或 JPEG', route: '/pdf-to-image' },
    ],
  },
  {
    name: '📥 转换成 PDF',
    tools: [
      { icon: '📝', title: 'Word 转 PDF', description: '将 Word 文档 (.docx) 转为 PDF', route: '/word-to-pdf' },
      { icon: '📊', title: 'Excel 转 PDF', description: '将 Excel 表格 (.xlsx) 转为 PDF', route: '/excel-to-pdf' },
      { icon: '📽️', title: 'PPT 转 PDF', description: '将 PowerPoint (.pptx) 转为 PDF', route: '/ppt-to-pdf' },
      { icon: '🖼️', title: '图片转 PDF', description: '将图片合并转换为 PDF 文件', route: '/image-to-pdf' },
    ],
  },
  {
    name: '📖 阅读器',
    tools: [
      { icon: '📖', title: 'PDF 阅读器', description: '在浏览器中在线阅读 PDF 文件', route: '/pdf-reader' },
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
