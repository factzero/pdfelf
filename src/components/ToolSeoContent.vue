<template>
  <section class="seo-content" v-if="hasContent">
    <!-- 功能特色：双列卡片网格 -->
    <div v-if="features.length" class="seo-card">
      <h2 class="seo-card__title">{{ t(`${ns}.seo.featuresTitle`) }}</h2>
      <div class="features-grid">
        <div v-for="(f, i) in features" :key="i" class="feature-item">
          <span class="feature-item__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="feature-item__text">{{ f }}</span>
        </div>
      </div>
    </div>

    <!-- 使用步骤：横向步骤卡片 -->
    <div v-if="steps.length" class="seo-card">
      <h2 class="seo-card__title">{{ t(`${ns}.seo.stepsTitle`) }}</h2>
      <div class="steps-row">
        <div v-for="(s, i) in steps" :key="i" class="step-card">
          <span class="step-card__num">{{ i + 1 }}</span>
          <div class="step-card__body">
            <strong class="step-card__title">{{ s.title }}</strong>
            <p class="step-card__desc">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 常见问题：每项独立卡片 -->
    <div v-if="faq.length" class="seo-card">
      <h2 class="seo-card__title">{{ t(`${ns}.seo.faqTitle`) }}</h2>
      <dl class="faq-list">
        <div v-for="(item, i) in faq" :key="i" class="faq-item">
          <dt class="faq-item__q">
            <span class="faq-item__q-badge">Q</span>
            {{ item.q }}
          </dt>
          <dd class="faq-item__a">
            <span class="faq-item__a-badge">A</span>
            {{ item.a }}
          </dd>
        </div>
      </dl>
    </div>

    <!-- 相关工具：标签式链接 -->
    <div v-if="related.length" class="seo-card">
      <h2 class="seo-card__title">{{ t(`${ns}.seo.relatedTitle`) }}</h2>
      <div class="related-chips">
        <router-link
          v-for="(r, i) in related"
          :key="i"
          :to="r.path"
          class="related-chip"
        >
          {{ r.label }} →
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  ns: string
}>()

const { t, tm } = useI18n()

interface StepItem { title: string; desc: string }
interface FaqItem { q: string; a: string }
interface RelatedItem { label: string; path: string }

const features = computed<string[]>(() => {
  try { return (tm(`${props.ns}.seo.features`) as string[]) || [] } catch { return [] }
})
const steps = computed<StepItem[]>(() => {
  try { return (tm(`${props.ns}.seo.steps`) as StepItem[]) || [] } catch { return [] }
})
const faq = computed<FaqItem[]>(() => {
  try { return (tm(`${props.ns}.seo.faq`) as FaqItem[]) || [] } catch { return [] }
})
const related = computed<RelatedItem[]>(() => {
  try { return (tm(`${props.ns}.seo.related`) as RelatedItem[]) || [] } catch { return [] }
})

const hasContent = computed(() =>
  features.value.length > 0 || steps.value.length > 0 || faq.value.length > 0 || related.value.length > 0
)
</script>

<style scoped>
/* ===== 整体容器 ===== */
.seo-content {
  margin-top: var(--spacing-3xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* ===== 区块卡片 ===== */
.seo-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
}

.seo-card__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--color-primary-light);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

/* ===== 功能特色：双列网格 ===== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.feature-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.feature-item__icon {
  flex-shrink: 0;
  color: var(--color-success);
  margin-top: 1px;
}

.feature-item__text {
  font-size: 0.875rem;
  line-height: 1.65;
  color: var(--color-text-secondary);
}

/* ===== 使用步骤：横向排列 ===== */
.steps-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.step-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--spacing-lg) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
}

.step-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.step-card__num {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.step-card__body {
  flex: 1;
}

.step-card__title {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.step-card__desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.55;
}

/* 步骤卡片之间的连接线（桌面端） */
.step-card:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -14px;
  top: 32px;
  width: 12px;
  height: 2px;
  background: var(--color-border);
}

/* ===== 常见问题：每项独立卡片 ===== */
.faq-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.faq-item {
  padding: var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-primary-light);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.faq-item:hover {
  border-left-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.faq-item__q {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  line-height: 1.5;
}

.faq-item__q-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
}

.faq-item__a {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.faq-item__a-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--color-success);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
}

/* ===== 相关工具：标签式 ===== */
.related-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.related-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.related-chip:hover {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

/* ===== 响应式：小屏回退为单列 ===== */
@media (max-width: 768px) {
  .seo-content {
    margin-top: var(--spacing-2xl);
    gap: var(--spacing-lg);
  }

  .seo-card {
    padding: var(--spacing-lg);
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .steps-row {
    grid-template-columns: 1fr;
  }

  .step-card:not(:last-child)::after {
    display: none;
  }
}
</style>
