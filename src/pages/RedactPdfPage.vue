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

      <!-- ── Toolbar ── -->
      <div class="toolbar">
        <div class="toolbar__tools">
          <button
            v-for="mode in toolModes"
            :key="mode.key"
            class="tool-btn"
            :class="{ 'tool-btn--active': drawMode === mode.key }"
            :title="$t(mode.labelKey)"
            @click="drawMode = mode.key"
          >
            <span class="tool-btn__icon">{{ mode.icon }}</span>
            <span class="tool-btn__label">{{ $t(mode.labelKey) }}</span>
          </button>
        </div>

        <div class="toolbar__divider"></div>

        <div class="toolbar__brush">
          <label class="brush-label">{{ $t('redactPdf.brushWidth') }}</label>
          <div class="brush-control">
            <button class="brush-btn" @click="brushWidth = Math.max(4, brushWidth - 4)">−</button>
            <input
              v-model.number="brushWidth"
              type="range"
              class="brush-slider"
              min="4"
              max="80"
              step="2"
            />
            <button class="brush-btn" @click="brushWidth = Math.min(80, brushWidth + 4)">+</button>
            <span class="brush-value">{{ brushWidth }}px</span>
          </div>
        </div>

        <div class="toolbar__divider"></div>

        <div class="toolbar__actions">
          <button class="act-btn" @click="undoLast" :disabled="!hasAnyRedactions">
            ↩ {{ $t('redactPdf.undo') }}
          </button>
          <button class="act-btn act-btn--danger" @click="clearAll" :disabled="!hasAnyRedactions">
            ✕ {{ $t('redactPdf.clearAll') }}
          </button>
        </div>
      </div>

      <!-- ── Page nav ── -->
      <div class="viewer-controls">
        <button class="btn btn--small btn--nav" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">◀ {{ $t('common.prevPage') }}</button>
        <span class="page-indicator">{{ $t('common.pageInfo', { current: currentPage, total: pageCount }) }}</span>
        <button class="btn btn--small btn--nav" :disabled="currentPage >= pageCount" @click="goToPage(currentPage + 1)">{{ $t('common.nextPage') }} ▶</button>
      </div>

      <p class="hint">{{ $t('redactPdf.drawHint') }}</p>

      <!-- ── Canvas stack ── -->
      <div ref="canvasContainerRef" class="canvas-container">
        <div class="canvas-stack" ref="canvasStackRef">
          <canvas ref="pdfCanvasRef" class="pdf-canvas" />
          <canvas
            ref="drawCanvasRef"
            class="draw-canvas"
            :style="{ cursor: cursorStyle }"
            @mousedown="onPointerDown"
            @mousemove="onPointerMove"
            @mouseup="onPointerUp"
            @mouseleave="onPointerUp"
            @touchstart.prevent="onTouchStart"
            @touchmove.prevent="onTouchMove"
            @touchend="onTouchEnd"
          />
        </div>
      </div>

      <div v-if="hasAnyRedactions" class="stats-bar">
        <span>{{ $t('redactPdf.rectsCount', { n: totalRedactions }) }}</span>
        <span class="stats-breakdown">
          {{ rectRedactions.length }}▭ {{ circleRedactions.length }}○ {{ freehandRedactions.length }}✏
        </span>
      </div>
    </div>

    <!-- ── Action ── -->
    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        :disabled="!hasAnyRedactions"
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
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { redactPdf, type RedactRect, type RedactCircle, type RedactPath } from '@/services/pdfService'

// ── types ──
type DrawMode = 'rect' | 'circle' | 'freehand'

interface RectRedaction { page: number; x: number; y: number; width: number; height: number }
interface CircleRedaction { page: number; cx: number; cy: number; rx: number; ry: number }
interface FreehandRedaction { page: number; points: { x: number; y: number }[]; brushWidth: number }

interface Point { x: number; y: number }

// ── store / i18n ──
const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

