<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('pdfToPpt.title') }}</h1>
    <p class="tool-desc">{{ $t('pdfToPpt.desc') }}</p>
    <FileDropZone
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />
    <div v-if="selectedFile" class="file-info">
      <p class="file-info__name">📄 {{ selectedFile.name }}</p>
      <p class="file-info__hint">{{ $t('pdfToPpt.renderNote') }}</p>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="convert"
    >
      {{ isProcessing ? $t('common.processing') : $t('pdfToPpt.convertBtn') }}
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
import { useI18n } from 'vue-i18n'
import FileDropZone from '@/components/FileDropZone.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ResultDownload from '@/components/ResultDownload.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename } from '@/utils/fileUtils'
import { pdfToPpt } from '@/services/pdfToPptService'

const store = useToolStore()
const { t } = useI18n()
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
  store.startProcessing(t('pdfToPpt.converting'))
  try {
    const blob = await pdfToPpt(selectedFile.value, (p) =>
      store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('pdfToPpt.failed'))
    errorMsg.value = t('pdfToPpt.failed')
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
