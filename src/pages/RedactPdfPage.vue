<template>
  <div class="tool-page container">
    <h1 class="tool-title"><EyeOff :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('redactPdf.title') }}</h1>
    <p class="tool-desc">{{ $t('redactPdf.desc') }}</p>

    <FileDropZone
      v-if="!selectedFile"
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />

    <div v-if="selectedFile" class="file-bar">
      <FileText :size="20" :stroke-width="1.5" class="file-bar__icon" />
      <span class="file-bar__name">{{ selectedFile.name }}</span>
      <span class="file-bar__meta">{{ formatFileSize(selectedFile.size) }}</span>
      <span v-if="pageCount > 0" class="file-bar__pages">{{ $t('common.pages', { n: pageCount }) }}</span>
      <input ref="reSelectInputRef" type="file" accept=".pdf" hidden @change="onReSelect" />
      <button class="file-bar__act" title="重新选择文件" @click="reSelectInputRef?.click()">
        <FolderOpen :size="18" :stroke-width="1.5" />
      </button>
      <button class="file-bar__del" title="移除文件" @click="removeFile">✕</button>
    </div>

    <div v-if="selectedFile" class="options">

      <!-- ── Compact Toolbar ── -->
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
          </button>
        </div>

        <div class="toolbar__divider"></div>

        <div class="toolbar__brush">
          <button class="brush-btn" title="−4px" @click="brushWidth = Math.max(4, brushWidth - 4)">−</button>
          <input
            v-model.number="brushWidth"
            type="range"
            class="brush-slider"
            min="4"
            max="80"
            step="2"
            :title="brushWidth + 'px'"
          />
          <button class="brush-btn" title="+4px" @click="brushWidth = Math.min(80, brushWidth + 4)">+</button>
          <span class="brush-value">{{ brushWidth }}px</span>
        </div>

        <div class="toolbar__divider"></div>

        <div class="toolbar__actions">
          <button class="act-btn" :title="$t('redactPdf.undo')" @click="undoLast" :disabled="!hasAnyRedactions">↩</button>
          <button class="act-btn act-btn--danger" :title="$t('redactPdf.clearAll')" @click="clearAll" :disabled="!hasAnyRedactions">✕</button>
        </div>

        <div class="toolbar__divider"></div>

        <div class="toolbar__nav">
          <button class="nav-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">◀</button>
          <span class="page-indicator">{{ currentPage }} / {{ pageCount }}</span>
          <button class="nav-btn" :disabled="currentPage >= pageCount" @click="goToPage(currentPage + 1)">▶</button>
        </div>
      </div>

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
          {{ rectRedactions.length }}▭ {{ roundedRectRedactions.length }}▢ {{ circleRedactions.length }}●
          {{ ellipseRedactions.length }}○ {{ polygonRedactions.length }}⬠ {{ freehandRedactions.length }}✏
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
        <p class="result-title">✅ {{ $t('redactPdf.completed') }}</p>
        <p class="result-filename">{{ outputFilename }}</p>
        <div class="result-actions">
          <button class="btn result-edit-btn" @click="continueEdit">
            ✎ {{ $t('redactPdf.continueEdit') }}
          </button>
          <button class="btn btn--primary result-btn" @click="downloadResult">
            ⬇ {{ $t('common.downloadFile') }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'redactPdf'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { EyeOff, FileText, FolderOpen } from 'lucide-vue-next'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import {
  redactPdf,
  type RedactRect, type RedactCircle, type RedactRoundedRect,
  type RedactPolygon, type RedactPath,
} from '@/services/pdfService'

// ── types ──
type DrawMode = 'rect' | 'rounded-rect' | 'circle' | 'ellipse' | 'triangle' | 'star' | 'hexagon' | 'cross' | 'freehand'
type RedactionTypeKey = 'rect' | 'rounded-rect' | 'circle' | 'ellipse' | 'polygon' | 'freehand'

interface RectRedaction { page: number; x: number; y: number; width: number; height: number }
interface RoundedRectRedaction { page: number; x: number; y: number; width: number; height: number; rx: number; ry: number }
interface CircleRedaction { page: number; cx: number; cy: number; r: number }
interface EllipseRedaction { page: number; cx: number; cy: number; rx: number; ry: number }
interface PolygonRedaction { page: number; shape: string; x: number; y: number; width: number; height: number }
interface FreehandRedaction { page: number; points: { x: number; y: number }[]; brushWidth: number }

interface Point { x: number; y: number }

type HandleDir = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'

// ── store / i18n ──
const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

// ── state ──
const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')
const currentPage = ref(1)
const reSelectInputRef = ref<HTMLInputElement | null>(null)
const pdfCanvasRef = ref<HTMLCanvasElement | null>(null)
const drawCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasStackRef = ref<HTMLDivElement | null>(null)

const drawMode = ref<DrawMode>('rect')
const brushWidth = ref(24)
const rectRedactions = ref<RectRedaction[]>([])
const roundedRectRedactions = ref<RoundedRectRedaction[]>([])
const circleRedactions = ref<CircleRedaction[]>([])
const ellipseRedactions = ref<EllipseRedaction[]>([])
const polygonRedactions = ref<PolygonRedaction[]>([])
const freehandRedactions = ref<FreehandRedaction[]>([])

// selection / resize state
const selectedType = ref<RedactionTypeKey | null>(null)
const selectedIndex = ref(-1)
const isResizing = ref(false)
const resizeHandle = ref<HandleDir | ''>('')
const currentHoverHandle = ref<HandleDir | ''>('')

// non-reactive resize working copies
let resizingOriginal: any = null
let resizeStartMX = 0
let resizeStartMY = 0
const HANDLE_SIZE = 8

const toolModes: { key: DrawMode; icon: string; labelKey: string }[] = [
  { key: 'rect', icon: '▭', labelKey: 'redactPdf.toolRect' },
  { key: 'rounded-rect', icon: '▢', labelKey: 'redactPdf.toolRoundedRect' },
  { key: 'circle', icon: '●', labelKey: 'redactPdf.toolCircle' },
  { key: 'ellipse', icon: '○', labelKey: 'redactPdf.toolEllipse' },
  { key: 'triangle', icon: '△', labelKey: 'redactPdf.toolTriangle' },
  { key: 'star', icon: '★', labelKey: 'redactPdf.toolStar' },
  { key: 'hexagon', icon: '⬡', labelKey: 'redactPdf.toolHexagon' },
  { key: 'cross', icon: '✚', labelKey: 'redactPdf.toolCross' },
  { key: 'freehand', icon: '✏', labelKey: 'redactPdf.toolFreehand' },
]

// ── computed ──
const hasAnyRedactions = computed(() =>
  rectRedactions.value.length > 0 ||
  roundedRectRedactions.value.length > 0 ||
  circleRedactions.value.length > 0 ||
  ellipseRedactions.value.length > 0 ||
  polygonRedactions.value.length > 0 ||
  freehandRedactions.value.length > 0
)

const totalRedactions = computed(() =>
  rectRedactions.value.length + roundedRectRedactions.value.length +
  circleRedactions.value.length + ellipseRedactions.value.length +
  polygonRedactions.value.length + freehandRedactions.value.length
)

const cursorStyle = computed(() => {
  if (currentHoverHandle.value) {
    const map: Record<string, string> = {
      'nw': 'nwse-resize', 'n': 'ns-resize', 'ne': 'nesw-resize',
      'w': 'ew-resize', 'e': 'ew-resize',
      'sw': 'nesw-resize', 's': 'ns-resize', 'se': 'nwse-resize',
    }
    return map[currentHoverHandle.value] || 'crosshair'
  }
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

// Compute shape vertices from bounding rect (top-left origin)
function getShapeVertices(shape: string, x: number, y: number, w: number, h: number): Point[] {
  const cx = x + w / 2, cy = y + h / 2
  switch (shape) {
    case 'triangle':
      return [{ x: cx, y }, { x: x + w, y: y + h }, { x, y: y + h }]
    case 'star': {
      const outerR = Math.min(w, h) / 2, innerR = outerR * 0.382
      const verts: Point[] = []
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR
        const angle = -Math.PI / 2 + (i * Math.PI) / 5
        verts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
      }
      return verts
    }
    case 'hexagon': {
      const verts: Point[] = []
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        verts.push({ x: cx + (w / 2) * Math.cos(angle), y: cy + (h / 2) * Math.sin(angle) })
      }
      return verts
    }
    case 'cross': {
      const thickness = Math.min(w, h) / 3, tx = thickness / 2
      return [
        { x: cx - tx, y }, { x: cx + tx, y },
        { x: cx + tx, y: cy - tx }, { x: x + w, y: cy - tx },
        { x: x + w, y: cy + tx }, { x: cx + tx, y: cy + tx },
        { x: cx + tx, y: y + h }, { x: cx - tx, y: y + h },
        { x: cx - tx, y: cy + tx }, { x, y: cy + tx },
        { x, y: cy - tx }, { x: cx - tx, y: cy - tx },
      ]
    }
    default: return []
  }
}

/** Get bounding box of any redaction */
function getRedactionBBox(item: any, type: RedactionTypeKey): { x: number; y: number; w: number; h: number } | null {
  switch (type) {
    case 'rect': return { x: item.x, y: item.y, w: item.width, h: item.height }
    case 'rounded-rect': return { x: item.x, y: item.y, w: item.width, h: item.height }
    case 'circle': return { x: item.cx - item.r, y: item.cy - item.r, w: item.r * 2, h: item.r * 2 }
    case 'ellipse': return { x: item.cx - item.rx, y: item.cy - item.ry, w: item.rx * 2, h: item.ry * 2 }
    case 'polygon': return { x: item.x, y: item.y, w: item.width, h: item.height }
    default: return null
  }
}

/** Get 8 handle positions around a bounding box */
function getHandlePositions(bb: { x: number; y: number; w: number; h: number }): { dir: HandleDir; x: number; y: number }[] {
  const { x, y, w, h } = bb
  const cx = x + w / 2
  const cy = y + h / 2
  return [
    { dir: 'nw', x, y },
    { dir: 'n', x: cx, y },
    { dir: 'ne', x: x + w, y },
    { dir: 'w', x, y: cy },
    { dir: 'e', x: x + w, y: cy },
    { dir: 'sw', x, y: y + h },
    { dir: 's', x: cx, y: y + h },
    { dir: 'se', x: x + w, y: y + h },
  ]
}

/** Hit test: point inside a shape */
function hitTestShape(px: number, py: number, item: any, type: RedactionTypeKey): boolean {
  switch (type) {
    case 'rect':
    case 'rounded-rect':
    case 'polygon':
      return px >= item.x && px <= item.x + item.width && py >= item.y && py <= item.y + item.height
    case 'circle': {
      const dx = px - item.cx, dy = py - item.cy
      return Math.sqrt(dx * dx + dy * dy) <= item.r
    }
    case 'ellipse': {
      const dx = px - item.cx, dy = py - item.cy
      return (dx * dx) / (item.rx * item.rx) + (dy * dy) / (item.ry * item.ry) <= 1
    }
    default: return false
  }
}

/** Hit test: point inside a handle (8x8 px) */
function hitTestHandle(px: number, py: number, bb: { x: number; y: number; w: number; h: number }): HandleDir | '' {
  for (const h of getHandlePositions(bb)) {
    if (px >= h.x - HANDLE_SIZE / 2 && px <= h.x + HANDLE_SIZE / 2 &&
        py >= h.y - HANDLE_SIZE / 2 && py <= h.y + HANDLE_SIZE / 2) {
      return h.dir
    }
  }
  return ''
}

/** Find a redaction at point (x,y) on the given page. Returns type+index or null. */
function findRedactionAt(px: number, py: number, page: number): { type: RedactionTypeKey; index: number } | null {
  // Check in reverse draw order (last = on top)
  const arrays: { type: RedactionTypeKey; items: any[] }[] = [
    { type: 'freehand', items: freehandRedactions.value },
    { type: 'polygon', items: polygonRedactions.value },
    { type: 'ellipse', items: ellipseRedactions.value },
    { type: 'circle', items: circleRedactions.value },
    { type: 'rounded-rect', items: roundedRectRedactions.value },
    { type: 'rect', items: rectRedactions.value },
  ]
  for (const arr of arrays) {
    for (let i = arr.items.length - 1; i >= 0; i--) {
      if (arr.items[i].page === page && hitTestShape(px, py, arr.items[i], arr.type)) {
        return { type: arr.type, index: i }
      }
    }
  }
  return null
}

/** Get the array ref for a given type */
function getRedactionArray(type: RedactionTypeKey) {
  switch (type) {
    case 'rect': return rectRedactions
    case 'rounded-rect': return roundedRectRedactions
    case 'circle': return circleRedactions
    case 'ellipse': return ellipseRedactions
    case 'polygon': return polygonRedactions
    case 'freehand': return freehandRedactions
  }
}

/** Apply resize delta to a shape based on handle direction */
function applyResizeToShape(
  item: any, type: RedactionTypeKey, handle: HandleDir,
  dx: number, dy: number,
): any {
  const copy = JSON.parse(JSON.stringify(item))
  const limit = (v: number) => Math.max(3, v) // minimum size 3px

  // For circle/ellipse, convert to bbox, modify, convert back
  if (type === 'circle') {
    let x = copy.cx - copy.r, y = copy.cy - copy.r, w = copy.r * 2, h = copy.r * 2
    ;({ x, y, w, h } = applyBBoxResize(x, y, w, h, handle, dx, dy))
    copy.cx = x + w / 2
    copy.cy = y + h / 2
    copy.r = limit(Math.min(w, h)) / 2
    return copy
  }
  if (type === 'ellipse') {
    let x = copy.cx - copy.rx, y = copy.cy - copy.ry, w = copy.rx * 2, h = copy.ry * 2
    ;({ x, y, w, h } = applyBBoxResize(x, y, w, h, handle, dx, dy))
    copy.cx = x + w / 2
    copy.cy = y + h / 2
    copy.rx = limit(w) / 2
    copy.ry = limit(h) / 2
    return copy
  }
  // rect / rounded-rect / polygon
  const res = applyBBoxResize(copy.x, copy.y, copy.width, copy.height, handle, dx, dy)
  copy.x = res.x; copy.y = res.y; copy.width = res.w; copy.height = res.h
  return copy
}

function applyBBoxResize(
  x: number, y: number, w: number, h: number,
  handle: HandleDir, dx: number, dy: number,
): { x: number; y: number; w: number; h: number } {
  let nx = x, ny = y, nw = w, nh = h
  const limit = (v: number) => Math.max(3, v)
  switch (handle) {
    case 'nw': nx += dx; ny += dy; nw = limit(w - dx); nh = limit(h - dy); break
    case 'n': ny += dy; nh = limit(h - dy); break
    case 'ne': ny += dy; nw = limit(w + dx); nh = limit(h - dy); break
    case 'w': nx += dx; nw = limit(w - dx); break
    case 'e': nw = limit(w + dx); break
    case 'sw': nx += dx; nw = limit(w - dx); nh = limit(h + dy); break
    case 's': nh = limit(h + dy); break
    case 'se': nw = limit(w + dx); nh = limit(h + dy); break
  }
  return { x: nx, y: ny, w: nw, h: nh }
}

/** Select a redaction by type+index */
function selectRedaction(type: RedactionTypeKey, index: number) {
  selectedType.value = type
  selectedIndex.value = index
}

/** Deselect any selected redaction */
function deselectRedaction() {
  selectedType.value = null
  selectedIndex.value = -1
  currentHoverHandle.value = ''
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
  const w = Math.floor(viewport.width), h = Math.floor(viewport.height)

  pdfCanvas.width = w; pdfCanvas.height = h
  pdfCanvas.style.width = w + 'px'; pdfCanvas.style.height = h + 'px'
  drawCanvas.width = w; drawCanvas.height = h
  drawCanvas.style.width = w + 'px'; drawCanvas.style.height = h + 'px'

  if (canvasStackRef.value) {
    canvasStackRef.value.style.width = w + 'px'
    canvasStackRef.value.style.height = h + 'px'
  }

  const ctx = pdfCanvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  await page.render({ canvas: pdfCanvas, canvasContext: ctx, viewport }).promise

  const dctx = drawCanvas.getContext('2d')!
  dctx.clearRect(0, 0, w, h)
  redrawAllShapes()
}

function drawFillAndStroke(ctx: CanvasRenderingContext2D, withStroke = true) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  if (withStroke) {
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'
    ctx.lineWidth = 1
  }
}

