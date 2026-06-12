import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
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
      path: '/pdf-to-word',
      name: 'pdf-to-word',
      component: () => import('@/pages/PdfToWordPage.vue'),
    },
    {
      path: '/pdf-to-image',
      name: 'pdf-to-image',
      component: () => import('@/pages/PdfToImagePage.vue'),
    },
  ],
})

export default router
