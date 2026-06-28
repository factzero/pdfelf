<template>
  <header class="header" :class="{ 'header--scrolled': scrolled }">
    <div class="header-inner container">
      <!-- Logo -->
      <router-link to="/" class="logo" @click="closeAll">
        <img src="/pdfelf-logo.svg" class="logo-icon" alt="PDF Elf" width="28" height="28" />
        <span class="logo-text">PDF Elf</span>
      </router-link>

      <!-- Desktop navigation -->
      <nav class="nav">
        <!-- All tools dropdown -->
        <div
          class="nav-dropdown"
          ref="dropdownRef"
          @mouseenter="showDropdown = true"
          @mouseleave="startDropdownLeave"
        >
          <button
            class="nav-link nav-link--dropdown"
            :class="{ 'nav-link--active': isDropdownActive }"
            @click="toggleDropdown"
          >
            {{ $t('nav.allTools') }}
            <ChevronDown :size="14" class="dropdown-arrow" :class="{ 'dropdown-arrow--open': showDropdown }" />
          </button>

          <Transition name="dropdown">
            <div
              v-if="showDropdown"
              class="dropdown-panel"
              @mouseenter="cancelDropdownLeave"
              @mouseleave="showDropdown = false"
            >
              <div class="dropdown-grid">
                <div
                  v-for="(cat, idx) in navDropdownCategories"
                  :key="cat.categoryKey"
                  class="dropdown-col"
                  :style="{ '--cat-color': categoryColors[idx % categoryColors.length] }"
                >
                  <h4 class="dropdown-col__title">
                    <span class="dropdown-col__dot"></span>
                    {{ $t(cat.categoryKey) }}
                  </h4>
                  <ul class="dropdown-col__links">
                    <li v-for="tool in cat.tools" :key="tool.route">
                      <router-link
                        :to="tool.route"
                        class="dropdown-link"
                        @click="showDropdown = false"
                      >
                        <component :is="tool.icon" :size="14" :stroke-width="2" class="dropdown-link__icon" />
                        {{ $t(tool.titleKey) }}
                      </router-link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <router-link to="/compress-pdf" class="nav-link">{{ $t('nav.compress') }}</router-link>
        <router-link to="/merge-pdf" class="nav-link">{{ $t('nav.merge') }}</router-link>
        <router-link to="/split-pdf" class="nav-link">{{ $t('nav.split') }}</router-link>
        <router-link to="/pdf-to-word" class="nav-link">{{ $t('nav.toWord') }}</router-link>
        <router-link to="/pdf-to-image" class="nav-link">{{ $t('nav.toImage') }}</router-link>
      </nav>

      <!-- Right actions -->
      <div class="header-actions">
        <button class="lang-btn" @click="toggleLang" :title="nextLangLabel">
          <Globe :size="14" :stroke-width="2" />
          <span>{{ currentLang === 'zh-CN' ? 'EN' : '中' }}</span>
        </button>

        <!-- Hamburger -->
        <button
          class="hamburger"
          :class="{ 'hamburger--active': mobileMenuOpen }"
          @click="mobileMenuOpen = !mobileMenuOpen"
          :aria-label="$t('nav.menu')"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>

    <!-- Mobile overlay -->
    <Transition name="overlay">
      <div v-if="mobileMenuOpen" class="mobile-overlay" @click="mobileMenuOpen = false" />
    </Transition>

    <!-- Mobile drawer -->
    <Transition name="drawer">
      <div v-if="mobileMenuOpen" class="mobile-drawer">
        <div class="mobile-drawer__header">
          <span class="mobile-drawer__title">{{ $t('nav.menu') }}</span>
          <button class="mobile-drawer__close" @click="mobileMenuOpen = false">
            <X :size="20" :stroke-width="2" />
          </button>
        </div>
        <nav class="mobile-nav">
          <router-link to="/compress-pdf" class="mobile-nav__link" @click="mobileMenuOpen = false">
            {{ $t('nav.compress') }}
          </router-link>
          <router-link to="/merge-pdf" class="mobile-nav__link" @click="mobileMenuOpen = false">
            {{ $t('nav.merge') }}
          </router-link>
          <router-link to="/split-pdf" class="mobile-nav__link" @click="mobileMenuOpen = false">
            {{ $t('nav.split') }}
          </router-link>
          <router-link to="/pdf-to-word" class="mobile-nav__link" @click="mobileMenuOpen = false">
            {{ $t('nav.toWord') }}
          </router-link>
          <router-link to="/pdf-to-image" class="mobile-nav__link" @click="mobileMenuOpen = false">
            {{ $t('nav.toImage') }}
          </router-link>

          <div v-for="cat in navDropdownCategories" :key="cat.categoryKey" class="mobile-nav__category">
            <h4 class="mobile-nav__cat-title">{{ $t(cat.categoryKey) }}</h4>
            <router-link
              v-for="tool in cat.tools"
              :key="tool.route"
              :to="tool.route"
              class="mobile-nav__sublink"
              @click="mobileMenuOpen = false"
            >
              <component :is="tool.icon" :size="14" :stroke-width="2" />
              {{ $t(tool.titleKey) }}
            </router-link>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ChevronDown, Globe, X } from 'lucide-vue-next'
