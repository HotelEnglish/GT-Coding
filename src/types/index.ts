// ==========================================
// GROUNDED THEORY TYPES
// ==========================================

export type TheoryParadigm = 'classical' | 'procedural' | 'constructivist';

export interface TheoryConfig {
  id: TheoryParadigm;
  name: string;
  nameEn: string;
  author: string;
  shortDesc: string;
  fullDesc: string;
  goals: string[];
  codingLevels: {
    level1: string; // 最高层（选择性/理论/核心）
    level2: string; // 中间层（主轴/实质/聚焦）
    level3: string; // 底层（开放/概念/初始）
  };
  promptGuidance: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ==========================================
// CODING DATA TYPES
// ==========================================

export interface OpenCode {
  label: string;
  quote: string;
  note?: string;
}

export interface AxialCode {
  label: string;
  open_codes: OpenCode[];
}

export interface SelectiveCode {
  label: string;
  axial_codes: AxialCode[];
}

export interface CodingResult {
  selective_codes: SelectiveCode[];
  core_category: string;
  memo_suggestions: string[];
  theory?: TheoryParadigm;
  timestamp?: number;
}

// ==========================================
// REFERENCE LIBRARY TYPES
// ==========================================

export interface ReferenceDoc {
  id: string;
  name: string;
  size: number;
  uploadedAt: number;
  summary?: string;         // AI 生成的摘要
  summaryStatus: 'pending' | 'processing' | 'done' | 'error';
  summaryError?: string;
  rawText: string;          // 原始文本（前 8000 字）
}

// ==========================================
// TERMINOLOGY TYPES
// ==========================================

export interface TermEntry {
  id: string;
  general: string;   // 通用词
  specific: string;  // 专业词
}

export interface TerminologyConfig {
  styleDescription: string;     // 自由描述
  terms: TermEntry[];           // 对照表
}

// ==========================================
// API CONFIG TYPES
// ==========================================

export type ApiMode = 'anthropic' | 'openai';

export interface ApiConfig {
  baseurl: string;
  model: string;
  apikey: string;
  mode: ApiMode;
}

// ==========================================
// MEMO TYPES
// ==========================================

export interface MemoItem {
  id: string;
  text: string;
  timestamp: string;
  isAI: boolean;
  theory?: TheoryParadigm;
}

// ==========================================
// APP STATE TYPES
// ==========================================

export type ActiveModule = 'workbench' | 'coding' | 'library' | 'terminology' | 'settings' | 'guide' | 'user-center' | 'admin';

export type CodingDepth = 'std' | 'deep';

// ==========================================
// USER TYPES
// ==========================================

export interface User {
  id: string;
  email: string;
  status: 'active' | 'disabled';
  registeredAt: string;
  lastLoginAt?: string;
  creditBalance: number;
  totalCodingTasks: number;
  totalCharactersProcessed: number;
}

export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
}

// ==========================================
// CREDIT TYPES
// ==========================================

export type TransactionType =
  | 'registration_bonus'
  | 'check_in'
  | 'check_in_bonus'
  | 'recharge'
  | 'coding_consumption'
  | 'admin_adjustment';

export interface CreditTransaction {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  relatedId?: string;
  createdAt: string;
}

export interface CreditBalance {
  balance: number;
}

// ==========================================
// CHECK-IN TYPES
// ==========================================

export interface CheckInRecord {
  id: string;
  checkedInAt: string;
  creditsAwarded: number;
  bonusAwarded: number;
  checkInDate: string;
}

export interface CheckInStatus {
  hasCheckedInToday: boolean;
  consecutiveDays: number;
  nextCheckInTime: string | null;
  monthlyHistory: string[];
}

// ==========================================
// RECHARGE TYPES
// ==========================================

export type OrderStatus = 'pending' | 'approved' | 'rejected';

export interface RechargePlan {
  id: 'basic' | 'standard' | 'premium';
  name: string;
  price: number;
  credits: number;
  characters: number;
  qrCodeUrl: string;
}

export interface RechargeOrder {
  id: string;
  orderNumber: string;
  planId: string;
  credits: number;
  paymentTime: string;
  transactionLast4: string;
  status: OrderStatus;
  submittedAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

// ==========================================
// NOTIFICATION TYPES
// ==========================================

export type NotificationType =
  | 'check_in_success'
  | 'check_in_milestone'
  | 'recharge_approved'
  | 'recharge_rejected'
  | 'low_balance_warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    data?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
