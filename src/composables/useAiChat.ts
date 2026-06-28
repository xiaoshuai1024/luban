import { ref, type Ref } from 'vue';
import { request } from '@/api/request';

/**
 * AI 助手 SSE 客户端(M6)。
 *
 * 走 BFF /api/ai/chat 反代(自动带 JWT 鉴权),裸 fetch + ReadableStream reader 解析 SSE。
 * 不依赖 @microsoft/fetch-event-source(未安装),自己实现轻量解析。
 *
 * SSE 事件类型(对齐 AI 服务 chat.py):
 * - progress: agent 进度(正在理解/检索/生成)
 * - tool_call / tool_result: 工具回环(M4)
 * - intent: 意图分类
 * - patch: 待确认 schema 变更
 * - confirm: HITL 等待确认
 * - done: 完成(含最终 status)
 * - error: 失败
 */

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  /** agent 进度事件流(assistant 消息的中间过程展示) */
  progress?: string[];
  ts: number;
}

export interface AiEvent {
  type: string;
  [k: string]: unknown;
}

export interface UseAiChatOptions {
  /** siteId getter(运行时读最新值,PageEditor 的 computed 可通过 () => x.value 传入) */
  siteId: () => string | null;
  pageId: () => string | null;
}

export interface UseAiChatReturn {
  messages: Ref<AiMessage[]>;
  streaming: Ref<boolean>;
  error: Ref<string | null>;
  /** 当前 agent 进度文案(流式中展示) */
  progress: Ref<string>;
  /** 待确认的 AI 生成的 schema(应用前需 HITL 确认) */
  pendingSchema: Ref<Record<string, unknown> | null>;
  /** 发送消息(流式) */
  send(message: string): Promise<void>;
  /** 确认应用 AI 生成的 schema(由调用方实现落地) */
  confirmSchema(): void;
  /** 拒绝 AI 生成的 schema */
  rejectSchema(): void;
  /** 中断当前流 */
  abort(): void;
}

/**
 * SSE 流式 AI 对话。
 *
 * @param options 会话上下文(siteId/pageId,工具回环用)
 * @param onApplySchema 应用 schema 的回调(由 PageEditor 提供,走 onSchemaUpdate 入栈)
 */
export function useAiChat(
  options: UseAiChatOptions,
  onApplySchema: (schema: Record<string, unknown>) => void,
): UseAiChatReturn {
  const messages = ref<AiMessage[]>([]);
  const streaming = ref(false);
  const error = ref<string | null>(null);
  const progress = ref('');
  const pendingSchema = ref<Record<string, unknown> | null>(null);
  let controller: AbortController | null = null;

  async function send(message: string): Promise<void> {
    if (streaming.value || !message.trim()) return;
    error.value = null;
    progress.value = '';
    pendingSchema.value = null;

    messages.value.push({ role: 'user', content: message, ts: Date.now() });
    const assistantMsg: AiMessage = {
      role: 'assistant',
      content: '',
      progress: [],
      ts: Date.now(),
    };
    messages.value.push(assistantMsg);

    controller = new AbortController();
    streaming.value = true;

    try {
      const token = localStorage.getItem('luban_token') || '';
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          siteId: options.siteId(),
          pageId: options.pageId(),
          role: 'admin',
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.message || `请求失败 (${resp.status})`);
      }
      if (!resp.body) throw new Error('无响应流');

      await readSSE(resp.body, (evt) => handleEvent(evt, assistantMsg));
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        assistantMsg.content = assistantMsg.content || '(已中断)';
      } else {
        error.value = (e as Error).message;
        assistantMsg.content = `❌ ${error.value}`;
      }
    } finally {
      streaming.value = false;
      progress.value = '';
      controller = null;
    }
  }

  function handleEvent(evt: AiEvent, assistantMsg: AiMessage): void {
    switch (evt.type) {
      case 'progress':
        progress.value = String(evt.message || '');
        assistantMsg.progress!.push(progress.value);
        break;
      case 'intent':
      case 'tool_call':
      case 'tool_result':
        assistantMsg.progress!.push(`🔧 ${evt.tool || evt.type}`);
        break;
      case 'patch': {
        const schema = (evt.patch || evt.schema) as Record<string, unknown> | undefined;
        if (schema) pendingSchema.value = schema;
        assistantMsg.content = '已生成待确认的页面结构';
        break;
      }
      case 'confirm':
        assistantMsg.content = '等待确认…';
        break;
      case 'done':
        assistantMsg.content = assistantMsg.content || '完成';
        if (evt.status) assistantMsg.content += `(${evt.status})`;
        break;
      case 'error':
        error.value = String(evt.message || 'AI 处理失败');
        assistantMsg.content = `❌ ${error.value}`;
        break;
      default:
        // 其他 token 流式拼到 content
        if (typeof evt.delta === 'string') assistantMsg.content += evt.delta;
    }
  }

  function confirmSchema(): void {
    if (pendingSchema.value) {
      onApplySchema(pendingSchema.value);
      pendingSchema.value = null;
    }
  }

  function rejectSchema(): void {
    pendingSchema.value = null;
  }

  function abort(): void {
    controller?.abort();
  }

  return {
    messages,
    streaming,
    error,
    progress,
    pendingSchema,
    send,
    confirmSchema,
    rejectSchema,
    abort,
  };
}

/** 极简 SSE 解析:逐行读 `data: {...}` 行,JSON.parse 后回调。 */
async function readSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (evt: AiEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          onEvent(JSON.parse(payload));
        } catch {
          // 非 JSON(纯文本 token),作为 delta 事件
          onEvent({ type: 'token', delta: payload });
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** 静默引用,保留 request 用于后续非流式端点(如 /api/ai/config) */
void request;
