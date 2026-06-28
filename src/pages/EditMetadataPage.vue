<template>
  <div class="tool-page container">
    <h1 class="tool-title"><FileCode :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('editMetadata.title') }}</h1>
    <p class="tool-desc">{{ $t('editMetadata.desc') }}</p>

    <FileDropZone v-if="!selectedFile" :accept="['pdf']" @file-selected="onFileSelected" @error="errorMsg = $event" />

    <!-- 左右布局：左边缩略图+文件信息，右边元数据表单 -->
    <div v-if="selectedFile && !isProcessing" class="layout">
      <div class="layout__left">
        <div class="panel">
          <div class="file-preview">
            <div class="file-preview__thumbnail" @mouseenter="showDelete = true" @mouseleave="showDelete = false">
              <img v-if="previewUrl" :src="previewUrl" class="file-preview__canvas" alt="PDF Preview" />
              <div v-else class="file-preview__placeholder">
                <FileText :size="48" :stroke-width="1" class="file-preview__placeholder-icon" />
              </div>
              <Transition name="fade">
                <button v-if="showDelete" class="file-preview__delete" @click="removeFile">✕</button>
              </Transition>
            </div>
          </div>
          <div class="file-preview__meta">
            <span class="file-preview__name">{{ selectedFile.name }}</span>
            <span class="file-preview__size">{{ $t('common.fileSize', { size: formatFileSize(selectedFile.size) }) }}</span>
          </div>
          <div class="file-summary">
            <div class="file-summary__row">
              <span class="file-summary__label">{{ $t('editMetadata.pagesLabel') }}</span>
              <span class="file-summary__value">{{ meta.pages }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="layout__right">
        <div class="panel metadata-form">
          <div class="form-field">
            <label>{{ $t('editMetadata.titleLabel') }}</label>
            <input v-model="meta.title" :placeholder="$t('editMetadata.titlePlaceholder')" />
          </div>
          <div class="form-field">
            <label>{{ $t('editMetadata.authorLabel') }}</label>
            <input v-model="meta.author" :placeholder="$t('editMetadata.authorPlaceholder')" />
          </div>
          <div class="form-field">
            <label>{{ $t('editMetadata.subjectLabel') }}</label>
            <input v-model="meta.subject" :placeholder="$t('editMetadata.subjectPlaceholder')" />
          </div>
          <div class="form-field">
            <label>{{ $t('editMetadata.keywordsLabel') }}</label>
            <input v-model="meta.keywords" :placeholder="$t('editMetadata.keywordsPlaceholder')" />
          </div>
          <div class="form-field">
            <label>{{ $t('editMetadata.creatorLabel') }}</label>
            <input v-model="meta.creator" :placeholder="$t('editMetadata.creatorPlaceholder')" />
          </div>
          <div class="form-field">
            <label>{{ $t('editMetadata.producerLabel') }}</label>
            <input v-model="meta.producer" :placeholder="$t('editMetadata.producerPlaceholder')" />
          </div>

          <button class="btn btn--primary btn--large" :disabled="isProcessing" @click="doEdit">
            {{ isProcessing ? progressText : $t('editMetadata.saveBtn') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 处理中 -->
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
    <ToolSeoContent ns="editMetadata" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileCode, FileText } from 'lucide-vue-next'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import { readFileAsArrayBuffer, generateOutputFilename, formatFileSize, downloadBlob } from '@/utils/fileUtils'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { readPdfMetadata, editPdfMetadata } from '@/services/pdfService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const outputFilename = ref('')
const errorMsg = ref('')
const showDelete = ref(false)
const meta = reactive({ title: '', author: '', subject: '', keywords: '', creator: '', producer: '', pages: '' })
let objectUrl: string | null = null

async function onFileSelected(file: File | File[]) {
  const f = Array.isArray(file) ? file[0] : file
  errorMsg.value = ''
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  selectedFile.value = f
  outputFilename.value = generateOutputFilename(f.name, 'pdf', 'meta-edited')

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
  } catch { /* ignore render error */ }

  // Load metadata
  try {
    const md = await readPdfMetadata(f)
    meta.title = md.title
    meta.author = md.author
    meta.subject = md.subject
    meta.keywords = md.keywords
    meta.creator = md.creator
    meta.producer = md.producer
    meta.pages = md.pages
  } catch {
    errorMsg.value = t('editMetadata.readFailed')
  }
}

function removeFile() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  selectedFile.value = null
  errorMsg.value = ''
}

async function doEdit() {
  if (!selectedFile.value) return
  errorMsg.value = ''
  store.startProcessing(t('editMetadata.saving'))
  try {
    const blob = await editPdfMetadata(selectedFile.value, {
      title: meta.title,
      author: meta.author,
      subject: meta.subject,
      keywords: meta.keywords,
      creator: meta.creator,
      producer: meta.producer,
    }, (p) => store.updateProgress(p))
    downloadBlob(blob, outputFilename.value)
    store.finishProcessing()
  } catch (e: any) {
    store.setError(e.message || t('editMetadata.failed'))
    errorMsg.value = e.message || t('editMetadata.failed')
  }
}

onUnmounted(() => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null } })
</script>

<style scoped>
.tool-page { max-width: 980px; margin: 0 auto; padding: var(--spacing-2xl) var(--spacing-lg); }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }

/* ===== 左右布局 ===== */
.layout { display: flex; gap: var(--spacing-xl); margin-top: var(--spacing-lg); align-items: stretch; }
.layout__left { flex: 0 0 340px; min-width: 0; display: flex; }
.layout__right { flex: 1; min-width: 0; display: flex; }

/* ===== 面板卡片 ===== */
.panel { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-xl); width: 100%; display: flex; flex-direction: column; }

/* ===== 左侧：缩略图 + 文件信息 ===== */
.file-preview { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.file-preview__thumbnail { position: relative; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; background: var(--color-bg-tertiary); cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
.file-preview__canvas { display: block; width: 100%; height: 100%; object-fit: contain; background: #fff; }
.file-preview__placeholder { display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; background: #fff; }
.file-preview__placeholder-icon { font-size: 3rem; opacity: 0.3; }
.file-preview__delete { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 1; }
.file-preview__delete:hover { background: rgba(0,0,0,0.75); }
.file-preview__meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--spacing-sm); padding-top: var(--spacing-md); flex-shrink: 0; }
.file-preview__name { font-weight: 600; word-break: break-all; font-size: 0.875rem; }
.file-preview__size { font-size: 0.85rem; color: var(--color-text-secondary); white-space: nowrap; }

.file-summary { margin-top: var(--spacing-md); background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-sm) var(--spacing-md); flex-shrink: 0; }
.file-summary__row { display: flex; justify-content: space-between; align-items: center; }
.file-summary__label { font-size: 0.8125rem; color: var(--color-text-secondary); font-weight: 600; }
.file-summary__value { font-size: 0.9375rem; font-weight: 700; color: var(--color-primary); }

/* ===== 右侧：元数据表单 ===== */
.metadata-form { flex: 1; }
.form-field { margin-bottom: var(--spacing-md); }
.form-field label { display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: var(--spacing-sm); color: var(--color-text-secondary); }
.form-field input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.875rem; background: var(--color-bg-secondary); color: var(--color-text); box-sizing: border-box; transition: border-color 0.2s; }
.form-field input:focus { border-color: var(--color-primary); outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

/* ===== 共用组件 ===== */
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

.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ===== 响应式：窄屏时上下堆叠 ===== */
@media (max-width: 720px) {
  .layout { flex-direction: column; }
  .layout__left { flex: none; width: 100%; }
  .file-preview__canvas { max-height: 260px; }
}
</style>
