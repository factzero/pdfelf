import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    // 整理
    {
      path: '/compress-pdf',
      name: 'compress-pdf',
      component: () => import('@/pages/CompressPage.vue'),
    },
    {
      path: '/merge-pdf',
      name: 'merge-pdf',
      component: () => import('@/pages/MergePage.vue'),
    },
    {
      path: '/split-pdf',
      name: 'split-pdf',
      component: () => import('@/pages/SplitPage.vue'),
    },
    {
      path: '/rotate-pdf',
      name: 'rotate-pdf',
      component: () => import('@/pages/RotatePage.vue'),
    },
    {
      path: '/delete-pages',
      name: 'delete-pages',
      component: () => import('@/pages/DeletePage.vue'),
    },
    {
      path: '/extract-pages',
      name: 'extract-pages',
      component: () => import('@/pages/ExtractPage.vue'),
    },
    // 编辑
    {
      path: '/add-watermark',
      name: 'add-watermark',
      component: () => import('@/pages/WatermarkPage.vue'),
    },
    // 从 PDF 转换
    {
      path: '/pdf-to-word',
      name: 'pdf-to-word',
      component: () => import('@/pages/PdfToWordPage.vue'),
    },
    {
      path: '/pdf-to-excel',
      name: 'pdf-to-excel',
      component: () => import('@/pages/PdfToExcelPage.vue'),
    },
    {
      path: '/pdf-to-ppt',
      name: 'pdf-to-ppt',
      component: () => import('@/pages/PdfToPptPage.vue'),
    },
    {
      path: '/pdf-to-image',
      name: 'pdf-to-image',
      component: () => import('@/pages/PdfToImagePage.vue'),
    },
    {
      path: '/pdf-to-jpg',
      name: 'pdf-to-jpg',
      component: () => import('@/pages/PdfToJpgPage.vue'),
    },
    {
      path: '/pdf-to-png',
      name: 'pdf-to-png',
      component: () => import('@/pages/PdfToPngPage.vue'),
    },
    {
      path: '/pdf-to-tiff',
      name: 'pdf-to-tiff',
      component: () => import('@/pages/PdfToTiffPage.vue'),
    },
    {
      path: '/pdf-to-svg',
      name: 'pdf-to-svg',
      component: () => import('@/pages/PdfToSvgPage.vue'),
    },
    {
      path: '/pdf-to-text',
      name: 'pdf-to-text',
      component: () => import('@/pages/PdfToTextPage.vue'),
    },
    {
      path: '/pdf-to-html',
      name: 'pdf-to-html',
      component: () => import('@/pages/PdfToHtmlPage.vue'),
    },
    // 转换成 PDF
    {
      path: '/word-to-pdf',
      name: 'word-to-pdf',
      component: () => import('@/pages/WordToPdfPage.vue'),
    },
    {
      path: '/excel-to-pdf',
      name: 'excel-to-pdf',
      component: () => import('@/pages/ExcelToPdfPage.vue'),
    },
    {
      path: '/ppt-to-pdf',
      name: 'ppt-to-pdf',
      component: () => import('@/pages/PptToPdfPage.vue'),
    },
    {
      path: '/image-to-pdf',
      name: 'image-to-pdf',
      component: () => import('@/pages/ImageToPdfPage.vue'),
    },
    // 阅读器
    {
      path: '/pdf-reader',
      name: 'pdf-reader',
      component: () => import('@/pages/PdfReaderPage.vue'),
    },
  ],
})

export default router
