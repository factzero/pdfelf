<template>
  <header class="header">
    <div class="header-inner container">
      <router-link to="/" class="logo">
        <span class="logo-icon">🧝</span>
        <span class="logo-text">PDF Elf</span>
      </router-link>
      <nav class="nav">
        <router-link to="/compress-pdf" class="nav-link">{{ $t('nav.compress') }}</router-link>
        <router-link to="/merge-pdf" class="nav-link">{{ $t('nav.merge') }}</router-link>
        <router-link to="/split-pdf" class="nav-link">{{ $t('nav.split') }}</router-link>
        <router-link to="/pdf-to-word" class="nav-link">{{ $t('nav.toWord') }}</router-link>
        <router-link to="/pdf-to-image" class="nav-link">{{ $t('nav.toImage') }}</router-link>
      </nav>
      <button class="lang-btn" @click="toggleLang" :title="nextLangLabel">
        {{ currentLang === 'zh-CN' ? 'EN' : '中' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const currentLang = computed(() => locale.value)
const nextLangLabel = computed(() => (currentLang.value === 'zh-CN' ? 'Switch to English' : '切换到中文'))

function toggleLang() {
  locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
  localStorage.setItem('pdfelf-lang', locale.value)
}
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

.lang-btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-left: var(--spacing-md);
}

.lang-btn:hover {
  border-color: var(--color-primary);
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
