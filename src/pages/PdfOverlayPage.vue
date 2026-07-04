<template>
  <div class="tool-page container">
    <h1 class="tool-title"><CopyPlus :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('overlay.title') }}</h1>
    <p class="tool-desc">{{ $t('overlay.desc') }}</p>

    <div class="section-label">{{ $t('overlay.baseFile') }}</div>
    <FileDropZone
      v-if="!baseFile"
      :accept="['pdf']"
      @file-selected="onBaseSelected"
      @error="onError"
    />
    <div v-if="baseFile" class="file-preview file-preview--compact">
      <span class="file-preview__name">{{ baseFile.name }}</span>
      <button class="btn--small" @click="baseFile = null">✕</button>
    </div>

    <div v-if="baseFile" class="section-label" style="margin-top:16px">{{ $t('overlay.overlayFile') }}</div>
    <FileDropZone
      v-if="baseFile && !overlayFile"
      :accept="['pdf']"
      @file-selected="onOverlaySelected"
      @error="onError"
    />
    <div v-if="overlayFile" class="file-preview file-preview--compact">
      <span class="file-preview__name">{{ overlayFile.name }}</span>
      <button class="btn--small" @click="overlayFile = null">✕</button>
    </div>

    <div v-if="baseFile && overlayFile" class="action-card">
      <template v-if="!isProcessing && !resultBlob">
        <p class="action-card__note">{{ $t('overlay.note') }}</p>
        <button class="btn btn--primary btn--large" @click="doOverlay">
          {{ $t('overlay.overlayBtn') }}
        </button>
      </template>

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
          <p class="result-title">{{ $t('overlay.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
          <p class="result-file-size">{{ formatFileSize(resultBlob.size) }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'overlay'" />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { CopyPlus } from 'lucide-vue-next'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, formatFileSize, downloadBlob } from '@/utils/fileUtils'
import { overlayPdfs } from '@/services/pdfOverlayService'

const { t } = useI18n()
const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const baseFile = ref<File | null>(null)
const overlayFile = ref<File | null>(null)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

function onError(message: string) {
  errorMsg.value = message
}

function onBaseSelected(f: File | File[]) { baseFile.value = f as File }
function onOverlaySelected(f: File | File[]) { overlayFile.value = f as File }

async function doOverlay() {
  if (!baseFile.value || !overlayFile.value) return
  errorMsg.value = ''
  outputFilename.value = generateOutputFilename(baseFile.value.name, 'overlay')
  store.startProcessing(t('overlay.overlaying'))
  try {
    const blob = await overlayPdfs(baseFile.value, overlayFile.value, (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('overlay.failed'))
    errorMsg.value = t('overlay.failed')
  }
}

function downloadResult() {
  if (resultBlob.value) {
    downloadBlob(resultBlob.value, outputFilename.value)
  }
}

onUnmounted(() => { store.reset() })
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

.section-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 8px;
}

.file-preview--compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  margin-bottom: 8px;
}

.file-preview__name {
  font-weight: 600;
  color: var(--color-text);
  word-break: break-all;
}

.btn--small {
  padding: 4px 10px;
  font-size: 0.75rem;
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}

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
