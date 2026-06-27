import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import PageList from '@/views/page/PageList.vue';

vi.mock('@/api/page', () => ({
  getPages: vi.fn().mockResolvedValue({
    data: [
      { id: 'p1', name: 'Home', path: '/home', status: 'published', updatedAt: '2026-06-27' },
      { id: 'p2', name: 'About', path: '/about', status: 'draft', updatedAt: '2026-06-27' },
    ],
  }),
  deletePage: vi.fn().mockResolvedValue({}),
  publishPage: vi.fn().mockResolvedValue({ data: { status: 'published' } }),
  unpublishPage: vi.fn().mockResolvedValue({ data: { status: 'archived' } }),
}));
vi.mock('@/api/site', () => ({
  getSite: vi.fn().mockResolvedValue({
    data: { id: 's1', name: 'Test', slug: 'test', baseUrl: 'https://test.com' },
  }),
}));
vi.mock('@/utils/publicPage', () => ({
  buildPublishedPagePreviewUrl: vi.fn(() => 'https://test.com/home'),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/sites/:siteId/pages', component: PageList },
    { path: '/sites/:siteId/pages/new', component: { template: '<div/>' } },
    { path: '/sites/:siteId/pages/:pageId', component: { template: '<div/>' } },
  ],
});

describe('PageList.vue interactions', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    router.push('/sites/s1/pages');
    await router.isReady();
  });

  it('loads and displays pages with status tags', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('Home');
      expect(wrapper.html()).toContain('About');
    });
  });

  it('shows correct status labels', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('已发布');
      expect(wrapper.html()).toContain('草稿');
    });
  });

  it('shows publish button for draft pages', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('发布');
    });
  });

  it('shows unpublish button for published pages', async () => {
    const wrapper = mount(PageList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('下线');
    });
  });
});
