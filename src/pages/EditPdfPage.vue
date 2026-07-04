<template>
  <div class="tool-page container">
    <h1 class="tool-title"><Edit3 :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('editPdf.title') }}</h1>
    <p class="tool-desc">{{ $t('editPdf.desc') }}</p>

    <FileDropZone
      v-if="!selectedFile"
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />

    <!-- ── File bar ── -->
    <div v-if="selectedFile" class="file-bar">
      <FileText :size="20" :stroke-width="1.5" class="file-bar__icon" />
      <span class="file-bar__name">{{ selectedFile.name }}</span>
      <span class="file-bar__meta">{{ formatFileSize(selectedFile.size) }}</span>
      <span v-if="pageCount > 0" class="file-bar__pages">{{ $t('common.pages', { n: pageCount }) }}</span>
      <input ref="reSelectRef" type="file" accept=".pdf" hidden @change="onReSelect" />
      <button class="file-bar__act" :title="$t('common.reSelect')" @click="reSelectRef?.click()">
        <FolderOpen :size="18" :stroke-width="1.5" />
      </button>
      <button class="file-bar__del" title="移除" @click="removeFile">✕</button>
    </div>

    <!-- ── Toolbar ── -->
    <div v-if="selectedFile" class="toolbar">
      <div class="toolbar__tools">
        <button
          v-for="mode in toolModes"
          :key="mode.key"
          class="tool-btn"
          :class="{ 'tool-btn--active': drawMode === mode.key }"
          :title="$t(mode.labelKey)"
          @click="setDrawMode(mode.key)"
        >
          <component :is="mode.icon" :size="18" :stroke-width="2" />
        </button>
      </div>

      <div class="toolbar__divider"></div>

      <div class="toolbar__actions">
        <button class="act-btn" :title="$t('editPdf.toolDelete')" @click="deleteSelected" :disabled="selectedIdx < 0">🗑</button>
        <button class="act-btn act-btn--danger" :title="$t('editPdf.clearAll')" @click="clearAll" :disabled="edits.length === 0">✕</button>
      </div>

      <div class="toolbar__divider"></div>

      <div class="toolbar__nav">
        <button class="nav-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">◀</button>
        <span class="page-indicator">{{ currentPage }} / {{ pageCount }}</span>
        <button class="nav-btn" :disabled="currentPage >= pageCount" @click="goToPage(currentPage + 1)">▶</button>
      </div>
    </div>

    <!-- ── Canvas stack ── -->
    <div v-if="selectedFile" ref="canvasContainerRef" class="canvas-container">
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

    <!-- ── Text input popup ── -->
    <Teleport to="body">
      <div v-if="showTextPopup" class="text-popup-overlay" @mousedown.prevent.stop @click.stop>
        <div class="text-popup" :style="{ left: textPopupPos.x + 'px', top: textPopupPos.y + 'px' }">
          <div class="text-popup__header">{{ $t('editPdf.textPopupTitle') }}</div>
          <textarea
            v-model="textInput"
            class="text-popup__textarea"
            :placeholder="$t('editPdf.textPlaceholder')"
            rows="3"
            autofocus
          ></textarea>
          <div class="text-popup__options">
            <div class="text-popup__field">
              <label>{{ $t('editPdf.fontSize') }}</label>
              <select v-model="textFontSize">
                <option v-for="s in fontSizes" :key="s" :value="s">{{ s }}px</option>
              </select>
            </div>
            <div class="text-popup__field">
              <label>{{ $t('editPdf.font') }}</label>
              <select v-model="textFontFamily">
                <option value="Helvetica">Helvetica</option>
                <option value="Times Roman">Times Roman</option>
                <option value="Noto Sans SC">Noto Sans SC (中文)</option>
              </select>
            </div>
            <div class="text-popup__field">
              <label>{{ $t('editPdf.color') }}</label>
              <input type="color" v-model="textColor" />
            </div>
          </div>
          <div class="text-popup__actions">
            <button class="btn btn--secondary btn--sm" @click="cancelTextPopup">{{ $t('editPdf.cancel') }}</button>
            <button class="btn btn--primary btn--sm" @click="confirmText" :disabled="!textInput.trim()">
              {{ $t('editPdf.addText') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Image file input (hidden) ── -->
    <input ref="imageInputRef" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onImageSelected" />

    <!-- ── Stats bar ── -->
    <div v-if="selectedFile && pageEdits.length > 0" class="stats-bar">
      <span>{{ $t('editPdf.elementsCount', { n: totalEdits }) }}</span>
      <span class="stats-breakdown">
        {{ textCount }}T {{ imageCount }}🖼 {{ whiteoutCount }}▭
      </span>
    </div>

    <!-- ── Action card ── -->
    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        :disabled="edits.length === 0"
        @click="process"
      >
        {{ $t('editPdf.applyBtn') }}
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
        <div class="result-row">
          <p class="result-title">✅ {{ $t('editPdf.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
        </div>
        <div class="result-actions">
          <button class="btn result-edit-btn" @click="continueEdit">
            ✎ {{ $t('editPdf.continueEdit') }}
          </button>
          <button class="btn btn--primary result-btn" @click="downloadResult">
            ⬇ {{ $t('common.downloadFile') }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent ns="editPdf" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, FolderOpen, Type, Image, Square, Edit3 } from 'lucide-vue-next'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { applyEdits, type Edit, type TextEdit, type ImageEdit, type WhiteoutEdit } from '@/services/pdfEditService'

type DrawMode = 'text' | 'image' | 'whiteout'

interface Point { x: number; y: number }

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
const reSelectRef = ref<HTMLInputElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const pdfCanvasRef = ref<HTMLCanvasElement | null>(null)
const drawCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasStackRef = ref<HTMLDivElement | null>(null)

const drawMode = ref<DrawMode>('text')
const edits = ref<Edit[]>([])

// Selection
const selectedIdx = ref(-1)
const isDragging = ref(false)
let dragStartMX = 0
let dragStartMY = 0
let dragOrigX = 0
let dragOrigY = 0

// Whiteout drawing
let drawing = false
let drawStartX = 0
let drawStartY = 0

// Text popup
const showTextPopup = ref(false)
const textInput = ref('')
const textFontSize = ref(16)
const textColor = ref('#000000')
const textFontFamily = ref('Noto Sans SC')
const textPopupPos = ref({ x: 0, y: 0 })
let pendingTextPos: Point = { x: 0, y: 0 }

const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72]

// ── non-reactive vars ──
let objectUrl: string | null = null
let pdfDoc: any = null
let pdfBuffer: ArrayBuffer | null = null
let pageRenderedScale = 1.5
let pdfPageSizes: { width: number; height: number }[] = []
let containerWidth = 800
let resizeObserver: ResizeObserver | null = null
const imageCache = new Map<string, HTMLImageElement>()

// ── computed ──
const toolModes = computed(() => [
  { key: 'text' as DrawMode, icon: Type, labelKey: 'editPdf.toolText' },
  { key: 'image' as DrawMode, icon: Image, labelKey: 'editPdf.toolImage' },
  { key: 'whiteout' as DrawMode, icon: Square, labelKey: 'editPdf.toolWhiteout' },
])

const pageEdits = computed(() => edits.value.filter((e) => e.page === currentPage.value))

const totalEdits = computed(() => edits.value.length)
const textCount = computed(() => edits.value.filter((e) => e.type === 'text').length)
const imageCount = computed(() => edits.value.filter((e) => e.type === 'image').length)
const whiteoutCount = computed(() => edits.value.filter((e) => e.type === 'whiteout').length)

const cursorStyle = computed(() => {
  const modeCursors: Record<DrawMode, string> = { text: 'text', image: 'copy', whiteout: 'crosshair' }
  if (selectedIdx.value >= 0 && isDragging.value) return 'grabbing'
  if (selectedIdx.value >= 0) return 'grab'
  return modeCursors[drawMode.value] || 'default'
})

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

function getEditBBox(edit: Edit): { x: number; y: number; w: number; h: number } | null {
  switch (edit.type) {
    case 'text': return {
      x: edit.x, y: edit.y,
      w: (edit.text || '').length * edit.fontSize * 0.6,
      h: edit.fontSize * 1.4,
    }
    case 'image': return { x: edit.x, y: edit.y, w: edit.width, h: edit.height }
    case 'whiteout': return { x: edit.x, y: edit.y, w: edit.width, h: edit.height }
  }
}

function hitTest(point: Point, edit: Edit): boolean {
  const bb = getEditBBox(edit)
  if (!bb) return false
  return point.x >= bb.x && point.x <= bb.x + bb.w && point.y >= bb.y && point.y <= bb.y + bb.h
}

function setDrawMode(mode: DrawMode) {
  drawMode.value = mode
  selectedIdx.value = -1
  redrawOverlay()
}

// ── Text popup ──
function openTextPopup(canvasX: number, canvasY: number) {
  pendingTextPos = { x: canvasX, y: canvasY }
  textInput.value = ''
  textFontSize.value = 16
  textColor.value = '#000000'
  textFontFamily.value = 'Noto Sans SC'

  // Position popup near canvas click but within viewport
  const canvas = drawCanvasRef.value!
  const rect = canvas.getBoundingClientRect()
  let px = rect.left + canvasX + 10
  let py = rect.top + canvasY - 10
  if (px + 300 > window.innerWidth) px = window.innerWidth - 310
  if (py + 260 > window.innerHeight) py = window.innerHeight - 270
  if (px < 0) px = 10
  if (py < 0) py = 10
  textPopupPos.value = { x: px, y: py }
  showTextPopup.value = true
}

function confirmText() {
  if (!textInput.value.trim()) return
  const edit: TextEdit = {
    type: 'text',
    page: currentPage.value,
    x: pendingTextPos.x,
    y: pendingTextPos.y,
    text: textInput.value.trim(),
    fontSize: textFontSize.value,
    color: textColor.value,
    fontFamily: textFontFamily.value,
  }
  edits.value.push(edit)
  showTextPopup.value = false
  selectedIdx.value = edits.value.length - 1
  redrawOverlay()
}

function cancelTextPopup() {
  showTextPopup.value = false
}

// ── Image ──
function openImagePicker(canvasX: number, canvasY: number) {
  pendingTextPos = { x: canvasX, y: canvasY }
  imageInputRef.value?.click()
}

async function onImageSelected() {
  const file = imageInputRef.value?.files?.[0]
  if (!file) return

  // Reset input so re-select same file triggers change
  if (imageInputRef.value) imageInputRef.value.value = ''

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  // Get natural dimensions
  const img = document.createElement('img')
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = dataUrl
  })

  // Scale to fit ~200px wide on canvas
  const maxW = 200
  const scaleFactor = Math.min(1, maxW / img.naturalWidth)
  const w = Math.round(img.naturalWidth * scaleFactor)
  const h = Math.round(img.naturalHeight * scaleFactor)

  const edit: ImageEdit = {
    type: 'image',
    page: currentPage.value,
    x: pendingTextPos.x,
    y: pendingTextPos.y,
    width: w,
    height: h,
    dataUrl,
  }
  imageCache.set(dataUrl, img)
  edits.value.push(edit)
  selectedIdx.value = edits.value.length - 1
  redrawOverlay()
}

// ── Page rendering ──
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

  redrawOverlay()
}

function redrawOverlay() {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const cp = currentPage.value

  for (let i = 0; i < edits.value.length; i++) {
    const edit = edits.value[i]
    if (edit.page !== cp) continue

    const isSelected = selectedIdx.value === i

    switch (edit.type) {
      case 'whiteout': {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(180, 180, 180, 0.8)'
        ctx.lineWidth = isSelected ? 2 : 1
        if (isSelected) ctx.setLineDash([4, 2])
        ctx.fillRect(edit.x, edit.y, edit.width, edit.height)
        ctx.strokeRect(edit.x, edit.y, edit.width, edit.height)
        ctx.setLineDash([])
        break
      }

      case 'text': {
        const fs = edit.fontSize
        ctx.font = `${fs}px "${edit.fontFamily}", sans-serif`
        ctx.fillStyle = edit.color
        ctx.fillText(edit.text, edit.x, edit.y + fs)

        if (isSelected) {
          const tw = ctx.measureText(edit.text || '').width
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2
          ctx.setLineDash([4, 2])
          ctx.strokeRect(edit.x, edit.y, tw, fs * 1.4)
          ctx.setLineDash([])
        }
        break
      }

      case 'image': {
        // Draw placeholder border
        ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(59, 130, 246, 0.4)'
        ctx.lineWidth = isSelected ? 2 : 1
        if (isSelected) ctx.setLineDash([4, 2])
        ctx.fillStyle = 'rgba(59, 130, 246, 0.08)'
        ctx.fillRect(edit.x, edit.y, edit.width, edit.height)
        ctx.strokeRect(edit.x, edit.y, edit.width, edit.height)
        ctx.setLineDash([])

        // Draw image from cache (preloaded when inserted)
        const img = imageCache.get(edit.dataUrl)
        if (img && img.complete) {
          try { ctx.drawImage(img, edit.x, edit.y, edit.width, edit.height) } catch { /* ignore */ }
        }
        break
      }
    }
  }
}

function drawLiveWhiteout(pos: Point) {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  redrawOverlay()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.strokeStyle = '#ff4444'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 2])
  const x = Math.min(drawStartX, pos.x), y = Math.min(drawStartY, pos.y)
  const w = Math.abs(pos.x - drawStartX), h = Math.abs(pos.y - drawStartY)
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])
}

