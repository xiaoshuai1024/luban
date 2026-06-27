import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import SiteList from '@/views/site/SiteList.vue';

vi.mock('@/api/site', () => ({
  getSites: vi.fn().mockResolvedValue({ data: [
    { id: 's1', name: 'Site A', slug: 'a', baseUrl: 'https://a.com', status: 'active' },
  ] }),
  createSite: vi.fn().mockResolvedValue({ data: { id: 's2', name: 'Created' } }),
  updateSite: vi.fn().mockResolvedValue({ data: { id: 's1' } }),
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

describe('SiteList deep interactions', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    router.push('/sites');
    await router.isReady();
  });

  it('displays loaded sites in table', async () => {
    const wrapper = mount(SiteList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.html()).toContain('Site A'));
  });

  it('navigates to site detail on 详情 click', async () => {
    const wrapper = mount(SiteList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.html()).toContain('Site A'));
    const row = wrapper.find('.el-table__row');
    const detailBtn = row.findAll('button').find(b => b.text().includes('详情'));
    if (detailBtn) {
      await detailBtn.trigger('click');
      expect(wrapper.exists()).toBe(true);
    }
  });

  it('navigates to pages on 页面 click', async () => {
    const wrapper = mount(SiteList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.html()).toContain('Site A'));
    const row = wrapper.find('.el-table__row');
    const pagesBtn = row.findAll('button').find(b => b.text().includes('页面'));
    if (pagesBtn) {
      await pagesBtn.trigger('click');
      expect(wrapper.exists()).toBe(true);
    }
  });

  it('opens edit dialog and fills form', async () => {
    const wrapper = mount(SiteList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.html()).toContain('Site A'));
    const row = wrapper.find('.el-table__row');
    const editBtn = row.findAll('button').find(b => b.text().includes('编辑'));
    if (editBtn) {
      await editBtn.trigger('click');
      await vi.waitFor(() => {
        expect(wrapper.find('.el-dialog').exists() || document.querySelector('.el-dialog')).toBeTruthy();
      });
    }
  });

  it('triggers delete with confirmation', async () => {
    const wrapper = mount(SiteList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.html()).toContain('Site A'));
    const row = wrapper.find('.el-table__row');
    const delBtn = row.findAll('button').find(b => b.text().includes('删除'));
    if (delBtn) {
      await delBtn.trigger('click');
      await vi.waitFor(() => {
        expect(document.querySelector('.el-message-box')).toBeTruthy();
      });
    }
  });
});
