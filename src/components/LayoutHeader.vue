<template>
  <header class="header">
    <div class="header-inner container">
      <router-link to="/" class="logo">
        <span class="logo-icon">🧝</span>
        <span class="logo-text">PDF Elf</span>
      </router-link>
      <nav class="nav">
        <router-link to="/compress-pdf" class="nav-link">压缩</router-link>
        <router-link to="/merge-pdf" class="nav-link">合并</router-link>
        <router-link to="/split-pdf" class="nav-link">分割</router-link>
        <router-link to="/pdf-to-word" class="nav-link">转Word</router-link>
        <router-link to="/pdf-to-image" class="nav-link">转图片</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
</script>

<style scoped>
.header {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
}

.logo-icon {
  font-size: 1.5rem;
}

.nav {
  display: flex;
  gap: var(--spacing-sm);
}

.nav-link {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.nav-link.router-link-active {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

@media (max-width: 640px) {
  .nav {
    gap: 0;
  }
  .nav-link {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.75rem;
  }
}
</style>
