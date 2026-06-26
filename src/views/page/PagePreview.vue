<script setup lang="ts">
import { ref, onMounted, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElButton, ElMessage } from 'element-plus';
import { previewPageDraft } from '@/api/page';
import type { PageSchema } from '@/types/schema';

const route = useRoute();
const router = useRouter();
const siteId = route.params.siteId as string;
const pageId = route.params.pageId as string;

const schema = ref<PageSchema | null>(null);
const loading = ref(true);
const LubanPageComponent = shallowRef<unknown>(null);

onMounted(async () => {
  // 动态加载 LubanPage 渲染组件（与 Website DynamicPage 相同）
  try {
    const m = await import(/* @vite-ignore */ 'luban-low-code');
    LubanPageComponent.value = (m as { LubanPage: unknown }).LubanPage;
  } catch {
    ElMessage.warning('未安装 luban-low-code，无法渲染预览');
  }

  try {
    const { data } = await previewPageDraft(siteId, pageId);
    schema.value = data.schema ?? null;
  } catch (e) {
    ElMessage.error((e as Error).message || '加载草稿失败');
  } finally {
    loading.value = false;
  }
});

function backToEditor() {
  router.push(`/sites/${siteId}/pages/${pageId}`);
}
</script>

<template>
  <div v-loading="loading" class="page-preview">
    <div class="page-preview__bar">
      <span class="page-preview__label">🔍 草稿预览（未发布内容）</span>
      <ElButton type="primary" size="small" @click="backToEditor">返回编辑</ElButton>
    </div>
    <div class="page-preview__canvas">
      <component
        :is="LubanPageComponent"
        v-if="LubanPageComponent && schema"
        :schema="schema"
      />
      <p v-else-if="!loading" class="page-preview__empty">无内容可预览</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-preview {
  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #fdf6ec;
    border-bottom: 1px solid #f5dab1;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  &__label {
    font-size: 14px;
    color: #e6a23c;
    font-weight: 500;
  }

  &__canvas {
    min-height: calc(100vh - 48px);
  }

  &__empty {
    text-align: center;
    color: #909399;
    padding: 40px;
  }
}
</style>
