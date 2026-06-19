<template>
  <div class="tool-page container">
    <h1 class="tool-title">{{ $t('delete.title') }}</h1>
    <p class="tool-desc">{{ $t('delete.desc') }}</p>
    <FileDropZone :accept="['pdf']" @file-selected="onFileSelected" @error="onError" />
    <div v-if="selectedFile && pageCount > 0" class="options">
      <p class="page-info">{{ $t('delete.selectPages', { n: pageCount }) }}</p>
      <div class="page-grid">
        <label v-for="p in pageCount" :key="p" class="page-item" :class="{ selected: toDelete.includes(p) }">
          <input type="checkbox" :value="p" v-model="toDelete" />
          <span>{{ $t('common.page', { p }) }}</span>
        </label>
      </div>
      <div class="actions-row">
        <button class="btn-link" @click="selectAll">{{ $t('common.selectAll') }}</button>
        <button class="btn-link" @click="clearAll">{{ $t('common.deselectAll') }}</button>
      </div>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing || toDelete.length === 0"
      @click="deletePages"
    >
      {{ isProcessing ? $t('common.processing') : $t('delete.deleteBtn', { n: toDelete.length }) }}
    </button>
    <ProgressBar :visible="isProcessing" :percent="progress" :text="progressText" />
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ResultDownload v-if="resultBlob" :file-info="{ blob: resultBlob, filename: outputFilename }" />
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
import { getPageCount, deletePages as deletePagesService } from '@/services/pdfService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const toDelete = ref<number[]>([])
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'trimmed')
  const count = await getPageCount(selectedFile.value)
  pageCount.value = count
  toDelete.value = []
}

function onError(message: string) {
  errorMsg.value = message
}

function selectAll() {
  toDelete.value = Array.from({ length: pageCount.value }, (_, i) => i + 1)
}

function clearAll() {
  toDelete.value = []
}

async function deletePages() {
  if (!selectedFile.value || toDelete.value.length === 0) return
  if (toDelete.value.length >= pageCount.value) {
    errorMsg.value = t('delete.cannotDeleteAll')
    return
  }
  store.startProcessing(t('delete.deleting'))
  try {
    const blob = await deletePagesService(selectedFile.value, [...toDelete.value], (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : t('delete.failed'))
    errorMsg.value = t('delete.failed')
  }
}
</script>

<style scoped>
.tool-page { max-width: 640px; margin: 0 auto; }
.tool-title { font-size: 1.75rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }
.options { margin-top: var(--spacing-lg); }
.page-info { font-size: 0.9375rem; font-weight: 600; margin-bottom: var(--spacing-md); }
.page-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: var(--spacing-xs); }
.page-item { display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; font-size: 0.875rem; transition: all var(--transition-fast); }
.page-item:hover { border-color: var(--color-primary); }
.page-item.selected { border-color: var(--color-error); background: #fef2f2; }
.actions-row { display: flex; gap: var(--spacing-md); margin-top: var(--spacing-md); }
.btn-link { background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 0.8125rem; text-decoration: underline; }
.btn--large { display: block; width: 100%; margin-top: var(--spacing-xl); padding: var(--spacing-md); font-size: 1rem; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
</style>
