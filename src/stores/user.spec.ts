import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from './user';

// Mock localStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    mockStorage[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
});

// Mock getToken/setToken/clearToken
vi.mock('@/api/request', () => ({
  getToken: () => mockStorage['luban_token'] ?? null,
  setToken: (t: string) => {
    mockStorage['luban_token'] = t;
  },
  clearToken: () => {
    delete mockStorage['luban_token'];
  },
}));

describe('useUserStore', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    setActivePinia(createPinia());
  });

  it('has null initial state without token', () => {
    const store = useUserStore();
    expect(store.token).toBeNull();
    expect(store.username).toBeNull();
    expect(store.isLoggedIn).toBe(false);
    expect(store.isAdmin).toBe(false);
  });

  it('setAuth sets token and user info', () => {
    const store = useUserStore();
    store.setAuth('jwt-123', { username: 'admin', name: '管理员', role: 'admin' });
    expect(store.token).toBe('jwt-123');
    expect(store.username).toBe('admin');
    expect(store.name).toBe('管理员');
    expect(store.role).toBe('admin');
    expect(store.isLoggedIn).toBe(true);
    expect(store.isAdmin).toBe(true);
  });

  it('setAuth persists user info to localStorage', () => {
    const store = useUserStore();
    store.setAuth('tok', { username: 'u', role: 'editor' });
    expect(mockStorage['luban_user']).toContain('"username":"u"');
  });

  it('clearAuth resets everything and clears storage', () => {
    const store = useUserStore();
    store.setAuth('tok', { username: 'admin', role: 'admin' });
    store.clearAuth();
    expect(store.token).toBeNull();
    expect(store.username).toBeNull();
    expect(store.isLoggedIn).toBe(false);
    expect(mockStorage['luban_user']).toBeUndefined();
  });

  it('isAdmin is false for non-admin role', () => {
    const store = useUserStore();
    store.setAuth('tok', { username: 'u', role: 'viewer' });
    expect(store.isAdmin).toBe(false);
  });

  it('restores user info from localStorage when token exists', () => {
    mockStorage['luban_token'] = 'persisted-token';
    mockStorage['luban_user'] = JSON.stringify({
      username: 'restored',
      name: 'Restored',
      role: 'admin',
    });
    const store = useUserStore();
    expect(store.token).toBe('persisted-token');
    expect(store.username).toBe('restored');
    expect(store.isAdmin).toBe(true);
  });
});
