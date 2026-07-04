<template>
  <div class="tool-page container">
    <h1 class="tool-title"><FileText :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('txtToPdf.title') }}</h1>
    <p class="tool-desc">{{ $t('txtToPdf.desc') }}</p>

    <FileDropZone
      v-if="!selectedFile"
      :accept="['txt', 'text']"
      @file-selected="onFileSelected"
      @error="onError"
    />

    <div v-if="selectedFile" class="file-preview">
      <div class="file-preview__thumbnail" @mouseenter="showDelete = true" @mouseleave="showDelete = false">
        <div class="file-preview__placeholder">
          <FileText :size="48" :stroke-width="1" class="file-preview__placeholder-icon" />
        </div>
        <Transition name="fade">
          <button v-if="showDelete" class="file-preview__delete" @click="removeFile">✕</button>
        </Transition>
      </div>
      <div class="file-preview__meta">
        <span class="file-preview__name">{{ selectedFile.name }}</span>
        <span class="file-preview__size">{{ formatFileSize(selectedFile.size) }}</span>
      </div>
    </div>

    <div v-if="selectedFile && !isProcessing && !resultBlob" class="options">
      <div class="option-row">
        <label class="option-label">{{ $t('txtToPdf.fontSize') }}</label>
        <select v-model.number="options.fontSize" class="option-select">
          <option v-for="s in [9,10,11,12,14,16,18]" :key="s" :value="s">{{ s }}pt</option>
        </select>
      </div>
      <div class="option-row">
        <label class="option-label">{{ $t('txtToPdf.fontFamily') }}</label>
        <select v-model="options.fontFamily" class="option-select">
          <option value="helvetica">{{ $t('txtToPdf.fontHelvetica') }}</option>
          <option value="times">{{ $t('txtToPdf.fontTimes') }}</option>
          <option value="courier">{{ $t('txtToPdf.fontCourier') }}</option>
        </select>
      </div>
      <div class="option-row">
        <label class="option-label">{{ $t('txtToPdf.pageSize') }}</label>
        <select v-model="options.pageSize" class="option-select">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
      </div>
      <div class="option-row">
        <label class="option-label">{{ $t('txtToPdf.lineSpacing') }}</label>
        <select v-model.number="options.lineSpacing" class="option-select">
          <option :value="1.0">1.0</option>
          <option :value="1.3">1.3</option>
          <option :value="1.5">1.5</option>
          <option :value="2.0">2.0</option>
        </select>
      </div>
    </div>

    <div v-if="selectedFile" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        @click="doConvert"
      >
        {{ $t('txtToPdf.convertBtn') }}
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
          <p class="result-title">{{ $t('txtToPdf.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
          <p class="result-file-size">{{ formatFileSize(resultBlob.size) }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'txtToPdf'" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { formatFileSize, downloadBlob } from '@/utils/fileUtils'
import { convertTxtToPdf } from '@/services/txtToPdfService'

const { t } = useI18n()
const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')
const showDelete = ref(false)

const options = reactive({
  fontSize: 11,
  fontFamily: 'helvetica' as 'helvetica' | 'times' | 'courier',
  pageSize: 'a4' as 'a4' | 'letter',
  lineSpacing: 1.5,
})

function onError(message: string) {
  errorMsg.value = message
}

function removeFile() {
  selectedFile.value = null
  resultBlob.value = null
  errorMsg.value = ''
  showDelete.value = false
}

onUnmounted(() => {
  store.reset()
})

function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  selectedFile.value = file as File
  outputFilename.value = selectedFile.value.name.replace(/\.(txt|text)$/i, '.pdf')
}

async function doConvert() {
  if (!selectedFile.value) return
  store.startProcessing(t('txtToPdf.converting'))
  try {
    const blob = await convertTxtToPdf(
      selectedFile.value,
      {
        fontSize: options.fontSize,
        fontFamily: options.fontFamily,
        pageSize: options.pageSize,
        lineSpacing: options.lineSpacing,
      },
      (p) => store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('txtToPdf.failed'))
    errorMsg.value = t('txtToPdf.failed')
  }
}

function downloadResult() {
  if (resultBlob.value) {
    downloadBlob(resultBlob.value, outputFilename.value)
  }
}
</script>

<style scoped>
.tool-page {
  max-width: 880px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .tool-page {
    max-width: 100%;
  }
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

.file-preview {
  margin-top: var(--spacing-lg);
}

.file-preview__thumbnail {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-tertiary);
  cursor: pointer;
}

.file-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.options {
  margin-top: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.option-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.option-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text);
  min-width: 100px;
}

.option-select {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.9375rem;
  background: var(--color-bg);
  color: var(--color-text);
}

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

.result-download-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: 0.9375rem;
}

.result-title {
  font-weight: 700;
  font-size: 1.125rem;
  margin-bottom: var(--spacing-sm);
}

.result-filename {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  word-break: break-all;
  margin-bottom: var(--spacing-md);
}

.result-file-size {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.error {
  margin-top: var(--spacing-md);
  color: var(--color-error);
  font-size: 0.875rem;
  text-align: center;
}
</style>
