<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElDrawer, ElDescriptions, ElDescriptionsItem, ElTag, ElMessage } from 'element-plus';
import { getLeadDetail, LEAD_STATUS_MAP, type Lead } from '@/api/lead';

/**
 * 线索详情抽屉（lead-capture-mvp）。
 * 展示单条线索的完整字段（contactMasked 已脱敏），不含明文联系方式。
 */
const props = defineProps<{ siteId: string; leadId: string }>();
const emit = defineEmits<{ close: [] }>();

const visible = ref(true);
const loading = ref(false);
const lead = ref<Lead | null>(null);

async function fetchDetail() {
  loading.value = true;
  try {
    const { data } = await getLeadDetail(props.siteId, props.leadId);
    lead.value = data;
  } catch (e) {
    ElMessage.error((e as Error).message || '加载详情失败');
  } finally {
    loading.value = false;
  }
}

function statusTagType(status: string): string {
  return LEAD_STATUS_MAP[status]?.type ?? 'info';
}
function statusLabel(status: string): string {
  return LEAD_STATUS_MAP[status]?.label ?? status;
}

watch(
  () => props.leadId,
  () => fetchDetail(),
  { immediate: true },
);
</script>

<template>
  <ElDrawer v-model="visible" title="线索详情" direction="rtl" size="480px" @close="emit('close')">
    <div v-loading="loading">
      <ElDescriptions v-if="lead" :column="1" border>
        <ElDescriptionsItem label="姓名">{{ lead.contactMasked?.name || '—' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="手机号">{{
          lead.contactMasked?.phone || '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="lead.contactMasked?.email" label="邮箱">
          {{ lead.contactMasked.email }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="lead.contactMasked?.source" label="来源">
          {{ lead.contactMasked.source }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="statusTagType(lead.status)" size="small">{{
            statusLabel(lead.status)
          }}</ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="来源表单">{{ lead.formName || lead.formId }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="lead.channelId" label="渠道">{{
          lead.channelId
        }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="lead.assigneeId" label="负责人">{{
          lead.assigneeId
        }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="lead.sourceIp" label="来源IP">{{
          lead.sourceIp
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="提交时间">{{ lead.createdAt }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="lead.updatedAt" label="更新时间">{{
          lead.updatedAt
        }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="lead.convertedAt" label="转化时间">{{
          lead.convertedAt
        }}</ElDescriptionsItem>
        <ElDescriptionsItem v-if="lead.utm && Object.keys(lead.utm).length" label="UTM">
          <div v-for="(v, k) in lead.utm" :key="k" class="lead-detail__utm">
            <span class="lead-detail__utm-key">{{ k }}:</span> {{ v }}
          </div>
        </ElDescriptionsItem>
      </ElDescriptions>
    </div>
  </ElDrawer>
</template>

<style scoped>
.lead-detail__utm {
  font-size: 13px;
  line-height: 1.6;
}

.lead-detail__utm-key {
  color: #909399;
}
</style>
