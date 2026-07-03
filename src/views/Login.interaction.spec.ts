import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import Login from '@/views/Login.vue';

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock('@/api/request', () => ({
  request: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  logout: vi.fn(),
}));

const { login } = await import('@/api/auth');

function mountLogin() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: Login },
      { path: '/dashboard', component: { template: '<div>dashboard</div>' } },
    ],
  });
  return mount(Login, { global: { plugins: [router, ElementPlus] } });
}

describe('Login.vue interactions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders title', () => {
    const wrapper = mountLogin();
    expect(wrapper.text()).toContain('Luban');
  });

  it('has both inputs', () => {
    const wrapper = mountLogin();
    expect(wrapper.find('input[placeholder="请输入账号"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder="请输入密码"]').exists()).toBe(true);
  });

  it('typing updates input values', async () => {
    const wrapper = mountLogin();
    const userInput = wrapper.find('input[placeholder="请输入账号"]');
    await userInput.setValue('admin');
    expect((userInput.element as HTMLInputElement).value).toBe('admin');
  });

  it('submit calls login with form values', async () => {
    vi.mocked(login).mockResolvedValue({
      data: { token: 'tok', user: { username: 'admin' } },
    } as never);
    const wrapper = mountLogin();
    await wrapper.find('input[placeholder="请输入账号"]').setValue('admin');
    await wrapper.find('input[placeholder="请输入密码"]').setValue('pass123');
    await wrapper.find('button').trigger('click');
    await vi.waitFor(() => {
      expect(vi.mocked(login)).toHaveBeenCalledWith({ username: 'admin', password: 'pass123' });
    });
  });

  it('handles login failure', async () => {
    vi.mocked(login).mockRejectedValue(new Error('Invalid credentials') as never);
    const wrapper = mountLogin();
    await wrapper.find('input[placeholder="请输入账号"]').setValue('bad');
    await wrapper.find('input[placeholder="请输入密码"]').setValue('bad');
    await wrapper.find('button').trigger('click');
    // 不应崩溃
    expect(wrapper.exists()).toBe(true);
  });
});
