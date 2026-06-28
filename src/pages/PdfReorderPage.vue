<template>
  <div class="tool-page container">
    <h1 class="tool-title"><ArrowLeftRight :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('reorder.title') }}</h1>
    <p class="tool-desc">{{ $t('reorder.desc') }}</p>

    <FileDropZone
      v-if="!selectedFile"
      :accept="['pdf']"
      :multiple="false"
      @file-selected="onFileSelected"
      @error="onFileError"
    />

    <template v-else>
      <!-- 文件预览 -->
      <div class="file-preview">
        <div
          class="file-preview__thumbnail pdf-thumb"
          @mouseenter="showDelete = true"
          @mouseleave="showDelete = false"
        >
          <FileText :size="48" :stroke-width="1" class="file-preview__icon" />
          <Transition name="fade">
            <button v-if="showDelete" class="file-preview__delete" @click="removeFile">✕</button>
          </Transition>
        </div>
        <div class="file-preview__meta">
          <p class="file-preview__name">{{ selectedFile.name }}</p>
          <p class="file-preview__size">
            {{ $t('common.fileSize', { size: formatSize(selectedFile.size) }) }}
            · {{ $t('common.pages', { n: totalPages }) }}
          </p>
        </div>
      </div>

      <!-- 页面缩略图网格 - 拖拽排序 -->
      <div v-if="!toolStore.isProcessing && !resultBlob" class="reorder-section">
        <p class="reorder-hint">{{ $t('reorder.dragHint') }}</p>
        <div class="pages-panel">
        <div class="pages-grid">
          <div
            v-for="(page, index) in pageThumbs"
            :key="page.id"
            class="page-card"
            :class="{
              'page-card--dragging': dragIndex === index,
              'page-card--drop-target': dropTarget === index,
            }"
            draggable="true"
            @dragstart="onDragStart(index)"
            @dragover.prevent="onDragOver(index)"
            @dragleave="onDragLeave"
            @drop="onDrop(index)"
            @dragend="onDragEnd"
          >
            <div class="page-card__number">{{ $t('common.page', { p: page.originalNum + 1 }) }}</div>
            <img
              v-if="page.dataUrl"
              :src="page.dataUrl"
              class="page-card__thumb"
              :alt="'Page ' + (page.originalNum + 1)"
            />
            <div v-else class="page-card__loading">{{ $t('common.loading') }}</div>
          </div>
        </div>
        </div>
      </div>

      <!-- 操作区 -->
      <div v-if="!resultBlob && !errorMsg" class="action-card">
        <button
          v-if="!toolStore.isProcessing"
          class="btn btn--primary btn--lg"
          :disabled="pageThumbs.length === 0"
          @click="reorder"
        >
          {{ $t('reorder.reorderBtn') }}
        </button>

        <div v-if="toolStore.isProcessing" class="progress-section">
          <ProgressBar :visible="true" :percent="toolStore.progress" :text="toolStore.progressText" />
        </div>
      </div>

      <!-- 结果 -->
      <div v-if="resultBlob" class="result-card">
        <div class="result-card__icon">✅</div>
        <p class="result-card__title">{{ $t('reorder.completed') }}</p>
        <p class="result-card__desc">{{ resultFilename }}</p>
        <button class="btn btn--primary btn--lg" @click="download">
          {{ $t('common.downloadFile') }}
        </button>
        <p class="result-card__note">{{ $t('reorder.note') }}</p>
      </div>

      <!-- 错误 -->
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </template>
    <ToolSeoContent :ns="'reorder'" />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeftRight, FileText } from 'lucide-vue-next'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { reorderPdf } from '@/services/reorderService'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import { useToolStore } from '@/stores/toolStore'
import { formatFileSize } from '@/utils/fileUtils'

const { t } = useI18n()
const toolStore = useToolStore()

// 页面缩略图数据
interface PageThumb {
  id: number
  originalNum: number // 原始页码 (0-based)
  dataUrl: string
}

const selectedFile = ref<File | null>(null)
const showDelete = ref(false)
const pageThumbs = ref<PageThumb[]>([])
const totalPages = ref(0)
const resultBlob = ref<Blob | null>(null)
const resultFilename = ref('')
const errorMsg = ref('')

// 拖拽状态
const dragIndex = ref<number | null>(null)
const dropTarget = ref<number | null>(null)

// 预览 URL 缓存，用于清理
const objectUrls: string[] = []

function formatSize(bytes: number): string {
  return formatFileSize(bytes)
}

function onFileError(msg: string) {
  errorMsg.value = msg
}

async function onFileSelected(file: File | File[]) {
  const f = Array.isArray(file) ? file[0] : file
  removeFile()
  selectedFile.value = f
  errorMsg.value = ''

  try {
    const buffer = await f.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS })
    const pdf = await loadingTask.promise
    totalPages.value = pdf.numPages

    // 按原始顺序生成缩略图
    pageThumbs.value = []
    for (let i = 0; i < pdf.numPages; i++) {
      pageThumbs.value.push({
        id: i,
        originalNum: i,
        dataUrl: '',
      })
    }

    // 异步渲染缩略图
    for (let i = 0; i < pdf.numPages; i++) {
      const thumb = await renderThumb(pdf, i)
      pageThumbs.value[i].dataUrl = thumb
    }
  } catch (e) {
    console.error(e)
    errorMsg.value = t('common.fileReadFailed')
    selectedFile.value = null
  }
}

