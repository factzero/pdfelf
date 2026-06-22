<template>
  <div class="tool-page container" @click="closeInsertMenu">
    <h1 class="tool-title">{{ $t('merge.title') }}</h1>
    <p class="tool-desc">{{ $t('merge.desc') }}</p>

    <!-- 文件缩略图列表 -->
    <div v-if="fileItems.length > 0" class="merge-list">
      <template v-for="(item, i) in fileItems" :key="item.id">
        <div
          class="merge-item"
          :class="{ 'merge-item--blank': item.type === 'blank' }"
          draggable="true"
          @dragstart="onDragStart(i)"
          @dragover.prevent
          @drop="onDropItem($event, i)"
          @mouseenter="item.hovered = true"
          @mouseleave="item.hovered = false"
        >
          <!-- 缩略图 -->
          <div class="merge-item__thumb">
            <img
              v-if="item.previewUrl"
              :src="item.previewUrl"
              class="merge-item__thumb-img"
              :alt="item.name"
            />
            <div v-else class="merge-item__thumb-placeholder">
              <span v-if="item.type === 'blank'" class="merge-item__thumb-blank">📄</span>
              <span v-else class="merge-item__thumb-loading">{{ $t('merge.loading') }}</span>
            </div>

            <!-- 鼠标悬停显示删除按钮 -->
            <Transition name="fade">
              <button
                v-if="item.hovered"
                class="merge-item__delete"
                @click="removeItem(i)"
              >✕</button>
            </Transition>
          </div>

          <!-- 文件名 -->
          <div class="merge-item__info">
            <span class="merge-item__name" :title="item.name">{{ item.name }}</span>
            <span class="merge-item__meta">
              <template v-if="item.type === 'blank'">
                {{ item.pageCount === 1 ? $t('merge.blankPage') : $t('merge.blankPages', { n: item.pageCount }) }}
              </template>
              <template v-else>
                {{ formatFileSize(item.file?.size ?? 0) }}
                <span v-if="item.pageCount > 0"> · {{ $t('common.pages', { n: item.pageCount }) }}</span>
              </template>
            </span>
          </div>
        </div>

        <!-- 缩略图之间的插入按钮 -->
        <div
          v-if="i < fileItems.length - 1"
          :key="'insert-' + item.id"
          class="merge-insert"
          @click.stop
        >
          <button class="merge-insert__btn" @click.stop="toggleInsertMenu(i)">
            <span class="merge-insert__icon">+</span>
          </button>
          <Transition name="fade">
            <div v-if="insertMenuIndex === i" class="merge-insert__menu">
              <button class="merge-insert__menu-item" @click.stop="insertFileAt(i + 1)">
                {{ $t('merge.addDoc') }}
              </button>
              <button class="merge-insert__menu-item" @click.stop="insertBlankAt(i + 1)">
                {{ $t('merge.addBlank') }}
              </button>
            </div>
          </Transition>
        </div>
      </template>

      <!-- 末尾添加按钮 — 紧跟文件后面，横向排列 -->
      <button
        class="merge-item merge-item--add"
        @click="addMoreFiles"
        :title="$t('merge.addPdf')"
      >
        <div class="merge-item__thumb merge-item__thumb--add">
          <span class="merge-add-icon">+</span>
        </div>
        <div class="merge-item__info">
          <span class="merge-item__name merge-item__name--add">{{ $t('merge.add') }}</span>
        </div>
      </button>
    </div>

    <!-- 空状态：显示上传区 -->
    <FileDropZone
      v-if="fileItems.length === 0"
      :accept="['pdf']"
      :multiple="true"
      @file-selected="onFilesSelected"
      @error="onError"
    />

    <!-- 隐藏的文件选择器 -->
    <input
      ref="hiddenInputRef"
      type="file"
      accept=".pdf"
      multiple
      style="display:none"
      @change="onHiddenInputChange"
    />

    <!-- 操作区卡片 -->
    <div v-if="fileItems.length > 0" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        @click="merge"
      >
        {{ $t('merge.mergeBtn', { n: fileItems.length }) }}
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
          <p class="result-title">{{ $t('merge.completed') }}</p>
          <p class="result-desc">{{ $t('merge.mergedDesc', { n: fileItems.length }) }}</p>
          <p class="result-filename">merged.pdf</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import FileDropZone from '@/components/FileDropZone.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { formatFileSize, readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { mergePDFs } from '@/services/pdfService'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

