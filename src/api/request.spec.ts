import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((k: string) => mockStorage[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { mockStorage[k] = v; }),
  removeItem: vi.fn((k: string) => { delete mockStorage[k]; }),
});

const { getToken, setToken, clearToken, request } = await import('./request');

describe('request token helpers', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  it('getToken returns null when empty', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken stores and getToken retrieves', () => {
    setToken('jwt-123');
    expect(getToken()).toBe('jwt-123');
  });

  it('clearToken removes token', () => {
    setToken('temp');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('request HTTP methods exist', () => {
  it('has get', () => expect(typeof request.get).toBe('function'));
  it('has post', () => expect(typeof request.post).toBe('function'));
  it('has put', () => expect(typeof request.put).toBe('function'));
  it('has delete', () => expect(typeof request.delete).toBe('function'));
});
