<script setup lang="ts">
import { ref, computed, onMounted, watch, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ElButton,
  ElInput,
  ElFormItem,
  ElForm,
  ElMessage,
  ElCard,
  ElTag,
} from 'element-plus';
import {
  getPage,
  savePage,
  createPage,
  publishPage,
} from '@/api/page';
import type { PageSchema } from '@/types/schema';
import VersionHistoryDrawer from './VersionHistoryDrawer.vue';

const route = useRoute();
const router = useRouter();
const siteId = computed(() => route.params.siteId as string);
const pageId = computed(() => route.params.pageId as string);
const isNew = computed(() => route.name === 'PageNew' || route.meta.isNew);

const pageName = ref('');
const pagePath = ref('');
const pageStatus = ref<string>('draft');
const schema = ref<PageSchema | null>(null);
const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const designerError = ref<string | null>(null);
const DesignerComponent = shallowRef<unknown>(null);
const versionDrawerVisible = ref(false);

onMounted(() => {
  import(/* @vite-ignore */ 'luban-low-code')
    .then((m: { LubanDesigner: unknown }) => {
      DesignerComponent.value = m.LubanDesigner;
    })
    .catch(() => {
      designerError.value = '未安装 luban-low-code，无法使用页面设计器。请通过 npm 安装并配置。';
    });
});

async function loadPage() {
  if (!siteId.value || (isNew.value ? false : !pageId.value)) return;
  loading.value = true;
  try {
    if (isNew.value) {
      pageName.value = '';
      pagePath.value = '';
      pageStatus.value = 'draft';
      schema.value = {
        root: { id: 'root', type: 'LubanContainer', props: {}, children: [] },
      };
    } else {
      const { data } = await getPage(siteId.value, pageId.value);
      pageName.value = data.name;
      pagePath.value = data.path;
      pageStatus.value = data.status ?? 'draft';
      schema.value = data.schema ?? {
        root: { id: 'root', type: 'LubanContainer', props: {}, children: [] },
      };
    }
  } catch {
    schema.value = { root: { id: 'root', type: 'LubanContainer', props: {}, children: [] } };
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!schema.value || !siteId.value) return;
  if (!pageName.value || !pagePath.value) {
    ElMessage.warning('请填写页面名称和路径');
    return;
  }
  saving.value = true;
  try {
    if (isNew.value) {
      const { data } = await createPage(siteId.value, {
        name: pageName.value,
        path: pagePath.value,
        schema: schema.value,
      });
      ElMessage.success('创建成功');
      router.replace(`/sites/${siteId.value}/pages/${data.id}`);
    } else {
      await savePage(siteId.value, pageId.value, {
        name: pageName.value,
        path: pagePath.value,
        schema: schema.value,
      });
      ElMessage.success('保存成功');
    }
  } catch (e) {
    ElMessage.error((e as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handlePublish() {
  if (!siteId.value || !pageId.value) return;
  publishing.value = true;
  try {
    // 先保存草稿，再发布
    if (schema.value) {
      await savePage(siteId.value, pageId.value, {
        name: pageName.value,
        path: pagePath.value,
        schema: schema.value,
      });
    }
    const { data } = await publishPage(siteId.value, pageId.value);
    pageStatus.value = data.status ?? 'published';
    ElMessage.success('发布成功');
  } catch (e) {
    ElMessage.error((e as Error).message || '发布失败');
  } finally {
    publishing.value = false;
  }
}

function handlePreview() {
  if (!siteId.value || !pageId.value) return;
  // 新窗口打开草稿预览页
  const url = router.resolve(
    `/sites/${siteId.value}/pages/${pageId.value}/preview`,
  ).href;
  window.open(url, '_blank');
}

function goBack() {
  router.push(`/sites/${siteId.value}/pages`);
}

const statusTagType = computed(() => {
  if (pageStatus.value === 'published') return 'success';
  if (pageStatus.value === 'archived') return 'danger';
  return 'info';
});

const statusTagText = computed(() => {
  if (pageStatus.value === 'published') return '已发布';
  if (pageStatus.value === 'archived') return '已下线';
  return '草稿';
});

onMounted(loadPage);
watch([siteId, pageId], loadPage);
</script>

<template>
  <div v-loading="loading" class="page-editor">
    <ElCard class="page-editor__meta" shadow="never">
      <ElForm inline>
        <ElFormItem label="页面名称">
          <ElInput v-model="pageName" placeholder="名称" style="width: 200px" />
        </ElFormItem>
        <ElFormItem label="路径">
          <ElInput v-model="pagePath" placeholder="/page-path" style="width: 200px" />
        </ElFormItem>
        <ElFormItem>
          <ElTag :type="statusTagType" size="small">{{ statusTagText }}</ElTag>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            保存草稿
          </ElButton>
          <ElButton
            v-if="!isNew"
            type="success"
            :loading="publishing"
            @click="handlePublish"
          >
            发布
          </ElButton>
          <ElButton v-if="!isNew" @click="handlePreview">预览草稿</ElButton>
          <ElButton v-if="!isNew" @click="versionDrawerVisible = true">
            版本历史
          </ElButton>
          <ElButton @click="goBack">返回列表</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard
      v-if="designerError"
      class="page-editor__designer"
      shadow="never"
    >
      <p class="page-editor__error">{{ designerError }}</p>
      <p v-if="schema" class="page-editor__hint">当前 Schema 已加载，保存时将一并提交。</p>
    </ElCard>

    <ElCard
      v-else-if="DesignerComponent && schema"
      class="page-editor__designer"
      shadow="never"
    >
      <component
        :is="DesignerComponent"
        v-model:schema="schema"
        :show-toolbar="true"
        placeholder="从左侧拖拽组件到此处"
      />
    </ElCard>

    <!-- 版本历史抽屉 -->
    <VersionHistoryDrawer
      v-if="!isNew && siteId && pageId"
      v-model:visible="versionDrawerVisible"
      :site-id="siteId"
      :page-id="pageId"
      @rolled-back="loadPage"
    />
  </div>
</template>

<style lang="scss" scoped>
.page-editor__meta {
  margin-bottom: 16px;
}

.page-editor__designer {
  min-height: 400px;
}

.page-editor__error {
  color: #f56c6c;
  margin: 0 0 8px;
}

.page-editor__hint {
  color: #909399;
  font-size: 12px;
  margin: 0;
}
</style>
