import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ElementPlus from 'element-plus';
import VersionHistoryDrawer from './VersionHistoryDrawer.vue';

vi.mock('@/api/page', () => ({
  getPageVersions: vi.fn().mockResolvedValue({ data: [] }),
  rollbackPage: vi.fn(),
}));

describe('VersionHistoryDrawer.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders drawer when visible', () => {
    const wrapper = shallowMount(VersionHistoryDrawer, {
      props: { visible: true, siteId: 's1', pageId: 'p1' },
      global: { plugins: [ElementPlus] },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('does not crash when invisible', () => {
    const wrapper = shallowMount(VersionHistoryDrawer, {
      props: { visible: false, siteId: 's1', pageId: 'p1' },
      global: { plugins: [ElementPlus] },
    });
    expect(wrapper.exists()).toBe(true);
  });
});
