<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElButton, ElTable, ElTableColumn, ElMessage, ElMessageBox, ElTag } from 'element-plus';
import { getPages, deletePage, publishPage, unpublishPage, type PageMeta } from '@/api/page';
import { getSite } from '@/api/site';
import { buildPublishedPagePreviewUrl } from '@/utils/publicPage';
import VersionHistoryDrawer from './VersionHistoryDrawer.vue';

const route = useRoute();
const router = useRouter();
const siteId = computed(() => route.params.siteId as string);
const siteName = ref('');
const siteSlug = ref('');
const siteBaseUrl = ref('');
const list = ref<PageMeta[]>([]);
const loading = ref(false);
const actionLoading = ref<string | null>(null);

async function fetchSite() {
  if (!siteId.value) return;
  try {
    const { data } = await getSite(siteId.value);
    siteName.value = data.name;
    siteSlug.value = data.slug ?? '';
    siteBaseUrl.value = data.baseUrl ?? '';
  } catch {
    siteName.value = '';
    siteSlug.value = '';
    siteBaseUrl.value = '';
  }
}

async function fetchList() {
  if (!siteId.value) return;
  loading.value = true;
  try {
    const { data } = await getPages(siteId.value);
    list.value = Array.isArray(data) ? data : [];
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function goNew() {
  router.push(`/sites/${siteId.value}/pages/new`);
}

function goEdit(row: PageMeta) {
  router.push(`/sites/${siteId.value}/pages/${row.id}`);
}

function openPublishedPreview(row: PageMeta) {
  const url = buildPublishedPagePreviewUrl({
    slug: siteSlug.value,
    baseUrl: siteBaseUrl.value,
    path: row.path,
  });

  if (!url) {
    ElMessage.warning('当前站点未配置 slug 或 baseUrl，无法预览');
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

async function handlePublish(row: PageMeta) {
  actionLoading.value = row.id;
  try {
    await publishPage(siteId.value, row.id);
    ElMessage.success('发布成功');
    fetchList();
  } catch (e) {
    ElMessage.error((e as Error).message || '发布失败');
  } finally {
    actionLoading.value = null;
  }
}

async function handleUnpublish(row: PageMeta) {
  try {
    await ElMessageBox.confirm(`确定下线页面「${row.name}」？下线后访客将无法访问。`, '下线确认', {
      type: 'warning',
      confirmButtonText: '确认下线',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  actionLoading.value = row.id;
  try {
    await unpublishPage(siteId.value, row.id);
    ElMessage.success('已下线');
    fetchList();
  } catch (e) {
    ElMessage.error((e as Error).message || '下线失败');
  } finally {
    actionLoading.value = null;
  }
}

async function handleDelete(row: PageMeta) {
  await ElMessageBox.confirm(`确定删除页面「${row.name}」？`, '提示', { type: 'warning' });
  try {
    await deletePage(siteId.value, row.id);
    ElMessage.success('删除成功');
    fetchList();
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败');
  }
}

// 版本历史抽屉
const versionDrawerVisible = ref(false);
const versionDrawerPageId = ref('');

function openVersionHistory(row: PageMeta) {
  versionDrawerPageId.value = row.id;
  versionDrawerVisible.value = true;
}

async function onVersionRolledBack() {
  ElMessage.success('已回滚，列表已刷新');
  await fetchList();
}

function statusTagType(status?: string) {
  if (status === 'published') return 'success';
  if (status === 'archived') return 'danger';
  return 'info';
}

function statusTagText(status?: string) {
  if (status === 'published') return '已发布';
  if (status === 'archived') return '已下线';
  return '草稿';
}

onMounted(() => {
  fetchSite();
  fetchList();
});
</script>

<template>
  <div class="page-list">
    <div class="page-list__toolbar">
      <span v-if="siteName" class="page-list__site">站点：{{ siteName }}</span>
      <ElButton type="primary" @click="goNew">新建页面</ElButton>
    </div>
    <ElTable v-loading="loading" :data="list" stripe>
      <ElTableColumn prop="name" label="页面名称" min-width="160" />
      <ElTableColumn prop="path" label="路径" min-width="120" />
      <ElTableColumn label="状态" width="100">
        <template #default="{ row }">
          <ElTag :type="statusTagType(row.status)" size="small">
            {{ statusTagText(row.status) }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="updatedAt" label="更新时间" width="180" />
      <ElTableColumn label="操作" width="340" fixed="right">
        <template #default="{ row }">
          <ElButton link type="primary" @click="goEdit(row)">编辑</ElButton>
          <ElButton
            v-if="row.status !== 'published'"
            link
            type="success"
            :loading="actionLoading === row.id"
            @click="handlePublish(row)"
          >
            发布
          </ElButton>
          <ElButton
            v-if="row.status === 'published'"
            link
            type="warning"
            :loading="actionLoading === row.id"
            @click="handleUnpublish(row)"
          >
            下线
          </ElButton>
          <ElButton
            v-if="row.status === 'published'"
            link
            type="info"
            @click="openPublishedPreview(row)"
          >
            预览
          </ElButton>
          <ElButton link type="info" @click="openVersionHistory(row)">版本</ElButton>
          <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <VersionHistoryDrawer
      v-model:visible="versionDrawerVisible"
      :site-id="siteId"
      :page-id="versionDrawerPageId"
      @rolled-back="onVersionRolledBack"
    />
  </div>
</template>

<style lang="scss" scoped>
.page-list__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-list__site {
  font-size: 14px;
  color: #606266;
}
</style>