// ── Mouse events ──
function onPointerDown(e: MouseEvent) {
  if (e.button !== 0) return
  const pos = getCanvasPos(e)

  // Check if clicking on a selected element to start drag
  if (selectedIdx.value >= 0) {
    const edit = edits.value[selectedIdx.value]
    if (edit.page === currentPage.value && hitTest(pos, edit)) {
      isDragging.value = true
      dragStartMX = pos.x
      dragStartMY = pos.y
      const bb = getEditBBox(edit)!
      dragOrigX = bb.x
      dragOrigY = bb.y
      return
    }
  }

  // Check if clicking on any element to select
  for (let i = pageEdits.value.length - 1; i >= 0; i--) {
    const edit = pageEdits.value[i]
    if (hitTest(pos, edit)) {
      selectedIdx.value = edits.value.indexOf(edit)
      redrawOverlay()
      return
    }
  }
  selectedIdx.value = -1

  // Handle tool action
  if (drawMode.value === 'text') {
    openTextPopup(pos.x, pos.y)
    return
  }

  if (drawMode.value === 'image') {
    openImagePicker(pos.x, pos.y)
    return
  }

  if (drawMode.value === 'whiteout') {
    drawing = true
    drawStartX = pos.x
    drawStartY = pos.y
  }
}

function onPointerMove(e: MouseEvent) {
  const pos = getCanvasPos(e)

  if (isDragging.value && selectedIdx.value >= 0) {
    const dx = pos.x - dragStartMX
    const dy = pos.y - dragStartMY
    const edit = edits.value[selectedIdx.value]
    if (edit.type === 'text') {
      edit.x = dragOrigX + dx
      edit.y = dragOrigY + dy
    } else if (edit.type === 'image' || edit.type === 'whiteout') {
      edit.x = dragOrigX + dx
      edit.y = dragOrigY + dy
    }
    redrawOverlay()
    return
  }

  if (drawing) {
    drawLiveWhiteout(pos)
  }
}

