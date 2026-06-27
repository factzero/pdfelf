<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('unlock.title') }}</h1>
    <p class="tool-desc">{{ $t('unlock.desc') }}</p>

    <FileDropZone v-if="!selectedFile" :accept="['pdf']" @file-selected="onFileSelected" @error="errorMsg = $event" />

    <div v-if="selectedFile" class="file-preview">
      <div class="file-preview__thumbnail" @mouseenter="showDelete = true" @mouseleave="showDelete = false">
        <img v-if="previewUrl" :src="previewUrl" class="file-preview__canvas" alt="PDF Preview" />
        <div v-else class="file-preview__placeholder">
          <span class="file-preview__placeholder-icon">📄</span>
        </div>
        <Transition name="fade">
          <button v-if="showDelete" class="file-preview__delete" @click="removeFile">✕</button>
        </Transition>
      </div>
      <div class="file-preview__meta">
        <span class="file-preview__name">{{ selectedFile.name }}</span>
        <span class="file-preview__size">{{ $t('common.fileSize', { size: formatFileSize(selectedFile.size) }) }} · {{ $t('common.pages', { n: pageCount }) }}</span>
      </div>
    </div>

    <div v-if="selectedFile" class="options">
      <div class="option-group">
        <label class="option-label">{{ $t('unlock.passwordLabel') }}</label>
        <input v-model="password" type="password" class="option-input" :placeholder="$t('unlock.passwordPlaceholder')" />
      </div>
    </div>

    <div v-if="selectedFile" class="action-card">
      <!-- 处理前：显示按钮 -->
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        :disabled="!password"
        @click="doUnlock"
      >
        {{ $t('unlock.unlockBtn') }}
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
          <p class="result-title">{{ $t('unlock.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <ToolSeoContent ns="unlock" />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, formatFileSize, downloadBlob } from '@/utils/fileUtils'
import { unlockPDF } from '@/services/pdfService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const previewUrl = ref('')
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')
const showDelete = ref(false)
const password = ref('')
let objectUrl: string | null = null

async function onFileSelected(file: File | File[]) {
  const f = Array.isArray(file) ? file[0] : file
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  pageCount.value = 0
  selectedFile.value = f
  outputFilename.value = generateOutputFilename(f.name, 'pdf', 'unlocked')

  try {
    const buffer = await readFileAsArrayBuffer(f)
    const pdf = await pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS }).promise
    pageCount.value = pdf.numPages

    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1)
      const scale = 1.5
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
        if (blob) {
          objectUrl = URL.createObjectURL(blob)
          previewUrl.value = objectUrl
        }
      }
    }
    pdf.cleanup()
  } catch {
    pageCount.value = 0
  }
}

function removeFile() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  selectedFile.value = null
  pageCount.value = 0
  resultBlob.value = null
  errorMsg.value = ''
}

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, outputFilename.value)
}

async function doUnlock() {
  if (!selectedFile.value || !password.value) return
  errorMsg.value = ''
  store.startProcessing(t('unlock.unlocking'))
  try {
    resultBlob.value = await unlockPDF(selectedFile.value, password.value, (p) => store.updateProgress(p))
    store.finishProcessing()
  } catch (e: any) {
    const msg = e.message || ''
    const errMsg = msg.includes('password') || msg.includes('Password') ? t('unlock.wrongPassword') : (e.message || t('unlock.failed'))
    store.setError(errMsg)
    errorMsg.value = errMsg
  }
}

onUnmounted(() => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null } })
</script>

<style scoped>
.tool-page { max-width: 720px; margin: 0 auto; padding: var(--spacing-2xl) var(--spacing-lg); }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }

.file-preview { margin-top: var(--spacing-lg); }
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
.file-preview__placeholder-icon { font-size: 3rem; opacity: 0.3; }
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
.file-preview__delete:hover { background: rgba(0, 0, 0, 0.75); }
.file-preview__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
}
.file-preview__name { font-weight: 600; word-break: break-all; }
.file-preview__size { font-size: 0.85rem; color: var(--color-text-secondary); }

.options { margin-bottom: var(--spacing-xl); }
.option-group { margin-bottom: var(--spacing-lg); }
.option-label { display: block; font-weight: 600; margin-bottom: var(--spacing-xs); }
.option-input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 1rem; box-sizing: border-box; }

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
  margin-bottom: 0;
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

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
