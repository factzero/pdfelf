<template>
  <div v-if="showOnPage" class="rating-bar">
    <!-- ═══ 评分摘要（始终显示）═══ -->
    <button class="rating-badge" @click="togglePanel">
      <span class="rating-badge__star">★</span>
      <span class="rating-badge__score">{{ avgStars }}</span>
      <span class="rating-badge__count">({{ formattedCount }})</span>
    </button>

    <!-- ═══ 弹出面板 ═══ -->
    <div v-if="panelOpen" class="rating-panel">
      <div class="rating-panel__head">
        <span class="rating-panel__title">{{ $t('rating.title') }}</span>
        <button class="rating-panel__close" @click="closePanel">✕</button>
      </div>

      <!-- 评分表单 -->
      <div v-if="!userRated || editing" class="rating-panel__form">
        <div class="rating-form__stars">
          <button
            v-for="i in 5"
            :key="i"
            class="star-btn"
            :class="{ 'star-btn--active': i <= hoverStars || i <= inputStars }"
            @click="inputStars = i"
            @mouseenter="hoverStars = i"
            @mouseleave="hoverStars = 0"
            :title="starLabel(i)"
          >★</button>
          <span class="rating-form__hint">{{ inputStars > 0 ? starLabel(inputStars) : $t('rating.prompt') }}</span>
        </div>
        <textarea
          v-model="inputReview"
          :placeholder="$t('rating.placeholder')"
          maxlength="300"
          rows="2"
          class="rating-form__input"
        ></textarea>
        <div class="rating-form__foot">
          <span class="rating-form__charcount">{{ inputReview.length }}/300</span>
          <div class="rating-form__btns">
            <button v-if="editing" class="btn--cancel" @click="editing = false; resetInput()">
              {{ $t('rating.cancel') }}
            </button>
            <button class="btn--submit" :disabled="inputStars < 1" @click="doSubmit">
              {{ $t('rating.submit') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 已评分状态 -->
      <div v-else class="rating-panel__done">
        <span class="rating-panel__done-icon">✅</span>
        <span>{{ $t('rating.thanks') }}</span>
        <button class="rating-panel__edit" @click="startEdit">{{ $t('rating.edit') }}</button>
      </div>

      <!-- 评论列表（未评分时显示） -->
      <div v-if="ratingsList.length > 0 && !userRated" class="rating-panel__reviews">
        <div v-for="(r, idx) in displayedReviews" :key="idx" class="review-item">
          <div class="review-item__head">
            <span class="review-item__stars">
              <span v-for="i in 5" :key="i" class="review-item__star" :class="{ 'review-item__star--on': i <= r.stars }">★</span>
            </span>
            <span class="review-item__time">{{ timeAgo(r.createdAt) }}</span>
          </div>
          <p v-if="r.review" class="review-item__text">{{ r.review }}</p>
        </div>
        <button
          v-if="ratingsList.length > 5 && !showAll"
          class="review-more"
          @click="showAll = true"
        >{{ $t('rating.showMore', { n: ratingsList.length - 5 }) }}</button>
        <button
          v-if="showAll && ratingsList.length > 5"
          class="review-more"
          @click="showAll = false"
        >{{ $t('rating.showLess') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchPageRatings, fetchUserRating, submitRating } from '@/services/likeService'
import type { RatingEntry } from '@/services/likeService'

const { t } = useI18n()
const route = useRoute()

const toolRoutes = new Set([
  'compress-pdf', 'merge-pdf', 'split-pdf', 'rotate-pdf',
  'delete-pages', 'extract-pages', 'reorder-pages',
  'add-watermark', 'add-page-numbers', 'add-header-footer',
  'protect-pdf', 'unlock-pdf', 'crop-pdf', 'extract-images', 'repair-pdf',
  'pdf-to-word', 'pdf-to-excel', 'pdf-to-ppt',
  'pdf-to-image', 'pdf-to-jpg', 'pdf-to-png', 'pdf-to-tiff', 'pdf-to-svg',
  'pdf-to-text', 'pdf-to-html',
  'word-to-pdf', 'excel-to-pdf', 'ppt-to-pdf', 'image-to-pdf', 'html-to-pdf',
  'pdf-reader',
  'edit-metadata', 'flip-pdf', 'grayscale-pdf', 'resize-pdf',
  'sign-pdf', 'redact-pdf', 'fill-form',
])

const showOnPage = ref(false)
const panelOpen = ref(false)
const userRated = ref(false)
const editing = ref(false)
const inputStars = ref(0)
const hoverStars = ref(0)
const inputReview = ref('')
const myStars = ref(0)
const myReview = ref('')
const avgStars = ref(0)
const totalRatings = ref(0)
const ratingsList = ref<RatingEntry[]>([])
const showAll = ref(false)
const closeTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const formattedCount = computed(() => {
  const n = totalRatings.value
  if (n === 0) return '0'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
})

const displayedReviews = computed(() => {
  if (showAll.value) return ratingsList.value
  return ratingsList.value.slice(0, 5)
})

const starLabels = computed(() => [
  t('rating.star1'), t('rating.star2'), t('rating.star3'), t('rating.star4'), t('rating.star5'),
])

function starLabel(n: number): string {
  return starLabels.value[n - 1] || ''
}

function resetInput() {
  inputStars.value = myStars.value
  inputReview.value = myReview.value
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('rating.justNow')
  if (mins < 60) return t('rating.minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('rating.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return t('rating.daysAgo', { n: days })
  const months = Math.floor(days / 30)
  return t('rating.monthsAgo', { n: months })
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (!panelOpen.value) clearCloseTimer()
}

function closePanel() {
  panelOpen.value = false
  clearCloseTimer()
}

async function loadPageRatings() {
  const name = route.name as string
  showOnPage.value = toolRoutes.has(name)
  if (!showOnPage.value) {
    panelOpen.value = false
    return
  }

  const path = route.path
  const [pageData, userData] = await Promise.all([
    fetchPageRatings(path),
    fetchUserRating(path),
  ])

  avgStars.value = pageData.avgStars
  totalRatings.value = pageData.totalRatings
  ratingsList.value = pageData.ratings

  if (userData.hasRated) {
    userRated.value = true
    myStars.value = userData.stars
    myReview.value = userData.review
    inputStars.value = userData.stars
    inputReview.value = userData.review
  } else {
    userRated.value = false
    editing.value = false
    inputStars.value = 0
    inputReview.value = ''
    myStars.value = 0
    myReview.value = ''
  }
}

async function doSubmit() {
  if (inputStars.value < 1) return
  const path = route.path
  const result = await submitRating(path, inputStars.value, inputReview.value.trim())
  if (result.submitted) {
    userRated.value = true
    editing.value = false
    myStars.value = inputStars.value
    myReview.value = inputReview.value.trim()
    avgStars.value = result.avgStars
    totalRatings.value = result.totalRatings

    const pageData = await fetchPageRatings(path)
    ratingsList.value = pageData.ratings
    avgStars.value = pageData.avgStars
    totalRatings.value = pageData.totalRatings

    // 3 秒后自动关闭弹框
    clearCloseTimer()
    closeTimer.value = setTimeout(() => {
      panelOpen.value = false
    }, 3000)
  }
}

function startEdit() {
  editing.value = true
  clearCloseTimer()
}

function clearCloseTimer() {
  if (closeTimer.value !== null) {
    clearTimeout(closeTimer.value)
    closeTimer.value = null
  }
}

onMounted(loadPageRatings)
onUnmounted(clearCloseTimer)
watch(() => route.path, loadPageRatings)
</script>

<style scoped>
/* ═══ 评分条（右下角固定）═══ */
.rating-bar {
  position: fixed;
  right: 24px;
  bottom: 48px;
  z-index: 50;
}

@media (max-width: 480px) {
  .rating-bar {
    right: 12px;
    bottom: 36px;
  }
}

/* 评分徽章 */
.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-size: 0.95rem;
  color: var(--color-text);
  background: #fff;
  border: 2px solid var(--color-primary);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.rating-badge:hover {
  background: #fff;
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.rating-badge__star {
  color: #f59e0b;
  font-size: 1.1rem;
}

.rating-badge__score {
  font-weight: 600;
  color: var(--color-text);
}

.rating-badge__count {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

/* ═══ 弹出面板 ═══ */
.rating-panel {
  position: fixed;
  right: 24px;
  bottom: 96px;
  z-index: 9999;
  width: 320px;
  max-height: 400px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (max-width: 480px) {
  .rating-panel {
    right: 8px;
    bottom: 80px;
    width: calc(100vw - 16px);
    max-width: 360px;
  }
}

.rating-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--color-border);
}

.rating-panel__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.rating-panel__close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.rating-panel__close:hover {
  background: var(--color-bg-secondary);
}

/* 表单区 */
.rating-panel__form {
  padding: 12px 14px;
}

.rating-form__stars {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 10px;
}

.star-btn {
  font-size: 1.4rem;
  color: #d1d5db;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  transition: transform 0.12s, color 0.12s;
}

.star-btn:hover {
  transform: scale(1.15);
}

.star-btn--active {
  color: #f59e0b;
}

.rating-form__hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-left: 6px;
  line-height: 1;
}

.rating-form__input {
  width: 100%;
  padding: 8px 10px;
  font-size: 0.82rem;
  font-family: inherit;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.rating-form__input:focus {
  border-color: var(--color-primary);
}

.rating-form__input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.5;
}

.rating-form__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.rating-form__charcount {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.rating-form__btns {
  display: flex;
  gap: 8px;
}

.btn--cancel {
  padding: 4px 12px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  cursor: pointer;
}

.btn--cancel:hover {
  background: var(--color-bg-secondary);
}

.btn--submit {
  padding: 4px 14px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn--submit:hover:not(:disabled) {
  opacity: 0.85;
}

.btn--submit:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* 已评分 */
.rating-panel__done {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.rating-panel__done-icon {
  font-size: 0.85rem;
}

.rating-panel__edit {
  margin-left: auto;
  padding: 3px 10px;
  font-size: 0.7rem;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  cursor: pointer;
}

.rating-panel__edit:hover {
  background: var(--color-primary);
  color: #fff;
}

/* 评论列表 */
.rating-panel__reviews {
  border-top: 1px solid var(--color-border);
  padding: 10px 14px;
  max-height: 200px;
  overflow-y: auto;
}

.review-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.review-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.review-item__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.review-item__stars {
  display: flex;
  gap: 0.5px;
}

.review-item__star {
  font-size: 0.65rem;
  color: #d1d5db;
}

.review-item__star--on {
  color: #f59e0b;
}

.review-item__time {
  font-size: 0.68rem;
  color: var(--color-text-secondary);
}

.review-item__text {
  margin: 2px 0 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--color-text);
  white-space: pre-wrap;
}

.review-more {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 5px 0;
  font-size: 0.75rem;
  color: var(--color-primary);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.review-more:hover {
  background: var(--color-bg-secondary);
}
</style>
