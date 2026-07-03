<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import {
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElSwitch,
  ElButton,
  ElMessage,
} from 'element-plus';
import {
  createForm,
  updateForm,
  getForm,
  DEDUP_POLICY_OPTIONS,
  type FormSavePayload,
} from '@/api/form';
import { getPages, type PageMeta } from '@/api/page';

/**
 * 表单编辑抽屉。
 * props.formId 为空 → 新建；非空 → 编辑。
 */
const props = defineProps<{
  siteId: string;
  formId?: string | null;
  modelValue: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [val: boolean];
  saved: [];
}>();

const visible = ref(props.modelValue);
watch(
  () => props.modelValue,
  (v) => {
    visible.value = v;
    if (v) loadForm();
  },
);
watch(visible, (v) => emit('update:modelValue', v));

const saving = ref(false);
const loading = ref(false);
const pages = ref<PageMeta[]>([]);

const form = ref<FormSavePayload>({
  siteId: props.siteId,
  pageId: '',
  name: '',
  fieldSchema: {},
  submitConfig: {},
  dedupKeys: ['phone'],
  dedupWindow: 86400,
  dedupPolicy: 'reject',
  antiSpam: { captchaRequired: false },
  status: 'active',
});

/** dedupKeys 编辑用逗号分隔字符串 */
const dedupKeysText = ref('phone');
/** fieldSchema 编辑用 JSON 文本 */
const fieldSchemaText = ref('{}');

async function loadPages() {
  try {
    const { data } = await getPages(props.siteId);
    pages.value = data ?? [];
  } catch {
    pages.value = [];
  }
}

async function loadForm() {
  await loadPages();
  if (!props.formId) {
    // 新建：重置默认值
    form.value = {
      siteId: props.siteId,
      pageId: '',
      name: '',
      fieldSchema: {},
      submitConfig: {},
      dedupKeys: ['phone'],
      dedupWindow: 86400,
      dedupPolicy: 'reject',
      antiSpam: { captchaRequired: false },
      status: 'active',
    };
    dedupKeysText.value = 'phone';
    fieldSchemaText.value = '{}';
    return;
  }
  loading.value = true;
  try {
    const { data } = await getForm(props.siteId, props.formId);
    form.value = {
      siteId: data.siteId,
      pageId: data.pageId,
      name: data.name,
      fieldSchema: data.fieldSchema ?? {},
      submitConfig: data.submitConfig ?? {},
      dedupKeys: data.dedupKeys ?? ['phone'],
      dedupWindow: data.dedupWindow,
      dedupPolicy: data.dedupPolicy,
      antiSpam: data.antiSpam ?? { captchaRequired: false },
      status: data.status,
    };
    dedupKeysText.value = (data.dedupKeys ?? ['phone']).join(',');
    fieldSchemaText.value = JSON.stringify(data.fieldSchema ?? {}, null, 2);
  } catch (e) {
    ElMessage.error((e as Error).message || '加载表单失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!form.value.name?.trim()) {
    ElMessage.warning('请输入表单名称');
    return;
  }
  if (!form.value.pageId) {
    ElMessage.warning('请选择关联页面');
    return;
  }
  // 解析 fieldSchema JSON
  try {
    form.value.fieldSchema = JSON.parse(fieldSchemaText.value || '{}');
  } catch {
    ElMessage.warning('字段 schema 不是合法 JSON');
    return;
  }
  // 解析 dedupKeys
  form.value.dedupKeys = dedupKeysText.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  saving.value = true;
  try {
    if (props.formId) {
      await updateForm(props.siteId, props.formId, form.value);
      ElMessage.success('表单已更新');
    } else {
      await createForm(form.value as FormSavePayload);
      ElMessage.success('表单已创建');
    }
    emit('saved');
    visible.value = false;
  } catch (e) {
    ElMessage.error((e as Error).message || '保存表单失败');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  if (visible.value) loadForm();
});
</script>

<template>
  <ElDrawer
    v-model="visible"
    :title="formId ? '编辑表单' : '新建表单'"
    direction="rtl"
    size="520px"
  >
    <ElForm v-loading="loading" :model="form" label-width="100px">
      <ElFormItem label="表单名称" required>
        <ElInput v-model="form.name" placeholder="如：官网咨询表单" />
      </ElFormItem>
      <ElFormItem label="关联页面" required>
        <ElSelect v-model="form.pageId" placeholder="选择页面" style="width: 100%">
          <ElOption v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="去重策略">
        <ElSelect v-model="form.dedupPolicy" style="width: 100%">
          <ElOption
            v-for="opt in DEDUP_POLICY_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="去重键">
        <ElInput v-model="dedupKeysText" placeholder="逗号分隔，如 phone,email" />
      </ElFormItem>
      <ElFormItem label="去重窗口(秒)">
        <ElInputNumber v-model="form.dedupWindow" :min="0" :step="3600" />
      </ElFormItem>
      <ElFormItem label="人机验证">
        <ElSwitch v-model="form.antiSpam!.captchaRequired" />
        <span style="margin-left: 8px; color: #909399; font-size: 12px">开启后提交需验证码</span>
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSelect v-model="form.status" style="width: 100%">
          <ElOption label="启用" value="active" />
          <ElOption label="禁用" value="disabled" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="字段 schema">
        <ElInput
          v-model="fieldSchemaText"
          type="textarea"
          :rows="6"
          placeholder='{"fields":[{"name":"phone","type":"tel","required":true}]}'
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
    </template>
  </ElDrawer>
</template>
