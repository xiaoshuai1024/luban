<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElDrawer, ElTable, ElTableColumn, ElButton, ElMessage, ElMessageBox } from 'element-plus';
import { getPageVersions, rollbackPage, type PageVersion } from '@/api/page';

const props = defineProps<{
  visible: boolean;
  siteId: string;
  pageId: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'rolled-back': [];
}>();

const versions = ref<PageVersion[]>([]);
const loading = ref(false);
const rollingBack = ref<string | null>(null);

async function loadVersions() {
  if (!props.siteId || !props.pageId) return;
  loading.value = true;
  try {
    const { data } = await getPageVersions(props.siteId, props.pageId);
    versions.value = data ?? [];
  } catch (e) {
    ElMessage.error((e as Error).message || '加载版本失败');
  } finally {
    loading.value = false;
  }
}

async function handleRollback(version: PageVersion) {
  try {
    await ElMessageBox.confirm(
      `确定回滚到 v${version.versionNo}（${version.summary ?? ''}）？当前草稿将被覆盖。`,
      '版本回滚',
      { type: 'warning', confirmButtonText: '确认回滚', cancelButtonText: '取消' },
    );
  } catch {
    return; // 用户取消
  }
  rollingBack.value = version.id;
  try {
    await rollbackPage(props.siteId, props.pageId, version.id);
    ElMessage.success(`已回滚到 v${version.versionNo}`);
    emit('rolled-back');
    emit('update:visible', false);
  } catch (e) {
    ElMessage.error((e as Error).message || '回滚失败');
  } finally {
    rollingBack.value = null;
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) loadVersions();
  },
);
</script>

<template>
  <ElDrawer
    :model-value="visible"
    title="版本历史"
    direction="rtl"
    size="400px"
    @update:model-value="emit('update:visible', $event)"
  >
    <ElTable v-loading="loading" :data="versions" stripe>
      <ElTableColumn label="版本" width="70" prop="versionNo" />
      <ElTableColumn label="操作" prop="summary" width="100" />
      <ElTableColumn label="时间" width="160">
        <template #default="{ row }">
          {{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <ElButton
            type="warning"
            size="small"
            :loading="rollingBack === row.id"
            @click="handleRollback(row)"
          >
            回滚
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElDrawer>
</template>
