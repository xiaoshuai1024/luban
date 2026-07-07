<script setup lang="ts">
/**
 * 支付弹窗组件（P-001 计费/订阅闭环）。
 *
 * 选择支付渠道 → 创建订单 → 成功提示。amount==0 时显示"免费（内测期）"。
 */
import { ref, computed } from 'vue';
import { ElDialog, ElRadioGroup, ElRadioButton, ElButton, ElMessage } from 'element-plus';
import { useBillingStore } from '@/stores/billing';

const props = defineProps<{
  visible: boolean;
  planCode: string;
  planName: string;
  amount: number;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

const billingStore = useBillingStore();
const channel = ref<'WECHAT' | 'ALIPAY'>('WECHAT');
const submitting = ref(false);

/** 金额显示：amount==0 显示"免费（内测期）"，否则显示 ¥X.XX。 */
const amountDisplay = computed(() => {
  if (props.amount === 0) return '免费（内测期）';
  return `¥${(props.amount / 100).toFixed(2)}/月`;
});

async function handleConfirm() {
  submitting.value = true;
  try {
    await billingStore.upgrade(props.planCode, channel.value);
    ElMessage.success('升级成功');
    emit('update:visible', false);
    emit('success');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '支付失败，请重试';
    ElMessage.error(msg);
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  emit('update:visible', false);
}
</script>

<template>
  <ElDialog :model-value="visible" title="升级到" width="420px" @update:model-value="handleClose">
    <div class="checkout">
      <div class="checkout__plan">{{ planName }}</div>
      <div class="checkout__amount">{{ amountDisplay }}</div>

      <div class="checkout__channel">
        <p class="checkout__label">选择支付方式</p>
        <ElRadioGroup v-model="channel">
          <ElRadioButton value="WECHAT">微信支付</ElRadioButton>
          <ElRadioButton value="ALIPAY">支付宝</ElRadioButton>
        </ElRadioGroup>
      </div>
    </div>

    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleConfirm"> 确认升级 </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.checkout__plan {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.checkout__amount {
  font-size: 24px;
  color: var(--el-color-primary);
  margin-bottom: 24px;
}

.checkout__label {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
