<template>
  <div v-if="visible" class="progress-container">
    <div class="progress-bar">
      <div class="progress-bar__fill" :style="{ width: `${percent}%` }"></div>
    </div>
    <div class="progress-info">
      <span class="progress-text">{{ text }}</span>
      <span class="progress-percent">{{ percent }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  percent: number
  text: string
}>()
</script>

<style scoped>
.progress-container {
  width: 100%;
  margin-top: var(--spacing-lg);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #60a5fa);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-sm);
}

.progress-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.progress-percent {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
}
</style>
