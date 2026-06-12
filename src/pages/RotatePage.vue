<template>
  <div class="tool-page container">
    <h1 class="tool-title">🔄 旋转 PDF</h1>
    <p class="tool-desc">旋转 PDF 页面，支持每页独立设置旋转角度</p>
    <FileDropZone :accept="['pdf']" @file-selected="onFileSelected" @error="onError" />
    <div v-if="selectedFile && pageCount > 0" class="options">
      <p class="page-info">共 {{ pageCount }} 页，选择要旋转的页面：</p>
      <div class="page-grid">
        <div v-for="p in pageCount" :key="p" class="page-item">
          <span class="page-num">第 {{ p }} 页</span>
          <select v-model.number="rotations[p]" class="rotate-select">
            <option :value="0">不旋转</option>
            <option :value="90">顺时针 90°</option>
            <option :value="180">180°</option>
            <option :value="270">逆时针 90°</option>
          </select>
        </div>
      </div>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="rotate"
    >
      {{ isProcessing ? '处理中...' : '旋转并保存' }}
    </button>
    <ProgressBar :visible="isProcessing" :percent="progress" :text="progressText" />
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ResultDownload v-if="resultBlob" :file-info="{ blob: resultBlob, filename: outputFilename }" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ResultDownload from '@/components/ResultDownload.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename } from '@/utils/fileUtils'
import { rotatePDF, getPageCount } from '@/services/pdfService'

const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const pageCount = ref(0)
const rotations = reactive<Record<number, number>>({})
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

async function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'rotated')
  const count = await getPageCount(selectedFile.value)
  pageCount.value = count
  for (let i = 1; i <= count; i++) {
    rotations[i] = 0
  }
}

function onError(message: string) {
  errorMsg.value = message
}

async function rotate() {
  if (!selectedFile.value) return
  const rotationMap = new Map<number, number>()
  for (const [p, angle] of Object.entries(rotations)) {
    if (angle > 0) rotationMap.set(Number(p), angle)
  }
  if (rotationMap.size === 0) {
    errorMsg.value = '请至少选择一页进行旋转'
    return
  }
  store.startProcessing('正在旋转 PDF...')
  try {
    const blob = await rotatePDF(selectedFile.value, rotationMap, (p) => store.updateProgress(p))
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : '旋转失败')
    errorMsg.value = '旋转失败，请重试'
  }
}
</script>

<style scoped>
.tool-page { max-width: 640px; margin: 0 auto; }
.tool-title { font-size: 1.75rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }
.options { margin-top: var(--spacing-lg); }
.page-info { font-size: 0.9375rem; font-weight: 600; margin-bottom: var(--spacing-md); }
.page-grid { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.page-item { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.page-num { font-size: 0.875rem; font-weight: 500; }
.rotate-select { padding: var(--spacing-xs) var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.875rem; background: var(--color-bg); cursor: pointer; }
.btn--large { display: block; width: 100%; margin-top: var(--spacing-xl); padding: var(--spacing-md); font-size: 1rem; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
</style>
