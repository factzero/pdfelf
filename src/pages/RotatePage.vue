<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('rotate.title') }}</h1>
    <p class="tool-desc">{{ $t('rotate.desc') }}</p>
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
        <span v-if="pageCount > 0" class="file-preview__pages">{{ $t('common.pages', { n: pageCount }) }}</span>
      </div>
    </div>

    <!-- 选择旋转页面 -->
    <div v-if="selectedFile && pageCount > 0" class="options">
      <p class="page-info">{{ $t('rotate.selectPages', { n: pageCount }) }}</p>
      <div class="page-grid">
        <div v-for="p in pageCount" :key="p" class="page-item">
          <span class="page-num">{{ $t('common.page', { p }) }}</span>
          <select v-model.number="rotations[p]" class="rotate-select">
            <option :value="0">{{ $t('rotate.noRotation') }}</option>
            <option :value="90">{{ $t('rotate.rotate90') }}</option>
            <option :value="180">{{ $t('rotate.rotate180') }}</option>
            <option :value="270">{{ $t('rotate.rotate270') }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 操作区卡片 -->
    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        @click="rotate"
      >
        {{ $t('rotate.rotateBtn') }}
      </button>

      <div v-if="isProcessing" class="action-card__progress">
        <div class="progress-bar">
          <div class="progress-bar__fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <div class="progress-info">
          <span class="progress-text">{{ progressText }}</span>
          <span class="progress-percent">{{ progress }}%</span>
        </div>
      </div>

      <div v-if="resultBlob" class="action-card__result">
        <div class="result-icon">✅</div>
        <div class="result-body">
          <p class="result-title">{{ $t('rotate.completed') }}</p>
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
import { ref, reactive, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import * as pdfjsLib from 'pdfjs-dist'
import FileDropZone from '@/components/FileDropZone.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { rotatePDF, getPageCount } from '@/services/pdfService'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const previewUrl = ref('')
const showDelete = ref(false)
const rotations = reactive<Record<number, number>>({})
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')
let objectUrl: string | null = null

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function removeFile() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
  selectedFile.value = null
  previewUrl.value = ''
  pageCount.value = 0
  resultBlob.value = null
  errorMsg.value = ''
  showDelete.value = false
}

// 修改旋转角度后自动重置结果，支持再次旋转
watch(() => ({ ...rotations }), () => {
  if (resultBlob.value) {
    resultBlob.value = null
    errorMsg.value = ''
  }
}, { deep: true })

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
  pageCount.value = 0
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'rotated')

  try {
    const buffer = await readFileAsArrayBuffer(selectedFile.value)
    const loadingTask = pdfjsLib.getDocument({ data: buffer })
    const pdf = await loadingTask.promise
    pageCount.value = pdf.numPages

    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1)
      const scale = 0.8
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

    for (let i = 1; i <= pdf.numPages; i++) {
      rotations[i] = 0
    }
  } catch {
    previewUrl.value = ''
    pageCount.value = 0
  }
}

function onError(message: string) {
  errorMsg.value = message
}

async function rotate() {
  if (!selectedFile.value) return
  const rotationMap = new Map<number, number>()
  for (const [p, angle] of Object.entries(rotations)) {
    if (angle > 0) rotationMap.set(Number(p), angle)
  }
  if (rotationMap.size === 0) {
    errorMsg.value = t('rotate.noSelection')
    return
  }
  errorMsg.value = ''
  store.startProcessing(t('rotate.rotating'))
  try {
    const blob = await rotatePDF(selectedFile.value, rotationMap, (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.setError(msg)
    errorMsg.value = msg || t('rotate.failed')
  }
}

function downloadResult() {
  if (resultBlob.value) {
    downloadBlob(resultBlob.value, outputFilename.value)
  }
}
</script>

<style scoped>
.tool-page { max-width: 640px; margin: 0 auto; }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); font-size: 0.875rem; }

/* ===== 文件预览缩略图 ===== */
.file-preview { margin-top: var(--spacing-md); }
.file-preview__thumbnail {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 140px;
}
.file-preview__canvas {
  display: block;
  width: 100%;
  max-height: 140px;
  object-fit: contain;
  background: #fff;
}
.file-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  background: #fff;
  width: 100%;
}
.file-preview__placeholder-icon { font-size: 2rem; opacity: 0.3; }
.file-preview__delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.file-preview__delete:hover { background: rgba(220, 38, 38, 0.85); }
.file-preview__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  flex-wrap: wrap;
}
.file-preview__name { font-weight: 600; font-size: 0.875rem; color: var(--color-text); word-break: break-all; }
.file-preview__size { font-size: 0.75rem; color: var(--color-text-muted); }
.file-preview__pages {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.options { margin-top: var(--spacing-lg); }
.page-info { font-size: 0.8125rem; font-weight: 600; margin-bottom: var(--spacing-md); }
.page-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--spacing-sm);
  max-height: 220px;
  overflow-y: auto;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}
.page-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.page-num { font-size: 0.875rem; font-weight: 500; color: var(--color-text); white-space: nowrap; flex-shrink: 0; }
.rotate-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  cursor: pointer;
}

/* ===== 操作区卡片 ===== */
.action-card {
  margin-top: var(--spacing-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}
.btn--large { display: block; width: 100%; padding: var(--spacing-sm) var(--spacing-md); font-size: 0.9375rem; border: none; cursor: pointer; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

.action-card__progress { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.progress-bar { width: 100%; height: 6px; background: var(--color-bg-tertiary); border-radius: 3px; overflow: hidden; }
.progress-bar__fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), #60a5fa); border-radius: 3px; transition: width 0.3s ease; }
.progress-info { display: flex; justify-content: space-between; }
.progress-text { font-size: 0.8125rem; color: var(--color-text-secondary); }
.progress-percent { font-size: 0.8125rem; font-weight: 600; color: var(--color-primary); }

.action-card__result { display: flex; align-items: center; gap: var(--spacing-md); }
.result-icon { font-size: 1.5rem; flex-shrink: 0; }
.result-body { flex: 1; min-width: 0; }
.result-title { font-weight: 700; font-size: 1rem; }
.result-filename { font-size: 0.75rem; color: var(--color-text-muted); word-break: break-all; margin-top: 2px; }
.result-download-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: 0.875rem;
}

.error { margin-top: var(--spacing-sm); color: var(--color-error); font-size: 0.8125rem; text-align: center; }
</style>
