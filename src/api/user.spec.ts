import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUsers, getUser, createUser, updateUser, setUserStatus } from './user';
import { request } from './request';

vi.mock('./request', () => ({
  request: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

describe('user API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getUsers calls request.get with /users', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { list: [], total: 0 } } as never);
    await getUsers();
    expect(request.get).toHaveBeenCalled();
    expect(vi.mocked(request.get).mock.calls[0][0]).toBe('/users');
  });

  it('getUsers with params passes them', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { list: [], total: 0 } } as never);
    await getUsers({ page: 1, size: 10, keyword: 'test' });
    expect(request.get).toHaveBeenCalledWith('/users', {
      params: { page: 1, size: 10, keyword: 'test' },
    });
  });

  it('getUser calls GET /users/:id', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { id: 'u1' } } as never);
    await getUser('u1');
    expect(request.get).toHaveBeenCalledWith('/users/u1');
  });

  it('createUser calls POST /users', async () => {
    vi.mocked(request.post).mockResolvedValue({ data: { id: 'new' } } as never);
    await createUser({ username: 'newuser', password: 'pass', name: 'New', role: 'editor' });
    expect(request.post).toHaveBeenCalledWith('/users', {
      username: 'newuser',
      password: 'pass',
      name: 'New',
      role: 'editor',
    });
  });

  it('updateUser calls PUT /users/:id', async () => {
    vi.mocked(request.put).mockResolvedValue({ data: {} } as never);
    await updateUser('u1', { username: 'upd', name: 'Updated' });
    expect(request.put).toHaveBeenCalledWith('/users/u1', { username: 'upd', name: 'Updated' });
  });

  it('setUserStatus calls PATCH /users/:id/status', async () => {
    vi.mocked(request.patch).mockResolvedValue({ data: {} } as never);
    await setUserStatus('u1', 'disabled');
    expect(request.patch).toHaveBeenCalledWith('/users/u1/status', { status: 'disabled' });
  });
});