async function renderThumb(pdf: any, pageIndex: number): Promise<string> {
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale: 0.4 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise

  const url = canvas.toDataURL('image/png')
  objectUrls.push(url)
  return url
}

function removeFile() {
  // 清理 data URL
  for (const url of objectUrls) {
    URL.revokeObjectURL(url)
  }
  objectUrls.length = 0

  selectedFile.value = null
  showDelete.value = false
  pageThumbs.value = []
  totalPages.value = 0
  resultBlob.value = null
  resultFilename.value = ''
  errorMsg.value = ''
  toolStore.reset()
}

// ===== 拖拽排序 =====

function onDragStart(index: number) {
  dragIndex.value = index
}

function onDragOver(index: number) {
  dropTarget.value = index
}

function onDragLeave() {
  dropTarget.value = null
}

function onDragEnd() {
  dragIndex.value = null
  dropTarget.value = null
}

function onDrop(targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) {
    dragIndex.value = null
    dropTarget.value = null
    return
  }

  const items = [...pageThumbs.value]
  const [moved] = items.splice(dragIndex.value, 1)
  items.splice(targetIndex, 0, moved)
  pageThumbs.value = items

  dragIndex.value = null
  dropTarget.value = null
  // 顺序改变后清除之前的转换结果
  resultBlob.value = null
}

// ===== 重排序 =====

async function reorder() {
  if (!selectedFile.value || pageThumbs.value.length === 0) return
  errorMsg.value = ''
  resultBlob.value = null

  toolStore.startProcessing(t('reorder.reordering'))

  try {
    const newOrder = pageThumbs.value.map(p => p.originalNum)
    const blob = await reorderPdf(selectedFile.value, newOrder, (pct) => {
      toolStore.updateProgress(pct)
    })

    resultBlob.value = blob
    const baseName = selectedFile.value.name.replace(/\.pdf$/i, '')
    resultFilename.value = `${baseName}_reordered.pdf`
  } catch (e) {
    console.error(e)
    errorMsg.value = t('reorder.failed')
  } finally {
    toolStore.finishProcessing()
  }
}

function download() {
  if (!resultBlob.value) return
  const url = URL.createObjectURL(resultBlob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = resultFilename.value
  a.click()
  URL.revokeObjectURL(url)
}

onUnmounted(() => {
  for (const url of objectUrls) {
    URL.revokeObjectURL(url)
  }
})
</script>

<style scoped>
.reorder-section {
  margin-top: var(--spacing-lg);
}

.reorder-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.pages-panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #fafbfc;
  padding: var(--spacing-md);
}

.pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-md);
}

.page-card {
  position: relative;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: grab;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  background: #fff;
}

.page-card:active {
  cursor: grabbing;
}

.page-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-card--dragging {
  opacity: 0.4;
  transform: scale(0.95);
}

.page-card--drop-target {
  border-color: var(--color-primary);
  border-style: dashed;
  box-shadow: 0 0 0 2px var(--color-primary-light, #6366f133);
}

.page-card__number {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  z-index: 1;
  pointer-events: none;
}

.page-card__thumb {
  width: 100%;
  display: block;
  aspect-ratio: 3 / 4;
  object-fit: contain;
  background: #f3f4f6;
}

.page-card__loading {
  width: 100%;
  aspect-ratio: 3 / 4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 12px;
  background: #f3f4f6;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #fff;
}

.file-preview__thumbnail {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.pdf-thumb {
  position: relative;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

/* fade transition for delete button */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.file-preview__delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.file-preview__delete:hover {
  background: rgba(220, 38, 38, 0.85);
}

.file-preview__icon {
  font-size: 28px;
}

.file-preview__meta {
  flex: 1;
  min-width: 0;
}

.file-preview__name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-preview__size {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.action-card {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: center;
}

.progress-section {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.progress-text {
  margin-top: var(--spacing-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
}

.result-card {
  margin-top: var(--spacing-lg);
  text-align: center;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #fff;
}

.result-card__icon {
  font-size: 36px;
  margin-bottom: var(--spacing-sm);
}

.result-card__title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.result-card__desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  word-break: break-all;
}

.result-card__note {
  margin-top: var(--spacing-sm);
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.2s, opacity 0.2s;
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.btn--primary:hover {
  opacity: 0.9;
}

.btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--lg {
  padding: 12px 32px;
  font-size: 16px;
}

.error {
  margin-top: var(--spacing-md);
  color: #ef4444;
  font-size: 14px;
  text-align: center;
}

.tool-page {
  max-width: 880px;
  margin: 0 auto;
}

.tool-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  text-align: center;
}

.tool-desc {
  font-size: 15px;
  color: var(--color-text-secondary);
  text-align: center;
  margin-bottom: var(--spacing-lg);
}
</style>