/** Draw 8 resize handles around a bounding box */
function drawSelectionHandles(ctx: CanvasRenderingContext2D, bb: { x: number; y: number; w: number; h: number }) {
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1.5
  for (const h of getHandlePositions(bb)) {
    const hs = HANDLE_SIZE / 2
    ctx.fillRect(h.x - hs, h.y - hs, HANDLE_SIZE, HANDLE_SIZE)
    ctx.strokeRect(h.x - hs, h.y - hs, HANDLE_SIZE, HANDLE_SIZE)
  }
  ctx.restore()
}

function drawPolygonPath(ctx: CanvasRenderingContext2D, verts: Point[]) {
  if (verts.length === 0) return
  ctx.beginPath()
  ctx.moveTo(verts[0].x, verts[0].y)
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y)
  ctx.closePath()
}

function drawRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function redrawAllShapes() {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const cp = currentPage.value

  // Rectangles
  for (let i = 0; i < rectRedactions.value.length; i++) {
    const r = rectRedactions.value[i]
    if (r.page !== cp) continue
    const isSel = selectedType.value === 'rect' && selectedIndex.value === i
    drawFillAndStroke(ctx, !isSel)
    if (isSel) { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([4, 2]) }
    ctx.fillRect(r.x, r.y, r.width, r.height)
    ctx.strokeRect(r.x, r.y, r.width, r.height)
    if (isSel) ctx.setLineDash([])
  }

  // Rounded rectangles
  for (let i = 0; i < roundedRectRedactions.value.length; i++) {
    const r = roundedRectRedactions.value[i]
    if (r.page !== cp) continue
    const isSel = selectedType.value === 'rounded-rect' && selectedIndex.value === i
    drawFillAndStroke(ctx, !isSel)
    if (isSel) { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([4, 2]) }
    drawRoundedRectPath(ctx, r.x, r.y, r.width, r.height, r.rx)
    ctx.fill()
    ctx.stroke()
    if (isSel) ctx.setLineDash([])
  }

  // Circles (constrained)
  for (let i = 0; i < circleRedactions.value.length; i++) {
    const c = circleRedactions.value[i]
    if (c.page !== cp) continue
    const isSel = selectedType.value === 'circle' && selectedIndex.value === i
    drawFillAndStroke(ctx, !isSel)
    if (isSel) { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([4, 2]) }
    ctx.beginPath()
    ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (isSel) ctx.setLineDash([])
  }

  // Ellipses
  for (let i = 0; i < ellipseRedactions.value.length; i++) {
    const e = ellipseRedactions.value[i]
    if (e.page !== cp) continue
    const isSel = selectedType.value === 'ellipse' && selectedIndex.value === i
    drawFillAndStroke(ctx, !isSel)
    if (isSel) { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([4, 2]) }
    ctx.beginPath()
    ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (isSel) ctx.setLineDash([])
  }

  // Polygons
  for (let i = 0; i < polygonRedactions.value.length; i++) {
    const p = polygonRedactions.value[i]
    if (p.page !== cp) continue
    const isSel = selectedType.value === 'polygon' && selectedIndex.value === i
    drawFillAndStroke(ctx, !isSel)
    if (isSel) { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([4, 2]) }
    const verts = getShapeVertices(p.shape, p.x, p.y, p.width, p.height)
    drawPolygonPath(ctx, verts)
    ctx.fill()
    ctx.stroke()
    if (isSel) ctx.setLineDash([])
  }

  // Freehand paths
  for (const path of freehandRedactions.value.filter(p => p.page === cp)) {
    drawFreehandPath(ctx, path.points, path.brushWidth)
  }

  // Draw selection handles
  if (selectedType.value && selectedIndex.value >= 0) {
    const arr = getRedactionArray(selectedType.value)
    const item = arr.value[selectedIndex.value]
    if (item && item.page === cp) {
      const bb = getRedactionBBox(item, selectedType.value)
      if (bb) drawSelectionHandles(ctx, bb)
    } else {
      // Selected item not on current page — deselect
      deselectRedaction()
    }
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
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.stroke()
}

// ── file handlers ──
async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'redacted')
  clearAll()
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
  clearAll()
}

