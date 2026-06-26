import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '@/api/request';
import { useUserStore } from '@/stores/user';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { layout: 'login', public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      meta: { layout: 'default' },
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '工作台' },
        },
        {
          path: 'sites',
          name: 'SiteList',
          component: () => import('@/views/site/SiteList.vue'),
          meta: { title: '站点管理' },
        },
        {
          path: 'sites/:id',
          name: 'SiteDetail',
          component: () => import('@/views/site/SiteDetail.vue'),
          meta: { title: '站点详情' },
        },
        {
          path: 'sites/:siteId/pages',
          name: 'PageList',
          component: () => import('@/views/page/PageList.vue'),
          meta: { title: '页面列表' },
        },
        {
          path: 'sites/:siteId/pages/new',
          name: 'PageNew',
          component: () => import('@/views/page/PageEditor.vue'),
          meta: { title: '新建页面', isNew: true },
        },
        {
          path: 'sites/:siteId/pages/:pageId',
          name: 'PageEditor',
          component: () => import('@/views/page/PageEditor.vue'),
          meta: { title: '页面编辑' },
        },
        {
          path: 'sites/:siteId/pages/:pageId/preview',
          name: 'PagePreview',
          component: () => import('@/views/page/PagePreview.vue'),
          meta: { title: '草稿预览' },
        },
        {
          path: 'users',
          name: 'UserList',
          component: () => import('@/views/user/UserList.vue'),
          meta: { title: '用户管理', requiresAdmin: true },
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/settings/Settings.vue'),
          meta: { title: '系统设置', requiresAdmin: true },
        },
      ],
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const token = getToken();
  const isPublic = to.meta.public === true;
  if (!isPublic && !token) {
    next({ path: '/login' });
    return;
  }
  // Wave 2: admin 路由守卫
  if (to.meta.requiresAdmin === true) {
    const userStore = useUserStore();
    if (!userStore.isAdmin) {
      next({ path: '/dashboard' });
      return;
    }
  }
  if (to.path === '/login' && token) {
    next({ path: '/dashboard' });
    return;
  }
  next();
});

export default router;
