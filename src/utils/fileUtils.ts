/**
 * Read a File as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Trigger file download in browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Validate file type against allowed extensions
 */
export function validateFileType(
  file: File,
  allowedExtensions: string[]
): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return allowedExtensions.includes(ext)
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024
}

/**
 * Generate output filename from input
 */
export function generateOutputFilename(
  inputName: string,
  newExtension: string,
  suffix?: string
): string {
  const baseName = inputName.replace(/\.[^.]+$/, '')
  const s = suffix ? `_${suffix}` : ''
  return `${baseName}${s}.${newExtension}`
}
