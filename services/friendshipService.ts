import { apiClient, toApiError, type ApiError } from '@/services/apiClient';
import type {
  Friend,
  FriendError,
  FriendErrorCode,
  FriendRequest,
  FriendRequestDirection,
  FriendUser,
  UserSearchResult,
} from '@/types/friend';

/**
 * Service bạn bè (FE-03 ↔ BE-03). Mọi chỗ phụ thuộc contract backend nằm trong file này.
 *
 * TODO(BE-03): contract dưới đây là GIẢ ĐỊNH (chưa có Swagger) — đang chạy bằng services/mock/mockFriendServer.ts.
 * Cần Backend xác nhận: path, shape DTO, mã lỗi, phân trang, và hành vi khi hai người gửi cho nhau cùng lúc.
 *
 * GET    /friends/search?q=&limit=        → 200 UserSearchResultDto[] (không gồm chính mình, không gồm tài khoản bị khóa)
 * GET    /friends                         → 200 FriendDto[]
 * GET    /friends/requests?direction=     → 200 FriendRequestDto[] (chỉ lời mời pending; direction = incoming|outgoing)
 * POST   /friends/requests { targetUserId } → 201 { status: 'pending', request } | 200 { status: 'accepted', friend }
 *        (đối phương đã gửi cho mình trước → BE chấp nhận luôn lời mời đó thay vì tạo lời mời trùng)
 *        | 400 SELF_FRIEND_REQUEST | 404 USER_NOT_FOUND | 409 FRIEND_REQUEST_EXISTS | 409 ALREADY_FRIENDS
 *        | 403 TARGET_ACCOUNT_LOCKED (KHÔNG dùng ACCOUNT_LOCKED — mã đó làm apiClient đăng xuất chính mình)
 * POST   /friends/requests/:id/accept     → 200 FriendDto | 404 FRIEND_REQUEST_NOT_FOUND (đã bị hủy/xử lý)
 * POST   /friends/requests/:id/reject     → 204 | 404 FRIEND_REQUEST_NOT_FOUND
 * DELETE /friends/requests/:id            → 204 | 404 FRIEND_REQUEST_NOT_FOUND (hủy lời mời mình đã gửi)
 * DELETE /friends/:userId                 → 204 | 404 (đã không còn là bạn)
 * Lỗi: { statusCode, code, message }
 *
 * TODO(BE-03): sau khi bị từ chối, FE đang coi quan hệ là `none` (được gửi lại). Schema ghi "không mở lại
 * lời mời đã rejected" → BE cần chốt: tạo bản ghi mới, hay trả lỗi (khi đó thêm mã vào FRIEND_SERVER_CODES).
 */

export const FRIEND_PATHS = {
  search: '/friends/search',
  friends: '/friends',
  friend: (userId: string) => `/friends/${encodeURIComponent(userId)}`,
  requests: '/friends/requests',
  request: (requestId: string) => `/friends/requests/${encodeURIComponent(requestId)}`,
  accept: (requestId: string) => `/friends/requests/${encodeURIComponent(requestId)}/accept`,
  reject: (requestId: string) => `/friends/requests/${encodeURIComponent(requestId)}/reject`,
} as const;

export type FriendUserDto = { id: string; displayName: string; avatarUrl: string | null };
export type FriendDto = { friendshipId: string; user: FriendUserDto; since: string };
export type FriendRequestDto = { id: string; user: FriendUserDto; createdAt: string };
export type UserSearchResultDto = {
  user: FriendUserDto;
  relationship: 'none' | 'friend' | 'outgoing' | 'incoming';
  requestId?: string | null;
};
export type SendRequestResultDto =
  | { status: 'pending'; request: FriendRequestDto }
  | { status: 'accepted'; friend: FriendDto };

export type SendRequestResult = { status: 'pending'; request: FriendRequest } | { status: 'accepted'; friend: Friend };

const SEARCH_LIMIT = 20;

