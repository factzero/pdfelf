<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('sign.title') }}</h1>
    <p class="tool-desc">{{ $t('sign.desc') }}</p>

    <FileDropZone
      v-if="!selectedFile"
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />

    <div v-if="selectedFile" class="file-preview">
      <div class="file-preview__thumbnail" @mouseenter="showDelete = true" @mouseleave="showDelete = false">
        <img v-if="previewUrl" :src="previewUrl" class="file-preview__canvas" alt="PDF Preview" />
        <div v-else class="file-preview__placeholder">
          <span class="file-preview__placeholder-icon">📄</span>
        </div>
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

    <!-- ======= Mode Tabs ======= -->
    <div v-if="selectedFile" class="mode-tabs">
      <button
        class="mode-tab"
        :class="{ 'mode-tab--active': signMode === 'image' }"
        @click="switchMode('image')"
      >🖼️ {{ $t('sign.modeImage') }}</button>
      <button
        class="mode-tab"
        :class="{ 'mode-tab--active': signMode === 'text' }"
        @click="switchMode('text')"
      >🔤 {{ $t('sign.modeText') }}</button>
      <button
        class="mode-tab"
        :class="{ 'mode-tab--active': signMode === 'hand' }"
        @click="switchMode('hand')"
      >✍️ {{ $t('sign.modeHand') }}</button>
    </div>

    <!-- ======= Image Mode ======= -->
    <div v-if="selectedFile && signMode === 'image'" class="options">
      <div class="form-group">
        <label class="form-label">{{ $t('sign.signatureImage') }}</label>
        <div class="sig-upload-area">
          <div v-if="sigPreviewUrl" class="sig-preview">
            <img :src="sigPreviewUrl" class="sig-preview__img" alt="Signature" />
            <button class="sig-preview__clear" @click="clearSignature">✕</button>
          </div>
          <div v-else class="sig-placeholder" @click="triggerSigUpload">
            <span class="sig-placeholder__icon">📤</span>
            <span>{{ $t('sign.uploadSignatureHint') }}</span>
          </div>
          <input ref="sigInputRef" type="file" accept="image/*" class="sig-hidden-input" @change="onSigSelected" />
        </div>
      </div>
    </div>

    <!-- ======= Text Mode ======= -->
    <div v-if="selectedFile && signMode === 'text'" class="options">
      <div class="form-group">
        <label class="form-label">{{ $t('sign.nameText') }}</label>
        <input
          v-model="textName"
          type="text"
          class="form-input"
          :placeholder="$t('sign.textNamePlaceholder')"
          @input="renderTextSignature"
        />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('sign.textFont') }}</label>
          <select v-model="textFont" class="form-input" @change="renderTextSignature">
            <option value="hand1">{{ $t('sign.fontHandwriting1') }}</option>
            <option value="hand2">{{ $t('sign.fontHandwriting2') }}</option>
            <option value="hand3">{{ $t('sign.fontHandwriting3') }}</option>
            <option value="regular">{{ $t('sign.fontRegular') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('sign.textColor') }}</label>
          <select v-model="textColor" class="form-input" @change="renderTextSignature">
            <option value="#000000">{{ $t('sign.colorBlack') }}</option>
            <option value="#1a56db">{{ $t('sign.colorBlue') }}</option>
            <option value="#cc2222">{{ $t('sign.colorRed') }}</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">{{ $t('sign.textSize') }}: {{ textSize }}px</label>
        <input v-model.number="textSize" type="range" class="form-range" min="24" max="100" step="2" @input="renderTextSignature" />
      </div>
      <!-- text preview -->
      <div class="sig-draw-preview">
        <canvas ref="textCanvasRef" class="sig-canvas" width="600" height="200"></canvas>
        <p v-if="!textName.trim()" class="sig-empty-hint">{{ $t('sign.textNamePlaceholder') }}</p>
      </div>
    </div>

    <!-- ======= Hand-Draw Mode ======= -->
    <div v-if="selectedFile && signMode === 'hand'" class="options">
      <p class="draw-hint">{{ $t('sign.drawHint') }}</p>
      <div class="sig-draw-preview">
        <canvas
          ref="drawCanvasRef"
          class="sig-canvas sig-canvas--draw"
          width="600"
          height="200"
          @mousedown="onDrawStart"
          @mousemove="onDrawMove"
          @mouseup="onDrawEnd"
          @mouseleave="onDrawEnd"
          @touchstart.prevent="onTouchStart"
          @touchmove.prevent="onTouchMove"
          @touchend="onDrawEnd"
        ></canvas>
      </div>
      <div class="form-row form-row--draw">
        <div class="form-group">
          <label class="form-label">{{ $t('sign.drawColor') }}</label>
          <input v-model="drawColor" type="color" class="color-input" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('sign.drawWidth') }}: {{ drawWidth }}px</label>
          <input v-model.number="drawWidth" type="range" class="form-range" min="1" max="12" step="0.5" />
        </div>
        <div class="form-group">
          <button class="btn btn--secondary btn--small" @click="clearDrawCanvas">{{ $t('sign.drawClear') }}</button>
        </div>
      </div>
    </div>

    <!-- ======= Common Position / Scale / Margin ======= -->
    <div v-if="selectedFile" class="options">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('sign.position') }}</label>
          <select v-model="position" class="form-input">
            <option value="bottom-right">{{ $t('sign.positionBottomRight') }}</option>
            <option value="bottom-left">{{ $t('sign.positionBottomLeft') }}</option>
            <option value="bottom-center">{{ $t('sign.positionBottomCenter') }}</option>
            <option value="top-right">{{ $t('sign.positionTopRight') }}</option>
            <option value="top-left">{{ $t('sign.positionTopLeft') }}</option>
            <option value="top-center">{{ $t('sign.positionTopCenter') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('sign.scale') }}</label>
          <input v-model.number="scale" type="range" class="form-range" min="0.3" max="2" step="0.1" />
          <span class="range-val">{{ scale.toFixed(1) }}x</span>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('sign.marginX') }} (pt)</label>
          <input v-model.number="marginX" type="number" class="form-input" min="0" max="200" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('sign.marginY') }} (pt)</label>
          <input v-model.number="marginY" type="number" class="form-input" min="0" max="200" />
        </div>
      </div>
    </div>

    <!-- ======= Action ======= -->
    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        :disabled="!hasSignature"
        @click="process"
      >
        {{ $t('sign.signBtn') }}
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
          <p class="result-title">{{ $t('sign.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'sign'" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { signPdf as signPdfService } from '@/services/pdfService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

// ---- file state ----
const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const previewUrl = ref('')
const showDelete = ref(false)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')
let objectUrl: string | null = null

// ---- mode ----
const signMode = ref<'image' | 'text' | 'hand'>('image')

// ---- image state ----
const sigInputRef = ref<HTMLInputElement | null>(null)
const signatureBlob = ref<Blob | null>(null)
const sigPreviewUrl = ref('')

// ---- text state ----
const textName = ref('')
const textFont = ref<string>('hand1')
const textColor = ref<string>('#000000')
const textSize = ref(48)
const textCanvasRef = ref<HTMLCanvasElement | null>(null)

// ---- hand-draw state ----
const drawCanvasRef = ref<HTMLCanvasElement | null>(null)
const drawColor = ref('#000000')
const drawWidth = ref(3)
let isDrawing = false
let lastX = 0
let lastY = 0

// ---- common position ----
const position = ref<string>('bottom-right')
const scale = ref(1)
const marginX = ref(40)
const marginY = ref(40)

// ---- has signature check ----
const hasSignature = computed(() => {
  if (signMode.value === 'image') return !!signatureBlob.value
  if (signMode.value === 'text') return textName.value.trim().length > 0
  if (signMode.value === 'hand') return !!signatureBlob.value
  return false
})

// ---- helpers ----
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ---- mode switch ----
function switchMode(mode: 'image' | 'text' | 'hand') {
  signMode.value = mode
  signatureBlob.value = null
  if (sigPreviewUrl.value) { URL.revokeObjectURL(sigPreviewUrl.value); sigPreviewUrl.value = '' }
  resultBlob.value = null
  errorMsg.value = ''

  if (mode === 'hand') {
    nextTick(() => {
      setupDrawCanvas()
    })
  }
  if (mode === 'text') {
    nextTick(() => {
      renderTextSignature()
    })
  }
}

// ---- file handling ----
function removeFile() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  selectedFile.value = null
  previewUrl.value = ''
  pageCount.value = 0
  resultBlob.value = null
  errorMsg.value = ''
  showDelete.value = false
  clearSignature()
  textName.value = ''
  clearDrawCanvas()
}

function clearSignature() {
  if (sigPreviewUrl.value) { URL.revokeObjectURL(sigPreviewUrl.value); sigPreviewUrl.value = '' }
  signatureBlob.value = null
}

watch([position, scale, marginX, marginY], () => {
  if (resultBlob.value) { resultBlob.value = null; errorMsg.value = '' }
})

onUnmounted(() => {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  if (sigPreviewUrl.value) { URL.revokeObjectURL(sigPreviewUrl.value) }
})

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
  previewUrl.value = ''
  pageCount.value = 0
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'signed')
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
}

