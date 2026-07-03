<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ElTable,
  ElTableColumn,
  ElTag,
  ElButton,
  ElEmpty,
  ElMessage,
  ElMessageBox,
} from 'element-plus';
import { getForms, deleteForm, FORM_STATUS_MAP, type Form } from '@/api/form';
import FormEditor from './FormEditor.vue';

/**
 * 表单管理列表（仿 LeadList.vue）。
 * 支持新建/编辑/删除（有线索时后端 409）/查看线索。
 */
const route = useRoute();
const router = useRouter();
const siteId = route.params.siteId as string;

const list = ref<Form[]>([]);
const loading = ref(false);

// 编辑抽屉
const editorVisible = ref(false);
const editingId = ref<string | null>(null);

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await getForms(siteId);
    list.value = data ?? [];
  } catch (e) {
    list.value = [];
    ElMessage.error((e as Error).message || '加载表单失败');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  editorVisible.value = true;
}

function openEdit(row: Form) {
  editingId.value = row.id;
  editorVisible.value = true;
}

function viewLeads(row: Form) {
  router.push(`/sites/${siteId}/leads?formId=${row.id}`);
}

async function handleDelete(row: Form) {
  try {
    await ElMessageBox.confirm(`确认删除表单「${row.name}」？`, '提示', {
      type: 'warning',
    });
  } catch {
    return; // 用户取消
  }
  try {
    await deleteForm(siteId, row.id);
    ElMessage.success('表单已删除');
    fetchList();
  } catch (e: unknown) {
    const err = e as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };
    if (err.response?.status === 409) {
      ElMessage.error(err.response?.data?.message || '表单下存在线索，无法删除');
    } else {
      ElMessage.error(err.message || '删除失败');
    }
  }
}

type TagType = 'success' | 'primary' | 'warning' | 'info' | 'danger';

function statusTagType(status: string): TagType {
  return (FORM_STATUS_MAP[status]?.type ?? 'info') as TagType;
}
function statusLabel(status: string): string {
  return FORM_STATUS_MAP[status]?.label ?? status;
}

onMounted(fetchList);
</script>

<template>
  <div class="form-list">
    <h1 class="form-list__title">表单管理</h1>

    <div class="form-list__toolbar">
      <ElButton type="primary" @click="openCreate">新建表单</ElButton>
    </div>

    <ElTable v-loading="loading" :data="list" border style="width: 100%">
      <ElTableColumn label="表单名称" prop="name" min-width="140" />
      <ElTableColumn label="状态" width="90">
        <template #default="{ row }">
          <ElTag :type="statusTagType(row.status)" size="small">{{
            statusLabel(row.status)
          }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="去重策略" prop="dedupPolicy" width="110" />
      <ElTableColumn label="更新时间" min-width="160">
        <template #default="{ row }">{{ row.updatedAt || row.createdAt }}</template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <ElButton type="primary" link @click="openEdit(row)">编辑</ElButton>
          <ElButton type="success" link @click="viewLeads(row)">查看线索</ElButton>
          <ElButton type="danger" link @click="handleDelete(row)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="暂无表单" />
      </template>
    </ElTable>

    <FormEditor v-model="editorVisible" :site-id="siteId" :form-id="editingId" @saved="fetchList" />
  </div>
</template>

<style scoped>
.form-list {
  padding: 16px;
}

.form-list__title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px;
}

.form-list__toolbar {
  margin-bottom: 16px;
}
</style>