function onReSelect() {
  const files = reSelectInputRef.value?.files
  if (files && files.length > 0) {
    onFileSelected(files[0])
  }
}

function goToPage(page: number) {
  currentPage.value = page
}

// ── drawing: pointer events ──
function onPointerDown(e: MouseEvent) {
  if (e.button !== 0) return
  const pos = getCanvasPos(e)

  // Check if clicking on a resize handle of the selected shape
  if (selectedType.value && selectedIndex.value >= 0) {
    const arr = getRedactionArray(selectedType.value)
    const item = arr.value[selectedIndex.value]
    if (item && item.page === currentPage.value) {
      const bb = getRedactionBBox(item, selectedType.value)
      if (bb) {
        const handleDir = hitTestHandle(pos.x, pos.y, bb)
        if (handleDir) {
          // Start resize
          isResizing.value = true
          resizeHandle.value = handleDir
          resizingOriginal = JSON.parse(JSON.stringify(item))
          resizeStartMX = pos.x
          resizeStartMY = pos.y
          return
        }
      }
    }
  }

  // Not on a handle — start drawing
  drawing = true
  drawStartX = pos.x
  drawStartY = pos.y

  if (drawMode.value === 'freehand') {
    currentPath = [pos]
    drawLiveFreehand()
  }
}

