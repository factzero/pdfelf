<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('wordToPdf.title') }}</h1>
    <p class="tool-desc">{{ $t('wordToPdf.desc') }}</p>
    <FileDropZone :accept="['docx']" @file-selected="onFileSelected" @error="onError" />
    <div v-if="selectedFile" class="notice">
      <p>{{ $t('wordToPdf.note') }}</p>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="convert"
    >
      {{ isProcessing ? $t('common.processing') : $t('wordToPdf.convertBtn') }}
    </button>
    <ProgressBar :visible="isProcessing" :percent="progress" :text="progressText" />
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ResultDownload v-if="resultBlob" :file-info="{ blob: resultBlob, filename: outputFilename }" />
    <ToolSeoContent :ns="'wordToPdf'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ResultDownload from '@/components/ResultDownload.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { wordToPdf } from '@/services/officeToPdfService'

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
  outputFilename.value = selectedFile.value.name.replace(/\.[^.]+$/, '.pdf')
}

function onError(message: string) { errorMsg.value = message }

async function convert() {
  if (!selectedFile.value) return
  store.startProcessing(t('wordToPdf.converting'))
  try {
    const blob = await wordToPdf(selectedFile.value, (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('wordToPdf.failed'))
    errorMsg.value = t('wordToPdf.failed')
  }
}
</script>

<style scoped>
.tool-page { max-width: 880px; margin: 0 auto; }
.tool-title { font-size: 1.75rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }
.notice { margin-top: var(--spacing-lg); padding: var(--spacing-md); background: #fffbeb; border: 1px solid #fcd34d; border-radius: var(--radius-md); font-size: 0.8125rem; color: #92400e; line-height: 1.5; }
.btn--large { display: block; width: 100%; margin-top: var(--spacing-xl); padding: var(--spacing-md); font-size: 1rem; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
</style>