function onPointerUp(e: MouseEvent) {
  if (isDragging.value) {
    isDragging.value = false
    redrawOverlay()
    return
  }

  if (!drawing) return
  drawing = false
  const pos = getCanvasPos(e)
  const x = Math.min(drawStartX, pos.x)
  const y = Math.min(drawStartY, pos.y)
  const w = Math.abs(pos.x - drawStartX)
  const h = Math.abs(pos.y - drawStartY)
  if (w < 3 || h < 3) return

  const edit: WhiteoutEdit = {
    type: 'whiteout',
    page: currentPage.value,
    x, y, width: w, height: h,
  }
  edits.value.push(edit)
  redrawOverlay()
}

// ── Touch events ──
let lastTouchX = 0
let lastTouchY = 0

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  e.preventDefault()
  const pos = getTouchPos(e)

  if (isDragging.value && selectedIdx.value >= 0) {
    dragStartMX = pos.x
    dragStartMY = pos.y
    return
  }

  // Check hit test
  for (let i = pageEdits.value.length - 1; i >= 0; i--) {
    const edit = pageEdits.value[i]
    if (hitTest(pos, edit)) {
      selectedIdx.value = edits.value.indexOf(edit)
      isDragging.value = true
      dragStartMX = pos.x
      dragStartMY = pos.y
      const bb = getEditBBox(edit)!
      dragOrigX = bb.x; dragOrigY = bb.y
      redrawOverlay()
      return
    }
  }
  selectedIdx.value = -1

  if (drawMode.value === 'text') {
    openTextPopup(pos.x, pos.y)
    return
  }
  if (drawMode.value === 'image') {
    openImagePicker(pos.x, pos.y)
    return
  }
  if (drawMode.value === 'whiteout') {
    drawing = true
    drawStartX = pos.x
    drawStartY = pos.y
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 1) return
  e.preventDefault()
  const pos = getTouchPos(e)
  lastTouchX = pos.x; lastTouchY = pos.y

  if (isDragging.value && selectedIdx.value >= 0) {
    const dx = pos.x - dragStartMX
    const dy = pos.y - dragStartMY
    const edit = edits.value[selectedIdx.value]
    if (edit.type === 'text') { edit.x = dragOrigX + dx; edit.y = dragOrigY + dy }
    else if (edit.type === 'image' || edit.type === 'whiteout') { edit.x = dragOrigX + dx; edit.y = dragOrigY + dy }
    redrawOverlay()
    return
  }
  if (drawing) drawLiveWhiteout(pos)
}