function onPointerMove(e: MouseEvent) {
  const pos = getCanvasPos(e)

  if (isResizing.value && selectedType.value && resizingOriginal) {
    // Calculate delta and apply resize
    const dx = pos.x - resizeStartMX
    const dy = pos.y - resizeStartMY
    const updated = applyResizeToShape(resizingOriginal, selectedType.value, resizeHandle.value as HandleDir, dx, dy)
    const arr = getRedactionArray(selectedType.value)
    arr.value[selectedIndex.value] = updated
    redrawAllShapes()
    return
  }

  if (!drawing) {
    // Hover: update cursor when near handles
    let foundHandle: HandleDir | '' = ''
    if (selectedType.value && selectedIndex.value >= 0) {
      const arr = getRedactionArray(selectedType.value)
      const item = arr.value[selectedIndex.value]
      if (item && item.page === currentPage.value) {
        const bb = getRedactionBBox(item, selectedType.value)
        if (bb) foundHandle = hitTestHandle(pos.x, pos.y, bb)
      }
    }
    currentHoverHandle.value = foundHandle
    return
  }

  if (drawMode.value === 'freehand') {
    currentPath.push(pos)
    drawLiveFreehand()
  } else {
    drawLiveShape(pos)
  }
}

function commitShape(pos: Point) {
  const mode = drawMode.value
  const x = Math.min(drawStartX, pos.x)
  const y = Math.min(drawStartY, pos.y)
  const w = Math.abs(pos.x - drawStartX)
  const h = Math.abs(pos.y - drawStartY)
  if (w < 3 || h < 3) return

  switch (mode) {
    case 'rect':
      rectRedactions.value.push({ page: currentPage.value, x, y, width: w, height: h })
      break
    case 'rounded-rect': {
      const r = Math.min(w, h) * 0.12
      roundedRectRedactions.value.push({ page: currentPage.value, x, y, width: w, height: h, rx: r, ry: r })
      break
    }
    case 'circle': {
      const cx = (drawStartX + pos.x) / 2
      const cy = (drawStartY + pos.y) / 2
      const r = Math.sqrt((pos.x - drawStartX) ** 2 + (pos.y - drawStartY) ** 2) / 2
      if (r >= 3) circleRedactions.value.push({ page: currentPage.value, cx, cy, r })
      break
    }
    case 'ellipse': {
      const cx = (drawStartX + pos.x) / 2
      const cy = (drawStartY + pos.y) / 2
      const rx = Math.abs(pos.x - drawStartX) / 2
      const ry = Math.abs(pos.y - drawStartY) / 2
      if (rx >= 3 && ry >= 3) ellipseRedactions.value.push({ page: currentPage.value, cx, cy, rx, ry })
      break
    }
    case 'triangle':
    case 'star':
    case 'hexagon':
    case 'cross':
      polygonRedactions.value.push({ page: currentPage.value, shape: mode, x, y, width: w, height: h })
      break
  }
}

