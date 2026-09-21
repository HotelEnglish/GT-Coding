import apiClient from './apiClient';
import type { ApiResponse, PaginatedResponse, CreditTransaction, TransactionType } from '../types';

export interface UsageStats {
  totalTasks: number;
  totalCharacters: number;
  totalCreditsConsumed: number;
  dailyUsage: Array<{
    date: string;
    tasks: number;
    characters: number;
    credits: number;
  }>;
}

/**
 * Get user's credit history with pagination
 */
export async function getCreditHistory(
  page: number = 1,
  limit: number = 20,
  filters?: {
    types?: TransactionType[];
    startDate?: string;
    endDate?: string;
  }
): Promise<PaginatedResponse<CreditTransaction>> {
  const params: any = { page, limit };
  
  if (filters?.types?.length) {
    params.types = filters.types.join(',');
  }
  if (filters?.startDate) {
    params.startDate = filters.startDate;
  }
  if (filters?.endDate) {
    params.endDate = filters.endDate;
  }

  const response = await apiClient.get<ApiResponse<PaginatedResponse<CreditTransaction>>>(
    '/api/user/credit-history',
    { params }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取积分历史失败');
  }
  
  return response.data.data!;
}

/**
 * Get user's coding usage statistics
 */
export async function getUsageStats(): Promise<UsageStats> {
  const response = await apiClient.get<ApiResponse<UsageStats>>('/api/user/usage-stats');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取使用统计失败');
  }
  
  return response.data.data!;
}
