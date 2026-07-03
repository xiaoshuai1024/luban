import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import PageList from '@/views/page/PageList.vue';

vi.mock('@/api/page', () => ({
  getPages: vi.fn().mockResolvedValue({ data: [] }),
  deletePage: vi.fn(),
  publishPage: vi.fn(),
  unpublishPage: vi.fn(),
}));
vi.mock('@/api/site', () => ({ getSite: vi.fn().mockResolvedValue({ data: { id: 's1' } }) }));
vi.mock('@/utils/publicPage', () => ({ buildPublishedPagePreviewUrl: vi.fn(() => null) }));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: PageList }],
});

function mountPageList() {
  return mount(PageList, {
    global: { plugins: [router, ElementPlus] },
    props: {},
  });
}

describe('PageList.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders the page', () => {
    const wrapper = mountPageList();
    expect(wrapper.exists()).toBe(true);
  });

  it('has create button', () => {
    const wrapper = mountPageList();
    expect(wrapper.html()).toContain('新建页面');
  });
});
