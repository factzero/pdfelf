<template>
  <router-link :to="route" class="tool-card">
    <span class="tool-card__icon">{{ icon }}</span>
    <h3 class="tool-card__title">{{ title }}</h3>
    <p class="tool-card__desc">{{ description }}</p>
  </router-link>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
  route: string
}>()
</script>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all var(--transition-normal);
  cursor: pointer;
}

.tool-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.tool-card__icon {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-md);
}

.tool-card__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.tool-card__desc {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  text-align: center;
}
</style>