import { navDropdownCategories } from '@/config/navTools'

const { locale } = useI18n()
const route = useRoute()

const currentLang = computed(() => locale.value)
const nextLangLabel = computed(() => (currentLang.value === 'zh-CN' ? 'Switch to English' : '切换到中文'))

// Category accent colors — one per dropdown column
const categoryColors = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#e11d48', '#0284c7', '#6366f1']

// ── State ──
const scrolled = ref(false)
const showDropdown = ref(false)
const mobileMenuOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
let dropdownLeaveTimer: ReturnType<typeof setTimeout> | null = null

// ── Computed ──
const isDropdownActive = computed(() => {
  // Check if current route is one of the "more tools" routes
  return navDropdownCategories.some(cat =>
    cat.tools.some(tool => route.path === tool.route)
  )
})

// ── Scroll shadow ──
function onScroll() {
  scrolled.value = window.scrollY > 10
}

// ── Dropdown ──
function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function startDropdownLeave() {
  dropdownLeaveTimer = setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

function cancelDropdownLeave() {
  if (dropdownLeaveTimer) {
    clearTimeout(dropdownLeaveTimer)
    dropdownLeaveTimer = null
  }
}

function onDocumentClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    showDropdown.value = false
  }
}

// ── Language ──
function toggleLang() {
  locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
  localStorage.setItem('pdfelf-lang', locale.value)
}

// ── Close all ──
function closeAll() {
  showDropdown.value = false
  mobileMenuOpen.value = false
}

// ── Body scroll lock ──
watch(mobileMenuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// ── Lifecycle ──
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('click', onDocumentClick)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════
   Header
   ═══════════════════════════════════════════════════ */
.header {
  background: var(--color-bg);
  border-bottom: 1px solid transparent;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: box-shadow var(--transition-normal), border-color var(--transition-normal);
}

.header--scrolled {
  border-bottom-color: var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.header-inner {
  display: flex;
  align-items: center;
  height: 56px;
}

/* ═══════════════════════════════════════════════════
   Logo
   ═══════════════════════════════════════════════════ */
.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  flex-shrink: 0;
  margin-right: var(--spacing-lg);
}

.logo-icon {
  width: 28px;
  height: 28px;
}

.logo-text {
  font-size: 1.15rem;
  font-weight: 700;
  background: linear-gradient(135deg, #2563eb, #7c3aed, #db2777);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ═══════════════════════════════════════════════════
   Desktop Nav
   ═══════════════════════════════════════════════════ */
.nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: var(--spacing-md);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 6px var(--spacing-sm);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: color var(--transition-fast), background var(--transition-fast);
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.nav-link.router-link-active,
.nav-link--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

/* Dropdown */
.nav-dropdown {
  position: relative;
}

.nav-link--dropdown {
  user-select: none;
}

.dropdown-arrow {
  transition: transform var(--transition-fast);
}

.dropdown-arrow--open {
  transform: rotate(180deg);
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #fafcff 0%, #f8faff 50%, #fafcff 100%);
  border: 1px solid var(--color-border);
  border-top: 3px solid #2563eb;
  border-radius: var(--radius-lg);
  box-shadow:
    0 16px 40px -8px rgba(37, 99, 235, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.06);
  padding: var(--spacing-lg) var(--spacing-xl);
  width: max-content;
  max-width: calc(100vw - 48px);
  z-index: 200;
}

.dropdown-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0 var(--spacing-lg);
}

.dropdown-col {
  position: relative;
  padding: var(--spacing-sm) var(--spacing-sm);
  min-width: 130px;
  border-radius: var(--radius-md);
  transition: background 0.2s ease;
}

.dropdown-col__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--cat-color, var(--color-text-muted));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  padding: 0 4px;
}

