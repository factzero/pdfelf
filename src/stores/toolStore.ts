import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useToolStore = defineStore('tool', () => {
  const isProcessing = ref(false)
  const progress = ref(0)
  const progressText = ref('')
  const error = ref<string | null>(null)

  function startProcessing(text?: string) {
    isProcessing.value = true
    progress.value = 0
    progressText.value = text ?? ''
    error.value = null
  }

  function updateProgress(value: number, text?: string) {
    progress.value = Math.min(100, Math.max(0, value))
    if (text) progressText.value = text
  }

  function finishProcessing(text?: string) {
    isProcessing.value = false
    progress.value = 100
    if (text) progressText.value = text
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
