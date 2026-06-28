<script setup lang="ts">
import { computed } from 'vue';
import type { UseAiChatReturn } from '@/composables/useAiChat';

/**
 * AI 助手面板(M6)。
 *
 * 右侧抽屉式(不挤压 PageEditor 右栏布局),通过 props 注入 useAiChat 的返回值。
 * 包含:消息流、agent 进度、待确认 schema 预览、HITL 确认/拒绝、输入框。
 */

const props = defineProps<{
  ai: UseAiChatReturn;
  modelValue: boolean; // 抽屉开关
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

function handleSend() {
  const input = document.querySelector('.ai-panel__input') as HTMLTextAreaElement | null;
  if (input && input.value.trim()) {
    props.ai.send(input.value);
    input.value = '';
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="ai-drawer">
      <aside v-if="isOpen" class="ai-panel">
        <header class="ai-panel__header">
          <span class="ai-panel__title">✨ AI 助手</span>
          <button class="ai-panel__close" title="关闭" @click="isOpen = false">✕</button>
        </header>

        <div class="ai-panel__messages">
          <div
            v-for="(msg, i) in props.ai.messages.value"
            :key="i"
            class="ai-panel__msg"
            :class="`ai-panel__msg--${msg.role}`"
          >
            <div v-if="msg.role === 'user'" class="ai-panel__bubble">{{ msg.content }}</div>
            <div v-else class="ai-panel__bubble ai-panel__bubble--ai">
              <div v-if="msg.progress && msg.progress.length" class="ai-panel__progress">
                <div v-for="(p, j) in msg.progress" :key="j" class="ai-panel__progress-item">
                  · {{ p }}
                </div>
              </div>
              <div v-if="msg.content">{{ msg.content }}</div>
            </div>
          </div>

          <!-- 流式进度条 -->
          <div
            v-if="props.ai.streaming.value && props.ai.progress.value"
            class="ai-panel__streaming"
          >
            <span class="ai-panel__spinner" />
            {{ props.ai.progress.value }}
          </div>

          <!-- 待确认 schema HITL -->
          <div v-if="props.ai.pendingSchema.value" class="ai-panel__confirm">
            <div class="ai-panel__confirm-title">AI 生成了页面结构,是否应用?</div>
            <pre class="ai-panel__preview">{{
              JSON.stringify(props.ai.pendingSchema.value, null, 2).slice(0, 500)
            }}</pre>
            <div class="ai-panel__confirm-actions">
              <button
                class="ai-panel__btn ai-panel__btn--primary"
                @click="props.ai.confirmSchema()"
              >
                ✓ 应用到画布
              </button>
              <button class="ai-panel__btn" @click="props.ai.rejectSchema()">✕ 拒绝</button>
            </div>
          </div>

          <div v-if="props.ai.error.value" class="ai-panel__error">
            ⚠ {{ props.ai.error.value }}
          </div>
        </div>

        <footer class="ai-panel__footer">
          <textarea
            class="ai-panel__input"
            placeholder="描述你想要的页面,如:做一个用户列表页"
            rows="2"
            :disabled="props.ai.streaming.value"
            @keydown="handleKeydown"
          />
          <button class="ai-panel__send" :disabled="props.ai.streaming.value" @click="handleSend">
            {{ props.ai.streaming.value ? '生成中…' : '发送' }}
          </button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ai-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100vh;
  background: #fff;
  box-shadow: -2px 0 12px rgb(0 0 0 / 10%);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.ai-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.ai-panel__title {
  font-weight: 600;
  color: #1f2937;
}

.ai-panel__close {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: #6b7280;
}

.ai-panel__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.ai-panel__msg {
  margin-bottom: 12px;
}

.ai-panel__msg--user {
  text-align: right;
}

.ai-panel__bubble {
  display: inline-block;
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.ai-panel__msg--user .ai-panel__bubble {
  background: #3b82f6;
  color: #fff;
}

.ai-panel__bubble--ai {
  background: #f3f4f6;
  color: #1f2937;
  text-align: left;
}

.ai-panel__progress {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.ai-panel__progress-item {
  padding: 1px 0;
}

.ai-panel__streaming {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 13px;
  padding: 8px 0;
}

.ai-panel__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #d1d5db;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ai-panel__confirm {
  margin: 12px 0;
  padding: 12px;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  background: #fffbeb;
}

.ai-panel__confirm-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #92400e;
}

.ai-panel__preview {
  font-size: 11px;
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  max-height: 160px;
  overflow: auto;
  margin-bottom: 8px;
}

.ai-panel__confirm-actions {
  display: flex;
  gap: 8px;
}

.ai-panel__btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.ai-panel__btn--primary {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.ai-panel__btn--primary:hover {
  background: #2563eb;
}

.ai-panel__error {
  color: #dc2626;
  font-size: 13px;
  padding: 8px;
  background: #fef2f2;
  border-radius: 4px;
}

.ai-panel__footer {
  border-top: 1px solid #eee;
  padding: 12px;
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.ai-panel__input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px;
  font-size: 13px;
  resize: none;
  font-family: inherit;
}

.ai-panel__input:focus {
  outline: none;
  border-color: #3b82f6;
}

.ai-panel__send {
  padding: 8px 16px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.ai-panel__send:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.ai-drawer-enter-active,
.ai-drawer-leave-active {
  transition: transform 0.25s ease;
}

.ai-drawer-enter-from,
.ai-drawer-leave-to {
  transform: translateX(100%);
}
</style>
