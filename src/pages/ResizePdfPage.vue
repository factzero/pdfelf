<template>
  <div class="tool-page container">
    <h1 class="tool-title"><Maximize :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('resizePdf.title') }}</h1>
    <p class="tool-desc">{{ $t('resizePdf.desc') }}</p>

    <FileDropZone v-if="!selectedFile" :accept="['pdf']" @file-selected="onFileSelected" @error="errorMsg = $event" />

    <div v-if="selectedFile" class="file-preview">
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
    </div>

    <div v-if="selectedFile && !isProcessing" class="action-card">
      <div class="size-presets">
        <button
          v-for="preset in getPresets()"
          :key="preset.label"
          class="size-preset"
          :class="{ 'size-preset--active': selectedPreset === preset.label }"
          @click="selectPreset(preset)"
        >
          <span class="size-preset__label">{{ preset.label }}</span>
          <span class="size-preset__dims">{{ preset.width }} × {{ preset.height }} mm</span>
        </button>
      </div>
      <div class="custom-size">
        <div class="form-field">
          <label>{{ $t('resizePdf.width') }} ({{ $t('resizePdf.unit') }})</label>
          <input type="number" v-model.number="customWidth" min="1" />
        </div>
        <div class="form-field">
          <label>{{ $t('resizePdf.height') }} ({{ $t('resizePdf.unit') }})</label>
          <input type="number" v-model.number="customHeight" min="1" />
        </div>
      </div>
      <label class="scale-option">
        <input type="checkbox" v-model="scaleContent" />
        <span>{{ $t('resizePdf.scaleContent') }}</span>
      </label>
      <button class="btn btn--primary btn--large" :disabled="isProcessing" @click="doResize">
        {{ isProcessing ? progressText : $t('resizePdf.resizeBtn') }}
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

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent ns="resizePdf" />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, Maximize } from 'lucide-vue-next'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import { readFileAsArrayBuffer, generateOutputFilename, formatFileSize, downloadBlob } from '@/utils/fileUtils'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { resizePdfPages } from '@/services/pdfService'

const MM_TO_PT = 72 / 25.4

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const outputFilename = ref('')
const errorMsg = ref('')
const showDelete = ref(false)
let objectUrl: string | null = null

const presetsPortrait = [
  { label: 'A4', width: 210, height: 297 },
  { label: 'A3', width: 297, height: 420 },
  { label: 'A5', width: 148, height: 210 },
  { label: 'Letter', width: 215.9, height: 279.4 },
  { label: 'Legal', width: 215.9, height: 355.6 },
]

const isLandscape = ref(false)
const selectedPreset = ref('A4')
const customWidth = ref(210)
const customHeight = ref(297)
const scaleContent = ref(true)

function getPresets() {
  if (isLandscape.value) {
    return presetsPortrait.map(p => ({ label: p.label, width: p.height, height: p.width }))
  }
  return presetsPortrait
}

function selectPreset(preset: { label: string; width: number; height: number }) {
  selectedPreset.value = preset.label
  customWidth.value = preset.width
  customHeight.value = preset.height
}

async function onFileSelected(file: File | File[]) {
  const f = Array.isArray(file) ? file[0] : file
  errorMsg.value = ''
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  selectedFile.value = f
  outputFilename.value = generateOutputFilename(f.name, 'pdf', 'resized')

  try {
    const buffer = await readFileAsArrayBuffer(f)
    const pdf = await pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS }).promise
    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1)
      const scale = 1.5
      const viewport = page.getViewport({ scale })
      // 检测原始页面方向，自动匹配同方向预设
      isLandscape.value = viewport.width > viewport.height
      const activePreset = getPresets().find(p => p.label === 'A4') || getPresets()[0]
      customWidth.value = activePreset.width
      customHeight.value = activePreset.height
      selectedPreset.value = activePreset.label

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
}

function removeFile() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  selectedFile.value = null
  errorMsg.value = ''
  isLandscape.value = false
}

async function doResize() {
  if (!selectedFile.value) return
  errorMsg.value = ''
  store.startProcessing(t('resizePdf.resizing'))
  try {
    const blob = await resizePdfPages(
      selectedFile.value,
      {
        width: customWidth.value * MM_TO_PT,
        height: customHeight.value * MM_TO_PT,
        scaleContent: scaleContent.value,
      },
      (p) => store.updateProgress(p),
    )
    downloadBlob(blob, outputFilename.value)
    store.finishProcessing()
  } catch (e: any) {
    store.setError(e.message || t('resizePdf.failed'))
    errorMsg.value = e.message || t('resizePdf.failed')
  }
}

onUnmounted(() => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null } })
</script>

<style scoped>
.tool-page { max-width: 720px; margin: 0 auto; padding: var(--spacing-2xl) var(--spacing-lg); }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }

.file-preview { margin-top: var(--spacing-lg); }
.file-preview__thumbnail { position: relative; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; background: var(--color-bg-tertiary); cursor: pointer; }
.file-preview__canvas { display: block; width: 100%; max-height: 300px; object-fit: contain; background: #fff; }
.file-preview__placeholder { display: flex; align-items: center; justify-content: center; height: 200px; background: #fff; }
.file-preview__placeholder-icon { font-size: 3rem; opacity: 0.3; }
.file-preview__delete { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.file-preview__delete:hover { background: rgba(0,0,0,0.75); }
.file-preview__meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--spacing-sm); padding: var(--spacing-md) 0; }
.file-preview__name { font-weight: 600; word-break: break-all; }
.file-preview__size { font-size: 0.85rem; color: var(--color-text-secondary); }

.action-card { margin-top: var(--spacing-xl); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-xl); }
.btn--large { display: block; width: 100%; padding: var(--spacing-md); font-size: 1rem; border: none; cursor: pointer; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

.size-presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: var(--spacing-sm); margin-bottom: var(--spacing-lg); }
.size-preset { padding: var(--spacing-sm); border: 2px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); cursor: pointer; text-align: center; transition: border-color 0.2s; }
.size-preset:hover { border-color: var(--color-primary); }
.size-preset--active { border-color: var(--color-primary); background: var(--color-primary-light); }
.size-preset__label { display: block; font-weight: 700; font-size: 0.9rem; }
.size-preset__dims { display: block; font-size: 0.75rem; color: var(--color-text-secondary); }

.custom-size { display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-lg); }
.custom-size .form-field { flex: 1; }
.custom-size .form-field label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--color-text-secondary); }
.custom-size .form-field input { width: 100%; padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9rem; background: var(--color-bg); color: var(--color-text); box-sizing: border-box; }
.custom-size .form-field input:focus { border-color: var(--color-primary); outline: none; }

.scale-option { display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-lg); font-size: 0.9rem; cursor: pointer; }

.action-card__progress { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.progress-bar { width: 100%; height: 8px; background: var(--color-bg-tertiary); border-radius: 4px; overflow: hidden; }
.progress-bar__fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), #60a5fa); border-radius: 4px; transition: width 0.3s ease; }
.progress-info { display: flex; justify-content: space-between; }
.progress-text { font-size: 0.875rem; color: var(--color-text-secondary); }
.progress-percent { font-size: 0.875rem; font-weight: 600; color: var(--color-primary); }

.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
