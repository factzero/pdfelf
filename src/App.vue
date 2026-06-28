<template>
  <div class="app">
    <LayoutHeader />
    <main class="main">
      <router-view />
      <ToolLike />
    </main>
    <TrustBar />
  </div>
</template>

<script setup lang="ts">
import LayoutHeader from '@/components/LayoutHeader.vue'
import ToolLike from '@/components/ToolLike.vue'
import TrustBar from '@/components/TrustBar.vue'
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
  position: relative;
}
</style>
