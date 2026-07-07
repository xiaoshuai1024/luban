<script setup lang="ts">
/**
 * 用量仪表复用组件（P-001 计费/订阅闭环）。
 *
 * 显示 "已用 X / Y" + ElProgress 进度条。quota=0 表示不限量（显示"不限"）。
 */
import { computed } from 'vue';
import { ElProgress } from 'element-plus';

const props = defineProps<{
  used: number;
  quota: number;
  label: string;
}>();

/** 进度百分比（quota=0 不限时显示 0%）。 */
const percentage = computed(() => {
  if (props.quota === 0) return 0;
  return Math.min(100, Math.round((props.used / props.quota) * 100));
});

/** 进度条颜色（接近上限变红）。 */
const color = computed(() => {
  if (props.quota === 0) return '#67c23a'; // 不限=绿
  if (percentage.value >= 90) return '#f56c6c';
  if (percentage.value >= 70) return '#e6a23c';
  return '#409eff';
});

/** 显示文案。 */
const displayText = computed(() => {
  if (props.quota === 0) return `${props.label}：${props.used} / 不限`;
  return `${props.label}：${props.used} / ${props.quota}`;
});
</script>

<template>
  <div class="usage-meter">
    <div class="usage-meter__label">{{ displayText }}</div>
    <ElProgress :percentage="percentage" :color="color" :stroke-width="14" :show-text="false" />
  </div>
</template>

<style scoped>
.usage-meter {
  padding: 12px 0;
}

.usage-meter__label {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
