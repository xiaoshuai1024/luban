import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { awarenessProtocol } from 'y-protocols';
import { ref, onUnmounted, readonly, type Ref } from 'vue';
import type { PageSchema } from '@/types/schema';

/**
 * 协作客户端（designer-pro-upgrade T-eng-d6 / platform-complete-v1 T-eng-7）。
 *
 * 连接 BFF custom server 的 y-websocket 协议端点：
 *   ws://host/api/collab/{siteId}/{pageId}?token=xxx
 * 通过 Yjs CRDT 同步页面 schema（多端无冲突合并），awareness 同步在线用户与光标。
 *
 * 数据模型：Y.Doc 顶层 Y.Map，key="schema" 存序列化后的 PageSchema JSON 字符串。
 * 用字符串而非递归 Y.Map 是为了：(1) 实现简洁；(2) 与现有 Pinia store 的 schema 结构完全一致，
 * 序列化/反序列化零适配；(3) CRDT 在整树级别合并，避免细粒度字段冲突的反直觉行为。
 *
 * 同步策略：
 *  - 本地 schema 变 → 写 Y.Map（origin=LOCAL，避免远端回环触发再次更新）
 *  - Y.Map 变（origin≠LOCAL，即远端）→ 反序列化更新本地 schema
 */

/** 协作者信息（awareness 状态中的标准化字段） */
export interface CollabUser {
  clientId: number;
  name: string;
  color: string;
}

/** 协作连接状态 */
export type CollabStatus = 'disconnected' | 'connecting' | 'connected' | 'synced' | 'error';

/** 本地修改标记，用于区分本地写入与远端广播，防止回环 */
const LOCAL_ORIGIN = 'local-edit';
/** Y.Map 中存 schema 的 key */
const SCHEMA_KEY = 'schema';

interface UseCollabOptions {
  /** BFF 基址，如 http://localhost:3000 */
  bffBase: string;
  siteId: string;
  pageId: string;
  /** JWT token，通过 query 传递给 BFF（y-websocket 不支持自定义 header） */
  token: string;
  /** 当前用户名（awareness 展示） */
  username: string;
  /** 初始 schema（远端无数据时用作本地种子） */
  initialSchema: PageSchema | null;
  /** 是否启用协作（false 时 composable 为空操作，便于 feature-gate） */
  enabled?: boolean;
}

interface UseCollabReturn {
  /** 当前用户 clientId（Yjs 分配） */
  clientId: Ref<number>;
  /** 连接状态 */
  status: Ref<CollabStatus>;
  /** 在线协作者列表（含自己） */
  onlineUsers: ReturnType<typeof readonly<Ref<CollabUser[]>>>;
  /** 远端推送过来的 schema（供调用方 watch 后写回本地 store） */
  remoteSchema: Ref<PageSchema | null>;
  /** 本地 schema 变更时广播到远端（调用方 watch 本地 schema 后调用） */
  broadcastLocal: (schema: PageSchema | null) => void;
  /** 设置本地光标/选区（广播 awareness） */
  setLocalSelection: (selection: unknown) => void;
  /** 主动断开（卸载时会自动调用） */
  disconnect: () => void;
}

/**
 * 创建协作客户端。必须在 setup 或带 onUnmounted 的作用域内调用。
 * enabled=false 或 SSR 环境返回 no-op 实例，不建立连接。
 */
