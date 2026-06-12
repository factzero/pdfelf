<template>
  <div class="tool-page container">
    <h1 class="tool-title">✂️ 分割 PDF</h1>
    <p class="tool-desc">按页面范围或每 N 页分割 PDF</p>
    <FileDropZone
      :accept="['pdf']"
      @file-selected="onFileSelected"
      @error="onError"
    />
    <div v-if="selectedFile" class="options">
      <label class="option">
        <input type="radio" v-model="splitMode" value="range" />
        <span class="option__label">
          <strong>按范围提取</strong>
          <small>输入页码范围，如 1-3, 5-8</small>
        </span>
      </label>
      <div v-if="splitMode === 'range'" class="option-input">
        <input
          v-model="rangeInput"
          type="text"
          placeholder="例如：1-3, 5-8"
          class="input"
        />
      </div>
      <label class="option">
        <input type="radio" v-model="splitMode" value="every" />
        <span class="option__label">
          <strong>每 N 页分割</strong>
          <small>按固定页数分割为多个文件</small>
        </span>
      </label>
      <div v-if="splitMode === 'every'" class="option-input">
        <input
          v-model.number="everyN"
          type="number"
          min="1"
          placeholder="每 N 页"
          class="input input--short"
        />
      </div>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing"
      @click="split"
    >
      {{ isProcessing ? '处理中...' : '分割 PDF' }}
    </button>
    <ProgressBar
      :visible="isProcessing"
      :percent="progress"
      :text="progressText"
    />
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ResultDownload
      v-if="resultBlob"
      :file-info="{ blob: resultBlob, filename: 'split.zip' }"
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
import { splitPDF } from '@/services/pdfService'

const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const selectedFile = ref<File | null>(null)
const splitMode = ref<'range' | 'every'>('range')
const rangeInput = ref('')
const everyN = ref(1)
const resultBlob = ref<Blob | null>(null)
const errorMsg = ref('')

function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  selectedFile.value = file as File
}

function onError(message: string) {
  errorMsg.value = message
}

async function split() {
  if (!selectedFile.value) return
  store.startProcessing('正在分割 PDF...')
  try {
    const ranges =
      splitMode.value === 'range'
        ? parseRanges(rangeInput.value)
        : undefined
    const blob = await splitPDF(
      selectedFile.value,
      splitMode.value === 'range' ? 'ranges' : 'every',
      ranges,
      everyN.value,
      (p) => store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : '分割失败')
    errorMsg.value = e instanceof Error ? e.message : '分割失败，请重试'
  }
}

function parseRanges(input: string): [number, number][] {
  const ranges: [number, number][] = []
  const parts = input.split(',')
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.includes('-')) {
      const [s, e] = trimmed.split('-').map(Number)
      if (!isNaN(s) && !isNaN(e)) ranges.push([s, e])
    } else {
      const n = Number(trimmed)
      if (!isNaN(n)) ranges.push([n, n])
    }
  }
  if (ranges.length === 0) throw new Error('请输入有效的页码范围')
  return ranges
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

.option-input {
  padding: 0 var(--spacing-md) var(--spacing-sm);
}

.input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--transition-fast);
}

.input:focus {
  border-color: var(--color-primary);
}

.input--short {
  width: 120px;
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
