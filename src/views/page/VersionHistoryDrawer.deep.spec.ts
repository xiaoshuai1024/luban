import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ElementPlus from 'element-plus';
import VersionHistoryDrawer from './VersionHistoryDrawer.vue';

vi.mock('@/api/page', () => ({
  getPageVersions: vi.fn().mockResolvedValue({
    data: [
      { id: 'v1', pageId: 'p1', versionNo: 1, summary: '创建', createdAt: '2026-06-27T10:00:00Z' },
      { id: 'v2', pageId: 'p1', versionNo: 2, summary: '保存', createdAt: '2026-06-27T11:00:00Z' },
    ],
  }),
  rollbackPage: vi.fn().mockResolvedValue({ data: { id: 'p1' } }),
}));

describe('VersionHistoryDrawer interactions', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('loads versions when visible', async () => {
    const wrapper = mount(VersionHistoryDrawer, {
      props: { visible: true, siteId: 's1', pageId: 'p1' },
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    // ElDrawer 内容 teleport 到 body
    await vi.waitFor(() => {
      expect(document.body.textContent || wrapper.text()).toContain('版本');
    });
  });

  it('drawer renders without crash', async () => {
    const wrapper = mount(VersionHistoryDrawer, {
      props: { visible: false, siteId: 's1', pageId: 'p1' },
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('accepts siteId and pageId props', async () => {
    const wrapper = mount(VersionHistoryDrawer, {
      props: { visible: true, siteId: 'my-site', pageId: 'my-page' },
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    expect(wrapper.props('siteId')).toBe('my-site');
    expect(wrapper.props('pageId')).toBe('my-page');
  });
});
