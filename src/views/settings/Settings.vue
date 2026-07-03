<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSwitch,
  ElButton,
  ElSelect,
  ElOption,
  ElMessage,
  ElTabs,
  ElTabPane,
} from 'element-plus';
import { getSettings, updateSettings, type SystemSettings } from '@/api/settings';

/** AI 模型配置(M7a:后台可配切 DeepSeek/GLM/通义)。 */
interface AiModelConfig {
  provider: 'deepseek' | 'glm' | 'qwen';
  model: string;
  temperature: number;
  apiKey: string;
}

/** 各 provider 的可选模型清单(联动下拉)。 */
const MODEL_OPTIONS: Record<AiModelConfig['provider'], string[]> = {
  deepseek: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
  glm: ['glm-4', 'glm-4-air', 'glm-4-flash'],
  qwen: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
};

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const form = ref<SystemSettings>({
  siteName: '',
  logo: '',
  security: { sessionTimeout: 30 },
  notification: { enabled: true },
});

/** AI 模型配置表单(独立子对象,保存时合并到 form.aiModelConfig)。 */
const aiConfig = ref<AiModelConfig>({
  provider: 'deepseek',
  model: 'deepseek-chat',
  temperature: 0.2,
  apiKey: '',
});

/** 当前 provider 的可选模型(切换 provider 时联动)。 */
const modelOptions = computed(() => MODEL_OPTIONS[aiConfig.value.provider] || []);

function onProviderChange() {
  // 切 provider 时,model 重置为该 provider 的默认第一个
  aiConfig.value.model = MODEL_OPTIONS[aiConfig.value.provider][0];
}

/** API key 脱敏展示(仅显示后4位,编辑时清空重填)。 */
const maskedApiKey = computed(() => {
  const k = aiConfig.value.apiKey;
  if (!k) return '';
  if (k.length <= 8) return k;
  return '****' + k.slice(-4);
});

async function fetchSettings() {
  loading.value = true;
  try {
    const { data } = await getSettings();
    form.value = { ...form.value, ...data };
    // 加载 AI 模型配置(若有)
    const ai = (data as SystemSettings).aiModelConfig as Partial<AiModelConfig> | undefined;
    if (ai) {
      aiConfig.value = {
        provider: (ai.provider as AiModelConfig['provider']) || 'deepseek',
        model: ai.model || 'deepseek-chat',
        temperature: ai.temperature ?? 0.2,
        apiKey: ai.apiKey || '',
      };
    }
  } catch {
    // keep defaults
  } finally {
    loading.value = false;
  }
}

async function onSubmit() {
  saving.value = true;
  try {
    // 合并 AI 配置到 form
    const payload: SystemSettings = {
      ...form.value,
      aiModelConfig: { ...aiConfig.value },
    };
    await updateSettings(payload);
    ElMessage.success('保存成功(AI 模型配置 30s 内生效)');
  } catch (e) {
    ElMessage.error((e as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
}

/** 测试当前配置(API key 脱敏校验,真实连通性由 AI 服务 /api/ai/config 端点反映)。 */
async function onTestModel() {
  testing.value = true;
  try {
    // 简单校验:provider/model/apiKey 非空即视为配置完整
    if (!aiConfig.value.apiKey) {
      ElMessage.warning('请先填写 API Key');
      return;
    }
    // 调 BFF /api/ai/config 读当前生效配置(经 AI 服务)
    const token = localStorage.getItem('luban_token') || '';
    const resp = await fetch('/api/ai/config', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) {
      ElMessage.success(
        `配置完整(provider=${aiConfig.value.provider}, model=${aiConfig.value.model})`,
      );
    } else {
      ElMessage.warning('AI 服务未就绪,但配置已填写(保存后生效)');
    }
  } finally {
    testing.value = false;
  }
}

onMounted(fetchSettings);
</script>

<template>
  <div class="settings">
    <ElTabs type="border-card">
      <ElTabPane label="基础信息">
        <ElCard shadow="never">
          <ElForm v-loading="loading" :model="form" label-width="120px">
            <ElFormItem label="系统名称">
              <ElInput v-model="form.siteName" placeholder="Luban 管理后台" />
            </ElFormItem>
            <ElFormItem label="Logo URL">
              <ElInput v-model="form.logo" placeholder="https://..." />
            </ElFormItem>
          </ElForm>
        </ElCard>
      </ElTabPane>
      <ElTabPane label="安全">
        <ElCard shadow="never">
          <ElForm v-loading="loading" :model="form" label-width="120px">
            <ElFormItem label="会话超时（分钟）">
              <ElInput
                v-model.number="form.security!.sessionTimeout"
                type="number"
                placeholder="30"
                style="width: 120px"
              />
            </ElFormItem>
          </ElForm>
        </ElCard>
      </ElTabPane>
      <ElTabPane label="通知">
        <ElCard shadow="never">
          <ElForm v-loading="loading" :model="form" label-width="120px">
            <ElFormItem label="启用通知">
              <ElSwitch v-model="form.notification!.enabled" />
            </ElFormItem>
          </ElForm>
        </ElCard>
      </ElTabPane>
      <ElTabPane label="AI 模型">
        <ElCard shadow="never">
          <ElForm v-loading="loading" :model="aiConfig" label-width="120px">
            <ElFormItem label="服务商">
              <ElSelect
                v-model="aiConfig.provider"
                placeholder="选择 LLM 服务商"
                style="width: 240px"
                @change="onProviderChange"
              >
                <ElOption label="DeepSeek(推荐)" value="deepseek" />
                <ElOption label="智谱 GLM" value="glm" />
                <ElOption label="通义千问" value="qwen" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="模型">
              <ElSelect v-model="aiConfig.model" placeholder="选择模型" style="width: 240px">
                <ElOption v-for="m in modelOptions" :key="m" :label="m" :value="m" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="Temperature">
              <ElInputNumber
                v-model="aiConfig.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                style="width: 120px"
              />
            </ElFormItem>
            <ElFormItem label="API Key">
              <ElInput
                v-model="aiConfig.apiKey"
                :placeholder="maskedApiKey ? `当前: ${maskedApiKey}` : '填入服务商 API Key'"
                type="password"
                show-password
                style="width: 360px"
              />
            </ElFormItem>
            <ElFormItem>
              <ElButton :loading="testing" @click="onTestModel">测试配置</ElButton>
              <span class="ai-config__hint">保存后 AI 服务 30s 内热切换生效</span>
            </ElFormItem>
          </ElForm>
        </ElCard>
      </ElTabPane>
    </ElTabs>
    <div class="settings__actions">
      <ElButton type="primary" :loading="saving" @click="onSubmit">保存设置</ElButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings__actions {
  margin-top: 20px;
}

.ai-config__hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
</style>
