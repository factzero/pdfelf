<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('redactPdf.title') }}</h1>
    <p class="tool-desc">{{ $t('redactPdf.desc') }}</p>

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

    <div v-if="selectedFile" class="options">
      <div class="viewer-controls">
        <button class="btn btn--small btn--nav" :disabled="currentPage <= 1" @click="currentPage--">◀ {{ $t('common.prevPage') }}</button>
        <span class="page-indicator">{{ $t('common.pageInfo', { current: currentPage, total: pageCount }) }}</span>
        <button class="btn btn--small btn--nav" :disabled="currentPage >= pageCount" @click="currentPage++">{{ $t('common.nextPage') }} ▶</button>
      </div>

      <p class="hint">{{ $t('redactPdf.drawHint') }}</p>

      <div class="canvas-container">
        <canvas
          ref="pdfCanvasRef"
          class="pdf-canvas"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @touchstart.prevent="onTouchStartCanvas"
          @touchmove.prevent="onTouchMoveCanvas"
          @touchend="onTouchEnd"
        ></canvas>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('redactPdf.pageSelect') }}</label>
          <input v-model.number="currentPage" type="number" class="form-input" min="1" :max="pageCount" />
        </div>
        <div class="form-group">
          <button class="btn btn--secondary btn--small" @click="undoLastRect">{{ $t('redactPdf.undo') }}</button>
        </div>
      </div>

      <div v-if="redactions.length > 0" class="rect-list">
        <p class="form-label">{{ $t('redactPdf.rectsCount', { n: redactions.length }) }}</p>
      </div>
    </div>

    <!-- Action -->
    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        :disabled="redactions.length === 0"
        @click="process"
      >
        {{ $t('redactPdf.startBtn') }}
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
          <p class="result-title">{{ $t('redactPdf.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'redactPdf'" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { redactPdf, type RedactRect } from '@/services/pdfService'

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
const currentPage = ref(1)
const pdfCanvasRef = ref<HTMLCanvasElement | null>(null)

const redactions = ref<RedactRect[]>([])

let objectUrl: string | null = null
let pdfDoc: any = null
let pdfBuffer: ArrayBuffer | null = null
let drawing = false
let drawStartX = 0
let drawStartY = 0
let lastX = 0
let lastY = 0
let pageRenderedScale = 1.5

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'redacted')
  redactions.value = []
  currentPage.value = 1

  try {
    pdfBuffer = await readFileAsArrayBuffer(selectedFile.value)
    pdfDoc = await pdfjsLib.getDocument({ data: pdfBuffer, ...DEFAULT_PDF_OPTIONS }).promise
    pageCount.value = pdfDoc.numPages
    await renderPage(1)
  } catch {
    pageCount.value = 0
  }
}

async function renderPage(pageNum: number) {
  if (!pdfDoc) return
  if (!pdfCanvasRef.value) { await nextTick(); if (!pdfCanvasRef.value) return }
  const c = pdfCanvasRef.value!
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale: pageRenderedScale })
  c.width = Math.floor(viewport.width)
  c.height = Math.floor(viewport.height)
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, c.width, c.height)
  await page.render({ canvas: c, canvasContext: ctx, viewport }).promise

  // Re-draw existing redactions for this page
  drawRectsOnCanvas()
}

function drawRectsOnCanvas() {
  const canvas = pdfCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const pageRects = redactions.value.filter((r) => r.page === currentPage.value)
  for (const r of pageRects) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(r.x, r.y, r.width, r.height)
  }
}

function getCanvasPos(e: MouseEvent) {
  const canvas = pdfCanvasRef.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function getTouchCanvasPos(e: TouchEvent) {
  const canvas = pdfCanvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const touch = e.touches[0]
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  }
}

function onMouseDown(e: MouseEvent) {
  drawing = true
  const pos = getCanvasPos(e)
  drawStartX = pos.x
  drawStartY = pos.y
}

function onMouseMove(e: MouseEvent) {
  if (!drawing) return
  const canvas = pdfCanvasRef.value!
  const ctx = canvas.getContext('2d')!
  const pos = getCanvasPos(e)

  // Re-render page then draw current rect
  renderPageQuick(ctx)
  drawRectsOnCanvas()

  const x = Math.min(drawStartX, pos.x)
  const y = Math.min(drawStartY, pos.y)
  const w = Math.abs(pos.x - drawStartX)
  const h = Math.abs(pos.y - drawStartY)

  ctx.strokeStyle = '#ff0000'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 3])
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])
}

