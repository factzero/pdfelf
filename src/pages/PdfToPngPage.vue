<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('pdfToPng.title') }}</h1>
    <p class="tool-desc">{{ $t('pdfToPng.desc') }}</p>

    <FileDropZone
      v-if="!selectedFile"
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />

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
        <span class="file-preview__size">{{ formatFileSize(selectedFile.size) }}</span>
        <span v-if="totalPages > 0" class="file-preview__pages">{{ $t('common.pages', { n: totalPages }) }}</span>
      </div>
    </div>

    <div v-if="selectedFile" class="options">
      <div class="option-group">
        <label class="option-label">{{ $t('pdfToPng.resolution') }}</label>
        <div class="option-row">
          <label v-for="d in dpiOptions" :key="d" class="option-chip">
            <input type="radio" :value="d" v-model.number="dpi" />
            <span>{{ d }} DPI</span>
          </label>
        </div>
      </div>
    </div>

    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        @click="convert"
      >
        {{ $t('pdfToPng.convertBtn') }}
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
          <p class="result-title">{{ $t('pdfToPng.completed') }}</p>
          <div class="result-compare">
            <span class="result-compare__item">
              <span class="result-compare__label">{{ $t('pdfToPng.before') }}</span>
              <span class="result-compare__value">{{ originalSize }}</span>
            </span>
            <span class="result-compare__arrow">→</span>
            <span class="result-compare__item">
              <span class="result-compare__label">{{ $t('pdfToPng.after') }}</span>
              <span class="result-compare__value result-compare__value--highlight">{{ resultSize }}</span>
            </span>
          </div>
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
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FileDropZone from '@/components/FileDropZone.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { pdfToImage } from '@/services/imageService'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'

const { t } = useI18n()
const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const dpiOptions = [72, 150, 300]
const selectedFile = ref<File | null>(null)
const dpi = ref(150)
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

const originalSize = computed(() => selectedFile.value ? formatFileSize(selectedFile.value.size) : '')
const resultSize = computed(() => resultBlob.value ? formatFileSize(resultBlob.value.size) : '')

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, outputFilename.value)
}

watch(dpi, () => { resultBlob.value = null; errorMsg.value = '' })

function removeFile() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = null
  previewUrl.value = ''
  totalPages.value = 0
  resultBlob.value = null
  errorMsg.value = ''
  showDelete.value = false
}

onUnmounted(() => {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
})

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  totalPages.value = 0
  selectedFile.value = file as File

  try {
    const buffer = await readFileAsArrayBuffer(selectedFile.value)
    const loadingTask = pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS })
    const pdf = await loadingTask.promise
    totalPages.value = pdf.numPages

    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
        if (blob) { objectUrl = URL.createObjectURL(blob); previewUrl.value = objectUrl }
      }
    }
  } catch {
    previewUrl.value = ''
    totalPages.value = 0
  }
}

function onError(message: string) { errorMsg.value = message }

async function convert() {
  if (!selectedFile.value) return
  store.startProcessing(t('pdfToPng.converting'))
  try {
    const result = await pdfToImage(selectedFile.value, 'png', dpi.value, (p) => store.updateProgress(p))
    resultBlob.value = result.blob
    outputFilename.value = result.isSingle
      ? generateOutputFilename(selectedFile.value.name, 'png', 'png')
      : generateOutputFilename(selectedFile.value.name, 'zip', 'png')
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('pdfToPng.failed'))
    errorMsg.value = t('pdfToPng.failed')
  }
}
</script>

<style scoped>
.tool-page { max-width: 640px; margin: 0 auto; }
.tool-title { font-size: 1.75rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }
.file-preview { margin-top: var(--spacing-lg); }
.file-preview__thumbnail { position: relative; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; background: var(--color-bg-tertiary); cursor: pointer; }
.file-preview__canvas { display: block; width: 100%; max-height: 300px; object-fit: contain; background: #fff; }
.file-preview__placeholder { display: flex; align-items: center; justify-content: center; height: 200px; background: #fff; }
.file-preview__placeholder-icon { font-size: 3rem; opacity: 0.3; }
.file-preview__delete { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.file-preview__delete:hover { background: rgba(220,38,38,0.85); }
.file-preview__meta { display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-sm); flex-wrap: wrap; }
.file-preview__name { font-weight: 600; color: var(--color-text); word-break: break-all; }
.file-preview__size { font-size: 0.8125rem; color: var(--color-text-muted); }
.file-preview__pages { font-size: 0.8125rem; color: var(--color-text-secondary); background: var(--color-bg-tertiary); padding: 2px 10px; border-radius: var(--radius-sm); white-space: nowrap; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.options { margin-top: var(--spacing-lg); }
.option-group { margin-bottom: var(--spacing-md); }
.option-label { display: block; font-size: 0.875rem; font-weight: 600; color: var(--color-text); margin-bottom: var(--spacing-sm); }
.option-row { display: flex; gap: var(--spacing-sm); }
.option-chip { display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-sm) var(--spacing-md); border: 2px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); cursor: pointer; font-size: 0.875rem; font-weight: 500; color: var(--color-text-secondary); transition: all var(--transition-fast); }
.option-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.option-chip:has(input:checked) { border-color: var(--color-primary); background: var(--color-primary); color: #fff; }
.option-chip input[type='radio'] { display: none; }
.action-card { margin-top: var(--spacing-xl); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-xl); }
.btn--large { display: block; width: 100%; padding: var(--spacing-md); font-size: 1rem; border: none; cursor: pointer; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.action-card__progress { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.progress-bar { width: 100%; height: 8px; background: var(--color-bg-tertiary); border-radius: 4px; overflow: hidden; }
.progress-bar__fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), #60a5fa); border-radius: 4px; transition: width 0.3s ease; }
.progress-info { display: flex; justify-content: space-between; }
.progress-text { font-size: 0.875rem; color: var(--color-text-secondary); }
.progress-percent { font-size: 0.875rem; font-weight: 600; color: var(--color-primary); }
.action-card__result { display: flex; align-items: center; gap: var(--spacing-lg); }
.result-icon { font-size: 2rem; flex-shrink: 0; }
.result-body { flex: 1; min-width: 0; }
.result-title { font-weight: 700; font-size: 1.125rem; margin-bottom: var(--spacing-sm); }
.result-compare { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; margin-bottom: var(--spacing-sm); }
.result-compare__item { display: flex; flex-direction: column; background: var(--color-bg-secondary); padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-sm); }
.result-compare__label { font-size: 0.6875rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.result-compare__value { font-weight: 600; font-size: 0.9375rem; }
.result-compare__value--highlight { color: var(--color-primary); }
.result-compare__arrow { color: var(--color-text-muted); font-size: 1.25rem; }
.result-filename { font-size: 0.8125rem; color: var(--color-text-muted); word-break: break-all; }
.result-download-btn { flex-shrink: 0; display: inline-flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-lg); font-size: 0.9375rem; }
.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
</style>
