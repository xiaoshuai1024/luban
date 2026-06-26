import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import UserList from '@/views/user/UserList.vue';

vi.mock('@/api/user', () => ({
  getUsers: vi.fn().mockResolvedValue({ data: { list: [], total: 0 } }),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserStatus: vi.fn(),
  deleteUser: vi.fn(),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: UserList }],
});

describe('UserList.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders the page', () => {
    const wrapper = shallowMount(UserList, { global: { plugins: [router, ElementPlus] } });
    expect(wrapper.exists()).toBe(true);
  });
});
