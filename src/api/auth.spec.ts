import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, getCurrentUser } from './auth';
import { request } from './request';

vi.mock('./request', () => ({
  request: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  logout: vi.fn(),
}));

describe('auth API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('login calls POST /auth/login', async () => {
    vi.mocked(request.post).mockResolvedValue({ data: { user: { username: 'admin' } } });
    await login({ username: 'admin', password: 'pass' });
    expect(request.post).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: 'pass',
    });
  });

  it('getCurrentUser calls GET /auth/me', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { username: 'admin', role: 'admin' } });
    await getCurrentUser();
    expect(request.get).toHaveBeenCalledWith('/auth/me');
  });
});
