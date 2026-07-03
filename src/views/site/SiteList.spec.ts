import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import SiteList from '@/views/site/SiteList.vue';

vi.mock('@/api/site', () => ({
  getSites: vi.fn().mockResolvedValue({ data: [] }),
  createSite: vi.fn(),
  updateSite: vi.fn(),
  deleteSite: vi.fn(),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: SiteList }],
});

function mountSiteList() {
  return mount(SiteList, { global: { plugins: [router, ElementPlus] } });
}

describe('SiteList.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders the page', () => {
    const wrapper = mountSiteList();
    expect(wrapper.exists()).toBe(true);
  });

  it('has create button', () => {
    const wrapper = mountSiteList();
    expect(wrapper.html()).toContain('新建站点');
  });

  it('renders table element', () => {
    const wrapper = mountSiteList();
    expect(
      wrapper.find('.el-table').exists() || wrapper.findComponent({ name: 'ElTable' }).exists(),
    ).toBe(true);
  });
});
