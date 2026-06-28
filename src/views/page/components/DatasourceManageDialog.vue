<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  ElDialog,
  ElTable,
  ElTableColumn,
  ElTag,
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElEmpty,
  ElMessage,
  ElMessageBox,
} from 'element-plus';
import type { AxiosError } from 'axios';
import {
  getDatasources,
  createDatasource,
  updateDatasource,
  deleteDatasource,
  testDatasource,
  type Datasource,
  type DatasourceTestResult,
  type DatasourceConfig,
} from '@/api/datasource';
import { formatDateTime } from '@/utils/datetime';

/**
 * 数据源管理弹窗（设计器内，wave15 R2 计划落地）。
 * CRUD + 测试连接 + headers 脱敏提示。仿 UserList.vue 弹窗模式。
 */
const props = defineProps<{
  modelValue: boolean;
  siteId: string;
}>();
const emit = defineEmits<{
  'update:modelValue': [val: boolean];
  change: [];
}>();

const visible = ref(props.modelValue);
watch(
  () => props.modelValue,
  (v) => {
    visible.value = v;
    if (v) fetchList();
  },
);
watch(visible, (v) => emit('update:modelValue', v));

const list = ref<Datasource[]>([]);
const loading = ref(false);
const noPermission = ref(false);

// 编辑表单
const formVisible = ref(false);
const editingId = ref<string | null>(null);
const formLoading = ref(false);
const form = ref<{
  name: string;
  type: 'static' | 'api';
  url: string;
  method: string;
}>({ name: '', type: 'api', url: '', method: 'GET' });

// 测试结果（按 id 索引）
const testingId = ref<string | null>(null);
const testResults = ref<Record<string, DatasourceTestResult>>({});

async function fetchList() {
  loading.value = true;
  noPermission.value = false;
  try {
    const { data } = await getDatasources(props.siteId);
    list.value = data ?? [];
  } catch (e) {
    list.value = [];
    const status = (e as AxiosError).response?.status;
    if (status === 403) {
      noPermission.value = true;
      ElMessage.error('无权限');
    } else {
      ElMessage.error((e as Error).message || '加载数据源失败');
    }
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = { name: '', type: 'api', url: '', method: 'GET' };
  formVisible.value = true;
}

function openEdit(row: Datasource) {
  editingId.value = row.id;
  form.value = {
    name: row.name,
    type: row.type,
    url: row.config?.url ?? '',
    method: row.config?.method ?? 'GET',
  };
  formVisible.value = true;
}

async function submitForm() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入数据源名称');
    return;
  }
  if (form.value.type === 'api' && !form.value.url.trim()) {
    ElMessage.warning('API 类型数据源须填写 URL');
    return;
  }
  const config: DatasourceConfig =
    form.value.type === 'api' ? { url: form.value.url, method: form.value.method } : {};
  formLoading.value = true;
  try {
    if (editingId.value) {
      await updateDatasource(editingId.value, {
        name: form.value.name,
        type: form.value.type,
        config,
      });
      ElMessage.success('数据源已更新');
    } else {
      await createDatasource({
        siteId: props.siteId,
        name: form.value.name,
        type: form.value.type,
        config,
      });
      ElMessage.success('数据源已创建');
    }
    formVisible.value = false;
    fetchList();
    emit('change');
  } catch (e) {
    const status = (e as AxiosError).response?.status;
    if (status === 403) ElMessage.error('无权限');
    else if (status === 409) ElMessage.error('数据源名称已存在');
    else ElMessage.error((e as Error).message || '保存失败');
  } finally {
    formLoading.value = false;
  }
}

async function handleTest(row: Datasource) {
  testingId.value = row.id;
  try {
    const { data } = await testDatasource(row.id);
    testResults.value[row.id] = data;
    if (data.ok) ElMessage.success(`连接成功（${data.latencyMs ?? 0}ms）`);
    else ElMessage.error(data.message || '连接失败');
  } catch (e) {
    testResults.value[row.id] = { ok: false, message: (e as Error).message };
    ElMessage.error('连接测试失败');
  } finally {
    testingId.value = null;
  }
}

