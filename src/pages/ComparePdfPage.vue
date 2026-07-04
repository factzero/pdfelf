<template>
  <div class="tool-page container">
    <h1 class="tool-title">
      <GitCompare :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('compare.title') }}
    </h1>
    <p class="tool-desc">{{ $t('compare.desc') }}</p>

    <!-- 两个文件上传区 -->
    <div v-if="!result" class="upload-area">
      <div class="upload-row">
        <!-- 左侧文件 -->
        <div class="upload-col">
          <div v-if="!leftFile" class="upload-col__drop">
            <FileDropZone
              :accept="['pdf']"
              @file-selected="onLeftFileSelected"
              @error="onLeftError"
            />
          </div>
          <div v-else class="file-preview">
            <div class="file-preview__thumbnail" @mouseenter="leftShowDelete = true" @mouseleave="leftShowDelete = false">
              <img v-if="leftPreviewUrl" :src="leftPreviewUrl" class="file-preview__canvas" alt="PDF Preview" />
              <div v-else class="file-preview__placeholder">
                <FileText :size="48" :stroke-width="1" class="file-preview__placeholder-icon" />
              </div>
              <Transition name="fade">
                <button v-if="leftShowDelete" class="file-preview__delete" @click="removeLeftFile">✕</button>
              </Transition>
            </div>
            <div class="file-preview__meta">
              <span class="file-preview__name">{{ leftFile.name }}</span>
              <span class="file-preview__size">{{ formatFileSize(leftFile.size) }}</span>
              <span v-if="leftTotalPages > 0" class="file-preview__pages">
                {{ $t('common.pages', { n: leftTotalPages }) }}
              </span>
            </div>
            <div class="file-preview__label">{{ $t('compare.originalFile') }}</div>
          </div>
        </div>

        <!-- 中间对比图标 -->
        <div class="upload-col__divider">
          <GitCompare :size="24" :stroke-width="1.5" class="divider-icon" />
        </div>

        <!-- 右侧文件 -->
        <div class="upload-col">
          <div v-if="!rightFile" class="upload-col__drop">
            <FileDropZone
              :accept="['pdf']"
              @file-selected="onRightFileSelected"
              @error="onRightError"
            />
          </div>
          <div v-else class="file-preview">
            <div class="file-preview__thumbnail" @mouseenter="rightShowDelete = true" @mouseleave="rightShowDelete = false">
              <img v-if="rightPreviewUrl" :src="rightPreviewUrl" class="file-preview__canvas" alt="PDF Preview" />
              <div v-else class="file-preview__placeholder">
                <FileText :size="48" :stroke-width="1" class="file-preview__placeholder-icon" />
              </div>
              <Transition name="fade">
                <button v-if="rightShowDelete" class="file-preview__delete" @click="removeRightFile">✕</button>
              </Transition>
            </div>
            <div class="file-preview__meta">
              <span class="file-preview__name">{{ rightFile.name }}</span>
              <span class="file-preview__size">{{ formatFileSize(rightFile.size) }}</span>
              <span v-if="rightTotalPages > 0" class="file-preview__pages">
                {{ $t('common.pages', { n: rightTotalPages }) }}
              </span>
            </div>
            <div class="file-preview__label">{{ $t('compare.modifiedFile') }}</div>
          </div>
        </div>
      </div>

      <!-- 开始对比按钮 -->
      <div v-if="leftFile && rightFile" class="action-card">
        <template v-if="!isProcessing">
          <p class="action-card__note">{{ $t('compare.diffTip') }}</p>
          <button class="btn btn--primary btn--large" @click="doCompare">
            {{ $t('compare.compareBtn') }}
          </button>
        </template>

        <div v-if="isProcessing" class="action-card__progress">
          <div class="progress-bar">
            <div class="progress-bar__fill" :style="{ width: `${progress}%` }"></div>
          </div>
          <div class="progress-info">
            <span class="progress-text">{{ progressText || $t('compare.comparing') }}</span>
            <span class="progress-percent">{{ progress }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 对比结果 -->
    <div v-if="result" class="result-area">
      <!-- 统计栏 -->
      <div class="stats-bar">
        <div class="stats-bar__item stats-bar__item--same">
          <span class="stats-bar__count">{{ result.sameCount }}</span>
          <span class="stats-bar__label">{{ $t('compare.same') }}</span>
        </div>
        <div class="stats-bar__item stats-bar__item--added">
          <span class="stats-bar__count">{{ result.addedCount }}</span>
          <span class="stats-bar__label">{{ $t('compare.added') }}</span>
        </div>
        <div class="stats-bar__item stats-bar__item--deleted">
          <span class="stats-bar__count">{{ result.deletedCount }}</span>
          <span class="stats-bar__label">{{ $t('compare.deleted') }}</span>
        </div>
        <div class="stats-bar__item stats-bar__item--total">
          <span class="stats-bar__count">{{ result.diffLines.length }}</span>
          <span class="stats-bar__label">{{ $t('compare.totalLines') }}</span>
        </div>
      </div>

      <!-- 重新对比 -->
      <div class="recompare-bar">
        <button class="btn btn--outline" @click="resetAll">
          <RotateCcw :size="14" :stroke-width="2" />
          {{ $t('compare.recompare') }}
        </button>
      </div>

      <!-- 差异视图 -->
      <div class="diff-view">
        <div class="diff-view__header">
          <div class="diff-view__col-header diff-view__col-header--left">
            {{ leftFile?.name }} ({{ result.leftPages }} {{ $t('compare.pages') }})
          </div>
          <div class="diff-view__col-header diff-view__col-header--right">
            {{ rightFile?.name }} ({{ result.rightPages }} {{ $t('compare.pages') }})
          </div>
        </div>
        <div class="diff-view__body">
          <div
            v-for="line in result.diffLines"
            :key="line.lineNo"
            class="diff-row"
            :class="'diff-row--' + line.type"
          >
            <span class="diff-row__no">{{ line.lineNo }}</span>
            <span class="diff-row__mark">{{ diffMark(line.type) }}</span>
            <span class="diff-row__text">{{ line.text }}</span>
          </div>
          <div v-if="result.diffLines.length === 0" class="diff-empty">
            {{ $t('compare.noDiff') }}
          </div>
        </div>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'compare'" />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, GitCompare, RotateCcw } from 'lucide-vue-next'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { readFileAsArrayBuffer, formatFileSize } from '@/utils/fileUtils'
import { pdfjsLib, DEFAULT_PDF_OPTIONS } from '@/utils/pdfjs'
import { comparePdfs, type CompareResult } from '@/services/compareService'

const { t } = useI18n()
const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

// 文件状态
const leftFile = ref<File | null>(null)
const rightFile = ref<File | null>(null)
const leftPreviewUrl = ref('')
const rightPreviewUrl = ref('')
const leftTotalPages = ref(0)
const rightTotalPages = ref(0)
const leftShowDelete = ref(false)
const rightShowDelete = ref(false)
const errorMsg = ref('')
const result = ref<CompareResult | null>(null)

let leftObjectUrl: string | null = null
let rightObjectUrl: string | null = null

function revokeLeftUrl() {
  if (leftObjectUrl) {
    URL.revokeObjectURL(leftObjectUrl)
    leftObjectUrl = null
  }
}
function revokeRightUrl() {
  if (rightObjectUrl) {
    URL.revokeObjectURL(rightObjectUrl)
    rightObjectUrl = null
  }
}

onUnmounted(() => {
  revokeLeftUrl()
  revokeRightUrl()
})

async function generatePreview(file: File): Promise<{ url: string; pages: number }> {
  const buffer = await readFileAsArrayBuffer(file)
  const loadingTask = pdfjsLib.getDocument({ data: buffer, ...DEFAULT_PDF_OPTIONS })
  const pdf = await loadingTask.promise
  let url = ''
  if (pdf.numPages > 0) {
    const page = await pdf.getPage(1)
    const scale = 1.2
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png')
      })
      if (blob) url = URL.createObjectURL(blob)
    }
  }
  return { url, pages: pdf.numPages }
}

