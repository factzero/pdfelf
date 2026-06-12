<template>
  <div class="tool-page container">
    <h1 class="tool-title">🖼️ 图片转 PDF</h1>
    <p class="tool-desc">将一张或多张图片合并转换为 PDF 文件</p>
    <FileDropZone :accept="['png', 'jpg', 'jpeg', 'webp', 'gif']" :multiple="true" @file-selected="onFileSelected" @error="onError" />
    <div v-if="files.length > 0" class="options">
      <div class="file-list">
        <div v-for="(f, i) in files" :key="i" class="file-item">
          <span class="file-name">{{ f.name }}</span>
          <button class="btn-remove" @click="removeFile(i)">✕</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">页面尺寸</label>
          <select v-model="pageSize" class="form-input">
            <option value="auto">自动适应</option>
            <option value="a4">A4</option>
            <option value="a3">A3</option>
            <option value="letter">Letter</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">方向</label>
          <select v-model="orientation" class="form-input" :disabled="pageSize === 'auto'">
            <option value="portrait">纵向</option>
            <option value="landscape">横向</option>
          </select>
        </div>
      </div>
    </div>
    <button
      v-if="files.length > 0"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="convert"
    >
      {{ isProcessing ? '转换中...' : '转换为 PDF' }}
    </button>
    <ProgressBar :visible="isProcessing" :percent="progress" :text="progressText" />
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ResultDownload v-if="resultBlob" :file-info="{ blob: resultBlob, filename: outputFilename }" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ResultDownload from '@/components/ResultDownload.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { imagesToPdf } from '@/services/imageToPdfService'

const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const files = ref<File[]>([])
const pageSize = ref<'auto' | 'a4' | 'a3' | 'letter'>('auto')
const orientation = ref<'portrait' | 'landscape'>('portrait')
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  const newFiles = Array.isArray(file) ? file : [file]
  files.value = [...files.value, ...newFiles]
  outputFilename.value = 'images_converted.pdf'
}

function onError(message: string) { errorMsg.value = message }

function removeFile(index: number) {
  files.value.splice(index, 1)
  if (files.value.length === 0) resultBlob.value = null
}

async function convert() {
  if (files.value.length === 0) return
  store.startProcessing('正在转换为 PDF...')
  try {
    const blob = await imagesToPdf(
      [...files.value],
      pageSize.value,
      orientation.value,
      (p) => store.updateProgress(p)
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
.tool-page { max-width: 640px; margin: 0 auto; }
.tool-title { font-size: 1.75rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }
.options { margin-top: var(--spacing-lg); }
.file-list { display: flex; flex-direction: column; gap: var(--spacing-xs); margin-bottom: var(--spacing-lg); }
.file-item { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.875rem; }
.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-remove { background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1rem; padding: 0 4px; }
.form-row { display: flex; gap: var(--spacing-md); }
.form-group { flex: 1; }
.form-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.form-input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; background: var(--color-bg); box-sizing: border-box; }
.btn--large { display: block; width: 100%; margin-top: var(--spacing-xl); padding: var(--spacing-md); font-size: 1rem; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
</style>
