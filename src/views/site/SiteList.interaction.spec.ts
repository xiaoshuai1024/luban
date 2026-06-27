import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import SiteList from '@/views/site/SiteList.vue';

vi.mock('@/api/site', () => ({
  getSites: vi.fn().mockResolvedValue({
    data: [
      { id: 's1', name: 'Site A', slug: 'a', baseUrl: 'https://a.com', status: 'active' },
      { id: 's2', name: 'Site B', slug: 'b', baseUrl: 'https://b.com', status: 'inactive' },
    ],
  }),
  createSite: vi.fn().mockResolvedValue({ data: { id: 's3', name: 'New' } }),
  updateSite: vi.fn().mockResolvedValue({ data: { id: 's1', name: 'Updated' } }),
  deleteSite: vi.fn().mockResolvedValue({}),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/sites', component: SiteList },
    { path: '/sites/:id', component: { template: '<div/>' } },
    { path: '/sites/:id/pages', component: { template: '<div/>' } },
  ],
});

describe('SiteList.vue interactions', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('loads and displays sites', async () => {
    const wrapper = mount(SiteList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('Site A');
    });
  });

  it('opens create dialog on button click', async () => {
    const wrapper = mount(SiteList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.html()).toContain('新建站点'));
    const buttons = wrapper.findAll('button');
    const createBtn = buttons.find((b) => b.text().includes('新建站点'));
    if (createBtn) await createBtn.trigger('click');
    await vi.waitFor(() => {
      expect(
        document.querySelector('.el-dialog') || wrapper.find('.el-dialog').exists(),
      ).toBeTruthy();
    });
  });

  it('displays site data in table', async () => {
    const wrapper = mount(SiteList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('Site A');
      expect(wrapper.html()).toContain('Site B');
    });
  });
});