export function useCollab(options: UseCollabOptions): UseCollabReturn {
  const { bffBase, siteId, pageId, token, username, initialSchema, enabled = true } = options;

  const clientId = ref(0);
  const status = ref<CollabStatus>('disconnected');
  const onlineUsersState = ref<CollabUser[]>([]);
  const onlineUsers = readonly(onlineUsersState);
  const remoteSchema = ref<PageSchema | null>(null);

  // SSR 或 disabled：返回 no-op（避免服务端建立 WebSocket）
  if (!enabled || typeof window === 'undefined') {
    return {
      clientId: readonly(clientId) as Ref<number>,
      status: readonly(status) as Ref<CollabStatus>,
      onlineUsers,
      remoteSchema,
      broadcastLocal: () => {},
      setLocalSelection: () => {},
      disconnect: () => {},
    };
  }

  // 1. 创建 Y.Doc + 顶层 Y.Map
  const doc = new Y.Doc();
  clientId.value = doc.clientID;
  const ymap = doc.getMap<string>(SCHEMA_KEY);

  // 种子：本地首次加入且远端无 schema 时，写入初始 schema
  if (initialSchema && !ymap.has(SCHEMA_KEY)) {
    ymap.set(SCHEMA_KEY, JSON.stringify(initialSchema));
  }

  // 2. 建立 WebSocket Provider（标准 y-websocket 协议，对接 BFF custom server）
  const wsUrl = buildWsUrl(bffBase, siteId, pageId, token);
  const provider = new WebsocketProvider(wsUrl, `${siteId}/${pageId}`, doc, {
    // y-websocket 会自动处理 sync step1/2 + awareness
    params: {}, // token 已在 wsUrl query
  });
  // y-websocket 需要 awareness room 一致；BFF 房间按 siteId/pageId 隔离
  provider.awareness.setLocalStateField('user', {
    name: username,
    color: pickColor(doc.clientID),
  });

  // 3. 连接状态映射
  provider.on('status', (event: { status: 'connected' | 'disconnected' | 'connecting' }) => {
    status.value = event.status;
  });
  provider.on('synced', (isSynced: boolean) => {
    if (isSynced) {
      status.value = 'synced';
      // 同步完成后，如果远端有 schema，回灌到 remoteSchema
      const raw = ymap.get(SCHEMA_KEY);
      if (raw) {
        remoteSchema.value = safeParse(raw);
      }
    }
  });
  provider.on('connection-close', () => {
    status.value = 'disconnected';
  });
  provider.on('connection-error', () => {
    status.value = 'error';
  });

  // 4. Y.Map 远端变更 → remoteSchema（origin≠LOCAL 才处理，防回环）
  ymap.observe((event) => {
    // 只在远端（非本地 origin）写入时更新 remoteSchema
    if (event.transaction.origin === LOCAL_ORIGIN) return;
    if (event.keysChanged.has(SCHEMA_KEY)) {
      const raw = ymap.get(SCHEMA_KEY);
      remoteSchema.value = raw ? safeParse(raw) : null;
    }
  });

  // 5. awareness → onlineUsers
  const updateOnlineUsers = () => {
    const states = provider.awareness.getStates();
    const users: CollabUser[] = [];
    states.forEach((state, client) => {
      if (state.user) {
        users.push({
          clientId: client,
          name: state.user.name ?? '匿名',
          color: state.user.color ?? '#888',
        });
      }
    });
    onlineUsersState.value = users;
  };
  provider.awareness.on('change', updateOnlineUsers);
  // 立即触发一次，拿到初始 awareness
  updateOnlineUsers();

  // 6. 本地广播 / 光标
  const broadcastLocal = (schema: PageSchema | null) => {
    // 事务用 LOCAL_ORIGIN 标记，observe 时据此跳过（防回环）
    doc.transact(() => {
      if (schema) {
        ymap.set(SCHEMA_KEY, JSON.stringify(schema));
      } else {
        ymap.delete(SCHEMA_KEY);
      }
    }, LOCAL_ORIGIN);
  };

  const setLocalSelection = (selection: unknown) => {
    provider.awareness.setLocalStateField('selection', selection);
  };

  // 7. 卸载清理
  const disconnect = () => {
    provider.awareness.off('change', updateOnlineUsers);
    provider.destroy();
    doc.destroy();
    status.value = 'disconnected';
  };
  onUnmounted(disconnect);

  return {
    clientId: readonly(clientId) as Ref<number>,
    status: readonly(status) as Ref<CollabStatus>,
    onlineUsers,
    remoteSchema,
    broadcastLocal,
    setLocalSelection,
    disconnect,
  };
}

/** 构造 y-websocket 端点 URL（http(s) → ws(s)） */
export function buildWsUrl(bffBase: string, siteId: string, pageId: string, token: string): string {
  const httpUrl = bffBase.replace(/\/$/, '');
  const wsBase = httpUrl.replace(/^http/, 'ws');
  const path = `/api/collab/${encodeURIComponent(siteId)}/${encodeURIComponent(pageId)}`;
  return `${wsBase}${path}?token=${encodeURIComponent(token)}`;
}

/** 安全 JSON 解析（损坏数据降级为 null，不抛穿） */
export function safeParse(raw: string): PageSchema | null {
  try {
    return JSON.parse(raw) as PageSchema;
  } catch {
    return null;
  }
}

/** 由 clientId 确定性选色（同一用户颜色稳定，便于辨识光标归属） */
const PALETTE = ['#f56c6c', '#e6a23c', '#67c23a', '#409eff', '#9254de', '#36cfc9'];
export function pickColor(clientId: number): string {
  return PALETTE[Math.abs(clientId) % PALETTE.length];
}

// 重新导出 awareness 类型，供外部使用
export type { awarenessProtocol };
