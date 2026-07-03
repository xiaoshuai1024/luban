import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSites, getSite, createSite, updateSite, deleteSite } from './site';
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
}));

describe('site API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getSites calls GET /sites', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: [] });
    await getSites();
    expect(request.get).toHaveBeenCalledWith('/sites');
  });

  it('getSite calls GET /sites/:id', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { id: 's1' } });
    await getSite('s1');
    expect(request.get).toHaveBeenCalledWith('/sites/s1');
  });

  it('createSite calls POST /sites', async () => {
    vi.mocked(request.post).mockResolvedValue({ data: { id: 'new' } });
    await createSite({ name: 'New', slug: 'new', baseUrl: 'https://new.com' });
    expect(request.post).toHaveBeenCalledWith('/sites', {
      name: 'New',
      slug: 'new',
      baseUrl: 'https://new.com',
    });
  });

  it('updateSite calls PUT /sites/:id', async () => {
    vi.mocked(request.put).mockResolvedValue({ data: {} });
    await updateSite('s1', { name: 'Updated' });
    expect(request.put).toHaveBeenCalledWith('/sites/s1', { name: 'Updated' });
  });

  it('deleteSite calls DELETE /sites/:id', async () => {
    vi.mocked(request.delete).mockResolvedValue({});
    await deleteSite('s1');
    expect(request.delete).toHaveBeenCalledWith('/sites/s1');
  });
});
