import { describe, it, expect } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import SiteDetail from './SiteDetail.vue';

vi.mock('@/api/site', () => ({ getSite: vi.fn().mockResolvedValue({ data: { id: 's1', name: 'Test', slug: 'test' } }) }));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/sites/:id', component: SiteDetail }],
});

describe('SiteDetail.vue', () => {
  it('renders site detail', async () => {
    router.push('/sites/s1');
    await router.isReady();
    const wrapper = shallowMount(SiteDetail, { global: { plugins: [router, ElementPlus] } });
    expect(wrapper.exists()).toBe(true);
  });
});
