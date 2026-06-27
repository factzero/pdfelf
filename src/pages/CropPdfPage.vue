<template>
  <div class="tool-page">
    <h1 class="tool-title">{{ $t('crop.title') }}</h1>
    <p class="tool-desc">{{ $t('crop.desc') }}</p>

    <FileDropZone v-if="!selectedFile" :accept="['pdf']" @file-selected="onFileSelected" @error="errorMsg = $event" />

    <!-- 文件信息栏 -->
    <div v-if="selectedFile" class="file-info-bar">
      <span class="file-info-bar__name" :title="selectedFile.name">{{ selectedFile.name }}</span>
      <button class="file-info-bar__remove" @click="removeFile" :title="$t('crop.changeFile')">✕</button>
    </div>

    <!-- 裁剪主布局：左侧预览 + 右侧控制 -->
    <div v-if="selectedFile" class="crop-layout">
      <!-- 左侧：预览区 -->
      <div class="crop-preview-panel">
        <div class="preview-viewport" ref="viewportRef" @mousedown="onViewportMouseDown">
          <canvas ref="canvasRef" class="preview-canvas" />
          <!-- 裁剪框 -->
          <div
            v-if="cropRect"
            class="crop-region"
            :style="cropRectStyle"
            @mousedown.stop="onCropRectMouseDown"
          >
            <div class="crop-region__inside" />
            <!-- 8 个拖拽手柄 -->
            <div class="crop-handle handle-nw" @mousedown.stop="onHandleMouseDown($event, 'nw')" />
            <div class="crop-handle handle-n" @mousedown.stop="onHandleMouseDown($event, 'n')" />
            <div class="crop-handle handle-ne" @mousedown.stop="onHandleMouseDown($event, 'ne')" />
            <div class="crop-handle handle-e" @mousedown.stop="onHandleMouseDown($event, 'e')" />
            <div class="crop-handle handle-se" @mousedown.stop="onHandleMouseDown($event, 'se')" />
            <div class="crop-handle handle-s" @mousedown.stop="onHandleMouseDown($event, 's')" />
            <div class="crop-handle handle-sw" @mousedown.stop="onHandleMouseDown($event, 'sw')" />
            <div class="crop-handle handle-w" @mousedown.stop="onHandleMouseDown($event, 'w')" />
          </div>
        </div>
        <!-- 页码导航 -->
        <div class="page-nav">
          <button class="nav-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">←</button>
          <span class="page-indicator">{{ $t('crop.pageOf', { current: currentPage, total: pageCount }) }}</span>
          <button class="nav-btn" :disabled="currentPage >= pageCount" @click="goToPage(currentPage + 1)">→</button>
        </div>
      </div>

      <!-- 右侧：控制面板 -->
      <div class="crop-control-bar">
        <p class="control-hint">{{ $t('crop.dragHint') }}</p>
        <button class="btn btn--outline reset-btn" @click="resetCrop">{{ $t('crop.resetAll') }}</button>
        <div class="page-scope">
          <label class="scope-option" :class="{ active: applyScope === 'all' }">
            <input v-model="applyScope" type="radio" value="all" />
            <span>{{ $t('crop.allPages') }}</span>
          </label>
          <label class="scope-option" :class="{ active: applyScope === 'current' }">
            <input v-model="applyScope" type="radio" value="current" />
            <span>{{ $t('crop.currentPage') }}</span>
          </label>
        </div>
        <button
          class="btn btn--primary crop-action-btn"
          :disabled="!cropRect"
          @click="doCrop"
        >
          {{ $t('crop.cropBtn') }}
        </button>
      </div>
    </div>

    <!-- 处理中：进度条 -->
    <div v-if="isProcessing" class="action-card">
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

    <ToolSeoContent ns="crop" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, downloadBlob } from '@/utils/fileUtils'
import { cropPDF } from '@/services/pdfService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const outputFilename = ref('')
const errorMsg = ref('')
const currentPage = ref(1)
const applyScope = ref<'all' | 'current'>('all')

const canvasRef = ref<HTMLCanvasElement | null>(null)
const viewportRef = ref<HTMLDivElement | null>(null)

// 裁剪矩形 (相对于 canvas 的像素坐标)
interface CropRect { x: number; y: number; w: number; h: number }
const cropRect = ref<CropRect | null>(null)

const cropRectStyle = computed(() => {
  if (!cropRect.value) return {}
  const r = cropRect.value
  return {
    left: `${r.x}px`,
    top: `${r.y}px`,
    width: `${r.w}px`,
    height: `${r.h}px`,
  }
})

let objectUrl: string | null = null
let pdfDoc: any = null
let canvasScale = 1