function onMouseUp(e: MouseEvent) {
  if (!drawing) return
  drawing = false
  const pos = getCanvasPos(e)
  const x = Math.min(drawStartX, pos.x)
  const y = Math.min(drawStartY, pos.y)
  const w = Math.abs(pos.x - drawStartX)
  const h = Math.abs(pos.y - drawStartY)

  if (w < 5 || h < 5) return // ignore tiny drags

  redactions.value.push({
    page: currentPage.value,
    x,
    y,
    width: w,
    height: h,
  })

  // Re-render with redaction
  renderPage(currentPage.value)
}

async function renderPageQuick(ctx: CanvasRenderingContext2D) {
  if (!pdfDoc) return
  const page = await pdfDoc.getPage(currentPage.value)
  const viewport = page.getViewport({ scale: pageRenderedScale })
  await page.render({ canvasContext: ctx, viewport }).promise
}

function onTouchStartCanvas(e: TouchEvent) {
  if (e.touches.length !== 1) return
  drawing = true
  const pos = getTouchCanvasPos(e)
  drawStartX = pos.x
  drawStartY = pos.y
  lastX = pos.x
  lastY = pos.y
}

function onTouchMoveCanvas(e: TouchEvent) {
  if (!drawing || e.touches.length !== 1) return
  const canvas = pdfCanvasRef.value!
  const ctx = canvas.getContext('2d')!
  const pos = getTouchCanvasPos(e)
  // Quick render for touch
  renderPageQuick(ctx).then(() => {
    drawRectsOnCanvas()
    const x = Math.min(drawStartX, pos.x)
    const y = Math.min(drawStartY, pos.y)
    const w = Math.abs(pos.x - drawStartX)
    const h = Math.abs(pos.y - drawStartY)
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])
  })
}

function onTouchEnd() {
  if (!drawing) return
  drawing = false
  // For touch, add a redaction from start to end position
  const lastTouchPos = { x: lastX, y: lastY }
  if (lastTouchPos.x !== drawStartX || lastTouchPos.y !== drawStartY) {
    const x = Math.min(drawStartX, lastTouchPos.x)
    const y = Math.min(drawStartY, lastTouchPos.y)
    const w = Math.abs(lastTouchPos.x - drawStartX)
    const h = Math.abs(lastTouchPos.y - drawStartY)
    if (w >= 5 && h >= 5) {
      redactions.value.push({ page: currentPage.value, x, y, width: w, height: h })
    }
  }
  renderPage(currentPage.value)
}

function undoLastRect() {
  redactions.value.pop()
  renderPage(currentPage.value)
}

watch(currentPage, async (newPage) => {
  await nextTick()
  await renderPage(newPage)
})

function removeFile() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = null
  pageCount.value = 0
  resultBlob.value = null
  redactions.value = []
}

function onError(msg: string) { errorMsg.value = msg }

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, outputFilename.value)
}

async function process() {
  if (!selectedFile.value || redactions.value.length === 0) return
  errorMsg.value = ''
  store.startProcessing(t('redactPdf.processing'))

  try {
    // Convert canvas coordinates to PDF points (1/72 inch)
    // pdf-lib uses PDF points. pdfjs viewport is scaled by pageRenderedScale.
    const scale = 1 / pageRenderedScale
    const pdfRects: RedactRect[] = redactions.value.map((r) => ({
      page: r.page,
      x: r.x * scale,
      y: r.y * scale,
      width: r.width * scale,
      height: r.height * scale,
    }))

    const blob = await redactPdf(selectedFile.value, pdfRects, (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.setError(msg)
    errorMsg.value = msg || (t('common.failed') as string)
  }
}

onUnmounted(() => {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
})
</script>

<style scoped>
.tool-page { max-width: 900px; margin: 0 auto; }
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
.form-group { flex: 1; }
.form-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.form-input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.875rem; background: var(--color-bg); box-sizing: border-box; }
.form-row { display: flex; gap: var(--spacing-md); align-items: flex-end; }

.viewer-controls { display: flex; align-items: center; justify-content: center; gap: var(--spacing-md); }
.page-indicator { font-size: 0.875rem; color: var(--color-text-secondary); font-weight: 500; }

.btn--small { padding: var(--spacing-xs) var(--spacing-md); font-size: 0.8125rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; background: var(--color-bg); color: var(--color-text); }
.btn--nav { font-weight: 500; }
.btn--secondary { background: var(--color-bg-tertiary); }

.hint { font-size: 0.8125rem; color: var(--color-text-secondary); text-align: center; margin: 0; }

.canvas-container {
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  overflow: auto; max-height: 600px; background: #e5e5e5;
  display: flex; justify-content: center;
}
.pdf-canvas { display: block; cursor: crosshair; touch-action: none; }

.rect-list { font-size: 0.8125rem; color: var(--color-text-secondary); }

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
