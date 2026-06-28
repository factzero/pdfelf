<template>
  <div class="tool-page container">
    <h1 class="tool-title"><Globe :size="28" :stroke-width="2" class="tool-title__icon" /> {{ $t('htmlToPdf.title') }}</h1>
    <p class="tool-desc">{{ $t('htmlToPdf.desc') }}</p>

    <!-- Mode tabs -->
    <div class="mode-tabs">
      <button class="mode-tab" :class="{ 'mode-tab--active': inputMode === 'paste' }" @click="inputMode = 'paste'">
        <Pencil :size="16" :stroke-width="1.5" /> {{ $t('htmlToPdf.modePaste') }}
      </button>
      <button class="mode-tab" :class="{ 'mode-tab--active': inputMode === 'file' }" @click="inputMode = 'file'">
        <FileText :size="16" :stroke-width="1.5" /> {{ $t('htmlToPdf.modeFile') }}
      </button>
    </div>

    <!-- Paste mode -->
    <div v-if="inputMode === 'paste'" class="options">
      <div class="form-group">
        <label class="form-label">{{ $t('htmlToPdf.htmlCode') }}</label>
        <textarea
          v-model="htmlCode"
          class="form-textarea"
          rows="12"
          :placeholder="$t('htmlToPdf.htmlPlaceholder')"
        ></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('htmlToPdf.preview') }}</label>
          <div class="preview-box">
            <iframe
              v-if="htmlCode.trim()"
              :srcdoc="htmlCode"
              class="preview-iframe"
              sandbox="allow-same-origin"
            ></iframe>
            <div v-else class="preview-placeholder">{{ $t('htmlToPdf.previewHint') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- File mode -->
    <div v-if="inputMode === 'file'" class="options">
      <div class="form-group">
        <label class="form-label">{{ $t('htmlToPdf.htmlFile') }}</label>
        <FileDropZone
          v-if="!htmlFile"
          :accept="['html', 'htm']"
          @file-selected="onHtmlFileSelected"
          @error="onError"
        />
        <div v-else class="file-preview">
          <div class="file-preview__thumbnail" @mouseenter="showDelete = true" @mouseleave="showDelete = false">
            <FileText :size="24" :stroke-width="1.5" class="file-preview__icon" />
            <Transition name="fade">
              <button v-if="showDelete" class="file-preview__delete" @click="clearHtmlFile">✕</button>
            </Transition>
          </div>
          <div class="file-preview__meta">
            <span class="file-preview__name">{{ htmlFile?.name }}</span>
            <span class="file-preview__size">{{ formatFileSize(htmlFile?.size || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Options -->
    <div v-if="hasInput" class="options">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('htmlToPdf.pageSize') }}</label>
          <select v-model="pageSize" class="form-input">
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
            <option value="legal">Legal</option>
            <option value="a3">A3</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('htmlToPdf.orientation') }}</label>
          <select v-model="orientation" class="form-input">
            <option value="portrait">{{ $t('htmlToPdf.portrait') }}</option>
            <option value="landscape">{{ $t('htmlToPdf.landscape') }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Action -->
    <div v-if="hasInput" class="action-card">
      <button
        v-if="!isProcessing && !resultBlob"
        class="btn btn--primary btn--large"
        @click="process"
      >
        {{ $t('htmlToPdf.startBtn') }}
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
          <p class="result-title">{{ $t('htmlToPdf.completed') }}</p>
          <p class="result-filename">{{ outputFilename }}</p>
        </div>
        <button class="btn btn--primary result-download-btn" @click="downloadResult">
          {{ $t('common.downloadFile') }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <ToolSeoContent :ns="'htmlToPdf'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, Globe, Pencil } from 'lucide-vue-next'
import FileDropZone from '@/components/FileDropZone.vue'
import ToolSeoContent from '@/components/ToolSeoContent.vue'
import { useToolStore } from '@/stores/toolStore'
import { storeToRefs } from 'pinia'
import { generateOutputFilename, downloadBlob } from '@/utils/fileUtils'
import { htmlToPdf } from '@/services/htmlToPdfService'

const store = useToolStore()
const { t } = useI18n()
const { isProcessing, progress, progressText } = storeToRefs(store)

const inputMode = ref<'paste' | 'file'>('paste')
const htmlCode = ref('')
const htmlFile = ref<File | null>(null)
const htmlFileContent = ref('')
const pageSize = ref('a4')
const orientation = ref<'portrait' | 'landscape'>('portrait')
const showDelete = ref(false)
const resultBlob = ref<Blob | null>(null)
const outputFilename = ref('')
const errorMsg = ref('')

const hasInput = computed(() => {
  if (inputMode.value === 'paste') return htmlCode.value.trim().length > 0
  return !!htmlFile.value
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function onHtmlFileSelected(file: File | File[]) {
  const f = file as File
  htmlFile.value = f
  outputFilename.value = generateOutputFilename(f.name, 'pdf', '')
  const reader = new FileReader()
  reader.onload = () => {
    htmlFileContent.value = reader.result as string
  }
  reader.readAsText(f)
}

function clearHtmlFile() {
  htmlFile.value = null
  htmlFileContent.value = ''
  resultBlob.value = null
}

function onError(msg: string) {
  errorMsg.value = msg
}

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, outputFilename.value)
}

async function process() {
  errorMsg.value = ''
  const html = inputMode.value === 'paste' ? htmlCode.value : htmlFileContent.value
  if (!html.trim()) return

  if (inputMode.value === 'paste') {
    outputFilename.value = 'html-output.pdf'
  }

  store.startProcessing(t('htmlToPdf.processing'))
  try {
    const blob = await htmlToPdf(
      html,
      {
        format: pageSize.value,
        orientation: orientation.value,
      },
      (p) => store.updateProgress(p),
    )
    resultBlob.value = blob
    store.finishProcessing()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.setError(msg)
    errorMsg.value = msg || (t('common.failed') as string)
  }
}
</script>

<style scoped>
.tool-page { max-width: 880px; margin: 0 auto; }
.tool-title { font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: var(--spacing-sm); }
.tool-desc { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); font-size: 0.875rem; }

.mode-tabs {
  display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--color-border);
}
.mode-tab {
  flex: 1; padding: var(--spacing-sm) var(--spacing-md);
  border: none; background: transparent;
  font-size: 0.875rem; font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: all 0.2s;
}
.mode-tab:hover { color: var(--color-primary); }
.mode-tab--active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 600; }