function onPointerUp(e: MouseEvent) {
  if (isResizing.value) {
    // Commit resize
    isResizing.value = false
    resizeHandle.value = ''
    resizingOriginal = null
    redrawAllShapes()
    return
  }

  if (!drawing) return
  drawing = false
  const pos = getCanvasPos(e)

  if (drawMode.value === 'freehand') {
    if (currentPath.length > 1) {
      freehandRedactions.value.push({
        page: currentPage.value, points: [...currentPath], brushWidth: brushWidth.value,
      })
    }
    currentPath = []
  } else {
    // Check if this was a short click (no significant drag) — try select
    const dx = pos.x - drawStartX
    const dy = pos.y - drawStartY
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
      // Click — try to select a shape
      const found = findRedactionAt(pos.x, pos.y, currentPage.value)
      if (found && found.type !== 'freehand') {
        selectRedaction(found.type, found.index)
        redrawAllShapes()
        return
      }
      // Click on empty space — deselect
      deselectRedaction()
      redrawAllShapes()
      return
    }
    commitShape(pos)
    deselectRedaction()
  }
  redrawAllShapes()
}

function drawLiveShape(pos: Point) {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  redrawAllShapes()

  const style = (cc: CanvasRenderingContext2D) => {
    cc.fillStyle = 'rgba(0, 0, 0, 0.35)'
    cc.strokeStyle = '#ff0000'
    cc.lineWidth = 1.5
    cc.setLineDash([4, 2])
  }
  const endStyle = (cc: CanvasRenderingContext2D) => cc.setLineDash([])

  const x = Math.min(drawStartX, pos.x), y = Math.min(drawStartY, pos.y)
  const w = Math.abs(pos.x - drawStartX), h = Math.abs(pos.y - drawStartY)

  switch (drawMode.value) {
    case 'rect':
      style(ctx)
      ctx.fillRect(x, y, w, h)
      ctx.strokeRect(x, y, w, h)
      endStyle(ctx)
      break
    case 'rounded-rect': {
      const r = Math.min(w, h) * 0.12
      style(ctx)
      drawRoundedRectPath(ctx, x, y, w, h, r)
      ctx.fill()
      ctx.stroke()
      endStyle(ctx)
      break
    }
    case 'circle': {
      const cx = (drawStartX + pos.x) / 2, cy = (drawStartY + pos.y) / 2
      const r = Math.sqrt((pos.x - drawStartX) ** 2 + (pos.y - drawStartY) ** 2) / 2
      style(ctx)
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      endStyle(ctx)
      break
    }
    case 'ellipse': {
      const cx = (drawStartX + pos.x) / 2, cy = (drawStartY + pos.y) / 2
      const rx = Math.abs(pos.x - drawStartX) / 2, ry = Math.abs(pos.y - drawStartY) / 2
      style(ctx)
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      endStyle(ctx)
      break
    }
    case 'triangle':
    case 'star':
    case 'hexagon':
    case 'cross': {
      const verts = getShapeVertices(drawMode.value, x, y, w, h)
      style(ctx)
      drawPolygonPath(ctx, verts)
      ctx.fill()
      ctx.stroke()
      endStyle(ctx)
      break
    }
  }
}

