<template>
  <div class="tool-page container">
    <h1 class="tool-title">🔗 合并 PDF</h1>
    <p class="tool-desc">将多个 PDF 合并为一个文件，拖拽调整顺序</p>
    <FileDropZone
      :accept="['pdf']"
      :multiple="true"
      @file-selected="onFilesSelected"
      @error="onError"
    />
    <div v-if="files.length > 0" class="file-list">
      <div
        v-for="(file, i) in files"
        :key="i"
        class="file-item"
        draggable="true"
        @dragstart="onDragStart(i)"
        @dragover.prevent
        @drop="onDropItem($event, i)"
      >
        <span class="file-item__handle">⠿</span>
        <span class="file-item__index">{{ i + 1 }}</span>
        <span class="file-item__name">{{ file.name }}</span>
        <button class="file-item__remove" @click="removeFile(i)">✕</button>
      </div>
    </div>
    <button
      v-if="files.length > 1"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="merge"
    >
      {{ isProcessing ? '处理中...' : '合并 PDF' }}
    </button>
    <ProgressBar
      :visible="isProcessing"
      :percent="progress"
      :text="progressText"
    />
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ResultDownload
      v-if="resultBlob"
      :file-info="{ blob: resultBlob, filename: 'merged.pdf' }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ResultDownload from '@/components/ResultDownload.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { mergePDFs } from '@/services/pdfService'

const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const files = ref<File[]>([])
const resultBlob = ref<Blob | null>(null)
const errorMsg = ref('')
let dragIndex = -1

function onFilesSelected(selected: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  const arr = Array.isArray(selected) ? selected : [selected]
  files.value = [...files.value, ...arr]
}

function onError(message: string) {
  errorMsg.value = message
}

function removeFile(index: number) {
  files.value.splice(index, 1)
  resultBlob.value = null
}

function onDragStart(index: number) {
  dragIndex = index
}

function onDropItem(_e: DragEvent, index: number) {
  if (dragIndex === -1 || dragIndex === index) return
  const item = files.value.splice(dragIndex, 1)[0]
  files.value.splice(index, 0, item)
  dragIndex = -1
  resultBlob.value = null
}

async function merge() {
  store.startProcessing('正在合并 PDF...')
  try {
    const blob = await mergePDFs(files.value, (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : '合并失败')
    errorMsg.value = '合并失败，请重试'
  }
}
</script>

<style scoped>
.tool-page {
  max-width: 640px;
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

.file-list {
  margin-top: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: grab;
  transition: background var(--transition-fast);
}

.file-item:hover {
  background: var(--color-primary-light);
}

.file-item__handle {
  color: var(--color-text-muted);
  font-size: 1.25rem;
  cursor: grab;
}

.file-item__index {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  min-width: 1.5rem;
  text-align: center;
}

.file-item__name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item__remove {
  background: none;
  color: var(--color-text-muted);
  font-size: 1rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.file-item__remove:hover {
  color: var(--color-error);
  background: #fef2f2;
}

.btn--large {
  display: block;
  width: 100%;
  margin-top: var(--spacing-xl);
  padding: var(--spacing-md);
  font-size: 1rem;
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

.error {
  margin-top: var(--spacing-md);
  color: var(--color-error);
  font-size: 0.875rem;
  text-align: center;
}
</style>
