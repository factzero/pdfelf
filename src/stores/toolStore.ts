import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useToolStore = defineStore('tool', () => {
  const isProcessing = ref(false)
  const progress = ref(0)
  const progressText = ref('')
  const error = ref<string | null>(null)

  function startProcessing(text = '处理中...') {
    isProcessing.value = true
    progress.value = 0
    progressText.value = text
    error.value = null
  }

  function updateProgress(value: number, text?: string) {
    progress.value = Math.min(100, Math.max(0, value))
    if (text) progressText.value = text
  }

  function finishProcessing() {
    isProcessing.value = false
    progress.value = 100
    progressText.value = '处理完成'
  }

  function setError(message: string) {
    error.value = message
    isProcessing.value = false
  }

  function reset() {
    isProcessing.value = false
    progress.value = 0
    progressText.value = ''
    error.value = null
  }

  return {
    isProcessing,
    progress,
    progressText,
    error,
    startProcessing,
    updateProgress,
    finishProcessing,
    setError,
    reset,
  }
})
