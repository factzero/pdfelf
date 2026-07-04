<template>
  <div class="tool-page container">
    <h1 class="tool-title"><ScanText :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('ocrPdf.title') }}</h1>
    <p class="tool-desc">{{ $t('ocrPdf.desc') }}</p>

    <FileDropZone v-if="!selectedFile" :accept="['pdf']" @file-selected="onFileSelected" @error="errorMsg = String($event)" />

    <div v-if="selectedFile && !isProcessing && !resultText" class="file-preview">
      <div class="file-preview__thumbnail" @mouseenter="showDelete = true" @mouseleave="showDelete = false">
        <img v-if="previewUrl" :src="previewUrl" class="file-preview__canvas" alt="PDF Preview" />
        <div v-else class="file-preview__placeholder">
          <FileText :size="48" :stroke-width="1" class="file-preview__placeholder-icon" />
        </div>
        <Transition name="fade">
          <button v-if="showDelete" class="file-preview__delete" @click="removeFile">✕</button>
        </Transition>
      </div>
      <div class="file-preview__meta">
        <span class="file-preview__name">{{ selectedFile.name }}</span>
        <span class="file-preview__size">{{ $t('common.fileSize', { size: formatFileSize(selectedFile.size) }) }}</span>
      </div>

      <div class="ocr-options">
        <div class="ocr-options__label">{{ $t('ocrPdf.languageLabel') }}</div>
        <div class="ocr-options__radios">
          <label v-for="l in languages" :key="l.value" class="ocr-radio" :class="{ 'ocr-radio--active': ocrLanguage === l.value }">
            <input type="radio" :value="l.value" v-model="ocrLanguage" />
            <span class="ocr-radio__dot"></span>
            <span class="ocr-radio__label">{{ l.label }}</span>
          </label>
        </div>
      </div>
    </div>

    <div v-if="selectedFile && !isProcessing && !resultText" class="action-card">
      <p v-if="hintText" class="action-hint">{{ hintText }}</p>
      <button class="btn btn--primary btn--large" @click="doOcr" :disabled="loadingLang">
        {{ loadingLang ? $t('ocrPdf.loadingLang') : $t('ocrPdf.startBtn') }}
      </button>
    </div>

    <div v-if="selectedFile && isProcessing" class="action-card">
      <div class="action-card__progress">
        <div class="progress-bar">
          <div class="progress-bar__fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <div class="progress-info">
          <span class="progress-text">{{ progressText }}</span>
          <span class="progress-percent">{{ progress }}%</span>
        </div>
      </div>
    </div>

    <div v-if="selectedFile && resultText" class="action-card">
      <div class="action-card__result ocr-result">
        <div class="result-icon">✅</div>
        <div class="result-body">
          <p class="result-title">{{ $t('ocrPdf.completed') }}</p>
          <p class="result-confidence">
            {{ $t('ocrPdf.confidence') }}: {{ resultConfidence }}%
          </p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadText">
          {{ $t('ocrPdf.downloadTxt') }}
        </button>
      </div>
      <details class="ocr-result__details">
        <summary class="ocr-result__summary">{{ $t('ocrPdf.previewText') }} ({{ textCharCount }} {{ $t('ocrPdf.chars') }})</summary>
        <pre class="ocr-result__text">{{ resultText }}</pre>
      </details>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <div v-if="selectedFile && resultText" class="action-card" style="margin-top: 16px;">
      <button class="btn btn--secondary btn--large" @click="resetAndReDo">
        {{ $t('ocrPdf.reOcr') }}
      </button>
    </div>
    <ToolSeoContent ns="ocrPdf" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, ScanText } from 'lucide-vue-next'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import { readFileAsArrayBuffer, formatFileSize } from '@/utils/fileUtils'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { ocrPdf } from '@/services/ocrService'
import type { OcrLanguage } from '@/services/ocrService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const resultText = ref('')
const resultConfidence = ref(0)
const errorMsg = ref('')
const showDelete = ref(false)
const loadingLang = ref(false)
const hintText = ref('')

let objectUrl: string | null = null

const ocrLanguage = ref<OcrLanguage>('eng+chi_sim')

const languages = computed(() => [
  { value: 'eng+chi_sim' as OcrLanguage, label: t('ocrPdf.langBoth') },
  { value: 'eng' as OcrLanguage, label: t('ocrPdf.langEng') },
  { value: 'chi_sim' as OcrLanguage, label: t('ocrPdf.langChs') },
])

const textCharCount = computed(() => resultText.value.length)