function onError(message: string) { errorMsg.value = message }

// ---- image mode ----
function triggerSigUpload() { sigInputRef.value?.click() }

function onSigSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    signatureBlob.value = file
    if (sigPreviewUrl.value) { URL.revokeObjectURL(sigPreviewUrl.value) }
    sigPreviewUrl.value = URL.createObjectURL(file)
  }
}

// ---- text mode ----
const FONT_MAP: Record<string, string> = {
  hand1: "'Brush Script MT', 'Apple Chancery', 'Comic Sans MS', cursive",
  hand2: "'Segoe Script', 'Snell Roundhand', 'Apple Chancery', cursive",
  hand3: "'KaiTi', 'STKaiti', 'Kai', serif",
  regular: "'Arial', 'Microsoft YaHei', sans-serif",
}

function renderTextSignature() {
  const canvas = textCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  const txt = textName.value.trim()
  if (!txt) {
    signatureBlob.value = null
    return
  }
  ctx.font = `${textSize.value}px ${FONT_MAP[textFont.value] || FONT_MAP.hand1}`
  ctx.fillStyle = textColor.value
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(txt, w / 2, h / 2)

  canvas.toBlob((blob) => {
    signatureBlob.value = blob
  }, 'image/png')
}

// ---- hand-draw mode ----
function setupDrawCanvas() {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function getCanvasPos(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

function onDrawStart(e: MouseEvent) {
  isDrawing = true
  const pos = getCanvasPos(drawCanvasRef.value!, e.clientX, e.clientY)
  lastX = pos.x
  lastY = pos.y
}

function onDrawMove(e: MouseEvent) {
  if (!isDrawing) return
  const canvas = drawCanvasRef.value!
  const ctx = canvas.getContext('2d')!
  const pos = getCanvasPos(canvas, e.clientX, e.clientY)
  ctx.strokeStyle = drawColor.value
  ctx.lineWidth = drawWidth.value
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  lastX = pos.x
  lastY = pos.y
  updateDrawSigBlob()
}

function onDrawEnd() {
  if (!isDrawing) return
  isDrawing = false
  updateDrawSigBlob()
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    isDrawing = true
    const touch = e.touches[0]
    const pos = getCanvasPos(drawCanvasRef.value!, touch.clientX, touch.clientY)
    lastX = pos.x
    lastY = pos.y
  }
}

function onTouchMove(e: TouchEvent) {
  if (!isDrawing || e.touches.length !== 1) return
  const canvas = drawCanvasRef.value!
  const ctx = canvas.getContext('2d')!
  const touch = e.touches[0]
  const pos = getCanvasPos(canvas, touch.clientX, touch.clientY)
  ctx.strokeStyle = drawColor.value
  ctx.lineWidth = drawWidth.value
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  lastX = pos.x
  lastY = pos.y
  updateDrawSigBlob()
}

function updateDrawSigBlob() {
  drawCanvasRef.value?.toBlob((blob) => {
    signatureBlob.value = blob
  }, 'image/png')
}

function clearDrawCanvas() {
  const canvas = drawCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  signatureBlob.value = null
}

// ---- process ----
function downloadResult() {
  if (resultBlob.value) { downloadBlob(resultBlob.value, outputFilename.value) }
}

async function process() {
  if (!selectedFile.value) return

  // Ensure we have a fresh signature blob for text/hand modes
  if (signMode.value === 'text') {
    renderTextSignature()
    await nextTick()
  }
  if (signMode.value === 'hand') {
    updateDrawSigBlob()
    await nextTick()
  }

  if (!signatureBlob.value) {
    errorMsg.value = t('sign.needSignature') as string
    return
  }

  errorMsg.value = ''
  store.startProcessing(t('sign.signing'))

  try {
    const blob = await signPdfService(
      selectedFile.value,
      signatureBlob.value,
      {
        position: position.value as any,
        scale: scale.value,
        marginX: marginX.value,
        marginY: marginY.value,
      },
      (p) => store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.setError(msg)
    errorMsg.value = msg || (t('sign.failed') as string)
  }
}
</script>

<style scoped>
.tool-page { max-width: 880px; margin: 0 auto; }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); font-size: 0.875rem; }