function drawLiveFreehand() {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  redrawAllShapes()

  if (currentPath.length === 1) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.beginPath()
    ctx.arc(currentPath[0].x, currentPath[0].y, brushWidth.value / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (currentPath.length < 2) return
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = brushWidth.value
  ctx.beginPath()
  ctx.moveTo(currentPath[0].x, currentPath[0].y)
  for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i].x, currentPath[i].y)
  ctx.stroke()
}

// ── touch events ──
function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  e.preventDefault()
  const pos = getTouchPos(e)

  // Check handle resize
  if (selectedType.value && selectedIndex.value >= 0) {
    const arr = getRedactionArray(selectedType.value)
    const item = arr.value[selectedIndex.value]
    if (item && item.page === currentPage.value) {
      const bb = getRedactionBBox(item, selectedType.value)
      if (bb) {
        const handleDir = hitTestHandle(pos.x, pos.y, bb)
        if (handleDir) {
          isResizing.value = true
          resizeHandle.value = handleDir
          resizingOriginal = JSON.parse(JSON.stringify(item))
          resizeStartMX = pos.x
          resizeStartMY = pos.y
          return
        }
      }
    }
  }

  drawing = true
  drawStartX = pos.x
  drawStartY = pos.y
  if (drawMode.value === 'freehand') {
    currentPath = [pos]
    drawLiveFreehand()
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 1) return
  e.preventDefault()
  const pos = getTouchPos(e)
  lastTouchX = pos.x
  lastTouchY = pos.y

  if (isResizing.value && selectedType.value && resizingOriginal) {
    const dx = pos.x - resizeStartMX
    const dy = pos.y - resizeStartMY
    const updated = applyResizeToShape(resizingOriginal, selectedType.value, resizeHandle.value as HandleDir, dx, dy)
    const arr = getRedactionArray(selectedType.value)
    arr.value[selectedIndex.value] = updated
    redrawAllShapes()
    return
  }

  if (!drawing) return
  if (drawMode.value === 'freehand') {
    currentPath.push(pos)
    drawLiveFreehand()
  } else {
    drawLiveShape(pos)
  }
}

