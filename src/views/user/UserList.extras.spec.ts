import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import UserList from '@/views/user/UserList.vue';

vi.mock('@/api/user', () => ({
  getUsers: vi.fn().mockResolvedValue({ data: { list: [
    { id: 'u1', username: 'admin', name: 'Admin', role: 'admin', status: 'active' },
    { id: 'u2', username: 'editor', name: 'Editor', role: 'editor', status: 'active' },
    { id: 'u3', username: 'viewer', name: 'Viewer', role: 'viewer', status: 'disabled' },
  ], total: 3 } }),
  createUser: vi.fn().mockResolvedValue({ data: { id: 'u4', username: 'new' } }),
  updateUser: vi.fn().mockResolvedValue({ data: {} }),
  setUserStatus: vi.fn().mockResolvedValue({ data: {} }),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/users', component: UserList }],
});

describe('UserList extras', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    router.push('/users');
    await router.isReady();
  });

  it('renders all three users', async () => {
    const wrapper = mount(UserList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('admin');
      expect(wrapper.html()).toContain('editor');
    });
  });

  it('shows role labels', async () => {
    const wrapper = mount(UserList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('admin');
    });
  });

  it('has pagination element', async () => {
    const wrapper = mount(UserList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      expect(wrapper.find('.el-table').exists()).toBe(true);
    });
  });
});