/* ---- file preview ---- */
.file-preview { margin-top: var(--spacing-md); }
.file-preview__thumbnail {
  position: relative; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); overflow: hidden;
  background: var(--color-bg-tertiary); cursor: pointer;
  max-height: 160px; display: flex; align-items: center; justify-content: center;
}
.file-preview__canvas { display: block; width: 100%; max-height: 160px; object-fit: contain; background: #fff; }
.file-preview__placeholder { display: flex; align-items: center; justify-content: center; height: 110px; background: #fff; width: 100%; }
.file-preview__placeholder-icon { font-size: 2rem; opacity: 0.3; }
.file-preview__delete {
  position: absolute; top: 6px; right: 6px; width: 28px; height: 28px;
  border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff;
  font-size: 0.875rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.file-preview__delete:hover { background: rgba(220,38,38,0.85); }
.file-preview__meta { display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-sm); flex-wrap: wrap; }
.file-preview__name { font-weight: 600; font-size: 0.875rem; color: var(--color-text); word-break: break-all; }
.file-preview__size { font-size: 0.75rem; color: var(--color-text-muted); }
.file-preview__pages { font-size: 0.75rem; color: var(--color-text-secondary); background: var(--color-bg-tertiary); padding: 1px 8px; border-radius: var(--radius-sm); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ---- mode tabs ---- */
.mode-tabs {
  display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-lg);
  border-bottom: 2px solid var(--color-border); padding-bottom: 0;
}
.mode-tab {
  flex: 1; padding: var(--spacing-sm) var(--spacing-md);
  border: none; background: transparent;
  font-size: 0.875rem; font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: all 0.2s;
}
.mode-tab:hover { color: var(--color-primary); }
.mode-tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

/* ---- options ---- */
.options { margin-top: var(--spacing-md); display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { flex: 1; }
.form-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.form-input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.875rem; background: var(--color-bg); box-sizing: border-box; }
.form-input:focus { outline: none; border-color: var(--color-primary); }
.form-row { display: flex; gap: var(--spacing-md); }
.form-row--draw { align-items: flex-end; }

/* ---- image mode ---- */
.sig-upload-area { text-align: center; }
.sig-placeholder {
  border: 2px dashed var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-lg);
  cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xs);
  transition: border-color 0.2s; background: var(--color-bg-tertiary);
}
.sig-placeholder:hover { border-color: var(--color-primary); }
.sig-placeholder__icon { font-size: 1.5rem; }
.sig-preview { position: relative; display: inline-block; }
.sig-preview__img { max-height: 80px; max-width: 200px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); }
.sig-preview__clear {
  position: absolute; top: -6px; right: -6px; width: 20px; height: 20px;
  border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff;
  font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.sig-preview__clear:hover { background: rgba(220,38,38,0.85); }
.sig-hidden-input { display: none; }

/* ---- draw/text canvas ---- */
.sig-draw-preview {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: repeating-linear-gradient(
    45deg,
    var(--color-bg-tertiary) 0px,
    var(--color-bg-tertiary) 4px,
    #fff 4px,
    #fff 8px
  );
  min-height: 100px;
}
.sig-canvas {
  display: block; width: 100%; height: auto; max-height: 200px;
  cursor: crosshair; touch-action: none;
}
.sig-canvas--draw { background: rgba(255,255,255,0.01); }
.sig-empty-hint {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-muted); font-size: 0.875rem; pointer-events: none; margin: 0;
}
.draw-hint { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }

.color-input { width: 40px; height: 36px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; padding: 2px; }

/* ---- common controls ---- */
.form-range { width: 100%; accent-color: var(--color-primary); }
.range-val { font-size: 0.75rem; color: var(--color-text-muted); margin-left: var(--spacing-xs); vertical-align: middle; }

/* ---- action card ---- */
.action-card { margin-top: var(--spacing-lg); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); }
.btn--large { display: block; width: 100%; padding: var(--spacing-sm) var(--spacing-md); font-size: 0.9375rem; border: none; cursor: pointer; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn--secondary { background: var(--color-bg-tertiary); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; font-size: 0.8125rem; transition: all 0.2s; }
.btn--secondary:hover { background: var(--color-bg-hover); border-color: var(--color-text-muted); }
.btn--small { padding: var(--spacing-xs) var(--spacing-md); }
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