function onTouchEnd() {
  if (isResizing.value) {
    isResizing.value = false
    resizeHandle.value = ''
    resizingOriginal = null
    redrawAllShapes()
    return
  }

  if (!drawing) return
  drawing = false

  if (drawMode.value === 'freehand') {
    if (currentPath.length > 1) {
      freehandRedactions.value.push({
        page: currentPage.value, points: [...currentPath], brushWidth: brushWidth.value,
      })
    }
    currentPath = []
  } else {
    const dx = lastTouchX - drawStartX
    const dy = lastTouchY - drawStartY
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
      const found = findRedactionAt(lastTouchX, lastTouchY, currentPage.value)
      if (found && found.type !== 'freehand') {
        selectRedaction(found.type, found.index)
        redrawAllShapes()
        return
      }
      deselectRedaction()
      redrawAllShapes()
      return
    }
    commitShape({ x: lastTouchX, y: lastTouchY })
    deselectRedaction()
  }

  currentPath = []
  redrawAllShapes()
}

// ── actions ──
function undoLast() {
  let popped = false
  if (freehandRedactions.value.length > 0) { freehandRedactions.value.pop(); popped = true }
  else if (polygonRedactions.value.length > 0) { polygonRedactions.value.pop(); popped = true }
  else if (ellipseRedactions.value.length > 0) { ellipseRedactions.value.pop(); popped = true }
  else if (circleRedactions.value.length > 0) { circleRedactions.value.pop(); popped = true }
  else if (roundedRectRedactions.value.length > 0) { roundedRectRedactions.value.pop(); popped = true }
  else if (rectRedactions.value.length > 0) { rectRedactions.value.pop(); popped = true }
  if (popped) deselectRedaction()
  redrawAllShapes()
}

function clearAll() {
  rectRedactions.value = []
  roundedRectRedactions.value = []
  circleRedactions.value = []
  ellipseRedactions.value = []
  polygonRedactions.value = []
  freehandRedactions.value = []
  deselectRedaction()
  redrawAllShapes()
}

function onError(msg: string) { errorMsg.value = msg }

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, outputFilename.value)
}

function continueEdit() {
  resultBlob.value = null
  store.reset()
  nextTick(() => redrawAllShapes())
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

    const roundedRects: RedactRoundedRect[] = roundedRectRedactions.value.map(r => ({
      page: r.page, x: r.x * scale, y: r.y * scale,
      width: r.width * scale, height: r.height * scale,
      rx: r.rx * scale, ry: r.ry * scale,
    }))

    // Combine circle and ellipse into "circles" for the backend (both use drawEllipse)
    const circles: RedactCircle[] = [
      ...circleRedactions.value.map(c => ({
        page: c.page, cx: c.cx * scale, cy: c.cy * scale,
        rx: c.r * scale, ry: c.r * scale,
      })),
      ...ellipseRedactions.value.map(e => ({
        page: e.page, cx: e.cx * scale, cy: e.cy * scale,
        rx: e.rx * scale, ry: e.ry * scale,
      })),
    ]

    const polygons: RedactPolygon[] = polygonRedactions.value.map(p => ({
      page: p.page, shape: p.shape as RedactPolygon['shape'],
      x: p.x * scale, y: p.y * scale,
      width: p.width * scale, height: p.height * scale,
    }))

    const paths: RedactPath[] = freehandRedactions.value.map(p => ({
      page: p.page,
      points: p.points.map(pt => ({ x: pt.x * scale, y: pt.y * scale })),
      brushWidth: p.brushWidth * scale,
    }))

    const blob = await redactPdf(
      selectedFile.value,
      { rects, circles, roundedRects, polygons, paths },
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
  deselectRedaction()
  await nextTick()
  await renderPage(currentPage.value)
})

