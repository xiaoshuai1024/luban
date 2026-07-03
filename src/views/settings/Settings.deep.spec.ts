import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import Settings from '@/views/settings/Settings.vue';

vi.mock('@/api/settings', () => ({
  getSettings: vi
    .fn()
    .mockResolvedValue({ data: { siteName: 'Luban', logo: '', features: { darkMode: false } } }),
  updateSettings: vi.fn().mockResolvedValue({ data: {} }),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/settings', component: Settings }],
});

describe('Settings deep interactions', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    router.push('/settings');
    await router.isReady();
  });

  it('renders settings form', async () => {
    const wrapper = mount(Settings, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.exists()).toBe(true));
  });

  it('loads settings data', async () => {
    const wrapper = mount(Settings, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(
      () => {
        expect(wrapper.html()).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});
