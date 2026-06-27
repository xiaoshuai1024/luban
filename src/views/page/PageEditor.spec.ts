import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import PageEditor from '@/views/page/PageEditor.vue';

vi.mock('@/api/page', () => ({
  getPage: vi.fn().mockResolvedValue({
    data: {
      id: 'p1',
      name: 'T',
      path: '/t',
      status: 'draft',
      schema: { root: { id: 'r', type: 'LubanContainer', props: {}, children: [] } },
    },
  }),
  savePage: vi.fn().mockResolvedValue({ data: {} }),
  createPage: vi.fn(),
  publishPage: vi.fn(),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/sites/:siteId/pages/:pageId', name: 'PageEditor', component: PageEditor }],
});

describe('PageEditor.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders page editor', async () => {
    router.push('/sites/s1/pages/p1');
    await router.isReady();
    const wrapper = shallowMount(PageEditor, { global: { plugins: [router, ElementPlus] } });
    expect(wrapper.exists()).toBe(true);
  });
});
