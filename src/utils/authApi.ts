import apiClient from './apiClient';
import type { ApiResponse, User } from '../types';

export interface LoginResponse {
  user: User;
}

export interface RegisterResponse {
  user: User;
}

export interface SendVerificationResponse {
  message: string;
}

/**
 * Send verification code for registration or password reset
 */
export async function sendVerification(
  email: string,
  purpose: 'registration' | 'password_reset'
): Promise<SendVerificationResponse> {
  const response = await apiClient.post<ApiResponse<SendVerificationResponse>>(
    '/api/auth/send-verification',
    { email, purpose }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '发送验证码失败');
  }
  
  return response.data.data!;
}

/**
 * Register a new user
 */
export async function register(
  email: string,
  password: string,
  verificationCode: string
): Promise<RegisterResponse> {
  const response = await apiClient.post<ApiResponse<RegisterResponse>>(
    '/api/auth/register',
    { email, password, verificationCode }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '注册失败');
  }
  
  return response.data.data!;
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/login',
    { email, password }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '登录失败');
  }
  
  return response.data.data!;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  await apiClient.post('/api/auth/logout');
}

/**
 * Reset password with verification code
 */
export async function resetPassword(
  email: string,
  verificationCode: string,
  newPassword: string
): Promise<{ message: string }> {
  const response = await apiClient.post<ApiResponse<{ message: string }>>(
    '/api/auth/reset-password',
    { email, verificationCode, newPassword }
  );
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '密码重置失败');
  }
  
  return response.data.data!;
}

/**
 * Get current logged-in user info
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<ApiResponse<{ user: User }>>('/api/auth/me');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '获取用户信息失败');
  }
  
  return response.data.data!.user;
}
