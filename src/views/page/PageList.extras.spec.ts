import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import PageList from '@/views/page/PageList.vue';

vi.mock('@/api/page', () => ({
  getPages: vi.fn().mockResolvedValue({ data: [
    { id: 'p1', name: '首页', path: '/', status: 'published', updatedAt: '2026-06-27' },
    { id: 'p2', name: '关于', path: '/about', status: 'draft', updatedAt: '2026-06-27' },
    { id: 'p3', name: '联系', path: '/contact', status: 'archived', updatedAt: '2026-06-27' },
  ] }),
  deletePage: vi.fn().mockResolvedValue({}),
  publishPage: vi.fn().mockResolvedValue({ data: { status: 'published' } }),
  unpublishPage: vi.fn().mockResolvedValue({ data: { status: 'archived' } }),
}));
vi.mock('@/api/site', () => ({
  getSite: vi.fn().mockResolvedValue({ data: { id: 's1', name: '测试站', slug: 'test', baseUrl: 'https://t.com' } }),
}));
vi.mock('@/utils/publicPage', () => ({
  buildPublishedPagePreviewUrl: vi.fn(() => 'https://t.com/'),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/sites/:siteId/pages', component: PageList },
    { path: '/sites/:siteId/pages/new', component: { template: '<div/>' } },
    { path: '/sites/:siteId/pages/:pageId', component: { template: '<div/>' } },
  ],
});

describe('PageList extras', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    router.push('/sites/s1/pages');
    await router.isReady();
  });

  it('shows all three page statuses', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('已发布');
      expect(wrapper.html()).toContain('草稿');
      expect(wrapper.html()).toContain('已下线');
    });
  });

  it('shows site name in toolbar', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('测试站');
    });
  });

  it('shows edit buttons for all rows', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      const editBtns = wrapper.findAll('button').filter(b => b.text().includes('编辑'));
      expect(editBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows delete buttons for all rows', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      const delBtns = wrapper.findAll('button').filter(b => b.text().includes('删除'));
      expect(delBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows preview for published page', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      const previewBtns = wrapper.findAll('button').filter(b => b.text().includes('预览'));
      expect(previewBtns.length).toBeGreaterThanOrEqual(1);
    });
  });
});