async function handleDelete(row: Datasource) {
  try {
    await ElMessageBox.confirm(`确认删除数据源「${row.name}」？`, '提示', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await deleteDatasource(row.id);
    ElMessage.success('已删除');
    fetchList();
    emit('change');
  } catch (e) {
    const status = (e as AxiosError).response?.status;
    if (status === 403) ElMessage.error('无权限');
    else ElMessage.error((e as Error).message || '删除失败');
  }
}

type TagType = 'success' | 'info' | 'warning' | 'danger' | 'primary';
function typeTagType(t: string): TagType {
  return (t === 'api' ? 'success' : 'info') as TagType;
}
</script>

<template>
  <ElDialog v-model="visible" title="数据源管理" width="720px" append-to-body>
    <div class="ds-toolbar">
      <ElButton type="primary" :disabled="noPermission" @click="openCreate">新建数据源</ElButton>
      <ElButton @click="fetchList">刷新</ElButton>
    </div>

    <ElTable v-loading="loading" :data="list" border style="width: 100%">
      <ElTableColumn label="名称" prop="name" min-width="140" />
      <ElTableColumn label="类型" width="90">
        <template #default="{ row }">
          <ElTag :type="typeTagType(row.type)" size="small">{{ row.type }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="更新时间" min-width="160">
        <template #default="{ row }">{{ formatDateTime(row.updatedAt || row.createdAt) }}</template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <ElButton type="primary" link @click="openEdit(row)">编辑</ElButton>
          <ElButton type="success" link :loading="testingId === row.id" @click="handleTest(row)"
            >测试</ElButton
          >
          <ElButton type="danger" link @click="handleDelete(row)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="暂无数据源" />
      </template>
    </ElTable>

    <!-- 测试结果行内提示 -->
    <div v-for="r in Object.entries(testResults)" :key="r[0]" class="ds-test-result">
      <ElTag :type="r[1].ok ? 'success' : 'danger'" size="small">
        {{ r[1].ok ? '✓' : '✗' }} {{ r[1].message }}
        {{ r[1].latencyMs != null ? `(${r[1].latencyMs}ms)` : '' }}
      </ElTag>
    </div>

    <!-- 编辑/新建子弹窗 -->
    <ElDialog
      v-model="formVisible"
      :title="editingId ? '编辑数据源' : '新建数据源'"
      width="480px"
      append-to-body
    >
      <ElForm :model="form" label-width="90px">
        <ElFormItem label="名称" required>
          <ElInput v-model="form.name" placeholder="如：商品列表 API" />
        </ElFormItem>
        <ElFormItem label="类型" required>
          <ElSelect v-model="form.type" style="width: 100%">
            <ElOption label="API 接口" value="api" />
            <ElOption label="静态数据" value="static" />
          </ElSelect>
        </ElFormItem>
        <template v-if="form.type === 'api'">
          <ElFormItem label="URL" required>
            <ElInput v-model="form.url" placeholder="https://api.example.com/items" />
          </ElFormItem>
          <ElFormItem label="请求方法">
            <ElSelect v-model="form.method" style="width: 100%">
              <ElOption label="GET" value="GET" />
              <ElOption label="POST" value="POST" />
            </ElSelect>
          </ElFormItem>
          <div class="ds-hint">headers 已配置的值出于安全不在编辑时回显，重新输入以修改</div>
        </template>
      </ElForm>
      <template #footer>
        <ElButton @click="formVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="formLoading" @click="submitForm">保存</ElButton>
      </template>
    </ElDialog>
  </ElDialog>
</template>

<style scoped>
.ds-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ds-test-result {
  margin-top: 4px;
}

.ds-hint {
  margin: -8px 0 8px 90px;
  font-size: 12px;
  color: #909399;
}
</style>
