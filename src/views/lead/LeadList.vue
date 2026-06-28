<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  ElTable,
  ElTableColumn,
  ElTag,
  ElInput,
  ElButton,
  ElPagination,
  ElEmpty,
  ElMessage,
} from 'element-plus';
import { getLeads, LEAD_STATUS_MAP, type Lead } from '@/api/lead';
import LeadDetail from './LeadDetail.vue';

/**
 * 线索中心（lead-capture-mvp T-eng 缺口补全）。
 * 展示当前站点的留资线索列表（脱敏），点击「详情」查看完整字段。
 */
const route = useRoute();
const siteId = route.params.siteId as string;
/** 支持 FormList「查看线索」跳转带的 formId 过滤 */
const formIdFilter = (route.query.formId as string) || '';

const list = ref<Lead[]>([]);
const total = ref(0);
const page = ref(1);
const size = ref(10);
const loading = ref(false);
const keyword = ref('');

// 详情抽屉
const detailVisible = ref(false);
const detailLeadId = ref<string | null>(null);

async function fetchList() {
  loading.value = true;
  try {
    const { data } = await getLeads(siteId, {
      page: page.value,
      size: size.value,
      keyword: keyword.value,
      formId: formIdFilter || undefined,
    });
    list.value = data.list ?? [];
    total.value = data.total ?? 0;
  } catch (e) {
    list.value = [];
    total.value = 0;
    ElMessage.error((e as Error).message || '加载线索失败');
  } finally {
    loading.value = false;
  }
}

function openDetail(row: Lead) {
  detailLeadId.value = row.id;
  detailVisible.value = true;
}

function statusTagType(status: string): string {
  return LEAD_STATUS_MAP[status]?.type ?? 'info';
}
function statusLabel(status: string): string {
  return LEAD_STATUS_MAP[status]?.label ?? status;
}

/** 联系人姓名（contactMasked.name 或 fallback） */
function contactName(row: Lead): string {
  return row.contactMasked?.name || row.contactMasked?.Name || '—';
}
/** 脱敏手机号 */
function contactPhone(row: Lead): string {
  return row.contactMasked?.phone || row.contactMasked?.Phone || '—';
}

onMounted(fetchList);
</script>

<template>
  <div class="lead-list">
    <h1 class="lead-list__title">线索中心</h1>

    <div class="lead-list__toolbar">
      <ElInput
        v-model="keyword"
        placeholder="搜索姓名/手机号"
        clearable
        style="width: 240px"
        @keyup.enter="fetchList"
        @clear="fetchList"
      />
      <ElButton type="primary" @click="fetchList">搜索</ElButton>
    </div>

    <ElTable v-loading="loading" :data="list" border style="width: 100%">
      <ElTableColumn label="姓名" min-width="100">
        <template #default="{ row }">{{ contactName(row) }}</template>
      </ElTableColumn>
      <ElTableColumn label="手机号" min-width="140">
        <template #default="{ row }">{{ contactPhone(row) }}</template>
      </ElTableColumn>
      <ElTableColumn label="来源表单" prop="formName" min-width="120">
        <template #default="{ row }">{{ row.formName || row.formId }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="100">
        <template #default="{ row }">
          <ElTag :type="statusTagType(row.status)" size="small">{{
            statusLabel(row.status)
          }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="提交时间" prop="createdAt" min-width="170">
        <template #default="{ row }">{{ row.createdAt }}</template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <ElButton type="primary" link @click="openDetail(row)">详情</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="暂无线索" />
      </template>
    </ElTable>

    <ElPagination
      v-if="total > 0"
      v-model:current-page="page"
      class="lead-list__pager"
      :page-size="size"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="fetchList"
    />

    <!-- 详情抽屉 -->
    <LeadDetail
      v-if="detailVisible && detailLeadId"
      :site-id="siteId"
      :lead-id="detailLeadId"
      @close="detailVisible = false"
    />
  </div>
</template>

<style scoped>
.lead-list {
  padding: 16px;
}

.lead-list__title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px;
}

.lead-list__toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.lead-list__pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