// ── state ──
const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const previewUrl = ref('')
const showDelete = ref(false)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')
const currentPage = ref(1)
const pdfCanvasRef = ref<HTMLCanvasElement | null>(null)
const drawCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasStackRef = ref<HTMLDivElement | null>(null)

const drawMode = ref<DrawMode>('rect')
const brushWidth = ref(24)
const rectRedactions = ref<RectRedaction[]>([])
const circleRedactions = ref<CircleRedaction[]>([])
const freehandRedactions = ref<FreehandRedaction[]>([])

const toolModes: { key: DrawMode; icon: string; labelKey: string }[] = [
  { key: 'rect', icon: '▭', labelKey: 'redactPdf.toolRect' },
  { key: 'circle', icon: '○', labelKey: 'redactPdf.toolCircle' },
  { key: 'freehand', icon: '✏', labelKey: 'redactPdf.toolFreehand' },
]

// ── computed ──
const hasAnyRedactions = computed(() =>
  rectRedactions.value.length > 0 || circleRedactions.value.length > 0 || freehandRedactions.value.length > 0
)

const totalRedactions = computed(() =>
  rectRedactions.value.length + circleRedactions.value.length + freehandRedactions.value.length
)

const cursorStyle = computed(() => {
  if (drawMode.value === 'freehand') return 'crosshair'
  return 'crosshair'
})

// ── non-reactive vars ──
let objectUrl: string | null = null
let pdfDoc: any = null
let pdfBuffer: ArrayBuffer | null = null
let pageRenderedScale = 1.5
let containerWidth = 800
let drawing = false
let drawStartX = 0
let drawStartY = 0
let lastTouchX = 0
let lastTouchY = 0
let currentPath: Point[] = []
let resizeObserver: ResizeObserver | null = null

