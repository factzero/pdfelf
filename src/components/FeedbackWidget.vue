<template>
  <div class="feedback-widget">
    <!-- 浮动按钮 -->
    <button
      v-if="!showThanks"
      class="feedback-btn"
      :class="{ 'feedback-btn--active': panelOpen }"
      @click="togglePanel"
      :title="$t('feedback.toggle')"
    >
      <MessageCircle :size="20" :stroke-width="2" />
      <span class="feedback-btn__label">{{ $t('feedback.toggle') }}</span>
    </button>

    <!-- 感谢提示（提交成功后显示 3 秒） -->
    <div v-if="showThanks" class="feedback-thanks">
      <span class="feedback-thanks__icon">✅</span>
      <span>{{ $t('feedback.thanks') }}</span>
    </div>

    <!-- 弹出面板 -->
    <Transition name="slide-up">
      <div v-if="panelOpen" class="feedback-panel">
        <div class="feedback-panel__head">
          <span class="feedback-panel__title">{{ $t('feedback.title') }}</span>
          <button class="feedback-panel__close" @click="closePanel">✕</button>
        </div>

        <div class="feedback-panel__body">
          <!-- 类型选择 -->
          <div class="feedback-type-group">
            <label
              v-for="opt in typeOptions"
              :key="opt.value"
              class="feedback-type-btn"
              :class="{ 'feedback-type-btn--active': form.type === opt.value }"
            >
              <input
                type="radio"
                v-model="form.type"
                :value="opt.value"
                class="feedback-type-btn__radio"
              />
              <span class="feedback-type-btn__icon">{{ opt.icon }}</span>
              <span class="feedback-type-btn__label">{{ $t(opt.labelKey) }}</span>
            </label>
          </div>

          <!-- 消息 -->
          <textarea
            v-model="form.message"
            :placeholder="$t('feedback.messagePlaceholder')"
            maxlength="1000"
            rows="4"
            class="feedback-input"
          ></textarea>
          <div class="feedback-charcount">{{ form.message.length }}/1000</div>

          <!-- 邮箱（可选） -->
          <input
            v-model="form.email"
            type="email"
            :placeholder="$t('feedback.emailPlaceholder')"
            class="feedback-email"
          />

          <!-- 提交 -->
          <button
            class="feedback-submit"
            :disabled="!canSubmit || submitting"
            @click="handleSubmit"
          >
            <span v-if="submitting" class="feedback-submit__loading"></span>
            {{ submitting ? $t('feedback.submitting') : $t('feedback.submit') }}
          </button>

          <p v-if="errorMsg" class="feedback-error">{{ errorMsg }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageCircle } from 'lucide-vue-next'

const { t } = useI18n()

const panelOpen = ref(false)
const showThanks = ref(false)
const submitting = ref(false)
const errorMsg = ref('')

const typeOptions = [
  { value: 'bug', icon: '🐛', labelKey: 'feedback.typeBug' },
  { value: 'feature', icon: '💡', labelKey: 'feedback.typeFeature' },
  { value: 'general', icon: '💬', labelKey: 'feedback.typeGeneral' },
] as const

const form = reactive({
  type: 'general' as 'bug' | 'feature' | 'general',
  message: '',
  email: '',
})

const canSubmit = computed(() => form.message.trim().length > 0 && !submitting.value)

function togglePanel() {
  if (showThanks.value) return
  panelOpen.value = !panelOpen.value
  errorMsg.value = ''
}

function closePanel() {
  panelOpen.value = false
  errorMsg.value = ''
}

function resetForm() {
  form.type = 'general'
  form.message = ''
  form.email = ''
  errorMsg.value = ''
}

async function handleSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMsg.value = ''

  try {
    const resp = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: form.type,
        message: form.message.trim(),
        email: form.email.trim() || undefined,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error || 'Request failed')
    }

    // 成功
    resetForm()
    panelOpen.value = false
    showThanks.value = true
    setTimeout(() => {
      showThanks.value = false
    }, 3000)
  } catch (e: any) {
    errorMsg.value = e.message || t('feedback.failed')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.feedback-widget {
  position: fixed;
  right: 24px;
  bottom: 120px;
  z-index: 49;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

@media (max-width: 480px) {
  .feedback-widget {
    right: 12px;
    bottom: 100px;
  }
}

/* 浮动按钮 */
.feedback-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  background: #fff;
  border: 1.5px solid var(--color-border);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  font-family: inherit;
}

.feedback-btn:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.feedback-btn--active {
  border-color: var(--color-primary);
  background: #eff6ff;
}

.feedback-btn__label {
  white-space: nowrap;
}

/* 感谢提示 */
.feedback-thanks {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 0.82rem;
  color: #16a34a;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.feedback-thanks__icon {
  font-size: 0.9rem;
}

/* 弹出面板 */
.feedback-panel {
  width: 340px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

@media (max-width: 480px) {
  .feedback-panel {
    width: calc(100vw - 24px);
    max-width: 360px;
  }
}

.feedback-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--color-border);
}

.feedback-panel__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.feedback-panel__close {
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

.feedback-panel__close:hover {
  background: var(--color-bg-secondary);
}

.feedback-panel__body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 类型选择 */
.feedback-type-group {
  display: flex;
  gap: 6px;
}

.feedback-type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-bg);
}

.feedback-type-btn:hover {
  border-color: var(--color-primary);
}

.feedback-type-btn--active {
  border-color: var(--color-primary);
  background: #eff6ff;
}

.feedback-type-btn__radio {
  display: none;
}

.feedback-type-btn__icon {
  font-size: 1.1rem;
}

.feedback-type-btn__label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.feedback-type-btn--active .feedback-type-btn__label {
  color: var(--color-primary);
  font-weight: 600;
}

/* 文本输入 */
.feedback-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 0.82rem;
  font-family: inherit;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.feedback-input:focus {
  border-color: var(--color-primary);
}

.feedback-input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.5;
}

.feedback-charcount {
  text-align: right;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-top: -6px;
}

/* 邮箱 */
.feedback-email {
  width: 100%;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
}

.feedback-email:focus {
  border-color: var(--color-primary);
}

.feedback-email::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.5;
}

/* 提交按钮 */
.feedback-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
  font-family: inherit;
}

.feedback-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.feedback-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.feedback-submit__loading {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.feedback-error {
  font-size: 0.75rem;
  color: var(--color-error);
  text-align: center;
  margin: 0;
}

/* 面板动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