function onTouchEnd() {
  if (isDragging.value) { isDragging.value = false; redrawOverlay(); return }
  if (!drawing) return
  drawing = false
  const x = Math.min(drawStartX, lastTouchX), y = Math.min(drawStartY, lastTouchY)
  const w = Math.abs(lastTouchX - drawStartX), h = Math.abs(lastTouchY - drawStartY)
  if (w < 3 || h < 3) return
  edits.value.push({ type: 'whiteout', page: currentPage.value, x, y, width: w, height: h } as WhiteoutEdit)
  redrawOverlay()
}

// ── Actions ──
function deleteSelected() {
  if (selectedIdx.value < 0) return
  edits.value.splice(selectedIdx.value, 1)
  selectedIdx.value = -1
  redrawOverlay()
}

function clearAll() {
  edits.value = []
  selectedIdx.value = -1
  redrawOverlay()
}

function goToPage(page: number) {
  currentPage.value = page
}

// ── File handlers ──
async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'edited')
  clearAll()
  currentPage.value = 1

  try {
    pdfBuffer = await readFileAsArrayBuffer(selectedFile.value)
    pdfDoc = await pdfjsLib.getDocument({ data: pdfBuffer, ...DEFAULT_PDF_OPTIONS }).promise
    pageCount.value = pdfDoc.numPages

    // Collect page sizes
    pdfPageSizes = []
    for (let i = 1; i <= pageCount.value; i++) {
      const page = await pdfDoc.getPage(i)
      const vp = page.getViewport({ scale: 1 })
      pdfPageSizes.push({ width: vp.width, height: vp.height })
    }

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
  pdfDoc = null
  pdfBuffer = null
  pdfPageSizes = []
  clearAll()
}

