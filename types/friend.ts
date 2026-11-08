import type { ApiError } from '@/services/apiClient';

/**
 * Type bạn bè / lời mời kết bạn (FE-03) — định nghĩa duy nhất, dùng chung cho FE-07, FE-19...
 * Shape DTO của BE-03 nằm trong services/friendshipService.ts; ở đây là model đã chuẩn hóa cho UI.
 */

/** Thông tin tối thiểu để hiển thị một người (Avatar + tên). Không chứa email. */
export interface FriendUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Friend {
  user: FriendUser;
  /** ISO — thời điểm trở thành bạn */
  since: string;
}

export type FriendRequestDirection = 'incoming' | 'outgoing';

export interface FriendRequest {
  id: string;
  direction: FriendRequestDirection;
  /** Người còn lại (người gửi nếu incoming, người nhận nếu outgoing) */
  user: FriendUser;
  createdAt: string;
}

/**
 * Quan hệ giữa người đang đăng nhập và một người khác, nhìn từ phía mình.
 * `self` chỉ do FE suy ra (so với userId trong useAuthStore), BE không trả.
 */
export type Relationship = 'self' | 'none' | 'friend' | 'outgoing' | 'incoming';

export interface UserSearchResult {
  user: FriendUser;
  relationship: Exclude<Relationship, 'self'>;
  /** Có khi relationship là incoming/outgoing */
  requestId?: string;
}

/** Lỗi nghiệp vụ BE-03 đã chuẩn hóa — mỗi mã có câu thông báo `friend.errors.<code>` */
export const FRIEND_ERROR_CODES = [
  'self_request',
  'request_exists',
  'already_friends',
  'request_not_found',
  'target_locked',
  'target_not_found',
] as const;
export type FriendErrorCode = (typeof FRIEND_ERROR_CODES)[number];

export type FriendError = ApiError & { friendCode?: FriendErrorCode };

/**
 * Sự kiện thay đổi quan hệ — điểm cắm realtime. Hiện chưa có event socket nào của BE-03,
 * khi có thì handler socket chỉ cần gọi `useFriendStore.getState().applyEvent(event)`.
 */
export type FriendshipEvent =
  | { type: 'request_received'; request: FriendRequest }
  | { type: 'request_accepted'; requestId: string; friend: Friend }
  | { type: 'request_closed'; requestId: string }
  | { type: 'unfriended'; userId: string };
