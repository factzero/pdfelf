<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('pdfToWord.title') }}</h1>
    <p class="tool-desc">{{ $t('pdfToWord.desc') }}</p>

    <!-- 上传区：未选文件时显示 -->
    <FileDropZone
      v-if="!selectedFile"
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />

    <!-- 已选文件预览区 -->
    <div v-if="selectedFile" class="file-preview">
      <div class="file-preview__thumbnail" @mouseenter="showDelete = true" @mouseleave="showDelete = false">
        <img v-if="previewUrl" :src="previewUrl" class="file-preview__canvas" alt="PDF Preview" />
        <div v-else class="file-preview__placeholder">
          <span class="file-preview__placeholder-icon">📄</span>
        </div>
        <Transition name="fade">
          <button
            v-if="showDelete"
            class="file-preview__delete"
            @click="removeFile"
          >
            ✕
          </button>
        </Transition>
      </div>
      <div class="file-preview__meta">
        <span class="file-preview__name">{{ selectedFile.name }}</span>
        <span class="file-preview__size">{{ formatFileSize(selectedFile.size) }}</span>
        <span v-if="totalPages > 0" class="file-preview__pages">{{ $t('common.pages', { n: totalPages }) }}</span>
      </div>
    </div>

    <!-- 操作区：按钮 / 进度 / 结果 整合在一张卡片里 -->
    <div v-if="selectedFile" class="action-card">
      <!-- 处理前：显示按钮 -->
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        @click="convert"
      >
        {{ $t('pdfToWord.convertBtn') }}
      </button>

      <!-- 处理中：进度条替代按钮 -->
      <div v-if="isProcessing" class="action-card__progress">
        <div class="progress-bar">
          <div class="progress-bar__fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <div class="progress-info">
          <span class="progress-text">{{ progressText }}</span>
          <span class="progress-percent">{{ progress }}%</span>
        </div>
      </div>

      <!-- 处理完成：结果卡片 -->
      <div v-if="resultBlob" class="action-card__result">
        <div class="result-icon">✅</div>
        <div class="result-body">
          <p class="result-title">{{ $t('pdfToWord.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FileDropZone from '@/components/FileDropZone.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { pdfToWord } from '@/services/wordService'
import * as pdfjsLib from 'pdfjs-dist'

// Use bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const { t } = useI18n()
const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')
const previewUrl = ref('')
const totalPages = ref(0)
const showDelete = ref(false)
let objectUrl: string | null = null

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function downloadResult() {
  if (resultBlob.value) {
    downloadBlob(resultBlob.value, outputFilename.value)
  }
}

function removeFile() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
  selectedFile.value = null
  previewUrl.value = ''
  totalPages.value = 0
  resultBlob.value = null
  errorMsg.value = ''
  showDelete.value = false
}

onUnmounted(() => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
})

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
  previewUrl.value = ''
  totalPages.value = 0
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(
    selectedFile.value.name,
    'docx',
    'converted'
  )

  try {
    const buffer = await readFileAsArrayBuffer(selectedFile.value)
    const loadingTask = pdfjsLib.getDocument({ data: buffer })
    const pdf = await loadingTask.promise
    totalPages.value = pdf.numPages

    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1)
      const scale = 1.5
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png')
        })
        if (blob) {
          objectUrl = URL.createObjectURL(blob)
          previewUrl.value = objectUrl
        }
      }
    }
  } catch {
    previewUrl.value = ''
    totalPages.value = 0
  }
}

function onError(message: string) {
  errorMsg.value = message
}

async function convert() {
  if (!selectedFile.value) return
  store.startProcessing(t('pdfToWord.converting'))
  try {
    const blob = await pdfToWord(
      selectedFile.value,
      (p) => store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('pdfToWord.failed'))
    errorMsg.value = t('pdfToWord.failed')
  }
}
</script>

<style scoped>
.tool-page {
  max-width: 640px;
  margin: 0 auto;
}

.tool-title {
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--spacing-sm);
}

.tool-desc {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.file-preview {
  margin-top: var(--spacing-lg);
}

.file-preview__thumbnail {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-tertiary);
  cursor: pointer;
}

.file-preview__canvas {
  display: block;
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  background: #fff;
}

.file-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: #fff;
}

.file-preview__placeholder-icon {
  font-size: 3rem;
  opacity: 0.3;
}

.file-preview__delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.file-preview__delete:hover {
  background: rgba(220, 38, 38, 0.85);
}

.file-preview__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  flex-wrap: wrap;
}

.file-preview__name {
  font-weight: 600;
  color: var(--color-text);
  word-break: break-all;
}

.file-preview__size {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.file-preview__pages {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

/* Delete button fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ====== 操作区卡片 ====== */
.action-card {
  margin-top: var(--spacing-xl);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
}

.btn--large {
  display: block;
  width: 100%;
  padding: var(--spacing-md);
  font-size: 1rem;
  border: none;
  cursor: pointer;
}

.btn--primary {
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: background var(--transition-fast);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 进度条（内嵌版） */
.action-card__progress {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #60a5fa);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.progress-percent {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
}

/* 结果区 */
.action-card__result {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.result-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.result-body {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 700;
  font-size: 1.125rem;
  margin-bottom: var(--spacing-sm);
}

.result-filename {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  word-break: break-all;
}

.result-download-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: 0.9375rem;
}

.error {
  margin-top: var(--spacing-md);
  color: var(--color-error);
  font-size: 0.875rem;
  text-align: center;
}
</style>