/** TODO(BE-03): đối chiếu mã lỗi thật */
const FRIEND_SERVER_CODES: Record<string, FriendErrorCode> = {
  SELF_FRIEND_REQUEST: 'self_request',
  FRIEND_REQUEST_EXISTS: 'request_exists',
  ALREADY_FRIENDS: 'already_friends',
  FRIEND_REQUEST_NOT_FOUND: 'request_not_found',
  TARGET_ACCOUNT_LOCKED: 'target_locked',
  USER_NOT_FOUND: 'target_not_found',
};

export function toFriendError(err: unknown, fallbackFor404?: FriendErrorCode): FriendError {
  const raw = err as FriendError | undefined;
  // Lỗi 4xx nghiệp vụ có code 'unknown' → toApiError trả object mới, không giữ serverCode/status đã chuẩn hóa ở interceptor
  const normalized = toApiError(err);
  const error: ApiError = {
    ...normalized,
    status: normalized.status ?? raw?.status,
    serverCode: normalized.serverCode ?? raw?.serverCode,
  };
  const friendCode =
    raw?.friendCode ??
    (error.serverCode ? FRIEND_SERVER_CODES[error.serverCode] : undefined) ??
    (error.status === 404 ? fallbackFor404 : undefined);
  return friendCode ? { ...error, friendCode } : error;
}

const toFriendUser = (dto: FriendUserDto): FriendUser => ({
  id: dto.id,
  name: dto.displayName,
  avatarUrl: dto.avatarUrl ?? undefined,
});

const toFriend = (dto: FriendDto): Friend => ({ user: toFriendUser(dto.user), since: dto.since });

const toRequest = (dto: FriendRequestDto, direction: FriendRequestDirection): FriendRequest => ({
  id: dto.id,
  direction,
  user: toFriendUser(dto.user),
  createdAt: dto.createdAt,
});

async function call<T>(request: () => Promise<T>, fallbackFor404?: FriendErrorCode): Promise<T> {
  try {
    return await request();
  } catch (err) {
    throw toFriendError(err, fallbackFor404);
  }
}

export const friendshipService = {
  search(query: string): Promise<UserSearchResult[]> {
    return call(async () => {
      const res = await apiClient.get<UserSearchResultDto[]>(FRIEND_PATHS.search, {
        params: { q: query, limit: SEARCH_LIMIT },
      });
      return res.data.map((dto) => ({
        user: toFriendUser(dto.user),
        relationship: dto.relationship,
        requestId: dto.requestId ?? undefined,
      }));
    });
  },

  listFriends(): Promise<Friend[]> {
    return call(async () => (await apiClient.get<FriendDto[]>(FRIEND_PATHS.friends)).data.map(toFriend));
  },

  listRequests(direction: FriendRequestDirection): Promise<FriendRequest[]> {
    return call(async () => {
      const res = await apiClient.get<FriendRequestDto[]>(FRIEND_PATHS.requests, { params: { direction } });
      return res.data.map((dto) => toRequest(dto, direction));
    });
  },

  sendRequest(targetUserId: string): Promise<SendRequestResult> {
    return call(async () => {
      const { data } = await apiClient.post<SendRequestResultDto>(FRIEND_PATHS.requests, { targetUserId });
      return data.status === 'accepted'
        ? { status: 'accepted', friend: toFriend(data.friend) }
        : { status: 'pending', request: toRequest(data.request, 'outgoing') };
    }, 'target_not_found');
  },

  acceptRequest(requestId: string): Promise<Friend> {
    return call(async () => toFriend((await apiClient.post<FriendDto>(FRIEND_PATHS.accept(requestId))).data), 'request_not_found');
  },

  rejectRequest(requestId: string): Promise<void> {
    return call(async () => {
      await apiClient.post(FRIEND_PATHS.reject(requestId));
    }, 'request_not_found');
  },

  cancelRequest(requestId: string): Promise<void> {
    return call(async () => {
      await apiClient.delete(FRIEND_PATHS.request(requestId));
    }, 'request_not_found');
  },

  unfriend(userId: string): Promise<void> {
    return call(async () => {
      await apiClient.delete(FRIEND_PATHS.friend(userId));
    });
  },
};
