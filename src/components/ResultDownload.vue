<template>
  <div v-if="fileInfo" class="result">
    <div class="result__card">
      <div class="result__icon">✅</div>
      <div class="result__info">
        <p class="result__filename">{{ fileInfo.filename }}</p>
        <p class="result__size">文件大小：{{ fileInfo.size }}</p>
      </div>
      <button class="btn btn--primary" @click="download">
        ⬇ 下载文件
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatFileSize, downloadBlob } from '@/utils/fileUtils'

const props = defineProps<{
  fileInfo: {
    blob: Blob
    filename: string
  } | null
}>()

const emit = defineEmits<{
  download: []
}>()

const fileInfo = computed(() => {
  if (!props.fileInfo) return null
  return {
    ...props.fileInfo,
    size: formatFileSize(props.fileInfo.blob.size),
  }
})

function download() {
  if (props.fileInfo) {
    downloadBlob(props.fileInfo.blob, props.fileInfo.filename)
    emit('download')
  }
}
</script>

<script lang="ts">
import { computed, defineComponent } from 'vue'
export default defineComponent({ name: 'ResultDownload' })
</script>

<style scoped>
.result {
  margin-top: var(--spacing-xl);
}

.result__card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.result__icon {
  font-size: 2rem;
}

.result__info {
  flex: 1;
}

.result__filename {
  font-weight: 600;
  color: var(--color-text);
  word-break: break-all;
}

.result__size {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn--primary {
  background: var(--color-primary);
  color: white;
}

.btn--primary:hover {
  background: var(--color-primary-hover);
}

@media (max-width: 640px) {
  .result__card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
