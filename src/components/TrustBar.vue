<template>
  <footer class="site-footer">
    <div class="footer__nav container">
      <div
        v-for="(cat, idx) in navDropdownCategories"
        :key="cat.categoryKey"
        class="footer__col"
        :style="{ '--cat-color': categoryColors[idx % categoryColors.length] }"
      >
        <h4 class="footer__col-title">
          <span class="footer__col-dot"></span>
          {{ $t(footerCategoryKey(cat.categoryKey)) }}
        </h4>
        <ul class="footer__links">
          <li v-for="tool in cat.tools" :key="tool.route">
            <router-link :to="tool.route">
              <component :is="tool.icon" :size="14" :stroke-width="2" class="footer-link-icon" />
              {{ $t(tool.titleKey) }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>
    <div class="trust-bar">
      <div class="trust-bar__inner container">
        <div class="trust-item">
          <Lock :size="16" :stroke-width="2" class="trust-item__icon" />
          <span>{{ $t('trust.localProcessing') }}</span>
        </div>
        <div class="trust-item">
          <Cloud :size="16" :stroke-width="2" class="trust-item__icon" />
          <span>{{ $t('trust.noUpload') }}</span>
        </div>
        <div class="trust-item">
          <Sparkles :size="16" :stroke-width="2" class="trust-item__icon" />
          <span>{{ $t('trust.free') }}</span>
        </div>
        <div v-if="stats" class="trust-item trust-item--stats">
          <Eye :size="16" :stroke-width="2" class="trust-item__icon" />
          <span>{{ $t('stats.totalVisits', { n: stats.totalVisits }) }}</span>
          <span class="trust-item__sep">·</span>
          <span>{{ $t('stats.todayVisits', { n: stats.todayVisits }) }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Cloud, Eye, Lock, Sparkles } from 'lucide-vue-next'
import { navDropdownCategories } from '@/config/navTools'
import { fetchStats } from '@/services/statsService'

// Same category colors as navbar dropdown
const categoryColors = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#e11d48', '#0284c7', '#6366f1']

// Map navbar category keys to footer translation keys
const categoryKeyMap: Record<string, string> = {
  'categories.organize': 'footer.organize',
  'categories.edit': 'footer.edit',
  'categories.security': 'footer.security',
  'categories.fromPdf': 'footer.fromPdf',
  'categories.toPdf': 'footer.toPdf',
  'categories.reader': 'footer.reader',
  'categories.moreTools': 'footer.moreTools',
}

function footerCategoryKey(key: string): string {
  return categoryKeyMap[key] || key
}

interface StatsData {
  totalVisits: number
  todayVisits: number
  uniqueVisitors: number
}

const stats = ref<StatsData | null>(null)

onMounted(async () => {
  stats.value = await fetchStats()
})
</script>

<style scoped>
.site-footer {
  margin-top: auto;
  background: linear-gradient(135deg, #fafcff 0%, #f8faff 50%, #fafcff 100%);
  border-top: 3px solid #2563eb;
  position: relative;
  overflow: hidden;
}

.footer__nav {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0 var(--spacing-lg);
  padding: var(--spacing-2xl) var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.footer__col {
  min-width: 0;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  transition: background 0.2s ease;
}

.footer__col-title {
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

.footer__col-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cat-color, #94a3b8);
  flex-shrink: 0;
}

.footer__links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.footer__links a {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all 0.15s ease;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
}

.footer__links a:hover {
  color: var(--cat-color, var(--color-primary));
  background: color-mix(in srgb, var(--cat-color, #2563eb) 8%, transparent);
}

.footer-link-icon {
  flex-shrink: 0;
  color: var(--cat-color, var(--color-text-muted));
  transition: color 0.15s ease;
}

.footer__links a:hover .footer-link-icon {
  color: var(--cat-color, var(--color-primary));
}

.trust-bar {
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-lg) 0;
  background: rgba(255, 255, 255, 0.4);
  position: relative;
  z-index: 1;
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
  color: #475569;
  font-weight: 500;
}

.trust-item__icon {
  flex-shrink: 0;
}

.trust-item:nth-child(1) .trust-item__icon {
  color: #2563eb;
}

.trust-item:nth-child(2) .trust-item__icon {
  color: #7c3aed;
}

.trust-item:nth-child(3) .trust-item__icon {
  color: #f59e0b;
}

.trust-item--stats .trust-item__icon {
  color: #10b981 !important;
}

.trust-item__sep {
  margin: 0 4px;
  opacity: 0.3;
  color: var(--color-text-muted);
}

@media (max-width:1200px) {
  .footer__nav {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-sm);
  }
}

@media (max-width: 768px) {
  .footer__nav {
    grid-template-columns: repeat(2, 1fr);
    text-align: left;
  }

  .footer__col-title {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .footer__nav {
    grid-template-columns: 1fr;
    align-items: flex-start;
    gap: var(--spacing-xl);
  }

  .trust-bar__inner {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
  }
}
</style>