.dropdown-col__dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cat-color, #94a3b8);
  flex-shrink: 0;
}

.dropdown-col__links {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dropdown-link {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  line-height: 1.4;
  transition: all 0.15s ease;
}

.dropdown-link__icon {
  flex-shrink: 0;
  color: var(--cat-color, var(--color-text-muted));
  transition: color 0.15s ease;
}

.dropdown-link:hover {
  color: var(--cat-color, var(--color-primary));
  background: color-mix(in srgb, var(--cat-color, #2563eb) 8%, transparent);
}

.dropdown-link:hover .dropdown-link__icon {
  color: var(--cat-color, var(--color-primary));
}

.dropdown-link.router-link-active {
  color: var(--cat-color, var(--color-primary));
  background: color-mix(in srgb, var(--cat-color, #2563eb) 10%, transparent);
  font-weight: 600;
}

.dropdown-link.router-link-active .dropdown-link__icon {
  color: var(--cat-color, var(--color-primary));
}

/* Dropdown transition */
.dropdown-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.dropdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px) scale(0.97);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px) scale(0.97);
}

/* ═══════════════════════════════════════════════════
   Header Actions (CTA + Lang + Hamburger)
   ═══════════════════════════════════════════════════ */
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-left: auto;
}

/* Language button */
.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 5px 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lang-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

/* ═══════════════════════════════════════════════════
   Hamburger (mobile)
   ═══════════════════════════════════════════════════ */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 7px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.hamburger:hover {
  background: var(--color-bg-tertiary);
}

.hamburger span {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--color-text);
  border-radius: 1px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.hamburger--active span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.hamburger--active span:nth-child(2) {
  opacity: 0;
}
.hamburger--active span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ═══════════════════════════════════════════════════
   Mobile Overlay & Drawer
   ═══════════════════════════════════════════════════ */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  z-index: 150;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  max-width: 85vw;
  background: var(--color-bg);
  z-index: 160;
  overflow-y: auto;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
}

.mobile-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-bg);
  z-index: 1;
}

.mobile-drawer__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}

.mobile-drawer__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.mobile-drawer__close:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text);
}

/* Mobile nav links */
.mobile-nav {
  padding: var(--spacing-sm) var(--spacing-lg);
  padding-bottom: var(--spacing-3xl);
}

.mobile-nav__link {
  display: block;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  text-decoration: none;
  transition: background var(--transition-fast);
}

.mobile-nav__link:hover,
.mobile-nav__link.router-link-active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.mobile-nav__category {
  margin-top: var(--spacing-md);
}

.mobile-nav__cat-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 12px;
  margin-bottom: 2px;
}

.mobile-nav__sublink {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.mobile-nav__sublink:hover,
.mobile-nav__sublink.router-link-active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

/* Overlay transition */
.overlay-enter-active { transition: opacity 0.2s ease; }
.overlay-leave-active { transition: opacity 0.15s ease; }
.overlay-enter-from,
.overlay-leave-to { opacity: 0; }

/* Drawer transition */
.drawer-enter-active { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-leave-active { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-enter-from,
.drawer-leave-to { transform: translateX(100%); }

/* ═══════════════════════════════════════════════════
   Responsive
   ═══════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .nav {
    gap: var(--spacing-sm);
  }
  .nav-link {
    padding: 6px 8px;
  }
  .dropdown-panel {
    width: auto;
    min-width: 560px;
    padding: var(--spacing-md);
  }
  .dropdown-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 0 var(--spacing-sm);
  }
}

@media (max-width: 860px) {
  /* Hide desktop nav, show hamburger */
  .nav {
    display: none;
  }
  .hamburger {
    display: flex;
  }
}

@media (max-width: 480px) {
  .header-inner {
    height: 52px;
  }
  .logo-text {
    font-size: 1rem;
  }
  .lang-btn span {
    display: none;
  }
  .lang-btn {
    padding: 5px 7px;
  }
}
</style>
