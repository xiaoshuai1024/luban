import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import Dashboard from '@/views/Dashboard.vue';

vi.mock('@/api/site', () => ({ getSites: vi.fn().mockResolvedValue({ data: [] }) }));
vi.mock('@/api/user', () => ({ getUsers: vi.fn().mockResolvedValue({ data: { total: 0 } }) }));
vi.mock('@/api/request', () => ({
  getToken: vi.fn(() => 'tok'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: Dashboard }],
});

describe('Dashboard.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders dashboard', () => {
    const wrapper = shallowMount(Dashboard, { global: { plugins: [router, ElementPlus] } });
    expect(wrapper.exists()).toBe(true);
  });
});
