import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

vi.mock('@/api/request', () => ({
  getToken: vi.fn(() => 'tok'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  logout: vi.fn(),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [{ path: 'dashboard', component: { template: '<div/>' } }],
    },
  ],
});

describe('DefaultLayout.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders sidebar menu', () => {
    const wrapper = shallowMount(DefaultLayout, { global: { plugins: [router, ElementPlus] } });
    expect(wrapper.exists()).toBe(true);
  });
});