function onLeftError(msg: string) {
  errorMsg.value = msg
}
function onRightError(msg: string) {
  errorMsg.value = msg
}

async function onLeftFileSelected(file: File | File[]) {
  errorMsg.value = ''
  result.value = null
  revokeLeftUrl()
  leftPreviewUrl.value = ''
  const f = file as File
  leftFile.value = f
  try {
    const { url, pages } = await generatePreview(f)
    leftObjectUrl = url
    leftPreviewUrl.value = url
    leftTotalPages.value = pages
  } catch {
    leftPreviewUrl.value = ''
    leftTotalPages.value = 0
  }
}

async function onRightFileSelected(file: File | File[]) {
  errorMsg.value = ''
  result.value = null
  revokeRightUrl()
  rightPreviewUrl.value = ''
  const f = file as File
  rightFile.value = f
  try {
    const { url, pages } = await generatePreview(f)
    rightObjectUrl = url
    rightPreviewUrl.value = url
    rightTotalPages.value = pages
  } catch {
    rightPreviewUrl.value = ''
    rightTotalPages.value = 0
  }
}

function removeLeftFile() {
  revokeLeftUrl()
  leftFile.value = null
  leftPreviewUrl.value = ''
  leftTotalPages.value = 0
  result.value = null
  errorMsg.value = ''
}
function removeRightFile() {
  revokeRightUrl()
  rightFile.value = null
  rightPreviewUrl.value = ''
  rightTotalPages.value = 0
  result.value = null
  errorMsg.value = ''
}

function resetAll() {
  revokeLeftUrl()
  revokeRightUrl()
  leftFile.value = null
  rightFile.value = null
  leftPreviewUrl.value = ''
  rightPreviewUrl.value = ''
  leftTotalPages.value = 0
  rightTotalPages.value = 0
  result.value = null
  errorMsg.value = ''
}

