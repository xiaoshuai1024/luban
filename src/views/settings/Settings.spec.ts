import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import Settings from '@/views/settings/Settings.vue';

vi.mock('@/api/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({ data: {} }),
  updateSettings: vi.fn(),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: Settings }],
});

describe('Settings.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders the page', () => {
    const wrapper = shallowMount(Settings, { global: { plugins: [router, ElementPlus] } });
    expect(wrapper.exists()).toBe(true);
  });
});
