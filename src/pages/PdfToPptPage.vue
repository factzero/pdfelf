<template>
  <div class="tool-page container">
    <h1 class="tool-title">📽️ PDF 转 PPT</h1>
    <p class="tool-desc">将 PDF 文件转换为 PowerPoint 演示文稿，每页 PDF 对应一张幻灯片</p>
    <FileDropZone
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />
    <div v-if="selectedFile" class="file-info">
      <p class="file-info__name">📄 {{ selectedFile.name }}</p>
      <p class="file-info__hint">每页 PDF 将渲染为图片嵌入到对应的幻灯片中</p>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="convert"
    >
      {{ isProcessing ? '转换中...' : '转换为 PPT' }}
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
import { pdfToPpt } from '@/services/pdfToPptService'

const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pptx')
}

function onError(message: string) {
  errorMsg.value = message
}

async function convert() {
  if (!selectedFile.value) return
  store.startProcessing('正在转换 PDF → PPT...')
  try {
    const blob = await pdfToPpt(selectedFile.value, (p) =>
      store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : '转换失败')
    errorMsg.value = '转换失败，请重试'
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

.file-info {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.file-info__name {
  font-weight: 600;
  color: var(--color-text);
}

.file-info__hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
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
