<template>
  <div class="reader-page" :class="{ 'reader-page--reading': selectedFile }">
    <div v-if="!selectedFile" class="upload-area container">
      <h1 class="tool-title">{{ $t('reader.title') }}</h1>
      <p class="tool-desc">{{ $t('reader.desc') }}</p>
      <FileDropZone :accept="['pdf']" @file-selected="onFileSelected" @error="onError" />
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </div>
    <div v-else class="reader">
      <div class="reader__toolbar">
        <button class="tb-btn" @click="goBack">{{ $t('reader.back') }}</button>
        <button class="tb-btn" @click="prevPage" :disabled="currentPage <= 1">{{ $t('common.prevPage') }}</button>
        <span class="tb-page">{{ $t('common.pageInfo', { current: currentPage, total: totalPages }) }}</span>
        <button class="tb-btn" @click="nextPage" :disabled="currentPage >= totalPages">{{ $t('common.nextPage') }}</button>
        <select v-model.number="zoom" class="tb-zoom">
          <option :value="50">50%</option>
          <option :value="75">75%</option>
          <option :value="100">100%</option>
          <option :value="125">125%</option>
          <option :value="150">150%</option>
          <option :value="200">200%</option>
        </select>
      </div>
      <div class="reader__canvas-wrap" ref="canvasWrap">
        <canvas ref="canvasEl" class="reader__canvas"></canvas>
      </div>
      <div v-if="isLoading" class="reader__loading">{{ $t('reader.loading') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import * as pdfjsLib from 'pdfjs-dist'
import FileDropZone from '@/components/FileDropZone.vue'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const errorMsg = ref('')
const canvasEl = ref<HTMLCanvasElement>()

const totalPages = ref(0)
const currentPage = ref(1)
const zoom = ref(100)
const isLoading = ref(false)

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  const f = file as File
  selectedFile.value = f
  await loadPdf(f)
}

function onError(message: string) { errorMsg.value = message }

async function loadPdf(file: File) {
  isLoading.value = true
  try {
    const buffer = await readFileAsArrayBuffer(file)
    const task = pdfjsLib.getDocument({ data: buffer })
    pdfDoc = await task.promise
    totalPages.value = pdfDoc.numPages
    currentPage.value = 1
    await renderPage()
  } catch (e) {
    errorMsg.value = t('reader.cannotOpen')
    selectedFile.value = null
  }
  isLoading.value = false
}

async function renderPage() {
  if (!pdfDoc || !canvasEl.value) return
  isLoading.value = true
  const page = await pdfDoc.getPage(currentPage.value)
  const scale = zoom.value / 100
  const viewport = page.getViewport({ scale })
  const canvas = canvasEl.value
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')!
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  isLoading.value = false
}

function goBack() {
  selectedFile.value = null
  pdfDoc = null
  totalPages.value = 0
  currentPage.value = 1
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    renderPage()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    renderPage()
  }
}

watch(zoom, () => {
  if (pdfDoc) renderPage()
})

// Hide body scrollbar when reader is active
watch(selectedFile, (val) => {
  document.body.classList.toggle('reader-open', !!val)
})
onUnmounted(() => {
  document.body.classList.remove('reader-open')
})

// Keyboard navigation
function onKeydown(e: KeyboardEvent) {
  if (!selectedFile.value) return
  // Ignore if typing in an input/select
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage() }
  else if (e.key === 'ArrowRight') { e.preventDefault(); nextPage() }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
/* Reading mode: fill viewport, no scrollbar */
.reader-page--reading {
  margin: calc(-1 * var(--spacing-2xl)) 0;
  height: calc(100vh - 65px);
  overflow: hidden;
}
.upload-area { max-width: 640px; margin: 0 auto; padding-top: var(--spacing-3xl); }
.tool-title { font-size: 1.75rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }

.reader { display: flex; flex-direction: column; height: 100%; }
.reader__toolbar {
  display: flex; align-items: center; gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.tb-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  cursor: pointer;
  font-size: 0.8125rem;
  transition: all var(--transition-fast);
}
.tb-btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.tb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tb-page { font-size: 0.8125rem; font-weight: 600; min-width: 100px; text-align: center; }
.tb-zoom { padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.8125rem; margin-left: auto; }

.reader__canvas-wrap {
  flex: 1; overflow: auto; display: flex; justify-content: center;
  padding: var(--spacing-xl); background: #e5e7eb;
  /* Hide scrollbar, keep scroll functionality */
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.reader__canvas-wrap::-webkit-scrollbar {
  display: none;
}
.reader__canvas { box-shadow: 0 4px 24px rgba(0,0,0,.15); background: white; max-width: 100%; }
.reader__loading { text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary); font-size: 0.875rem; }
.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
</style>

<style>
body.reader-open { overflow: hidden; }
</style>