// ====== PDF 渲染 ======

async function renderPage(pageNum: number) {
  if (!pdfDoc || !canvasRef.value || !viewportRef.value) return
  const page = await pdfDoc.getPage(pageNum)
  const containerWidth = viewportRef.value.clientWidth
  const viewport = page.getViewport({ scale: 1 })
  canvasScale = containerWidth / viewport.width
  const scaledViewport = page.getViewport({ scale: canvasScale })

  const canvas = canvasRef.value
  canvas.width = Math.floor(scaledViewport.width)
  canvas.height = Math.floor(scaledViewport.height)
  canvas.style.width = `${scaledViewport.width}px`
  canvas.style.height = `${scaledViewport.height}px`

  const ctx = canvas.getContext('2d')
  if (ctx) {
    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
  }
  page.cleanup()
}

function goToPage(p: number) {
  if (p < 1 || p > pageCount.value) return
  currentPage.value = p
  cropRect.value = null
  nextTick(() => renderPage(p))
}

// ====== 文件加载 ======

async function onFileSelected(file: File | File[]) {
  const f = Array.isArray(file) ? file[0] : file
  errorMsg.value = ''
  cropRect.value = null
  currentPage.value = 1
  selectedFile.value = f
  outputFilename.value = generateOutputFilename(f.name, 'pdf', 'cropped')

  try {
    const buffer = await readFileAsArrayBuffer(f)
    pdfDoc = await pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS }).promise
    pageCount.value = pdfDoc.numPages
    await nextTick()
    await renderPage(1)
  } catch {
    pageCount.value = 0
  }
}

function removeFile() {
  if (pdfDoc) { pdfDoc.cleanup(); pdfDoc = null }
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = null
  pageCount.value = 0
  cropRect.value = null
  errorMsg.value = ''
  cropRect.value = null
}

// ====== 交互：创建/调整裁剪框 ======

type DragMode = 'none' | 'create' | 'move' | 'resize'
type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const dragMode = ref<DragMode>('none')
const dragStart = ref({ x: 0, y: 0 })
const rectStart = ref<CropRect>({ x: 0, y: 0, w: 0, h: 0 })
const resizeDir = ref<HandleDir>('se')

function getViewportPos(e: MouseEvent): { x: number; y: number } {
  const rect = viewportRef.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function clampRect(r: CropRect): CropRect {
  const cw = canvasRef.value?.width || 0
  const ch = canvasRef.value?.height || 0
  return {
    x: Math.max(0, Math.min(r.x, cw - 1)),
    y: Math.max(0, Math.min(r.y, ch - 1)),
    w: Math.max(10, Math.min(r.w, cw - r.x)),
    h: Math.max(10, Math.min(r.h, ch - r.y)),
  }
}

function onViewportMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const pos = getViewportPos(e)
  dragMode.value = 'create'
  dragStart.value = pos
  cropRect.value = { x: pos.x, y: pos.y, w: 0, h: 0 }
}

function onCropRectMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  dragMode.value = 'move'
  dragStart.value = getViewportPos(e)
  rectStart.value = { ...cropRect.value! }
}

function onHandleMouseDown(e: MouseEvent, dir: HandleDir) {
  if (e.button !== 0) return
  dragMode.value = 'resize'
  resizeDir.value = dir
  dragStart.value = getViewportPos(e)
  rectStart.value = { ...cropRect.value! }
}

function onMouseMove(e: MouseEvent) {
  if (dragMode.value === 'none') return
  const pos = getViewportPos(e)
  const dx = pos.x - dragStart.value.x
  const dy = pos.y - dragStart.value.y

  if (dragMode.value === 'create') {
    const x1 = dragStart.value.x
    const y1 = dragStart.value.y
    cropRect.value = clampRect({
      x: Math.min(x1, pos.x),
      y: Math.min(y1, pos.y),
      w: Math.abs(dx),
      h: Math.abs(dy),
    })
  } else if (dragMode.value === 'move') {
    const rs = rectStart.value
    const cw = canvasRef.value?.width || 0
    const ch = canvasRef.value?.height || 0
    cropRect.value = clampRect({
      x: rs.x + dx,
      y: rs.y + dy,
      w: rs.w,
      h: rs.h,
    })
  } else if (dragMode.value === 'resize') {
    const rs = rectStart.value
    const dir = resizeDir.value
    let { x, y, w, h } = rs
    if (dir.includes('e')) w = rs.w + dx
    if (dir.includes('w')) { x = rs.x + dx; w = rs.w - dx }
    if (dir.includes('s')) h = rs.h + dy
    if (dir.includes('n')) { y = rs.y + dy; h = rs.h - dy }
    cropRect.value = clampRect({ x, y, w, h })
  }
}

