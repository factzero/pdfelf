/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

/**
 * Get DPI label
 */
export function getDpiLabel(dpi: number): string {
  return `${dpi} DPI`
}

/**
 * Get file extension from format
 */
export function getImageExtension(format: 'png' | 'jpeg'): string {
  return format === 'jpeg' ? 'jpg' : 'png'
}
