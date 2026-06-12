<template>
  <div class="tool-page container">
    <h1 class="tool-title">🔏 PDF 添加水印</h1>
    <p class="tool-desc">给 PDF 每一页添加文字水印</p>
    <FileDropZone :accept="['pdf']" @file-selected="onFileSelected" @error="onError" />
    <div v-if="selectedFile" class="options">
      <div class="form-group">
        <label class="form-label">水印文字</label>
        <input v-model="watermarkText" type="text" class="form-input" placeholder="例如：机密文件" maxlength="50" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">字体大小</label>
          <input v-model.number="fontSize" type="number" class="form-input" min="12" max="120" />
        </div>
        <div class="form-group">
          <label class="form-label">透明度</label>
          <select v-model.number="opacity" class="form-input">
            <option :value="0.08">很浅 (8%)</option>
            <option :value="0.15">浅 (15%)</option>
            <option :value="0.25">中等 (25%)</option>
            <option :value="0.4">深 (40%)</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">旋转角度</label>
          <select v-model.number="angle" class="form-input">
            <option :value="0">水平</option>
            <option :value="30">30°</option>
            <option :value="45">45° (推荐)</option>
            <option :value="60">60°</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">颜色</label>
          <select v-model="colorPreset" class="form-input">
            <option value="gray">灰色</option>
            <option value="red">红色</option>
            <option value="blue">蓝色</option>
            <option value="black">黑色</option>
          </select>
        </div>
      </div>
    </div>
    <button
      v-if="selectedFile"
      class="btn btn--primary btn--large"
      :disabled="isProcessing || !watermarkText.trim()"
      @click="addWatermark"
    >
      {{ isProcessing ? '处理中...' : '添加水印' }}
    </button>
    <ProgressBar :visible="isProcessing" :percent="progress" :text="progressText" />
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ResultDownload v-if="resultBlob" :file-info="{ blob: resultBlob, filename: outputFilename }" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FileDropZone from '@/components/FileDropZone.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ResultDownload from '@/components/ResultDownload.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename } from '@/utils/fileUtils'
import { addWatermark } from '@/services/pdfService'

const store = useToolStore()
const { isProcessing, progress, progressText } = storeToRefs(store)

const colorMap: Record<string, { r: number; g: number; b: number }> = {
  gray: { r: 0.5, g: 0.5, b: 0.5 },
  red: { r: 0.9, g: 0.2, b: 0.2 },
  blue: { r: 0.2, g: 0.4, b: 0.9 },
  black: { r: 0.1, g: 0.1, b: 0.1 },
}

const selectedFile = ref<File | null>(null)
const watermarkText = ref('机密文件')
const fontSize = ref(48)
const opacity = ref(0.15)
const angle = ref(45)
const colorPreset = ref('gray')
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

function onFileSelected(file: File | File[]) {
  errorMsg.value = ''
  resultBlob.value = null
  selectedFile.value = file as File
  outputFilename.value = generateOutputFilename(selectedFile.value.name, 'pdf', 'watermarked')
}

function onError(message: string) { errorMsg.value = message }

async function doWatermark() {
  if (!selectedFile.value || !watermarkText.value.trim()) return
  store.startProcessing('正在添加水印...')
  try {
    const blob = await addWatermark(
      selectedFile.value,
      watermarkText.value.trim(),
      {
        fontSize: fontSize.value,
        opacity: opacity.value,
        color: colorMap[colorPreset.value],
        angle: angle.value,
      },
      (p) => store.updateProgress(p)
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    store.setError(e instanceof Error ? e.message : '添加水印失败')
    errorMsg.value = '添加水印失败，请重试'
  }
}
</script>

<style scoped>
.tool-page { max-width: 640px; margin: 0 auto; }
.tool-title { font-size: 1.75rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-xl); }
.options { margin-top: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { flex: 1; }
.form-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.form-input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.9375rem; background: var(--color-bg); box-sizing: border-box; }
.form-input:focus { outline: none; border-color: var(--color-primary); }
.form-row { display: flex; gap: var(--spacing-md); }
.btn--large { display: block; width: 100%; margin-top: var(--spacing-xl); padding: var(--spacing-md); font-size: 1rem; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { margin-top: var(--spacing-md); color: var(--color-error); font-size: 0.875rem; text-align: center; }
</style>