function onMouseUp() {
  if (dragMode.value === 'create' && cropRect.value && cropRect.value.w < 10 && cropRect.value.h < 10) {
    cropRect.value = null
  }
  dragMode.value = 'none'
}

function resetCrop() {
  cropRect.value = null
}

// 全局鼠标事件
onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  if (pdfDoc) { pdfDoc.cleanup(); pdfDoc = null }
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
})

// ====== 执行裁剪 ======

function getCropRectInPoints(): { x: number; y: number; width: number; height: number } | null {
  if (!cropRect.value) return null
  const r = cropRect.value
  return {
    x: Math.round(r.x / canvasScale),
    y: Math.round(r.y / canvasScale),
    width: Math.round(r.w / canvasScale),
    height: Math.round(r.h / canvasScale),
  }
}

async function doCrop() {
  if (!selectedFile.value) return
  const rect = getCropRectInPoints()
  if (!rect) return

  errorMsg.value = ''
  store.startProcessing(t('crop.cropping'))
  try {
    const blob = await cropPDF(
      selectedFile.value,
      {
        rect,
        pageNumbers: applyScope.value === 'current' ? [currentPage.value] : undefined,
      },
      (p) => store.updateProgress(p)
    )
    downloadBlob(blob, outputFilename.value)
    store.finishProcessing()
  } catch (e: any) {
    store.setError(e.message || t('crop.failed'))
    errorMsg.value = e.message || t('crop.failed')
  }
}
</script>

<style scoped>
.tool-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--spacing-2xl) var(--spacing-lg);
}
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }

/* ====== 文件信息栏 ====== */
.file-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.file-info-bar__name {
  font-size: 0.875rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: var(--spacing-md);
}

.file-info-bar__remove {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.file-info-bar__remove:hover {
  background: var(--color-error);
  color: #fff;
}

/* ====== 裁剪左右布局 ====== */
.crop-layout {
  display: flex;
  gap: var(--spacing-xl);
  margin-top: var(--spacing-xl);
  align-items: stretch;
}

/* ====== 左侧预览区 ====== */
.crop-preview-panel {
  flex: 1;
  min-width: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.preview-viewport {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f5f5f5;
  min-height: 300px;
  cursor: crosshair;
  user-select: none;
}

.preview-canvas {
  display: block;
  max-width: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

/* 裁剪框 */
.crop-region {
  position: absolute;
  border: 2px dashed var(--color-primary);
  cursor: move;
  z-index: 10;
}

.crop-region__inside {
  width: 100%;
  height: 100%;
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.25);
  box-sizing: border-box;
}

/* 裁剪框手柄 */
.crop-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid var(--color-primary);
  border-radius: 2px;
  z-index: 11;
}

.handle-nw { top: -5px; left: -5px; cursor: nw-resize; }
.handle-n  { top: -5px; left: 50%; margin-left: -5px; cursor: n-resize; }
.handle-ne { top: -5px; right: -5px; cursor: ne-resize; }
.handle-e  { top: 50%; right: -5px; margin-top: -5px; cursor: e-resize; }
.handle-se { bottom: -5px; right: -5px; cursor: se-resize; }
.handle-s  { bottom: -5px; left: 50%; margin-left: -5px; cursor: s-resize; }
.handle-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
.handle-w  { top: 50%; left: -5px; margin-top: -5px; cursor: w-resize; }

/* 页码导航 */
.page-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  transition: all 0.15s;
}

.nav-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 140px;
  text-align: center;
}

/* ====== 右侧控制面板 ====== */
.crop-control-bar {
  width: 240px;
  flex-shrink: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.control-hint {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.reset-btn {
  width: 100%;
}

.crop-action-btn {
  width: 100%;
  margin-top: auto;
}

/* 通用按钮基类 */
.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--outline {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn--outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 页面范围单选 */
.page-scope {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.scope-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
  transition: background 0.15s;
  background: var(--color-bg);
}

.scope-option:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.scope-option.active {
  background: var(--color-primary-light, #eff6ff);
  color: var(--color-primary);
  font-weight: 600;
}

.scope-option input[type="radio"] {
  accent-color: var(--color-primary);
  margin: 0;
}

/* ====== 进度条 & 结果 ====== */
.action-card {
  max-width: 480px;
  margin: var(--spacing-xl) auto 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
}

.action-card__progress {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #60a5fa);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.progress-percent {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
}


.error {
  margin-top: var(--spacing-md);
  color: var(--color-error);
  font-size: 0.875rem;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .crop-layout {
    flex-direction: column;
  }
  .crop-control-bar {
    width: 100%;
  }
}
</style>
