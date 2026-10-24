import { apiClient } from '@/services/apiClient';
import type { User } from '@/types/auth';
import type { UserRole } from '@/types/domain';

/**
 * Service xác thực (BE-01). Mọi chỗ phụ thuộc contract backend nằm trong file này.
 *
 * TODO BE-01: contract dưới đây là GIẢ ĐỊNH (chưa có Swagger). Khi có API thật, đối chiếu:
 *   - path từng endpoint (AUTH_PATHS)
 *   - shape response (AuthResponseDto, UserDto → toUser)
 *   - mã lỗi nghiệp vụ (SERVER_ERROR_CODES trong services/apiClient.ts)
 *
 * POST /auth/register { email, password, displayName } → 201 AuthResponseDto | 409 EMAIL_ALREADY_EXISTS
 * POST /auth/login    { email, password }              → 200 AuthResponseDto | 401 INVALID_CREDENTIALS | 403 ACCOUNT_LOCKED
 * POST /auth/google   { idToken }                      → 200 AuthResponseDto | 403 ACCOUNT_LOCKED
 * POST /auth/refresh  { refreshToken }                 → 200 TokensDto       | 401 (hết hạn/thu hồi) | 403 ACCOUNT_LOCKED
 * POST /auth/logout   { refreshToken }                 → 204
 * GET  /auth/me                                        → 200 UserDto         | 401 | 403 ACCOUNT_LOCKED
 * Lỗi: { statusCode, code, message, lockedReason? }
 */

export const AUTH_PATHS = {
  register: '/auth/register',
  login: '/auth/login',
  google: '/auth/google',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
} as const;

export type UserDto = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  shareLocation?: boolean;
};

export type TokensDto = { accessToken: string; refreshToken: string };
export type AuthResponseDto = TokensDto & { user: UserDto };

export type AuthSession = TokensDto & { user: User };
export type RegisterInput = { email: string; password: string; displayName: string };

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    name: dto.displayName,
    avatarUrl: dto.avatarUrl ?? undefined,
    role: dto.role,
    shareLocation: dto.shareLocation ?? false,
  };
}

const toSession = (dto: AuthResponseDto): AuthSession => ({
  accessToken: dto.accessToken,
  refreshToken: dto.refreshToken,
  user: toUser(dto.user),
});

export const authService = {
  async register(input: RegisterInput): Promise<AuthSession> {
    const res = await apiClient.post<AuthResponseDto>(AUTH_PATHS.register, input, { skipAuth: true });
    return toSession(res.data);
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const res = await apiClient.post<AuthResponseDto>(AUTH_PATHS.login, { email, password }, { skipAuth: true });
    return toSession(res.data);
  },

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    const res = await apiClient.post<AuthResponseDto>(AUTH_PATHS.google, { idToken }, { skipAuth: true });
    return toSession(res.data);
  },

  async refresh(refreshToken: string): Promise<TokensDto> {
    const res = await apiClient.post<TokensDto>(AUTH_PATHS.refresh, { refreshToken }, { skipAuth: true });
    return res.data;
  },

  /** Thu hồi refresh token phía server. Timeout ngắn: đăng xuất không được treo khi mất mạng. */
  async logout(refreshToken: string): Promise<void> {
    await apiClient.post(AUTH_PATHS.logout, { refreshToken }, { skipAuthRefresh: true, timeout: 5_000 });
  },

  async getMe(options?: { timeout?: number }): Promise<User> {
    const res = await apiClient.get<UserDto>(AUTH_PATHS.me, options);
    return toUser(res.data);
  },
};