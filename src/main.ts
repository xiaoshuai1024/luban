import './styles/index.scss';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import { useUserStore } from './stores';
import { getCurrentUser } from './api/auth';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(ElementPlus);

// 刷新时如果有 token，则尝试拉取当前用户信息
// Wave 2 致命修复：只在 401 时清除 auth，其他错误保留（避免网络波动导致强制登出）
router.isReady().then(async () => {
  const userStore = useUserStore(pinia);
  if (userStore.token) {
    try {
      const { data } = await getCurrentUser();
      userStore.setAuth(userStore.token, data);
    } catch (err: unknown) {
      // 只在 401 Unauthorized 时清除 auth（token 过期）
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        userStore.clearAuth();
      }
      // 其他错误（网络波动、500 等）保留 auth，让用户继续操作
    }
  }
  app.mount('#app');
});
