import { request } from './request';

/**
 * 计费 API 模块（P-001 计费/订阅闭环）。
 *
 * 封装套餐查询、当前订阅、用量、支付订单的前端调用。
 * 后端端点：/billing/*（已有）+ /payment/*（新增）。
 */

/** 套餐定义。 */
export interface Plan {
  planCode: string;
  name: string;
  priceMonthly: number;
  quotaLeads: number;
  quotaPages: number;
  quotaVisits: number;
  gates: string[];
  trialDays: number;
  sortOrder: number;
}

/** 当前订阅信息。 */
export interface MySubscription {
  planCode: string;
  planName: string;
  status: string;
  startedAt: string | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
}

/** 用量数据。 */
export interface Usage {
  leads: number;
  pages: number;
  visits: number;
  periodMonth: string;
  quotaLeads: number;
  quotaPages: number;
  quotaVisits: number;
}

/** 支付订单响应。 */
export interface PaymentOrder {
  orderId: string;
  userId: string;
  planCode: string;
  amount: number;
  currency: string;
  channel: string;
  status: string;
  payUrl: string | null;
  createdAt: string;
  paidAt: string | null;
}

/** 查询全部套餐。 */
export function getPlans() {
  return request.get<Plan[]>('/billing/plans');
}

/** 查询当前用户的订阅。 */
export function getMySubscription() {
  return request.get<MySubscription>('/billing/me');
}

/** 查询用量。 */
export function getUsage(period?: string) {
  return request.get<Usage>('/billing/usage', { params: period ? { period } : {} });
}

/** 创建支付订单（amount==0 直通 PAID）。 */
export function createPaymentOrder(planCode: string, channel: 'WECHAT' | 'ALIPAY') {
  return request.post<PaymentOrder>('/payment/orders', { planCode, channel });
}

/** 查询订单状态。 */
export function getPaymentOrder(orderId: string) {
  return request.get<PaymentOrder>(`/payment/orders/${orderId}`);
}
