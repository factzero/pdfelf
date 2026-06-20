<template>
  <div class="app">
    <LayoutHeader />
    <main class="main">
      <router-view />
    </main>
    <TrustBar />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import LayoutHeader from '@/components/LayoutHeader.vue'
import TrustBar from '@/components/TrustBar.vue'
import { recordPageVisit } from '@/services/statsService'

const router = useRouter()

// 每次路由切换时记录（含首次加载）
router.afterEach((to) => {
  recordPageVisit(to.path)
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  flex: 1;
  padding: var(--spacing-2xl) 0;
}
</style>
