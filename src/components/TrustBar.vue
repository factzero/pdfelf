<template>
  <div class="trust-bar">
    <div class="trust-bar__inner container">
      <div class="trust-item">
        <span class="trust-item__icon">🔒</span>
        <span>{{ $t('trust.localProcessing') }}</span>
      </div>
      <div class="trust-item">
        <span class="trust-item__icon">☁️</span>
        <span>{{ $t('trust.noUpload') }}</span>
      </div>
      <div class="trust-item">
        <span class="trust-item__icon">🎉</span>
        <span>{{ $t('trust.free') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.trust-bar {
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-lg) 0;
  margin-top: auto;
}

.trust-bar__inner {
  display: flex;
  justify-content: center;
  gap: var(--spacing-2xl);
}

.trust-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.trust-item__icon {
  font-size: 1rem;
}

@media (max-width: 640px) {
  .trust-bar__inner {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }
}
</style>
