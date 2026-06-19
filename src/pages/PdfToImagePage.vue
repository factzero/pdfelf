<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('pdfToImage.title') }}</h1>
    <p class="tool-desc">{{ $t('pdfToImage.desc') }}</p>
    <FileDropZone
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />
    <div v-if="selectedFile" class="options">
      <div class="option-group">
        <label class="option-label">{{ $t('pdfToImage.format') }}</label>
        <div class="option-row">
          <label class="option-chip">
            <input type="radio" v-model="format" value="png" />
            <span>PNG</span>
          </label>
          <label class="option-chip">
            <input type="radio" v-model="format" value="jpeg" />
            <span>JPEG</span>
          </label>
        </div>
      </div>
      <div class="option-group">
        <label class="option-label">{{ $t('pdfToImage.resolution') }}</label>
        <div class="option-row">
          <label v-for="d in dpiOptions" :key="d" class="option-chip">
            <input type="radio" :value="d" v-model.number="dpi" />
            <span>{{ d }} DPI</span>
          </label>
        </div>
      </div>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="convert"
    >
      {{ isProcessing ? $t('common.processing') : $t('pdfToImage.convertBtn') }}
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
import { pdfToImage } from '@/services/imageService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const dpiOptions = [72, 150, 300]
const selectedFile = ref<File | null>(null)
const format = ref<'png' | 'jpeg'>('png')
const dpi = ref(150)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  selectedFile.value = file as File
  const baseName = selectedFile.value.name.replace(/\.[^.]+$/, '')
  const ext = format.value === 'jpeg' ? 'jpg' : 'png'
  outputFilename.value = `${baseName}.${ext}`
}

function onError(message: string) {
  errorMsg.value = message
}

async function convert() {
  if (!selectedFile.value) return
  store.startProcessing(t('pdfToImage.converting'))
  try {
    const result = await pdfToImage(
      selectedFile.value,
      format.value,
      dpi.value,
      (p) => store.updateProgress(p)
    )
    resultBlob.value = result.blob
    const baseName = selectedFile.value.name.replace(/\.[^.]+$/, '')
    if (result.isSingle) {
      outputFilename.value = `${baseName}.${result.ext}`
    } else {
      outputFilename.value = `${baseName}_images.zip`
    }
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('pdfToImage.failed'))
    errorMsg.value = t('pdfToImage.failed')
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
}

.option-group {
  margin-bottom: var(--spacing-md);
}

.option-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.option-row {
  display: flex;
  gap: var(--spacing-sm);
}

.option-chip {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all var(--transition-fast);
}

.option-chip:hover {
  border-color: var(--color-primary);
}

.option-chip:has(input:checked) {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.option-chip input[type='radio'] {
  display: none;
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