// ── helpers ──
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getCanvasPos(e: MouseEvent): Point {
  const canvas = drawCanvasRef.value!
  const rect = canvas.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function getTouchPos(e: TouchEvent): Point {
  const canvas = drawCanvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const touch = e.touches[0]
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
}

// ── page rendering ──
function getViewScale(pageViewport: any): number {
  if (canvasContainerRef.value) {
    containerWidth = canvasContainerRef.value.clientWidth - 16
  }
  const fitScale = containerWidth / pageViewport.width
  return Math.min(2.0, Math.max(0.5, fitScale))
}

async function renderPage(pageNum: number) {
  if (!pdfDoc) return
  if (!pdfCanvasRef.value) { await nextTick(); if (!pdfCanvasRef.value) return }
  if (!drawCanvasRef.value) { await nextTick(); if (!drawCanvasRef.value) return }

  const pdfCanvas = pdfCanvasRef.value!
  const drawCanvas = drawCanvasRef.value!
  const page = await pdfDoc.getPage(pageNum)
  const unscaledViewport = page.getViewport({ scale: 1 })
  pageRenderedScale = getViewScale(unscaledViewport)
  const viewport = page.getViewport({ scale: pageRenderedScale })
  const w = Math.floor(viewport.width)
  const h = Math.floor(viewport.height)

  // Size both canvases identically
  pdfCanvas.width = w; pdfCanvas.height = h
  pdfCanvas.style.width = w + 'px'; pdfCanvas.style.height = h + 'px'
  drawCanvas.width = w; drawCanvas.height = h
  drawCanvas.style.width = w + 'px'; drawCanvas.style.height = h + 'px'

  // Size the stack wrapper
  if (canvasStackRef.value) {
    canvasStackRef.value.style.width = w + 'px'
    canvasStackRef.value.style.height = h + 'px'
  }

  const ctx = pdfCanvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  await page.render({ canvas: pdfCanvas, canvasContext: ctx, viewport }).promise

  // Clear draw canvas
  const dctx = drawCanvas.getContext('2d')!
  dctx.clearRect(0, 0, w, h)

  // Redraw all saved shapes on draw canvas
  redrawAllShapes()
}

function redrawAllShapes() {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw rectangles
  for (const r of rectRedactions.value.filter(r => r.page === currentPage.value)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'
    ctx.lineWidth = 1
    ctx.fillRect(r.x, r.y, r.width, r.height)
    ctx.strokeRect(r.x, r.y, r.width, r.height)
  }

  // Draw circles
  for (const c of circleRedactions.value.filter(c => c.page === currentPage.value)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(c.cx, c.cy, c.rx, c.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // Draw freehand paths
  for (const path of freehandRedactions.value.filter(p => p.page === currentPage.value)) {
    drawFreehandPath(ctx, path.points, path.brushWidth)
  }
}

function drawFreehandPath(ctx: CanvasRenderingContext2D, points: Point[], bw: number) {
  if (points.length < 2) return
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = bw
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
}

// ── file handlers ──
async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'redacted')
  rectRedactions.value = []
  circleRedactions.value = []
  freehandRedactions.value = []
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

function removeFile() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = null
  pageCount.value = 0
  resultBlob.value = null
  rectRedactions.value = []
  circleRedactions.value = []
  freehandRedactions.value = []
}

function goToPage(page: number) {
  currentPage.value = page
}

// ── drawing: pointer events ──
function onPointerDown(e: MouseEvent) {
  if (e.button !== 0) return
  drawing = true
  const pos = getCanvasPos(e)
  drawStartX = pos.x
  drawStartY = pos.y

  if (drawMode.value === 'freehand') {
    currentPath = [pos]
    drawLiveFreehand()
  }
}

function onPointerMove(e: MouseEvent) {
  if (!drawing) return
  const pos = getCanvasPos(e)

  if (drawMode.value === 'freehand') {
    currentPath.push(pos)
    drawLiveFreehand()
  } else {
    drawLiveShape(pos)
  }
}

function onPointerUp(e: MouseEvent) {
  if (!drawing) return
  drawing = false
  const pos = getCanvasPos(e)

  if (drawMode.value === 'freehand') {
    if (currentPath.length > 1) {
      freehandRedactions.value.push({
        page: currentPage.value,
        points: [...currentPath],
        brushWidth: brushWidth.value,
      })
    }
    currentPath = []
  } else if (drawMode.value === 'rect') {
    const x = Math.min(drawStartX, pos.x)
    const y = Math.min(drawStartY, pos.y)
    const w = Math.abs(pos.x - drawStartX)
    const h = Math.abs(pos.y - drawStartY)
    if (w >= 4 && h >= 4) {
      rectRedactions.value.push({ page: currentPage.value, x, y, width: w, height: h })
    }
  } else if (drawMode.value === 'circle') {
    const cx = (drawStartX + pos.x) / 2
    const cy = (drawStartY + pos.y) / 2
    const rx = Math.abs(pos.x - drawStartX) / 2
    const ry = Math.abs(pos.y - drawStartY) / 2
    if (rx >= 3 && ry >= 3) {
      circleRedactions.value.push({ page: currentPage.value, cx, cy, rx, ry })
    }
  }

  redrawAllShapes()
}

function drawLiveShape(pos: Point) {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  redrawAllShapes()

  if (drawMode.value === 'rect') {
    const x = Math.min(drawStartX, pos.x)
    const y = Math.min(drawStartY, pos.y)
    const w = Math.abs(pos.x - drawStartX)
    const h = Math.abs(pos.y - drawStartY)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 2])
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])
  } else if (drawMode.value === 'circle') {
    const cx = (drawStartX + pos.x) / 2
    const cy = (drawStartY + pos.y) / 2
    const rx = Math.abs(pos.x - drawStartX) / 2
    const ry = Math.abs(pos.y - drawStartY) / 2
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 2])
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function drawLiveFreehand() {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  redrawAllShapes()

  if (currentPath.length < 2) {
    // Draw a single dot
    if (currentPath.length === 1) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.beginPath()
      ctx.arc(currentPath[0].x, currentPath[0].y, brushWidth.value / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = brushWidth.value
  ctx.beginPath()
  ctx.moveTo(currentPath[0].x, currentPath[0].y)
  for (let i = 1; i < currentPath.length; i++) {
    ctx.lineTo(currentPath[i].x, currentPath[i].y)
  }
  ctx.stroke()
}

// ── touch events ──
function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  e.preventDefault()
  drawing = true
  const pos = getTouchPos(e)
  drawStartX = pos.x
  drawStartY = pos.y

  if (drawMode.value === 'freehand') {
    currentPath = [pos]
    drawLiveFreehand()
  }
}

function onTouchMove(e: TouchEvent) {
  if (!drawing || e.touches.length !== 1) return
  e.preventDefault()
  const pos = getTouchPos(e)
  lastTouchX = pos.x
  lastTouchY = pos.y

  if (drawMode.value === 'freehand') {
    currentPath.push(pos)
    drawLiveFreehand()
  } else {
    drawLiveShape(pos)
  }
}

function onTouchEnd() {
  if (!drawing) return
  drawing = false

  if (drawMode.value === 'freehand') {
    if (currentPath.length > 1) {
      freehandRedactions.value.push({
        page: currentPage.value,
        points: [...currentPath],
        brushWidth: brushWidth.value,
      })
    }
    currentPath = []
  } else {
    // Commit shape using the last known touch position
    const pos = { x: lastTouchX, y: lastTouchY }
    if (drawMode.value === 'rect') {
      const x = Math.min(drawStartX, pos.x)
      const y = Math.min(drawStartY, pos.y)
      const w = Math.abs(pos.x - drawStartX)
      const h = Math.abs(pos.y - drawStartY)
      if (w >= 4 && h >= 4) {
        rectRedactions.value.push({ page: currentPage.value, x, y, width: w, height: h })
      }
    } else if (drawMode.value === 'circle') {
      const cx = (drawStartX + pos.x) / 2
      const cy = (drawStartY + pos.y) / 2
      const rx = Math.abs(pos.x - drawStartX) / 2
      const ry = Math.abs(pos.y - drawStartY) / 2
      if (rx >= 3 && ry >= 3) {
        circleRedactions.value.push({ page: currentPage.value, cx, cy, rx, ry })
      }
    }
  }

  currentPath = []
  redrawAllShapes()
}

// ── actions ──
function undoLast() {
  // Undo the most recently added shape across all types (by checking which was added last)
  // Simple approach: pop from whichever array
  if (freehandRedactions.value.length > 0) { freehandRedactions.value.pop() }
  else if (circleRedactions.value.length > 0) { circleRedactions.value.pop() }
  else if (rectRedactions.value.length > 0) { rectRedactions.value.pop() }
  redrawAllShapes()
}

function clearAll() {
  rectRedactions.value = []
  circleRedactions.value = []
  freehandRedactions.value = []
  redrawAllShapes()
}

function onError(msg: string) { errorMsg.value = msg }

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, outputFilename.value)
}

