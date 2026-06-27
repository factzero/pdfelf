import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
      meta: { titleKey: 'seo.homeTitle', descKey: 'seo.homeDesc', homePage: true },
    },
    // 整理
    {
      path: '/compress-pdf',
      name: 'compress-pdf',
      component: () => import('@/pages/CompressPage.vue'),
      meta: { titleKey: 'seo.compressPdf', descKey: 'tools.compressPdf.desc' },
    },
    {
      path: '/merge-pdf',
      name: 'merge-pdf',
      component: () => import('@/pages/MergePage.vue'),
      meta: { titleKey: 'seo.mergePdf', descKey: 'tools.mergePdf.desc' },
    },
    {
      path: '/split-pdf',
      name: 'split-pdf',
      component: () => import('@/pages/SplitPage.vue'),
      meta: { titleKey: 'seo.splitPdf', descKey: 'tools.splitPdf.desc' },
    },
    {
      path: '/rotate-pdf',
      name: 'rotate-pdf',
      component: () => import('@/pages/RotatePage.vue'),
      meta: { titleKey: 'seo.rotatePdf', descKey: 'tools.rotatePdf.desc' },
    },
    {
      path: '/delete-pages',
      name: 'delete-pages',
      component: () => import('@/pages/DeletePage.vue'),
      meta: { titleKey: 'seo.deletePages', descKey: 'tools.deletePages.desc' },
    },
    {
      path: '/extract-pages',
      name: 'extract-pages',
      component: () => import('@/pages/ExtractPage.vue'),
      meta: { titleKey: 'seo.extractPages', descKey: 'tools.extractPages.desc' },
    },
    {
      path: '/reorder-pages',
      name: 'reorder-pages',
      component: () => import('@/pages/PdfReorderPage.vue'),
      meta: { titleKey: 'seo.reorderPages', descKey: 'tools.reorderPages.desc' },
    },
    // 编辑
    {
      path: '/add-watermark',
      name: 'add-watermark',
      component: () => import('@/pages/WatermarkPage.vue'),
      meta: { titleKey: 'seo.addWatermark', descKey: 'tools.addWatermark.desc' },
    },
    {
      path: '/add-page-numbers',
      name: 'add-page-numbers',
      component: () => import('@/pages/AddPageNumberPage.vue'),
      meta: { titleKey: 'seo.addPageNumbers', descKey: 'tools.addPageNumbers.desc' },
    },
    // 安全
    {
      path: '/protect-pdf',
      name: 'protect-pdf',
      component: () => import('@/pages/ProtectPdfPage.vue'),
      meta: { titleKey: 'seo.protectPdf', descKey: 'tools.protectPdf.desc' },
    },
    {
      path: '/unlock-pdf',
      name: 'unlock-pdf',
      component: () => import('@/pages/UnlockPdfPage.vue'),
      meta: { titleKey: 'seo.unlockPdf', descKey: 'tools.unlockPdf.desc' },
    },
    {
      path: '/crop-pdf',
      name: 'crop-pdf',
      component: () => import('@/pages/CropPdfPage.vue'),
      meta: { titleKey: 'seo.cropPdf', descKey: 'tools.cropPdf.desc' },
    },
    {
      path: '/extract-images',
      name: 'extract-images',
      component: () => import('@/pages/ExtractImagesPage.vue'),
      meta: { titleKey: 'seo.extractImages', descKey: 'tools.extractImages.desc' },
    },
    {
      path: '/repair-pdf',
      name: 'repair-pdf',
      component: () => import('@/pages/RepairPdfPage.vue'),
      meta: { titleKey: 'seo.repairPdf', descKey: 'tools.repairPdf.desc' },
    },
    // 从 PDF 转换
    {
      path: '/pdf-to-word',
      name: 'pdf-to-word',
      component: () => import('@/pages/PdfToWordPage.vue'),
      meta: { titleKey: 'seo.pdfToWord', descKey: 'tools.pdfToWord.desc' },
    },
    {
      path: '/pdf-to-excel',
      name: 'pdf-to-excel',
      component: () => import('@/pages/PdfToExcelPage.vue'),
      meta: { titleKey: 'seo.pdfToExcel', descKey: 'tools.pdfToExcel.desc' },
    },
    {
      path: '/pdf-to-ppt',
      name: 'pdf-to-ppt',
      component: () => import('@/pages/PdfToPptPage.vue'),
      meta: { titleKey: 'seo.pdfToPpt', descKey: 'tools.pdfToPpt.desc' },
    },
    {
      path: '/pdf-to-image',
      name: 'pdf-to-image',
      component: () => import('@/pages/PdfToImagePage.vue'),
      meta: { titleKey: 'seo.pdfToImage', descKey: 'tools.pdfToImage.desc' },
    },
    {
      path: '/pdf-to-jpg',
      name: 'pdf-to-jpg',
      component: () => import('@/pages/PdfToJpgPage.vue'),
      meta: { titleKey: 'seo.pdfToJpg', descKey: 'tools.pdfToJpg.desc' },
    },
    {
      path: '/pdf-to-png',
      name: 'pdf-to-png',
      component: () => import('@/pages/PdfToPngPage.vue'),
      meta: { titleKey: 'seo.pdfToPng', descKey: 'tools.pdfToPng.desc' },
    },
    {
      path: '/pdf-to-tiff',
      name: 'pdf-to-tiff',
      component: () => import('@/pages/PdfToTiffPage.vue'),
      meta: { titleKey: 'seo.pdfToTiff', descKey: 'tools.pdfToTiff.desc' },
    },
    {
      path: '/pdf-to-svg',
      name: 'pdf-to-svg',
      component: () => import('@/pages/PdfToSvgPage.vue'),
      meta: { titleKey: 'seo.pdfToSvg', descKey: 'tools.pdfToSvg.desc' },
    },
    {
      path: '/pdf-to-text',
      name: 'pdf-to-text',
      component: () => import('@/pages/PdfToTextPage.vue'),
      meta: { titleKey: 'seo.pdfToText', descKey: 'tools.pdfToText.desc' },
    },
    {
      path: '/pdf-to-html',
      name: 'pdf-to-html',
      component: () => import('@/pages/PdfToHtmlPage.vue'),
      meta: { titleKey: 'seo.pdfToHtml', descKey: 'tools.pdfToHtml.desc' },
    },
    // 转换成 PDF
    {
      path: '/word-to-pdf',
      name: 'word-to-pdf',
      component: () => import('@/pages/WordToPdfPage.vue'),
      meta: { titleKey: 'seo.wordToPdf', descKey: 'tools.wordToPdf.desc' },
    },
    {
      path: '/excel-to-pdf',
      name: 'excel-to-pdf',
      component: () => import('@/pages/ExcelToPdfPage.vue'),
      meta: { titleKey: 'seo.excelToPdf', descKey: 'tools.excelToPdf.desc' },
    },
    {
      path: '/ppt-to-pdf',
      name: 'ppt-to-pdf',
      component: () => import('@/pages/PptToPdfPage.vue'),
      meta: { titleKey: 'seo.pptToPdf', descKey: 'tools.pptToPdf.desc' },
    },
    {
      path: '/image-to-pdf',
      name: 'image-to-pdf',
      component: () => import('@/pages/ImageToPdfPage.vue'),
      meta: { titleKey: 'seo.imageToPdf', descKey: 'tools.imageToPdf.desc' },
    },
    // 阅读器
    {
      path: '/pdf-reader',
      name: 'pdf-reader',
      component: () => import('@/pages/PdfReaderPage.vue'),
      meta: { titleKey: 'seo.pdfReader', descKey: 'tools.pdfReader.desc' },
    },
    // 更多工具
    {
      path: '/edit-metadata',
      name: 'edit-metadata',
      component: () => import('@/pages/EditMetadataPage.vue'),
      meta: { titleKey: 'seo.editMetadata', descKey: 'tools.editMetadata.desc' },
    },
    {
      path: '/flip-pdf',
      name: 'flip-pdf',
      component: () => import('@/pages/FlipPdfPage.vue'),
      meta: { titleKey: 'seo.flipPdf', descKey: 'tools.flipPdf.desc' },
    },
    {
      path: '/grayscale-pdf',
      name: 'grayscale-pdf',
      component: () => import('@/pages/GrayscalePdfPage.vue'),
      meta: { titleKey: 'seo.grayscalePdf', descKey: 'tools.grayscalePdf.desc' },
    },
    {
      path: '/resize-pdf',
      name: 'resize-pdf',
      component: () => import('@/pages/ResizePdfPage.vue'),
      meta: { titleKey: 'seo.resizePdf', descKey: 'tools.resizePdf.desc' },
    },
  ],
})

export default router
