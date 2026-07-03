import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus';
import Login from '@/views/Login.vue';

// Mock API
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

describe('Login.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders login form with title', () => {
    const wrapper = mountLogin();
    expect(wrapper.text()).toContain('Luban');
  });

  it('has username and password inputs', () => {
    const wrapper = mountLogin();
    expect(wrapper.find('input[placeholder="请输入账号"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder="请输入密码"]').exists()).toBe(true);
  });

  it('has login button', () => {
    const wrapper = mountLogin();
    const btn = wrapper.find('button');
    expect(btn.exists()).toBe(true);
  });

  it('updates username on input', async () => {
    const wrapper = mountLogin();
    const input = wrapper.find('input[placeholder="请输入账号"]');
    await input.setValue('testuser');
    expect((input.element as HTMLInputElement).value).toBe('testuser');
  });

  it('calls login API even with empty form (current behavior)', async () => {
    vi.mocked(login).mockRejectedValue(new Error('invalid') as never);
    const wrapper = mountLogin();
    await wrapper.find('button').trigger('click');
    // 当前行为：空表单也会调 API（后端拒绝）
    await vi.waitFor(() => {
      expect(vi.mocked(login)).toHaveBeenCalled();
    });
  });

  it('calls login API when form is filled', async () => {
    vi.mocked(login).mockResolvedValue({
      data: { token: 'tok', user: { username: 'admin' } },
    } as never);
    const wrapper = mountLogin();
    await wrapper.find('input[placeholder="请输入账号"]').setValue('admin');
    await wrapper.find('input[placeholder="请输入密码"]').setValue('pass');
    await wrapper.find('button').trigger('click');
    await vi.waitFor(() => {
      expect(vi.mocked(login)).toHaveBeenCalledWith({ username: 'admin', password: 'pass' });
    });
  });
});
