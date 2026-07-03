<script setup lang="ts">
/**
 * TemplatePicker.vue — V2-T3 模板选择器（新建页时弹层）。
 *
 * ElDialog + 缩略图网格；按 category 分组展示；点击模板卡片 emit('select', template)。
 * 含「空白页」选项（从零开始）。
 *
 * 数据源：优先从市场 API（/api/public/templates）拉取 published/featured 模板；
 * API 不可达时回退到本地 TEMPLATES 种子（离线兜底，template-marketplace plan）。
 *
 * FeatureGate：VITE_FEATURE_TEMPLATES 关闭时 PageList 不触发本弹层。
 */
import {
  ElDialog,
  ElEmpty,
} from 'element-plus'
import { computed, ref, watch } from 'vue'
import { TEMPLATES, type PageTemplate } from '@/config/templates'
import { getPublicTemplates, getPublicTemplateSchema } from '@/api/template'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'select', template: PageTemplate): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

/** 市场模板（API 拉取，弹层打开时加载一次）。 */
const marketplaceTemplates = ref<PageTemplate[]>([])
const loading = ref(false)
/** 是否使用市场数据（true=API 成功，false=回退本地 TEMPLATES）。 */
const useMarketplace = ref(false)

/** 当前展示的模板源（市场优先，本地兜底）。 */
const source = computed<PageTemplate[]>(() =>
  useMarketplace.value ? marketplaceTemplates.value : TEMPLATES,
)

/** 按 category 分组（基于当前 source）。 */
const grouped = computed(() => {
  const groups: Record<string, PageTemplate[]> = {}
  for (const tpl of source.value) {
    const cat = tpl.category || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(tpl)
  }
  return Object.entries(groups).map(([category, templates]) => ({ category, templates }))
})

/** 弹层打开时从市场加载（失败静默回退本地）。 */
async function loadMarketplace() {
  if (useMarketplace.value || loading.value) return
  loading.value = true
  try {
    const metas = await getPublicTemplates()
    if (metas && metas.length > 0) {
      // 转 PageTemplate（schema 延迟加载，选中时才取）
      marketplaceTemplates.value = metas.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        description: m.description ?? '',
        thumbnail: m.thumbnail ?? '📄',
        // schema 占位，选中时按需拉取（见 pick）
        schema: { root: { id: 'root', type: 'LubanContainer', props: {}, children: [] } },
      }))
      useMarketplace.value = true
    }
  } catch {
    // API 不可达，静默回退本地 TEMPLATES（离线兜底）
    useMarketplace.value = false
  } finally {
    loading.value = false
  }
}

watch(visible, (open) => {
  if (open) loadMarketplace()
})

async function pick(tpl: PageTemplate): Promise<void> {
  // 市场模板：选中时按需拉取真实 schema（避免列表加载全部 schema 体积）
  if (useMarketplace.value) {
    const schema = await getPublicTemplateSchema(tpl.id)
    if (schema) {
      emit('select', { ...tpl, schema })
      emit('update:modelValue', false)
      return
    }
    // schema 拉取失败，仍用占位（让 PageEditor 自行处理空 schema）
  }
  emit('select', tpl)
  emit('update:modelValue', false)
}

function close(): void {
  emit('update:modelValue', false)
}
</script>

<template>
  <ElDialog
    v-model="visible"
    title="选择模板"
    width="80%"
    :close-on-click-modal="true"
    @close="close"
  >
    <div class="template-picker">
      <p class="template-picker__hint">
        选择一个模板快速开始，或从空白页自由搭建。
        共 {{ source.length }} 个模板{{ useMarketplace ? '（市场）' : '（本地）' }}
      </p>
      <div v-for="group in grouped" :key="group.category" class="template-picker__group">
        <div class="template-picker__group-title">{{ group.category }}</div>
        <div class="template-picker__grid">
          <button
            v-for="tpl in group.templates"
            :key="tpl.id"
            class="template-picker__card"
            @click="pick(tpl)"
          >
            <div class="template-picker__thumb">{{ tpl.thumbnail }}</div>
            <div class="template-picker__name">{{ tpl.name }}</div>
            <div class="template-picker__desc">{{ tpl.description }}</div>
          </button>
        </div>
      </div>
      <ElEmpty v-if="source.length === 0 && !loading" description="暂无模板" />
    </div>
  </ElDialog>
</template>

<style lang="scss" scoped>
.template-picker {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;

  &__hint {
    font-size: 13px;
    color: #909399;
    margin: 0 0 16px;
  }

  &__group {
    margin-bottom: 24px;
  }

  &__group-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #ebeef5;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  &__card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 16px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    font-family: inherit;

    &:hover {
      border-color: #409eff;
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
      transform: translateY(-2px);
    }
  }

  &__thumb {
    font-size: 36px;
    line-height: 1;
    margin-bottom: 4px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  &__desc {
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }
}
</style>
