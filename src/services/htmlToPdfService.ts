import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * Convert HTML string to PDF
 * @param html - HTML string
 * @param options - Optional settings
 * @param onProgress - Progress callback (0-100)
 * @returns PDF as Blob
 */
export async function htmlToPdf(
  html: string,
  options?: {
    format?: string // 'a4' | 'letter' | [width, height] in mm
    orientation?: 'portrait' | 'landscape'
    scale?: number
  },
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  onProgress?.(10)

  const format = options?.format || 'a4'
  const orientation = options?.orientation || 'portrait'
  const scale = options?.scale || 2 // Higher scale = better quality

  // Create a hidden container to render the HTML
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '800px'
  container.style.background = '#fff'
  container.style.fontFamily = 'Arial, sans-serif'
  container.innerHTML = html
  document.body.appendChild(container)

  onProgress?.(30)

  try {
    // Render HTML to canvas
    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    onProgress?.(60)

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    // Create PDF
    let pdf: jsPDF
    if (Array.isArray(format)) {
      pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: format as unknown as [number, number] })
    } else {
      pdf = new jsPDF({ orientation, unit: 'mm', format: format as string })
    }

    onProgress?.(75)

    // Fit image to single page
    pdf = new jsPDF({ orientation, unit: 'mm', format: format as string })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const aspectRatio = imgWidth / imgHeight
    let drawW = pageW - 10
    let drawH = drawW / aspectRatio

    if (drawH > pageH - 10) {
      drawH = pageH - 10
      drawW = drawH * aspectRatio
    }

    const x = (pageW - drawW) / 2
    const y = (pageH - drawH) / 2

    pdf.addImage(imgData, 'PNG', x, y, drawW, drawH)

    onProgress?.(90)

    const pdfBlob = pdf.output('blob')
    onProgress?.(100)
    return pdfBlob
  } finally {
    document.body.removeChild(container)
  }
}