function diffMark(type: string): string {
  if (type === 'added') return '+'
  if (type === 'deleted') return '-'
  return ' '
}

async function doCompare() {
  if (!leftFile.value || !rightFile.value) return
  store.startProcessing(t('compare.comparing'))
  try {
    const res = await comparePdfs(leftFile.value, rightFile.value, (p) => store.updateProgress(p))
    result.value = res
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('compare.failed'))
    errorMsg.value = t('compare.failed')
  }
}
</script>

<style scoped>
.tool-page {
  max-width: 1100px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .tool-page {
    max-width: 100%;
  }
}

.tool-title {
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.tool-title__icon {
  flex-shrink: 0;
}

.tool-desc {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

/* ── 双文件上传区 ── */
.upload-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--spacing-lg);
  align-items: start;
}

@media (max-width: 768px) {
  .upload-row {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}

.upload-col__drop {
  min-height: 180px;
}

.upload-col__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 80px;
}

@media (max-width: 768px) {
  .upload-col__divider {
    padding-top: 0;
    transform: rotate(90deg);
  }
}

.divider-icon {
  color: var(--color-text-muted);
  opacity: 0.5;
}

/* ── 文件预览 ── */
.file-preview {
  margin-top: var(--spacing-sm);
}

.file-preview__thumbnail {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-tertiary);
  cursor: pointer;
}

.file-preview__canvas {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  background: #fff;
}

.file-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  background: #fff;
}

.file-preview__placeholder-icon {
  font-size: 3rem;
  opacity: 0.3;
}

.file-preview__delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.file-preview__delete:hover {
  background: rgba(220, 38, 38, 0.85);
}

.file-preview__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  flex-wrap: wrap;
}

.file-preview__name {
  font-weight: 600;
  color: var(--color-text);
  word-break: break-all;
}

.file-preview__size {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.file-preview__pages {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.file-preview__label {
  margin-top: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── action-card ── */
.action-card {
  margin-top: var(--spacing-xl);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
}

.action-card__note {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.btn--large {
  display: block;
  width: 100%;
  padding: var(--spacing-md);
  font-size: 1rem;
  border: none;
  cursor: pointer;
}

.btn--primary {
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: background var(--transition-fast);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  font-size: 0.875rem;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.btn--outline:hover {
  background: var(--color-primary-light);
}

/* ── 进度条 ── */
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

/* ── 统计栏 ── */
.stats-bar {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  flex-wrap: wrap;
}

.stats-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  min-width: 100px;
}

.stats-bar__item--same {
  border-left: 3px solid #22c55e;
}
.stats-bar__item--added {
  border-left: 3px solid #3b82f6;
}
.stats-bar__item--deleted {
  border-left: 3px solid #ef4444;
}
.stats-bar__item--total {
  border-left: 3px solid var(--color-text-muted);
}

.stats-bar__count {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.stats-bar__label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* ── 重新对比 ── */
.recompare-bar {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-md);
}

/* ── 差异视图 ── */
.diff-view {
  margin-top: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.diff-view__header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

@media (max-width: 640px) {
  .diff-view__header {
    grid-template-columns: 1fr;
  }
}

.diff-view__col-header {
  padding: 10px 16px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diff-view__col-header--left {
  border-right: 1px solid var(--color-border);
}

.diff-view__body {
  max-height: 600px;
  overflow-y: auto;
  background: #f8fafc;
}

.diff-row {
  display: flex;
  align-items: flex-start;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  padding: 2px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.diff-row__no {
  flex-shrink: 0;
  width: 50px;
  text-align: right;
  padding: 1px 10px 1px 8px;
  color: var(--color-text-muted);
  font-size: 0.7rem;
  user-select: none;
}

.diff-row__mark {
  flex-shrink: 0;
  width: 20px;
  text-align: center;
  font-weight: 700;
  user-select: none;
}

.diff-row__text {
  flex: 1;
  padding: 1px 16px 1px 4px;
  word-break: break-all;
  white-space: pre-wrap;
}

/* 未变更行 */
.diff-row--unchanged {
  background: #f8fafc;
}
.diff-row--unchanged .diff-row__mark {
  color: transparent;
}

/* 新增行 */
.diff-row--added {
  background: #dbeafe;
}
.diff-row--added .diff-row__mark {
  color: #2563eb;
}
.diff-row--added .diff-row__text {
  color: #1e40af;
}

/* 删除行 */
.diff-row--deleted {
  background: #fee2e2;
}
.diff-row--deleted .diff-row__mark {
  color: #dc2626;
}
.diff-row--deleted .diff-row__text {
  color: #991b1b;
}

.diff-empty {
  padding: 48px 16px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9375rem;
}

/* ── 错误 ── */
.error {
  margin-top: var(--spacing-md);
  color: var(--color-error);
  font-size: 0.875rem;
  text-align: center;
}
</style>
