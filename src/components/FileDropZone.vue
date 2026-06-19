<template>
  <div
    class="dropzone"
    :class="{
      'dropzone--active': isDragOver,
      'dropzone--has-file': hasFile,
    }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    @click="triggerInput"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="acceptStr"
      :multiple="multiple"
      class="dropzone__input"
      @change="onFileChange"
    />
    <div class="dropzone__content">
      <div class="dropzone__icon">{{ hasFile ? '📄' : '📁' }}</div>
      <div class="dropzone__text">
        <template v-if="hasFile">
          <p class="dropzone__filename">{{ fileName }}</p>
          <p class="dropzone__filesize">{{ fileSize }}</p>
        </template>
        <template v-else>
          <p class="dropzone__title">{{ $t('dropzone.dragHere') }}</p>
          <p class="dropzone__subtitle">{{ $t('dropzone.clickToSelect') }}</p>
        </template>
      </div>
    </div>
    <p class="dropzone__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatFileSize } from '@/utils/fileUtils'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    accept?: string[]
    multiple?: boolean
    maxSizeMB?: number
  }>(),
  {
    accept: () => ['pdf'],
    multiple: false,
    maxSizeMB: 100,
  }
)

const emit = defineEmits<{
  fileSelected: [file: File | File[]]
  error: [message: string]
}>()

const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const selectedFiles = ref<File[]>([])

const acceptStr = computed(() =>
  props.accept.map((ext) => `.${ext}`).join(',')
)

const hasFile = computed(() => selectedFiles.value.length > 0)

const fileName = computed(() => {
  if (selectedFiles.value.length === 1) return selectedFiles.value[0].name
  return t('dropzone.selectedFiles', { count: selectedFiles.value.length })
})

const fileSize = computed(() => {
  const total = selectedFiles.value.reduce((s, f) => s + f.size, 0)
  return formatFileSize(total)
})

const hint = computed(() => {
  const exts = props.accept.map((e) => e.toUpperCase()).join(' / ')
  return t('dropzone.supportedFormats', { exts, max: props.maxSizeMB })
})

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFiles(files)
  }
}

function triggerInput() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    handleFiles(input.files)
    input.value = ''
  }
}

function handleFiles(fileList: FileList) {
  const files = Array.from(fileList)

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!props.accept.includes(ext)) {
      emit('error', t('dropzone.unsupportedFormat', { name: file.name }))
      return
    }
    if (file.size > props.maxSizeMB * 1024 * 1024) {
      emit('error', t('dropzone.fileTooBig', { name: file.name, max: props.maxSizeMB }))
      return
    }
  }

  selectedFiles.value = files

  if (props.multiple) {
    emit('fileSelected', files)
  } else {
    emit('fileSelected', files[0])
  }
}

defineExpose({
  reset() {
    selectedFiles.value = []
  },
})
</script>

<style scoped>
.dropzone {
  border: 2px dashed var(--color-dropzone-border);
  border-radius: var(--radius-lg);
  background: var(--color-dropzone);
  padding: var(--spacing-3xl) var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
}

.dropzone:hover,
.dropzone--active {
  border-color: var(--color-primary);
  background: var(--color-dropzone-hover);
}

.dropzone--has-file {
  border-style: solid;
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.dropzone__input {
  display: none;
}

.dropzone__icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

.dropzone__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.dropzone__subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.dropzone__filename {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  word-break: break-all;
}

.dropzone__filesize {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.dropzone__hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: var(--spacing-lg);
}
</style>
