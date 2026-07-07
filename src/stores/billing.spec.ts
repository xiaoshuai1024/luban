import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { AxiosResponse } from 'axios';
import * as billingApi from '@/api/billing';
import type { Plan, MySubscription, Usage, PaymentOrder } from '@/api/billing';

// Mock the API module
vi.mock('@/api/billing');

/** 构造 AxiosResponse mock（避免 as any lint）。 */
function res<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} } as AxiosResponse<T>;
}

describe('useBillingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchPlans populates plans', async () => {
    const mockPlans: Plan[] = [
      {
        planCode: 'free',
        name: 'Free',
        priceMonthly: 0,
        quotaLeads: 100,
        quotaPages: 3,
        quotaVisits: 1000,
        gates: ['lead_capture'],
        trialDays: 0,
        sortOrder: 0,
      },
    ];
    vi.mocked(billingApi.getPlans).mockResolvedValue(res(mockPlans));

    const { useBillingStore } = await import('@/stores/billing');
    const store = useBillingStore();
    await store.fetchPlans();

    expect(store.plans).toEqual(mockPlans);
  });

  it('isFeatureUnlocked checks current plan gates', async () => {
    const { useBillingStore } = await import('@/stores/billing');
    const store = useBillingStore();

    const mockSub: MySubscription = {
      planCode: 'growth',
      planName: 'Growth',
      status: 'active',
      startedAt: null,
      expiresAt: null,
      trialEndsAt: null,
    };
    const mockPlans: Plan[] = [
      {
        planCode: 'growth',
        name: 'Growth',
        priceMonthly: 0,
        quotaLeads: 0,
        quotaPages: 0,
        quotaVisits: 0,
        gates: ['analytics', 'ab_testing'],
        trialDays: 14,
        sortOrder: 2,
      },
    ];
    vi.mocked(billingApi.getMySubscription).mockResolvedValue(res(mockSub));
    vi.mocked(billingApi.getPlans).mockResolvedValue(res(mockPlans));

    await store.fetchPlans();
    await store.fetchMySubscription();

    expect(store.isFeatureUnlocked('analytics')).toBe(true);
    expect(store.isFeatureUnlocked('nonexistent')).toBe(false);
  });

  it('upgrade calls createPaymentOrder and refreshes subscription', async () => {
    const { useBillingStore } = await import('@/stores/billing');
    const store = useBillingStore();

    const mockOrder: PaymentOrder = {
      orderId: 'o-1',
      userId: 'u-1',
      planCode: 'starter',
      amount: 0,
      currency: 'CNY',
      channel: 'WECHAT',
      status: 'PAID',
      payUrl: null,
      createdAt: '',
      paidAt: '',
    };
    const mockSub: MySubscription = {
      planCode: 'starter',
      planName: 'Starter',
      status: 'active',
      startedAt: null,
      expiresAt: null,
      trialEndsAt: null,
    };
    const mockUsage: Usage = {
      leads: 0,
      pages: 0,
      visits: 0,
      periodMonth: '2026-07',
      quotaLeads: 1000,
      quotaPages: 10,
      quotaVisits: 10000,
    };

    vi.mocked(billingApi.createPaymentOrder).mockResolvedValue(res(mockOrder));
    vi.mocked(billingApi.getMySubscription).mockResolvedValue(res(mockSub));
    vi.mocked(billingApi.getUsage).mockResolvedValue(res(mockUsage));

    await store.upgrade('starter', 'WECHAT');

    expect(billingApi.createPaymentOrder).toHaveBeenCalledWith('starter', 'WECHAT');
    expect(billingApi.getMySubscription).toHaveBeenCalled();
    expect(store.mySubscription?.planCode).toBe('starter');
  });
});