function onReSelect() {
  const files = reSelectRef.value?.files
  if (files && files.length > 0) onFileSelected(files[0])
}

function onError(msg: string) { errorMsg.value = msg }

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, outputFilename.value)
}

function continueEdit() {
  resultBlob.value = null
  store.reset()
  nextTick(() => redrawOverlay())
}

// ── Process ──
async function process() {
  if (!selectedFile.value || edits.value.length === 0) return
  errorMsg.value = ''
  store.startProcessing(t('editPdf.processing'))

  try {
    const blob = await applyEdits(
      selectedFile.value,
      edits.value,
      pageRenderedScale,
      pdfPageSizes,
      (p) => store.updateProgress(p),
      (s) => store.updateProgress(progress.value, s),
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e: any) {
    const msg = e?.message || t('common.failed')
    store.setError(msg)
    errorMsg.value = msg
  }
}

// ── Keyboard ──
function onKeyDown(e: KeyboardEvent) {
  if (showTextPopup.value) return
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
  if (e.key === 'Escape') { selectedIdx.value = -1; redrawOverlay() }
}

// ── Watchers ──
watch(currentPage, async () => {
  selectedIdx.value = -1
  await nextTick()
  await renderPage(currentPage.value)
})

// ── Lifecycle ──
onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  resizeObserver = new ResizeObserver(() => {
    if (pdfDoc && currentPage.value > 0) renderPage(currentPage.value)
  })
  if (canvasContainerRef.value) resizeObserver.observe(canvasContainerRef.value)
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
.tool-title__icon { vertical-align: middle; margin-right: 4px; }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); font-size: 0.875rem; }

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