async function onFileSelected(file: File | File[]) {
  const f = Array.isArray(file) ? file[0] : file
  resetState()
  selectedFile.value = f
  loadingLang.value = true
  hintText.value = t('ocrPdf.loadingHint')

  // 生成预览图
  try {
    const buffer = await readFileAsArrayBuffer(f)
    const pdf = await pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS }).promise
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
  } catch { /* ignore */ }

  loadingLang.value = false
  hintText.value = ''
}

function resetState() {
  errorMsg.value = ''
  resultText.value = ''
  resultConfidence.value = 0
  hintText.value = ''
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
}

function removeFile() {
  resetState()
  selectedFile.value = null
}

function resetAndReDo() {
  resultText.value = ''
  resultConfidence.value = 0
  errorMsg.value = ''
}

function downloadText() {
  if (!resultText.value || !selectedFile.value) return
  const blob = new Blob([resultText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = selectedFile.value.name.replace(/\.[^.]+$/, '') + '_ocr.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function doOcr() {
  if (!selectedFile.value) return
  errorMsg.value = ''
  store.startProcessing(t('ocrPdf.starting'))

  try {
    const result = await ocrPdf(
      selectedFile.value,
      ocrLanguage.value,
      (pct) => store.updateProgress(pct),
      (status) => store.updateProgress(progress.value, status)
    )

    resultText.value = result.fullText
    resultConfidence.value = result.totalConfidence
    store.finishProcessing(t('ocrPdf.completed'))
  } catch (e: any) {
    const msg = e?.message || t('ocrPdf.failed')
    store.setError(msg)
    errorMsg.value = msg
  }
}

onUnmounted(() => {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
})
</script>

<style scoped>
.tool-page { max-width: 880px; margin: 0 auto; }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-title__icon { vertical-align: middle; margin-right: 4px; }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }

.file-preview { margin-top: var(--spacing-lg); }
.file-preview__thumbnail { position: relative; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; background: var(--color-bg-tertiary); cursor: pointer; }
.file-preview__canvas { display: block; width: 100%; max-height: 300px; object-fit: contain; background: #fff; }
.file-preview__placeholder { display: flex; align-items: center; justify-content: center; height: 200px; background: #fff; }
.file-preview__placeholder-icon { opacity: 0.3; }
.file-preview__delete { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.file-preview__delete:hover { background: rgba(0,0,0,0.75); }
.file-preview__meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--spacing-sm); padding: var(--spacing-md) 0; }
.file-preview__name { font-weight: 600; word-break: break-all; }
.file-preview__size { font-size: 0.85rem; color: var(--color-text-secondary); }

/* 语言选择 */
.ocr-options { margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--color-bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.ocr-options__label { font-size: 0.875rem; font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--color-text); }
.ocr-options__radios { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.ocr-radio { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; background: #fff; }
.ocr-radio:hover { border-color: var(--color-primary); }
.ocr-radio--active { border-color: var(--color-primary); background: #eff6ff; }
.ocr-radio input[type="radio"] { display: none; }
.ocr-radio__dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: border-color 0.2s; }
.ocr-radio--active .ocr-radio__dot { border-color: var(--color-primary); }
.ocr-radio__dot::after { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--color-primary); transform: scale(0); transition: transform 0.2s; }
.ocr-radio--active .ocr-radio__dot::after { transform: scale(1); }
.ocr-radio__label { font-size: 0.85rem; font-weight: 500; }

.action-card { margin-top: var(--spacing-xl); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-xl); }
.action-hint { text-align: center; font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: var(--spacing-md); }
.btn--large { display: block; width: 100%; padding: var(--spacing-md); font-size: 1rem; border: none; cursor: pointer; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn--secondary { background: var(--color-bg-tertiary); color: var(--color-text); border-radius: var(--radius-md); font-weight: 600; border: 1px solid var(--color-border); transition: all var(--transition-fast); }
.btn--secondary:hover { border-color: var(--color-primary); color: var(--color-primary); }

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
.result-confidence { font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0; }
.result-download-btn { flex-shrink: 0; padding: var(--spacing-sm) var(--spacing-lg); font-size: 0.9375rem; }

.ocr-result__details { margin-top: var(--spacing-lg); border-top: 1px solid var(--color-border); padding-top: var(--spacing-lg); }
.ocr-result__summary { font-weight: 600; cursor: pointer; font-size: 0.9rem; color: var(--color-text-secondary); user-select: none; }
.ocr-result__text { margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--color-bg-tertiary); border-radius: var(--radius-md); max-height: 480px; overflow-y: auto; font-size: 0.8125rem; line-height: 1.7; white-space: pre-wrap; word-break: break-word; font-family: inherit; color: var(--color-text); }
.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
