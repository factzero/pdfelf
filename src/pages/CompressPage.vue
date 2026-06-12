<template>
  <div class="tool-page container">
    <h1 class="tool-title">🗜️ 压缩 PDF</h1>
    <p class="tool-desc">减小 PDF 文件大小，选择适合你的压缩模式</p>
    <FileDropZone
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />
    <div v-if="selectedFile" class="options">
      <label class="option">
        <input type="radio" v-model="compressMode" value="basic" />
        <span class="option__label">
          <strong>基本压缩</strong>
          <small>推荐 — 适度压缩，保持良好质量</small>
        </span>
      </label>
      <label class="option">
        <input type="radio" v-model="compressMode" value="strong" />
        <span class="option__label">
          <strong>强压缩</strong>
          <small>更高压缩率，可能有轻微质量损失</small>
        </span>
      </label>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="compress"
    >
      {{ isProcessing ? '处理中...' : '开始压缩' }}
    </button>
    <ProgressBar
      :visible="isProcessing"
      :percent="progress"
      :text="progressText"
    />
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ResultDownload
      v-if="resultBlob"
      :file-info="{ blob: resultBlob, filename: outputFilename }"
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
import { generateOutputFilename } from '@/utils/fileUtils'
import { compressPDF } from '@/services/pdfService'

const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const compressMode = ref<'basic' | 'strong'>('basic')
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(
    selectedFile.value.name,
    'pdf',
    'compressed'
  )
}

function onError(message: string) {
  errorMsg.value = message
}

async function compress() {
  if (!selectedFile.value) return
  store.startProcessing(
    compressMode.value === 'basic' ? '正在压缩...' : '正在进行强压缩...'
  )
  try {
    const blob = await compressPDF(
      selectedFile.value,
      compressMode.value,
      (p) => store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : '压缩失败')
    errorMsg.value = '压缩失败，请重试'
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

.options {
  margin-top: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.option {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.option:hover {
  border-color: var(--color-primary);
}

.option input[type='radio'] {
  margin-top: 2px;
}

.option__label {
  display: flex;
  flex-direction: column;
}

.option__label strong {
  font-size: 0.9375rem;
}

.option__label small {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
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
