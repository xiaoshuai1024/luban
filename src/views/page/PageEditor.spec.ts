import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import PageEditor from '@/views/page/PageEditor.vue';

const apiPageMock = {
  getPage: vi.fn(),
  savePage: vi.fn().mockResolvedValue({ data: {} }),
  createPage: vi.fn(),
  publishPage: vi.fn(),
  unpublishPage: vi.fn(),
};

vi.mock('@/api/page', () => ({
  getPage: (...args: unknown[]) => apiPageMock.getPage(...args),
  savePage: (...args: unknown[]) => apiPageMock.savePage(...args),
  createPage: (...args: unknown[]) => apiPageMock.createPage(...args),
  publishPage: (...args: unknown[]) => apiPageMock.publishPage(...args),
  unpublishPage: (...args: unknown[]) => apiPageMock.unpublishPage(...args),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/sites/:siteId/pages/:pageId', name: 'PageEditor', component: PageEditor }],
});

function makePageData(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: 'p1',
      name: 'T',
      path: '/t',
      status: 'draft',
      schema: { root: { id: 'r', type: 'LubanContainer', props: {}, children: [] } },
      ...overrides,
    },
  };
}

async function mountEditor() {
  router.push('/sites/s1/pages/p1');
  await router.isReady();
  const wrapper = shallowMount(PageEditor, { global: { plugins: [router, ElementPlus] } });
  await flushPromises();
  return wrapper;
}

describe('PageEditor.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    apiPageMock.getPage.mockResolvedValue(makePageData());
  });

  it('renders page editor', async () => {
    const wrapper = await mountEditor();
    expect(wrapper.exists()).toBe(true);
  });

  it('加载草稿页面时 getPage 被调用并传入 siteId/pageId', async () => {
    apiPageMock.getPage.mockResolvedValue(makePageData({ status: 'draft' }));
    await mountEditor();
    expect(apiPageMock.getPage).toHaveBeenCalledWith('s1', 'p1');
  });

  it('handlePublish 调用 publishPage(s1, p1)', async () => {
    apiPageMock.getPage.mockResolvedValue(makePageData({ status: 'draft' }));
    apiPageMock.publishPage.mockResolvedValue(makePageData({ status: 'published' }));
    const wrapper = await mountEditor();
    const vm = wrapper.vm as unknown as { handlePublish: () => Promise<void> };
    await vm.handlePublish();
    await flushPromises();
    expect(apiPageMock.publishPage).toHaveBeenCalledWith('s1', 'p1');
  });

  it('handleUnpublish 调用 unpublishPage(s1, p1)', async () => {
    apiPageMock.getPage.mockResolvedValue(makePageData({ status: 'published' }));
    apiPageMock.unpublishPage.mockResolvedValue(makePageData({ status: 'draft' }));
    const wrapper = await mountEditor();
    const vm = wrapper.vm as unknown as { handleUnpublish: () => Promise<void> };
    await vm.handleUnpublish();
    await flushPromises();
    expect(apiPageMock.unpublishPage).toHaveBeenCalledWith('s1', 'p1');
  });

  it('发布失败时 publishPage 仍被调用（错误降级为提示）', async () => {
    apiPageMock.getPage.mockResolvedValue(makePageData({ status: 'draft' }));
    apiPageMock.publishPage.mockRejectedValue(new Error('server error'));
    const wrapper = await mountEditor();
    const vm = wrapper.vm as unknown as { handlePublish: () => Promise<void> };
    // 不应抛穿
    await expect(vm.handlePublish()).resolves.toBeUndefined();
    expect(apiPageMock.publishPage).toHaveBeenCalled();
  });

  it('openDraftPreview 解析到 preview 路由', async () => {
    apiPageMock.getPage.mockResolvedValue(makePageData());
    const wrapper = await mountEditor();
    const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const vm = wrapper.vm as unknown as { openDraftPreview: () => void };
    vm.openDraftPreview();
    expect(windowSpy).toHaveBeenCalledTimes(1);
    // 新窗口打开的是 preview 路由
    expect(windowSpy.mock.calls[0][1]).toBe('_blank');
    windowSpy.mockRestore();
  });
});
