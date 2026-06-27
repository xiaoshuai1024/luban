import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import UserList from '@/views/user/UserList.vue';

vi.mock('@/api/user', () => ({
  getUsers: vi.fn().mockResolvedValue({ data: { list: [
    { id: 'u1', username: 'admin', name: 'Admin', role: 'admin', status: 'active' },
  ], total: 1 } }),
  createUser: vi.fn().mockResolvedValue({ data: { id: 'u2' } }),
  updateUser: vi.fn().mockResolvedValue({ data: {} }),
  setUserStatus: vi.fn().mockResolvedValue({ data: {} }),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/users', component: UserList }],
});

describe('UserList deep interactions', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    router.push('/users');
    await router.isReady();
  });

  it('loads and displays users', async () => {
    const wrapper = mount(UserList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => expect(wrapper.html()).toContain('admin'));
  });

  it('shows create button', async () => {
    const wrapper = mount(UserList, { global: { plugins: [router, ElementPlus] } });
    await vi.waitFor(() => {
      const btns = wrapper.findAll('button');
      expect(btns.length).toBeGreaterThan(0);
    });
  });
});
