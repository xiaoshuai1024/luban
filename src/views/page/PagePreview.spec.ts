import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import PagePreview from '@/views/page/PagePreview.vue';

vi.mock('@/api/page', () => ({
  previewPageDraft: vi.fn().mockResolvedValue({
    data: { id: 'p1', schema: { root: { id: 'r', type: 'LubanHero', props: {} } } },
  }),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/sites/:siteId/pages/:pageId/preview', component: PagePreview }],
});

describe('PagePreview.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders preview page', async () => {
    router.push('/sites/s1/pages/p1/preview');
    await router.isReady();
    const wrapper = shallowMount(PagePreview, { global: { plugins: [router, ElementPlus] } });
    expect(wrapper.exists()).toBe(true);
  });
});
