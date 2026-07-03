import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getToken } from '@/api/request';

const USER_STORAGE_KEY = 'luban_user';

/** 从 localStorage 恢复用户信息（Wave 2: 刷新不丢用户） */
function loadPersistedUser(): { username?: string; name?: string; role?: string } | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePersistedUser(user: { username?: string; name?: string; role?: string }) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // localStorage 不可用时静默降级
  }
}

function clearPersistedUser() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // 静默
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken());
  // Wave 2: 从 localStorage 恢复用户信息（刷新不丢）
  const persisted = token.value ? loadPersistedUser() : null;
  const username = ref<string | null>(persisted?.username ?? null);
  const name = ref<string | null>(persisted?.name ?? null);
  const role = ref<string | null>(persisted?.role ?? null);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => role.value === 'admin');

  function setAuth(t: string, user?: { username?: string; name?: string; role?: string }) {
    token.value = t;
    username.value = user?.username ?? null;
    name.value = user?.name ?? null;
    role.value = user?.role ?? null;
    // Wave 2: 持久化用户信息
    savePersistedUser({
      username: username.value ?? undefined,
      name: name.value ?? undefined,
      role: role.value ?? undefined,
    });
  }

  function clearAuth() {
    token.value = null;
    username.value = null;
    name.value = null;
    role.value = null;
    clearPersistedUser();
  }

  return { token, username, name, role, isLoggedIn, isAdmin, setAuth, clearAuth };
});
