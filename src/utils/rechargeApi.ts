import apiClient from './apiClient';
import type { ApiResponse, RechargePlan, RechargeOrder } from '../types';

/**
 * Get available recharge plans
 */
export async function getPlans(): Promise<RechargePlan[]> {
  const response = await apiClient.get<ApiResponse<{ plans: RechargePlan[] }>>('/api/recharge/plans');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取充值套餐失败');
  }
  
  return response.data.data!.plans;
}

/**
 * Create a new recharge order
 */
export async function createOrder(
  planId: string,
  paymentTime: string,
  transactionLast4: string
): Promise<{ orderId: string; orderNumber: string; message: string }> {
  const response = await apiClient.post<ApiResponse<{ orderId: string; orderNumber: string; message: string }>>(
    '/api/recharge/order',
    { planId, paymentTime, transactionLast4 }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '创建订单失败');
  }
  
  return response.data.data!;
}

/**
 * Get user's recharge orders
 */
export async function getOrders(): Promise<RechargeOrder[]> {
  const response = await apiClient.get<ApiResponse<{ orders: RechargeOrder[] }>>('/api/recharge/orders');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取订单列表失败');
  }
  
  return response.data.data!.orders;
}
