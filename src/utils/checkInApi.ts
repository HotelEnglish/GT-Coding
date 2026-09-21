import apiClient from './apiClient';
import type { ApiResponse, CheckInStatus } from '../types';

export interface CheckInResult {
  creditsAwarded: number;
  bonusAwarded: number;
  consecutiveDays: number;
  message: string;
}

/**
 * Perform daily check-in
 */
export async function checkIn(): Promise<CheckInResult> {
  const response = await apiClient.post<ApiResponse<CheckInResult>>('/api/checkin');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '签到失败');
  }
  
  return response.data.data!;
}

/**
 * Get check-in status and monthly history
 */
export async function getCheckInStatus(): Promise<CheckInStatus> {
  const response = await apiClient.get<ApiResponse<CheckInStatus>>('/api/checkin/status');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取签到状态失败');
  }
  
  return response.data.data!;
}