.toolbar {
  display: flex; align-items: center; gap: 2px;
  padding: 4px 8px; margin-top: var(--spacing-md);
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); flex-wrap: nowrap; overflow-x: auto;
}
.toolbar__tools { display: flex; gap: 2px; flex-shrink: 0; }
.tool-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); background: var(--color-bg-tertiary);
  color: var(--color-text); cursor: pointer;
  transition: all 0.15s ease; flex-shrink: 0;
}
.tool-btn:hover { background: var(--color-bg); border-color: var(--color-primary); }
.tool-btn--active {
  background: var(--color-primary); color: #fff;
  border-color: var(--color-primary);
}
.toolbar__divider { width: 1px; height: 22px; background: var(--color-border); margin: 0 6px; flex-shrink: 0; }
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

.canvas-container {
  margin-top: var(--spacing-sm);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  overflow: auto; max-height: 70vh; min-height: 200px;
  background: #e5e5e5; text-align: center;
}
.canvas-stack { position: relative; display: inline-block; margin: 0 auto; }
.pdf-canvas, .draw-canvas { position: absolute; top: 0; left: 0; display: block; }
.pdf-canvas { z-index: 1; }
.draw-canvas { z-index: 2; }

.stats-bar {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.8125rem; color: var(--color-text-secondary);
  padding: 4px 0; margin-top: var(--spacing-sm);
}
.stats-breakdown { font-size: 0.75rem; opacity: 0.7; }

/* Text popup overlay */
.text-popup-overlay { position: fixed; inset: 0; z-index: 9999; }
.text-popup {
  position: fixed;
  width: 300px; background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  padding: var(--spacing-md); z-index: 10000;
  display: flex; flex-direction: column; gap: var(--spacing-sm);
}
.text-popup__header { font-size: 0.875rem; font-weight: 600; }
.text-popup__textarea {
  width: 100%; min-height: 60px; padding: 8px;
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  font-size: 0.875rem; font-family: inherit; resize: vertical;
  background: var(--color-bg); color: var(--color-text);
}
.text-popup__options { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.text-popup__field { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; }
.text-popup__field label { white-space: nowrap; color: var(--color-text-secondary); }
.text-popup__field select {
  padding: 2px 4px; border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); font-size: 0.75rem;
  background: var(--color-bg); color: var(--color-text);
}
.text-popup__field input[type="color"] {
  width: 28px; height: 24px; border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); padding: 1px; cursor: pointer;
}
.text-popup__actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); }
.btn--sm { padding: 4px 14px; font-size: 0.8125rem; border: none; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; }
.btn--secondary { background: var(--color-bg-tertiary); color: var(--color-text); border: 1px solid var(--color-border); }
.btn--secondary:hover { border-color: var(--color-primary); }

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

.action-card__result { display: flex; flex-direction: column; gap: 8px; }
.result-row { display: flex; flex-direction: column; gap: 4px; }
.result-title { font-weight: 600; font-size: 0.9375rem; margin: 0; }
.result-filename { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; word-break: break-all; }
.result-actions { display: flex; gap: 8px; }
.result-btn { flex: 1; padding: 8px 0; font-size: 0.875rem; border: none; border-radius: var(--radius-md); cursor: pointer; font-weight: 600; }
.result-edit-btn { flex: 1; padding: 8px 0; font-size: 0.875rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); color: var(--color-text); cursor: pointer; font-weight: 600; }
.result-edit-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

.error { color: var(--color-error); font-size: 0.875rem; text-align: center; margin-top: var(--spacing-md); }
</style>