// ── process ──
async function process() {
  if (!selectedFile.value) return
  if (!hasAnyRedactions.value) return
  errorMsg.value = ''
  store.startProcessing(t('redactPdf.processing'))

  try {
    const scale = 1 / pageRenderedScale

    const rects: RedactRect[] = rectRedactions.value.map(r => ({
      page: r.page, x: r.x * scale, y: r.y * scale,
      width: r.width * scale, height: r.height * scale,
    }))

    const circles: RedactCircle[] = circleRedactions.value.map(c => ({
      page: c.page, cx: c.cx * scale, cy: c.cy * scale,
      rx: c.rx * scale, ry: c.ry * scale,
    }))

    const paths: RedactPath[] = freehandRedactions.value.map(p => ({
      page: p.page,
      points: p.points.map(pt => ({ x: pt.x * scale, y: pt.y * scale })),
      brushWidth: p.brushWidth * scale,
    }))

    const blob = await redactPdf(
      selectedFile.value,
      { rects, circles, paths },
      (p) => store.updateProgress(p),
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.setError(msg)
    errorMsg.value = msg || (t('common.failed') as string)
  }
}

// ── watchers ──
watch(currentPage, async () => {
  await nextTick()
  await renderPage(currentPage.value)
})

// ── lifecycle ──
onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (pdfDoc && currentPage.value > 0) {
      renderPage(currentPage.value)
    }
  })
  if (canvasContainerRef.value) {
    resizeObserver.observe(canvasContainerRef.value)
  }
})

