import { describe, it, expect } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import LoginLayout from './LoginLayout.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: LoginLayout }],
});

describe('LoginLayout.vue', () => {
  it('renders login layout container', () => {
    const wrapper = shallowMount(LoginLayout, { global: { plugins: [router] } });
    expect(wrapper.find('.login-layout').exists()).toBe(true);
  });
});
