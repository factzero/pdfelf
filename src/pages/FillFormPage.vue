<template>
  <div class="tool-page container">
    <h1 class="tool-title"><FileType :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('fillForm.title') }}</h1>
    <p class="tool-desc">{{ $t('fillForm.desc') }}</p>

    <FileDropZone
      v-if="!selectedFile"
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />

    <div v-if="selectedFile" class="file-preview">
      <div class="file-preview__thumbnail" @mouseenter="showDelete = true" @mouseleave="showDelete = false">
        <img v-if="previewUrl" :src="previewUrl" class="file-preview__canvas" alt="PDF Preview" />
        <div v-else class="file-preview__placeholder">📄</div>
        <Transition name="fade">
          <button v-if="showDelete" class="file-preview__delete" @click="removeFile">✕</button>
        </Transition>
      </div>
      <div class="file-preview__meta">
        <span class="file-preview__name">{{ selectedFile.name }}</span>
        <span class="file-preview__size">{{ formatFileSize(selectedFile.size) }}</span>
        <span v-if="pageCount > 0" class="file-preview__pages">{{ $t('common.pages', { n: pageCount }) }}</span>
      </div>
    </div>

    <!-- Form fields -->
    <div v-if="selectedFile && fields.length > 0" class="options">
      <p class="form-summary">{{ $t('fillForm.fieldsFound', { n: fields.length }) }}</p>
      <div class="form-card">
        <div v-for="(field, idx) in fields" :key="idx" class="form-field-row">
          <label class="field-label">{{ field.name }}</label>
          <span class="field-type">{{ field.type }}</span>
          <input
            v-model="fieldValues[field.name]"
            type="text"
            class="form-input field-input"
            :placeholder="$t('fillForm.fieldPlaceholder')"
          />
        </div>
      </div>
    </div>

    <div v-if="selectedFile && fields.length === 0 && formLoaded" class="options">
      <p class="no-fields">{{ $t('fillForm.noFields') }}</p>
    </div>

    <!-- Action -->
    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        :disabled="!hasFieldsFilled"
        @click="process"
      >
        {{ $t('fillForm.startBtn') }}
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
          <p class="result-title">{{ $t('fillForm.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'fillForm'" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileType } from 'lucide-vue-next'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { getFormFields, fillPdfForm, type FormFieldInfo } from '@/services/pdfService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const previewUrl = ref('')
const showDelete = ref(false)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')
const fields = ref<FormFieldInfo[]>([])
const fieldValues = reactive<Record<string, string>>({})
const formLoaded = ref(false)

let objectUrl: string | null = null

const hasFieldsFilled = computed(() => {
  return Object.values(fieldValues).some((v) => v.trim().length > 0)
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'filled')
  fields.value = []
  formLoaded.value = false

  // Generate preview
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

  // Extract form fields
  try {
    const formFields = await getFormFields(selectedFile.value)
    fields.value = formFields
    // Initialize values
    for (const f of formFields) {
      fieldValues[f.name] = ''
    }
  } catch {
    fields.value = []
  }
  formLoaded.value = true
}

function removeFile() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = null
  pageCount.value = 0
  previewUrl.value = ''
  resultBlob.value = null
  fields.value = []
  formLoaded.value = false
  for (const key in fieldValues) delete fieldValues[key]
}

function onError(msg: string) { errorMsg.value = msg }

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, outputFilename.value)
}

async function process() {
  if (!selectedFile.value) return
  errorMsg.value = ''

  // Build non-empty values
  const values: Record<string, string> = {}
  for (const key in fieldValues) {
    if (fieldValues[key].trim()) {
      values[key] = fieldValues[key].trim()
    }
  }

  if (Object.keys(values).length === 0) {
    errorMsg.value = t('fillForm.noFields') as string
    return
  }

  store.startProcessing(t('fillForm.processing'))
  try {
    const blob = await fillPdfForm(selectedFile.value, values, (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.setError(msg)
    errorMsg.value = msg || (t('common.failed') as string)
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
.file-preview__placeholder { display: flex; align-items: center; justify-content: center; height: 110px; background: #fff; width: 100%; font-size: 2rem; opacity: 0.3; }
.file-preview__delete {
  position: absolute; top: 6px; right: 6px; width: 28px; height: 28px;
  border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff;
  font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.file-preview__delete:hover { background: rgba(220,38,38,0.85); }
.file-preview__meta { display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-sm); flex-wrap: wrap; }
.file-preview__name { font-weight: 600; font-size: 0.875rem; color: var(--color-text); word-break: break-all; }
.file-preview__size { font-size: 0.75rem; color: var(--color-text-muted); }
.file-preview__pages { font-size: 0.75rem; color: var(--color-text-secondary); background: var(--color-bg-tertiary); padding: 1px 8px; border-radius: var(--radius-sm); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.options { margin-top: var(--spacing-md); display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-summary { font-size: 0.8125rem; color: var(--color-text-secondary); font-weight: 500; margin: 0; }
.form-card {
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  padding: var(--spacing-md); background: var(--color-bg);
}
.form-field-row { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border); }
.form-field-row:last-child { border-bottom: none; }
.field-label { font-size: 0.8125rem; font-weight: 600; color: var(--color-text); min-width: 120px; word-break: break-all; }
.field-type { font-size: 0.6875rem; color: var(--color-text-muted); background: var(--color-bg-tertiary); padding: 1px 6px; border-radius: var(--radius-sm); flex-shrink: 0; }
.field-input { flex: 1; min-width: 0; }
.form-input { padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.875rem; background: var(--color-bg); box-sizing: border-box; }
.form-input:focus { outline: none; border-color: var(--color-primary); }

.no-fields { color: var(--color-text-muted); text-align: center; padding: var(--spacing-xl); font-size: 0.875rem; }

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