// ── lifecycle ──
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    deselectRedaction()
    redrawAllShapes()
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedType.value && selectedIndex.value >= 0) {
      const arr = getRedactionArray(selectedType.value)
      arr.value.splice(selectedIndex.value, 1)
      deselectRedaction()
      redrawAllShapes()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
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
  window.removeEventListener('keydown', onKeyDown)
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
})
</script>

<style scoped>
.tool-page { max-width: 1040px; margin: 0 auto; }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); font-size: 0.875rem; }

/* ── Compact file bar ── */
.file-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  font-size: 0.75rem; color: var(--color-text-secondary);
}
.file-bar__icon { font-size: 1rem; flex-shrink: 0; }
.file-bar__name { font-weight: 600; color: var(--color-text); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-bar__meta { white-space: nowrap; }
.file-bar__pages { background: var(--color-bg-tertiary); padding: 0 6px; border-radius: var(--radius-sm); white-space: nowrap; }
.file-bar__act {
  margin-left: auto; width: 22px; height: 22px; padding: 0;
  border: 1px solid var(--color-border); border-radius: 50%;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
  font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.file-bar__act:hover { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.file-bar__del {
  width: 22px; height: 22px; padding: 0;
  border: 1px solid var(--color-border); border-radius: 50%;
  background: var(--color-bg-tertiary); color: var(--color-text-secondary);
  font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.file-bar__del:hover { background: #dc2626; color: #fff; border-color: #dc2626; }

.options { margin-top: var(--spacing-md); display: flex; flex-direction: column; gap: var(--spacing-sm); }

/* ── Compact Toolbar ── */
.toolbar {
  display: flex; align-items: center; gap: 2px;
  padding: 4px 8px;
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); flex-wrap: nowrap; overflow-x: auto;
}
.toolbar__tools { display: flex; gap: 1px; flex-shrink: 0; }
.tool-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); background: var(--color-bg-tertiary);
  color: var(--color-text); cursor: pointer;
  transition: all 0.15s ease; flex-shrink: 0;
}
.tool-btn:hover { background: var(--color-bg); border-color: var(--color-primary); }
.tool-btn--active {
  background: var(--color-primary); color: #fff;
  border-color: var(--color-primary); font-weight: 600;
}
.tool-btn__icon { font-size: 1rem; line-height: 1; }

.toolbar__divider { width: 1px; height: 22px; background: var(--color-border); margin: 0 6px; flex-shrink: 0; }

.toolbar__brush { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.brush-btn {
  width: 22px; height: 22px; border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); background: var(--color-bg-tertiary);
  color: var(--color-text); font-size: 0.75rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.brush-btn:hover { background: var(--color-bg); }
.brush-slider { width: 60px; accent-color: var(--color-primary); margin: 0 2px; }
.brush-value { font-size: 0.6875rem; color: var(--color-text-secondary); min-width: 28px; text-align: right; flex-shrink: 0; }

.toolbar__actions { display: flex; gap: 2px; flex-shrink: 0; }
.act-btn {
  width: 32px; height: 32px; padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); background: var(--color-bg-tertiary);
  color: var(--color-text); font-size: 0.875rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.act-btn:hover:not(:disabled) { background: var(--color-bg); }
.act-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.act-btn--danger:hover:not(:disabled) { color: #dc2626; border-color: #dc2626; }

/* ── Page nav (inside toolbar) ── */
.toolbar__nav { display: flex; align-items: center; gap: 2px; flex-shrink: 0; margin-left: auto; }
.nav-btn {
  width: 28px; height: 28px; padding: 0;
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  cursor: pointer; background: var(--color-bg-tertiary); color: var(--color-text);
  font-size: 0.75rem; display: flex; align-items: center; justify-content: center;
}
.nav-btn:hover:not(:disabled) { background: var(--color-bg); border-color: var(--color-primary); }
.nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-indicator { font-size: 0.75rem; color: var(--color-text-secondary); font-weight: 500; white-space: nowrap; margin: 0 4px; }

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

.action-card__result { display: flex; flex-direction: column; gap: 6px; }
.result-title { font-weight: 600; font-size: 0.9375rem; margin: 0; }
.result-filename { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; word-break: break-all; }
.result-actions { display: flex; gap: 8px; }
.result-btn {
  flex: 1; padding: 8px 0; font-size: 0.875rem; border: none;
  border-radius: var(--radius-md); cursor: pointer; font-weight: 600;
}
.result-edit-btn {
  flex: 1; padding: 8px 0; font-size: 0.875rem;
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg); color: var(--color-text); cursor: pointer; font-weight: 600;
}
.result-edit-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

.error { color: var(--color-error); font-size: 0.875rem; text-align: center; margin-top: var(--spacing-md); }
</style>
