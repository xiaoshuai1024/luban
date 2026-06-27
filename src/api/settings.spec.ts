import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, updateSettings } from './settings';
import { request } from './request';

vi.mock('./request', () => ({
  request: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

describe('settings API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getSettings calls GET /settings', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { siteName: 'Test' } });
    await getSettings();
    expect(request.get).toHaveBeenCalledWith('/settings');
  });

  it('updateSettings calls PUT /settings', async () => {
    vi.mocked(request.put).mockResolvedValue({ data: {} });
    await updateSettings({ siteName: 'New' });
    expect(request.put).toHaveBeenCalledWith('/settings', { siteName: 'New' });
  });
});
