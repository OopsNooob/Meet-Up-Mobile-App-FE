import type { UserRole } from './domain';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  shareLocation: boolean;
}

/** Lý do phiên kết thúc: người dùng tự đăng xuất, refresh token hết hạn/bị thu hồi, hoặc admin khóa tài khoản (FE-18). */
export type LogoutReason = 'user' | 'expired' | 'locked';