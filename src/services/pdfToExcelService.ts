/**
 * PDF → Excel 转换服务
 * 使用 pyodide Worker（pymupdf + openpyxl），与 Word 转换共享同一 Worker 实例。
 */

export { pdfToExcel, type ProgressInfo, type ProgressStage } from './wordService'
