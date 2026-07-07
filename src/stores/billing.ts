import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Plan, MySubscription, Usage } from '@/api/billing';
import { getPlans, getMySubscription, getUsage, createPaymentOrder } from '@/api/billing';

/**
 * 计费 Pinia Store（P-001 计费/订阅闭环）。
 *
 * 管理套餐列表、当前订阅、用量数据。提供 isFeatureUnlocked 基于 plan gates 判断功能可用性。
 */
export const useBillingStore = defineStore('billing', () => {
  const plans = ref<Plan[]>([]);
  const mySubscription = ref<MySubscription | null>(null);
  const usage = ref<Usage | null>(null);
  const loading = ref(false);

  /** 当前套餐的 feature gates 列表。 */
  const currentGates = computed<string[]>(() => {
    const code = mySubscription.value?.planCode;
    if (!code) return ['lead_capture'];
    const plan = plans.value.find((p) => p.planCode === code);
    return plan?.gates ?? ['lead_capture'];
  });

  /** 判断某功能是否在当前套餐 gates 中。 */
  function isFeatureUnlocked(gateKey: string): boolean {
    return currentGates.value.includes(gateKey);
  }

  async function fetchPlans() {
    const { data } = await getPlans();
    plans.value = data;
  }

  async function fetchMySubscription() {
    const { data } = await getMySubscription();
    mySubscription.value = data;
  }

  async function fetchUsage(period?: string) {
    const { data } = await getUsage(period);
    usage.value = data;
  }

  /** 加载计费页全部数据（套餐+订阅+用量）。 */
  async function fetchAll() {
    loading.value = true;
    try {
      await Promise.all([fetchPlans(), fetchMySubscription(), fetchUsage()]);
    } finally {
      loading.value = false;
    }
  }

  /** 创建支付订单（升级套餐）。amount==0 时后端直通 PAID。 */
  async function upgrade(planCode: string, channel: 'WECHAT' | 'ALIPAY') {
    await createPaymentOrder(planCode, channel).then(({ data }) => data);
    // 支付成功后刷新订阅状态
    await fetchMySubscription();
    await fetchUsage();
  }

  return {
    plans,
    mySubscription,
    usage,
    loading,
    currentGates,
    isFeatureUnlocked,
    fetchPlans,
    fetchMySubscription,
    fetchUsage,
    fetchAll,
    upgrade,
  };
});