interface FileItem {
  id: number
  type: 'file' | 'blank'
  name: string
  file?: File
  previewUrl: string
  pageCount: number
  hovered: boolean
  objectUrl?: string | null
}

let idCounter = 0
const fileItems = reactive<FileItem[]>([])
const resultBlob = ref<Blob | null>(null)
const errorMsg = ref('')
let dragIndex = -1

const hiddenInputRef = ref<HTMLInputElement | null>(null)
const insertMenuIndex = ref(-1)
const insertAtIndex = ref(-1)

// 用 Set 追踪所有已创建的 objectUrl，统一释放
const allObjectUrls = new Set<string>()

function revokeObjectUrl(url: string | null | undefined) {
  if (url && allObjectUrls.has(url)) {
    URL.revokeObjectURL(url)
    allObjectUrls.delete(url)
  }
}

onUnmounted(() => {
  allObjectUrls.forEach((url) => URL.revokeObjectURL(url))
  allObjectUrls.clear()
})

// 渲染 PDF 第一页缩略图（与 CompressPage 一致：ArrayBuffer 方式加载）
async function renderThumbnail(file: File): Promise<{ previewUrl: string; pageCount: number }> {
  try {
    const buffer = await readFileAsArrayBuffer(file)
    const loadingTask = pdfjsLib.getDocument({ data: buffer })
    const pdf = await loadingTask.promise
    const pageCount = pdf.numPages

    if (pageCount > 0) {
      const page = await pdf.getPage(1)
      const scale = 0.3
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        await page.render({ canvas, canvasContext: ctx, viewport }).promise
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        return { previewUrl: dataUrl, pageCount }
      }
    }
    return { previewUrl: '', pageCount }
  } catch (err) {
    console.error('renderThumbnail error:', file.name, err)
    return { previewUrl: '', pageCount: 0 }
  }
}

async function onFilesSelected(selected: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  const arr = Array.isArray(selected) ? selected : [selected]

  // 先把所有卡片插入列表（立即显示占位），记录索引以便后续通过响应式代理更新
  const pending: Array<{ index: number; file: File }> = []
  for (const file of arr) {
    const id = ++idCounter
    fileItems.push({
      id,
      type: 'file',
      name: file.name,
      file,
      previewUrl: '',
      pageCount: 0,
      hovered: false,
    })
    pending.push({ index: fileItems.length - 1, file })
  }

  // 并行渲染所有缩略图，通过 fileItems[index] 更新以触发 Vue 响应式
  await Promise.all(pending.map(async ({ index, file }) => {
    const { previewUrl, pageCount } = await renderThumbnail(file)
    fileItems[index].previewUrl = previewUrl
    fileItems[index].pageCount = pageCount
    fileItems[index].objectUrl = previewUrl
  }))
}

function onError(message: string) {
  errorMsg.value = message
}

function removeItem(index: number) {
  const item = fileItems[index]
  if (item) {
    revokeObjectUrl(item.objectUrl)
  }
  fileItems.splice(index, 1)
  resultBlob.value = null
}

function onDragStart(index: number) {
  dragIndex = index
}

function onDropItem(_e: DragEvent, index: number) {
  if (dragIndex === -1 || dragIndex === index) return
  const item = fileItems.splice(dragIndex, 1)[0]
  fileItems.splice(index, 0, item)
  dragIndex = -1
  resultBlob.value = null
}

// 插入菜单
function toggleInsertMenu(index: number) {
  insertMenuIndex.value = insertMenuIndex.value === index ? -1 : index
}

function closeInsertMenu() {
  insertMenuIndex.value = -1
}

function insertFileAt(index: number) {
  insertAtIndex.value = index
  closeInsertMenu()
  nextTick(() => {
    hiddenInputRef.value?.click()
  })
}

function insertBlankAt(index: number) {
  closeInsertMenu()
  fileItems.splice(index, 0, {
    id: ++idCounter,
    type: 'blank',
    name: t('merge.blankPage'),
    previewUrl: '',
    pageCount: 1,
    hovered: false,
  })
  resultBlob.value = null
}

// 末尾添加按钮
function addMoreFiles() {
  insertAtIndex.value = -1
  nextTick(() => {
    hiddenInputRef.value?.click()
  })
}

function onHiddenInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const newFiles = Array.from(input.files)
    const insertAt = insertAtIndex.value >= 0 ? insertAtIndex.value : fileItems.length
    insertAtIndex.value = -1

    const pending: Array<{ index: number; file: File }> = []
    for (let j = 0; j < newFiles.length; j++) {
      const file = newFiles[j]
      const itemIndex = insertAt + j
      fileItems.splice(itemIndex, 0, {
        id: ++idCounter,
        type: 'file',
        name: file.name,
        file,
        previewUrl: '',
        pageCount: 0,
        hovered: false,
      })
      pending.push({ index: itemIndex, file })
    }
    ;(async () => {
      await Promise.all(pending.map(async ({ index, file }) => {
        const { previewUrl, pageCount } = await renderThumbnail(file)
        fileItems[index].previewUrl = previewUrl
        fileItems[index].pageCount = pageCount
        fileItems[index].objectUrl = previewUrl
      }))
    })()
    resultBlob.value = null
  }
  input.value = ''
}

// 合并
async function merge() {
  const realFiles = fileItems
    .map((item) => item.file)
    .filter((f): f is File => !!f)

  if (realFiles.length === 0) {
    errorMsg.value = t('merge.noFiles')
    return
  }

  store.startProcessing(t('merge.merging'))
  try {
    const blob = await mergePDFs(realFiles, (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('merge.failed'))
    errorMsg.value = t('merge.failed')
  }
}

function downloadResult() {
  if (resultBlob.value) {
    downloadBlob(resultBlob.value, 'merged.pdf')
  }
}
</script>

<style scoped>
.tool-page {
  max-width: 700px;
  margin: 0 auto;
}

.tool-title {
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--spacing-sm);
}

.tool-desc {
  text-align: center;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

/* ===== 合并列表 ===== */
.merge-list {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: var(--spacing-md);
}

.merge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: grab;
  width: 140px;
  transition: background var(--transition-fast), box-shadow var(--transition-fast);
}

.merge-item:hover {
  background: var(--color-bg-secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.merge-item--blank {
  border-style: dashed;
  border-color: var(--color-border);
  opacity: 0.85;
}

.merge-item--add {
  border: 2px dashed var(--color-border);
  cursor: pointer;
}

.merge-item--add:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.merge-item__thumb--add {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
}

.merge-add-icon {
  font-size: 2.5rem;
  font-weight: 300;
  color: var(--color-text-muted);
  line-height: 1;
  transition: color var(--transition-fast);
}

.merge-item--add:hover .merge-add-icon {
  color: var(--color-primary);
}

.merge-item__name--add {
  color: var(--color-text-muted);
  font-weight: 500;
}

.merge-item--add:hover .merge-item__name--add {
  color: var(--color-primary);
}

/* ===== 插入按钮（缩略图之间） ===== */
.merge-insert {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.merge-insert__btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  padding: 0;
}

.merge-insert__btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.merge-insert__icon {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1;
}

.merge-insert__menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  min-width: 140px;
  z-index: 20;
}

.merge-insert__menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--color-text);
  font-size: 0.8125rem;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition: background var(--transition-fast);
}

.merge-insert__menu-item:hover {
  background: var(--color-bg-secondary);
  color: var(--color-primary);
}

.merge-item__handle {
  display: none;
}

.merge-item__thumb {
  position: relative;
  width: 108px;
  height: 144px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #fff;
  flex-shrink: 0;
}

.merge-item__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.merge-item__thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
}

.merge-item__thumb-loading {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.merge-item__thumb-blank {
  font-size: 2rem;
  opacity: 0.4;
}

.merge-item__delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 0.8125rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  line-height: 1;
}

.merge-item__delete:hover {
  background: rgba(220, 38, 38, 0.85);
}

.merge-item__info {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.merge-item__name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  text-align: center;
}

.merge-item__meta {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-align: center;
}

/* ===== 操作区 ===== */
.action-card {
  margin-top: var(--spacing-xl);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
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

/* 进度条 */
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

/* 结果区 */
.action-card__result {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.result-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.result-body {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 700;
  font-size: 1.125rem;
}

.result-desc {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.result-filename {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  word-break: break-all;
  margin-top: var(--spacing-xs);
}

.result-download-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: 0.9375rem;
}

.error {
  margin-top: var(--spacing-md);
  color: var(--color-error);
  font-size: 0.875rem;
  text-align: center;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
