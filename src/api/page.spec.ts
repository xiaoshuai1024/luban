import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPages, getPage, createPage, savePage, deletePage, publishPage, unpublishPage, previewPageDraft, getPageVersions, rollbackPage } from './page';
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

describe('page API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getPages calls GET /sites/:id/pages', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: [] });
    await getPages('site-1');
    expect(request.get).toHaveBeenCalledWith('/sites/site-1/pages');
  });

  it('getPage calls GET /sites/:id/pages/:pageId', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { id: 'p1' } });
    await getPage('site-1', 'p1');
    expect(request.get).toHaveBeenCalledWith('/sites/site-1/pages/p1');
  });

  it('createPage calls POST with name/path/schema', async () => {
    vi.mocked(request.post).mockResolvedValue({ data: { id: 'new' } });
    await createPage('site-1', { name: 'Test', path: '/test' });
    expect(request.post).toHaveBeenCalledWith('/sites/site-1/pages', { name: 'Test', path: '/test' });
  });

  it('savePage calls PUT', async () => {
    vi.mocked(request.put).mockResolvedValue({ data: { id: 'p1' } });
    await savePage('site-1', 'p1', { name: 'Updated' });
    expect(request.put).toHaveBeenCalledWith('/sites/site-1/pages/p1', { name: 'Updated' });
  });

  it('deletePage calls DELETE', async () => {
    vi.mocked(request.delete).mockResolvedValue({});
    await deletePage('site-1', 'p1');
    expect(request.delete).toHaveBeenCalledWith('/sites/site-1/pages/p1');
  });

  it('publishPage calls POST publish', async () => {
    vi.mocked(request.post).mockResolvedValue({ data: { status: 'published' } });
    await publishPage('site-1', 'p1');
    expect(request.post).toHaveBeenCalledWith('/sites/site-1/pages/p1/publish');
  });

  it('unpublishPage calls POST unpublish', async () => {
    vi.mocked(request.post).mockResolvedValue({ data: { status: 'archived' } });
    await unpublishPage('site-1', 'p1');
    expect(request.post).toHaveBeenCalledWith('/sites/site-1/pages/p1/unpublish');
  });

  it('previewPageDraft calls GET preview', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { status: 'draft' } });
    await previewPageDraft('site-1', 'p1');
    expect(request.get).toHaveBeenCalledWith('/sites/site-1/pages/p1/preview');
  });

  it('getPageVersions calls GET versions', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: [] });
    await getPageVersions('site-1', 'p1');
    expect(request.get).toHaveBeenCalledWith('/sites/site-1/pages/p1/versions');
  });

  it('rollbackPage calls POST rollback', async () => {
    vi.mocked(request.post).mockResolvedValue({ data: {} });
    await rollbackPage('site-1', 'p1', 'v1');
    expect(request.post).toHaveBeenCalledWith('/sites/site-1/pages/p1/versions/v1/rollback');
  });
});