onUnmounted(() => {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
})
</script>

<style scoped>
.tool-page { max-width: 960px; margin: 0 auto; }
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

/* ── Toolbar ── */
.toolbar {
  display: flex; align-items: center; gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); flex-wrap: wrap;
}
.toolbar__tools { display: flex; gap: 2px; }
.tool-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 12px; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); background: var(--color-bg-tertiary);
  color: var(--color-text); font-size: 0.8125rem; cursor: pointer;
  transition: all 0.15s ease; white-space: nowrap;
}
.tool-btn:hover { background: var(--color-bg); border-color: var(--color-primary); }
.tool-btn--active {
  background: var(--color-primary); color: #fff;
  border-color: var(--color-primary); font-weight: 600;
}
.tool-btn__icon { font-size: 1rem; }
.tool-btn__label { font-size: 0.75rem; }

.toolbar__divider { width: 1px; height: 28px; background: var(--color-border); margin: 0 4px; }

.toolbar__brush { display: flex; align-items: center; gap: var(--spacing-xs); }
.brush-label { font-size: 0.75rem; color: var(--color-text-secondary); white-space: nowrap; }
.brush-control { display: flex; align-items: center; gap: 4px; }
.brush-btn {
  width: 24px; height: 24px; border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); background: var(--color-bg-tertiary);
  color: var(--color-text); font-size: 0.875rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.brush-btn:hover { background: var(--color-bg); }
.brush-slider { width: 80px; accent-color: var(--color-primary); }
.brush-value { font-size: 0.75rem; color: var(--color-text-secondary); min-width: 32px; text-align: right; }

.toolbar__actions { display: flex; gap: 4px; }
.act-btn {
  padding: 5px 10px; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); background: var(--color-bg-tertiary);
  color: var(--color-text); font-size: 0.75rem; cursor: pointer;
  white-space: nowrap;
}
.act-btn:hover:not(:disabled) { background: var(--color-bg); }
.act-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.act-btn--danger:hover:not(:disabled) { color: #dc2626; border-color: #dc2626; }

/* ── Page nav ── */
.viewer-controls { display: flex; align-items: center; justify-content: center; gap: var(--spacing-md); }
.page-indicator { font-size: 0.875rem; color: var(--color-text-secondary); font-weight: 500; }

.btn--small { padding: var(--spacing-xs) var(--spacing-md); font-size: 0.8125rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; background: var(--color-bg); color: var(--color-text); }
.btn--nav { font-weight: 500; }
.btn--nav:disabled { opacity: 0.4; cursor: not-allowed; }

.hint { font-size: 0.8125rem; color: var(--color-text-secondary); text-align: center; margin: 0; }

/* ── Canvas stack ── */
.canvas-container {
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  overflow: auto; max-height: 70vh; min-height: 200px;
  background: #e5e5e5; text-align: center;
}
.canvas-stack {
  position: relative; display: inline-block; margin: 0 auto;
}
.pdf-canvas, .draw-canvas {
  position: absolute; top: 0; left: 0;
  display: block;
}
.pdf-canvas { z-index: 1; }
.draw-canvas { z-index: 2; }

.stats-bar {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.8125rem; color: var(--color-text-secondary);
  padding: 4px 0;
}
.stats-breakdown { font-size: 0.75rem; opacity: 0.7; }

/* ── Action card ── */
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
