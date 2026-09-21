import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse, RechargeOrder, OrderStatus, User } from '../types';

export interface AdminLoginResponse {
  admin: {
    id: string;
    email: string;
  };
}

export interface UserListItem {
  id: string;
  email: string;
  registeredAt: string;
  creditBalance: number;
  status: 'active' | 'disabled';
  totalCodingTasks: number;
}

export interface AdminStatistics {
  totalUsers: number;
  totalTasks: number;
  totalCreditsConsumed: number;
  totalRevenue: number;
  dailyStats: {
    users: any[];
    tasks: any[];
    revenue: any[];
  };
}

/**
 * Admin login
 */
export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const response = await apiClient.post<ApiResponse<AdminLoginResponse>>('/api/admin/login', {
    email,
    password,
  });
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '登录失败');
  }
  
  return response.data.data!;
}

/**
 * Admin logout
 */
export async function adminLogout(): Promise<void> {
  await apiClient.post('/api/admin/logout');
}

/**
 * Get all orders with search/filter
 */
export async function getOrders(params?: {
  status?: OrderStatus;
  userEmail?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<RechargeOrder>> {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<RechargeOrder>>>(
    '/api/admin/orders',
    { params }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取订单列表失败');
  }
  
  return response.data.data!;
}

/**
 * Approve a recharge order
 */
export async function approveOrder(orderId: string): Promise<void> {
  const response = await apiClient.post<ApiResponse<void>>(
    `/api/admin/orders/${orderId}/approve`
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '审批失败');
  }
}

/**
 * Reject a recharge order
 */
export async function rejectOrder(orderId: string, reason: string): Promise<void> {
  const response = await apiClient.post<ApiResponse<void>>(
    `/api/admin/orders/${orderId}/reject`,
    { reason }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '拒绝失败');
  }
}

/**
 * Get all users with search
 */
export async function getUsers(params?: {
  email?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<UserListItem>> {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<UserListItem>>>(
    '/api/admin/users',
    { params }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取用户列表失败');
  }
  
  return response.data.data!;
}

/**
 * Toggle user account status (enable/disable)
 */
export async function toggleUserStatus(userId: string, enable: boolean): Promise<void> {
  const response = await apiClient.post<ApiResponse<void>>(
    `/api/admin/users/${userId}/toggle-status`,
    { enable }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '操作失败');
  }
}

/**
 * Add credits to user account
 */
export async function addCredits(userId: string, amount: number, reason: string): Promise<{ newBalance: number }> {
  const response = await apiClient.post<ApiResponse<{ newBalance: number }>>(
    `/api/admin/users/${userId}/add-credits`,
    { amount, reason }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '操作失败');
  }
  
  return response.data.data!;
}

/**
 * Get system statistics
 */
export async function getStatistics(): Promise<AdminStatistics> {
  const response = await apiClient.get<ApiResponse<AdminStatistics>>('/api/admin/statistics');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取统计数据失败');
  }
  
  return response.data.data!;
}
