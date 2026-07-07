<script setup lang="ts">
/**
 * 计费页面（P-001 计费/订阅闭环）。
 *
 * 3 个 Tab：当前订阅 / 套餐对比 / 用量。
 * 升级套餐经 CheckoutDialog（amount==0 内测期直通 PAID）。
 */
import { ref, onMounted } from 'vue';
import { ElTabs, ElTabPane, ElCard, ElRow, ElCol, ElTag, ElButton, ElMessage } from 'element-plus';
import { useBillingStore } from '@/stores/billing';
import type { Plan } from '@/api/billing';
import UsageMeter from '@/components/UsageMeter.vue';
import CheckoutDialog from './CheckoutDialog.vue';

const billingStore = useBillingStore();
const activeTab = ref('subscription');

// CheckoutDialog 状态
const checkoutVisible = ref(false);
const checkoutPlan = ref<Plan | null>(null);

function openCheckout(plan: Plan) {
  checkoutPlan.value = plan;
  checkoutVisible.value = true;
}

async function handleCheckoutSuccess() {
  await billingStore.fetchAll();
}

/** 套餐状态 Tag 类型。 */
function statusTagType(status: string): 'success' | 'warning' | 'info' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'trialing') return 'warning';
  if (status === 'expired') return 'danger';
  return 'info';
}

/** 价格显示（活动价 0 显示"免费"，否则 ¥X.XX）。 */
function priceDisplay(plan: Plan): string {
  if (plan.priceMonthly === 0) return '免费';
  return `¥${(plan.priceMonthly / 100).toFixed(2)}/月`;
}

/** 原价显示（划线，用于活动价对比）。 */
function originalPrice(plan: Plan): string | null {
  if (plan.priceMonthly === 0) return null;
  return `¥${(plan.priceMonthly / 100).toFixed(2)}/月`;
}

onMounted(async () => {
  try {
    await billingStore.fetchAll();
  } catch {
    ElMessage.error('加载失败，请重试');
  }
});
</script>

<template>
  <div v-loading="billingStore.loading" class="billing">
    <ElTabs v-model="activeTab" type="border-card">
      <!-- Tab 1: 当前订阅 -->
      <ElTabPane label="当前订阅" name="subscription">
        <ElCard shadow="never">
          <template v-if="billingStore.mySubscription">
            <div class="sub-info">
              <span class="sub-info__label">当前套餐：</span>
              <span class="sub-info__value">{{ billingStore.mySubscription.planName }}</span>
              <ElTag :type="statusTagType(billingStore.mySubscription.status)" size="small">
                {{ billingStore.mySubscription.status }}
              </ElTag>
            </div>
            <div v-if="billingStore.mySubscription.expiresAt" class="sub-info">
              <span class="sub-info__label">到期时间：</span>
              <span class="sub-info__value">{{ billingStore.mySubscription.expiresAt }}</span>
            </div>
            <div v-if="billingStore.mySubscription.trialEndsAt" class="sub-info">
              <span class="sub-info__label">试用结束：</span>
              <span class="sub-info__value">{{ billingStore.mySubscription.trialEndsAt }}</span>
            </div>
            <ElButton type="primary" @click="activeTab = 'plans'">升级套餐</ElButton>
          </template>
          <template v-else>
            <p>暂无订阅信息</p>
          </template>
        </ElCard>
      </ElTabPane>

      <!-- Tab 2: 套餐对比 -->
      <ElTabPane label="套餐对比" name="plans">
        <ElRow :gutter="20">
          <ElCol v-for="plan in billingStore.plans" :key="plan.planCode" :span="8">
            <ElCard shadow="hover" class="plan-card">
              <div class="plan-card__name">{{ plan.name }}</div>
              <div class="plan-card__price">
                <span class="plan-card__price-current">{{ priceDisplay(plan) }}</span>
                <span v-if="originalPrice(plan)" class="plan-card__price-original">{{
                  originalPrice(plan)
                }}</span>
              </div>

              <ul class="plan-card__quota">
                <li>留资：{{ plan.quotaLeads === 0 ? '不限' : plan.quotaLeads }}/月</li>
                <li>页面：{{ plan.quotaPages === 0 ? '不限' : plan.quotaPages }}</li>
                <li>访问：{{ plan.quotaVisits === 0 ? '不限' : plan.quotaVisits }}/月</li>
              </ul>

              <ul class="plan-card__gates">
                <li v-for="gate in plan.gates" :key="gate">{{ gate }}</li>
              </ul>

              <ElButton
                v-if="billingStore.mySubscription?.planCode !== plan.planCode"
                type="primary"
                plain
                @click="openCheckout(plan)"
              >
                选择此套餐
              </ElButton>
              <ElTag v-else type="success">当前套餐</ElTag>
            </ElCard>
          </ElCol>
        </ElRow>
      </ElTabPane>

      <!-- Tab 3: 用量 -->
      <ElTabPane label="用量" name="usage">
        <ElCard shadow="never">
          <template v-if="billingStore.usage">
            <UsageMeter
              label="留资"
              :used="billingStore.usage.leads"
              :quota="billingStore.usage.quotaLeads"
            />
            <UsageMeter
              label="页面"
              :used="billingStore.usage.pages"
              :quota="billingStore.usage.quotaPages"
            />
            <UsageMeter
              label="访问"
              :used="billingStore.usage.visits"
              :quota="billingStore.usage.quotaVisits"
            />
            <p class="usage-period">统计周期：{{ billingStore.usage.periodMonth }}</p>
          </template>
          <template v-else>
            <p>暂无用量数据</p>
          </template>
        </ElCard>
      </ElTabPane>
    </ElTabs>

    <!-- 支付弹窗 -->
    <CheckoutDialog
      v-if="checkoutPlan"
      v-model:visible="checkoutVisible"
      :plan-code="checkoutPlan.planCode"
      :plan-name="checkoutPlan.name"
      :amount="checkoutPlan.priceMonthly"
      @success="handleCheckoutSuccess"
    />
  </div>
</template>

<style scoped>
.billing {
  padding: 20px;
}

.sub-info {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub-info__label {
  color: var(--el-text-color-secondary);
}

.sub-info__value {
  font-weight: 500;
}

.plan-card {
  text-align: center;
  margin-bottom: 20px;
}

.plan-card__name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.plan-card__price {
  margin-bottom: 16px;
}

.plan-card__price-current {
  font-size: 28px;
  color: var(--el-color-primary);
  font-weight: 700;
}

.plan-card__price-original {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
  margin-left: 8px;
}

.plan-card__quota,
.plan-card__gates {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  text-align: left;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.plan-card__quota li,
.plan-card__gates li {
  padding: 4px 0;
}

.usage-period {
  margin-top: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