.options { margin-top: var(--spacing-md); display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { flex: 1; }
.form-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.form-input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.875rem; background: var(--color-bg); box-sizing: border-box; }
.form-row { display: flex; gap: var(--spacing-md); }

.form-textarea {
  width: 100%; padding: var(--spacing-md); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); font-size: 0.8125rem; font-family: 'Consolas', 'Monaco', monospace;
  background: var(--color-bg); resize: vertical; box-sizing: border-box;
}
.form-textarea:focus { outline: none; border-color: var(--color-primary); }

.preview-box {
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  overflow: hidden; min-height: 200px; background: #fff;
}
.preview-iframe { width: 100%; height: 300px; border: none; }
.preview-placeholder {
  display: flex; align-items: center; justify-content: center;
  height: 200px; color: var(--color-text-muted); font-size: 0.875rem;
}

.file-preview { margin-top: var(--spacing-xs); }
.file-preview__thumbnail {
  position: relative; border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg-tertiary); display: flex; align-items: center; justify-content: center;
  height: 80px; cursor: pointer;
}
.file-preview__icon { font-size: 2rem; }
.file-preview__delete {
  position: absolute; top: 6px; right: 6px; width: 24px; height: 24px;
  border: none; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff;
  font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.file-preview__delete:hover { background: rgba(220,38,38,0.85); }
.file-preview__meta { display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-xs); font-size: 0.8125rem; }
.file-preview__name { font-weight: 600; color: var(--color-text); word-break: break-all; }
.file-preview__size { color: var(--color-text-muted); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.action-card { margin-top: var(--spacing-lg); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); }
.btn--large { display: block; width: 100%; padding: var(--spacing-sm) var(--spacing-md); font-size: 0.9375rem; border: none; cursor: pointer; }
.btn--primary { background: var(--color-primary); color: white; border-radius: var(--radius-md); font-weight: 600; transition: background var(--transition-fast); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

.action-card__progress { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.progress-bar { width: 100%; height: 6px; background: var(--color-bg-tertiary); border-radius: 3px; overflow: hidden; }
.progress-bar__fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), #60a5fa); border-radius: 3px; transition: width 0.3s ease; }
.progress-info { display: flex; justify-content: space-between; }
.progress-text { font-size: 0.8125rem; color: var(--color-text-secondary); }
.progress-percent { font-size: 0.8125rem; font-weight: 600; color: var(--color-primary); }

.action-card__result { display: flex; align-items: center; gap: var(--spacing-md); }
.result-icon { font-size: 1.5rem; flex-shrink: 0; }
.result-body { flex: 1; min-width: 0; }
.result-title { font-weight: 700; font-size: 1rem; margin-bottom: 2px; }
.result-filename { font-size: 0.75rem; color: var(--color-text-muted); word-break: break-all; }
.result-download-btn { flex-shrink: 0; display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-md); font-size: 0.875rem; }

.error { margin-top: var(--spacing-sm); color: var(--color-error); font-size: 0.8125rem; text-align: center; }
</style>
