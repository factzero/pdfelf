<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('headerFooter.title') }}</h1>
    <p class="tool-desc">{{ $t('headerFooter.desc') }}</p>

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

    <div v-if="selectedFile" class="options">
      <div class="form-group">
        <label class="form-label">{{ $t('headerFooter.headerText') }}</label>
        <input v-model="headerText" type="text" class="form-input" :placeholder="$t('headerFooter.headerPlaceholder')" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('headerFooter.headerAlign') }}</label>
          <select v-model="headerAlign" class="form-input">
            <option value="left">{{ $t('headerFooter.alignLeft') }}</option>
            <option value="center">{{ $t('headerFooter.alignCenter') }}</option>
            <option value="right">{{ $t('headerFooter.alignRight') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('headerFooter.fontSize') }}</label>
          <input v-model.number="fontSize" type="number" class="form-input" min="8" max="36" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('headerFooter.font') }}</label>
          <select v-model="font" class="form-input">
            <option value="Helvetica">{{ $t('headerFooter.fontHelvetica') }}</option>
            <option value="Times Roman">{{ $t('headerFooter.fontTimes') }}</option>
            <option value="Courier">{{ $t('headerFooter.fontCourier') }}</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">{{ $t('headerFooter.footerText') }}</label>
        <input v-model="footerText" type="text" class="form-input" :placeholder="$t('headerFooter.footerPlaceholder')" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('headerFooter.footerAlign') }}</label>
          <select v-model="footerAlign" class="form-input">
            <option value="left">{{ $t('headerFooter.alignLeft') }}</option>
            <option value="center">{{ $t('headerFooter.alignCenter') }}</option>
            <option value="right">{{ $t('headerFooter.alignRight') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('headerFooter.margin') }} (pt)</label>
          <input v-model.number="margin" type="number" class="form-input" min="10" max="80" />
        </div>
      </div>
    </div>

    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        :disabled="!headerText.trim() && !footerText.trim()"
        @click="process"
      >
        {{ $t('headerFooter.addBtn') }}
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
          <p class="result-title">{{ $t('headerFooter.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'headerFooter'" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { addHeaderFooter as addHeaderFooterService } from '@/services/pdfService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const previewUrl = ref('')
const showDelete = ref(false)
const headerText = ref('')
const footerText = ref('')
const headerAlign = ref<string>('center')
const footerAlign = ref<string>('center')
const fontSize = ref(12)
const font = ref<string>('Helvetica')
const margin = ref(28)
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
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = null
  previewUrl.value = ''
  pageCount.value = 0
  resultBlob.value = null
  errorMsg.value = ''
  showDelete.value = false
}

watch([headerText, footerText, headerAlign, footerAlign, fontSize, font, margin], () => {
  if (resultBlob.value) { resultBlob.value = null; errorMsg.value = '' }
})

onUnmounted(() => {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
})

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  pageCount.value = 0
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'header-footer')
  try {
    const buffer = await readFileAsArrayBuffer(selectedFile.value)
    const pdf = await pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS }).promise
    pageCount.value = pdf.numPages
    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 0.8 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png')
        })
        if (blob) { objectUrl = URL.createObjectURL(blob); previewUrl.value = objectUrl }
      }
    }
  } catch { previewUrl.value = ''; pageCount.value = 0 }
}

function onError(message: string) { errorMsg.value = message }

function downloadResult() {
  if (resultBlob.value) { downloadBlob(resultBlob.value, outputFilename.value) }
}

async function process() {
  if (!selectedFile.value) return
  if (!headerText.value.trim() && !footerText.value.trim()) return
  errorMsg.value = ''
  store.startProcessing(t('headerFooter.adding'))
  try {
    const blob = await addHeaderFooterService(
      selectedFile.value,
      {
        headerText: headerText.value,
        footerText: footerText.value,
        fontSize: fontSize.value,
        font: font.value as any,
        headerAlign: headerAlign.value as any,
        footerAlign: footerAlign.value as any,
        margin: margin.value,
      },
      (p) => store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.setError(msg)
    errorMsg.value = msg || t('headerFooter.failed')
  }
}
</script>

<style scoped>
.tool-page { max-width: 880px; margin: 0 auto; }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); font-size: 0.875rem; }
.file-preview { margin-top: var(--spacing-md); }
.file-preview__thumbnail {
  position: relative; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); overflow: hidden;
  background: var(--color-bg-tertiary); cursor: pointer;
  max-height: 160px; display: flex; align-items: center; justify-content: center;
}
.file-preview__canvas { display: block; width: 100%; max-height: 160px; object-fit: contain; background: #fff; }
.file-preview__placeholder { display: flex; align-items: center; justify-content: center; height: 110px; background: #fff; width: 100%; }
.file-preview__placeholder-icon { font-size: 2rem; opacity: 0.3; }
.file-preview__delete {
  position: absolute; top: 6px; right: 6px; width: 28px; height: 28px;
  border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff;
  font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.file-preview__delete:hover { background: rgba(220,38,38,0.85); }
.file-preview__meta { display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-sm); flex-wrap: wrap; }
.file-preview__name { font-weight: 600; font-size: 0.875rem; color: var(--color-text); word-break: break-all; }
.file-preview__size { font-size: 0.75rem; color: var(--color-text-muted); }
.file-preview__pages { font-size: 0.75rem; color: var(--color-text-secondary); background: var(--color-bg-tertiary); padding: 1px 8px; border-radius: var(--radius-sm); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.options { margin-top: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { flex: 1; }
.form-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.form-input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.875rem; background: var(--color-bg); box-sizing: border-box; }
.form-input:focus { outline: none; border-color: var(--color-primary); }
.form-row { display: flex; gap: var(--spacing-md); }
.action-card { margin-top: var(--spacing-lg); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); }
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
.result-title { font-weight: 700; font-size: 1rem; margin-bottom: 2px; }
.result-filename { font-size: 0.75rem; color: var(--color-text-muted); word-break: break-all; }
.result-download-btn { flex-shrink: 0; display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-md); font-size: 0.875rem; }
.error { margin-top: var(--spacing-sm); color: var(--color-error); font-size: 0.8125rem; text-align: center; }
</style>
