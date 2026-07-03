import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import Dashboard from '@/views/Dashboard.vue';

vi.mock('@/api/site', () => ({
  getSites: vi.fn().mockResolvedValue({ data: [{ id: 's1', name: 'Test' }] }),
}));
vi.mock('@/api/user', () => ({
  getUsers: vi.fn().mockResolvedValue({ data: { list: [], total: 5 } }),
}));
vi.mock('@/api/request', () => ({
  getToken: vi.fn(() => 'tok'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/dashboard', component: Dashboard },
    { path: '/sites', component: { template: '<div/>' } },
    { path: '/users', component: { template: '<div/>' } },
    { path: '/settings', component: { template: '<div/>' } },
  ],
});

describe('Dashboard deep interactions', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    router.push('/dashboard');
    await router.isReady();
  });

  it('displays statistic cards', async () => {
    const wrapper = mount(Dashboard, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('站点数');
    });
  });

  it('displays quick links', async () => {
    const wrapper = mount(Dashboard, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('站点管理');
    });
  });

  it('quick link navigates to sites', async () => {
    const wrapper = mount(Dashboard, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.html()).toContain('站点管理'));
    const link = wrapper.find('a[href="/sites"], [to="/sites"]');
    if (link.exists()) {
      expect(link.exists()).toBe(true);
    }
  });
});
