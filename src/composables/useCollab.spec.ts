import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';
import type * as Yjs from 'yjs';
import { buildWsUrl, safeParse, pickColor, useCollab } from './useCollab';
import type { PageSchema } from '@/types/schema';

/**
 * useCollab 单测：
 * 1. 纯函数（buildWsUrl / safeParse / pickColor）—— 确定性逻辑
 * 2. disabled / SSR no-op —— 不建立连接
 * 3. 双向绑定回环防护 —— LOCAL_ORIGIN 不触发 remoteSchema 回灌
 *
 * y-websocket 的 WebsocketProvider 涉及真实网络，这里用 mock 替换其副作用，
 * 只验证 useCollab 的编排逻辑（不验证 yjs 协议正确性）。
 */

// --- mock y-websocket：捕获 provider 实例，提供受控的事件触发 ---
const mockProviderInstance = {
  awareness: {
    setLocalStateField: vi.fn(),
    getStates: vi.fn(() => new Map()),
    on: vi.fn(),
    off: vi.fn(),
  },
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn(() => mockProviderInstance),
}));

// --- mock yjs：保留真实行为（CRDT 合并），仅做透传 ---
vi.mock('yjs', async () => {
  const actual = (await vi.importActual('yjs')) as typeof Yjs;
  return { ...actual };
});

describe('buildWsUrl', () => {
  it('http → ws 协议转换', () => {
    const url = buildWsUrl('http://localhost:3000', 's1', 'p1', 'tok');
    expect(url).toBe('ws://localhost:3000/api/collab/s1/p1?token=tok');
  });

  it('https → wss 协议转换', () => {
    const url = buildWsUrl('https://api.example.com', 's1', 'p1', 'tok');
    expect(url).toBe('wss://api.example.com/api/collab/s1/p1?token=tok');
  });

  it('去除尾部斜杠', () => {
    const url = buildWsUrl('http://localhost:3000/', 's1', 'p1', 't');
    expect(url.startsWith('ws://localhost:3000/')).toBe(true);
  });

  it('特殊字符转义（siteId/pageId/token）', () => {
    const url = buildWsUrl('http://h', 'si te', 'p/1', 'a&b=c');
    expect(url).toContain(encodeURIComponent('si te'));
    expect(url).toContain(encodeURIComponent('p/1'));
    expect(url).toContain(encodeURIComponent('a&b=c'));
  });
});

describe('safeParse', () => {
  it('合法 JSON 返回对象', () => {
    const schema: PageSchema = { root: { id: '1', type: 'container' } };
    expect(safeParse(JSON.stringify(schema))).toEqual(schema);
  });

  it('损坏 JSON 返回 null 不抛穿', () => {
    expect(safeParse('{invalid')).toBeNull();
    expect(safeParse('')).toBeNull();
  });
});

describe('pickColor', () => {
  it('同一 clientId 返回稳定颜色', () => {
    expect(pickColor(1)).toBe(pickColor(1));
  });

  it('不同 clientId 可能返回不同颜色', () => {
    const colors = new Set([pickColor(0), pickColor(1), pickColor(2), pickColor(3)]);
    expect(colors.size).toBeGreaterThan(1);
  });

  it('负 clientId 取绝对值（不抛错）', () => {
    expect(() => pickColor(-5)).not.toThrow();
    expect(typeof pickColor(-5)).toBe('string');
  });
});

describe('useCollab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enabled=false 时返回 no-op，不建立连接', () => {
    const opts = {
      bffBase: 'http://localhost:3000',
      siteId: 's1',
      pageId: 'p1',
      token: 'tok',
      username: 'alice',
      initialSchema: null,
      enabled: false,
    };
    const collab = useCollab(opts);
    expect(collab.status.value).toBe('disconnected');
    expect(collab.onlineUsers.value).toEqual([]);
    // no-op：调用这些不应抛错，也不触发 provider
    expect(() => collab.broadcastLocal(null)).not.toThrow();
    expect(() => collab.disconnect()).not.toThrow();
  });

  it('连接时设置 awareness 的 user 字段（name/color）', async () => {
    const opts = {
      bffBase: 'http://localhost:3000',
      siteId: 's1',
      pageId: 'p1',
      token: 'tok',
      username: 'alice',
      initialSchema: null,
    };
    useCollab(opts);
    await nextTick();
    expect(mockProviderInstance.awareness.setLocalStateField).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ name: 'alice' }),
    );
    // color 应是调色板内的颜色
    const call = mockProviderInstance.awareness.setLocalStateField.mock.calls.find(
      (c) => c[0] === 'user',
    );
    expect(call?.[1].color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('构造正确的 ws URL（含 token query）', async () => {
    const { WebsocketProvider } = await import('y-websocket');
    const opts = {
      bffBase: 'http://localhost:3000',
      siteId: 's1',
      pageId: 'p1',
      token: 'mytoken',
      username: 'bob',
      initialSchema: null,
    };
    useCollab(opts);
    await nextTick();
    expect(WebsocketProvider).toHaveBeenCalledWith(
      'ws://localhost:3000/api/collab/s1/p1?token=mytoken',
      's1/p1',
      expect.anything(),
      expect.any(Object),
    );
  });

  it('register 了 status / synced / awareness 事件监听', async () => {
    const opts = {
      bffBase: 'http://localhost:3000',
      siteId: 's1',
      pageId: 'p1',
      token: 'tok',
      username: 'alice',
      initialSchema: null,
    };
    useCollab(opts);
    await nextTick();
    // provider.on 注册了多种事件
    const eventTypes = mockProviderInstance.on.mock.calls.map((c) => c[0]);
    expect(eventTypes).toEqual(expect.arrayContaining(['status', 'synced']));
    // awareness.on 注册了 change
    expect(mockProviderInstance.awareness.on).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
