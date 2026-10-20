import axios, { create, getAdapter, isAxiosError, type AxiosAdapter } from 'axios';
import { toAppError, type AppError, type AppErrorCode } from '@/types/async';
import type { LogoutReason } from '@/types/auth';

/**
 * Axios instance dùng chung cho mọi service gọi backend.
 * - Tự gắn `Authorization: Bearer <accessToken>`
 * - 401 → làm mới token (nhiều request lỗi cùng lúc chỉ gọi refresh MỘT lần) rồi thử lại request gốc đúng 1 lần
 * - Refresh thất bại / tài khoản bị khóa → báo store kết thúc phiên (về màn Đăng nhập)
 * - Lỗi luôn được chuẩn hóa thành `ApiError` (AppError + status) → dùng thẳng với ErrorState/AsyncView
 */

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/api/v1';

// TODO BE-01: đặt EXPO_PUBLIC_USE_MOCK_API=false khi backend auth sẵn sàng
export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API !== 'false';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Không gắn token, không tự refresh (login, register, refresh...) */
    skipAuth?: boolean;
    /** Có gắn token nhưng 401 thì không refresh (logout) */
    skipAuthRefresh?: boolean;
    /** Nội bộ: request đã được thử lại sau refresh */
    _retried?: boolean;
  }
}

export type ApiError = AppError & {
  status?: number;
  /** Lý do khóa do admin nhập (chỉ có khi code = account_locked) */
  lockedReason?: string;
};

/** Mã lỗi nghiệp vụ backend → AppErrorCode. TODO BE-01: đối chiếu lại với mã thật của backend. */
const SERVER_ERROR_CODES: Record<string, AppErrorCode> = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_LOCKED: 'account_locked',
  EMAIL_ALREADY_EXISTS: 'email_exists',
};

/** Lỗi tạm thời (mất mạng, server lỗi) — không được coi là hết phiên */
const TRANSIENT_ERROR_CODES = new Set<AppErrorCode>(['offline', 'network', 'timeout', 'server']);
export const isTransientError = (error: AppError) => TRANSIENT_ERROR_CODES.has(error.code);

export function toApiError(err: unknown): ApiError {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const body = err.response?.data as { code?: unknown; lockedReason?: unknown } | undefined;
    const mapped = typeof body?.code === 'string' ? SERVER_ERROR_CODES[body.code] : undefined;
    if (mapped) {
      return {
        code: mapped,
        status,
        lockedReason: typeof body?.lockedReason === 'string' ? body.lockedReason : undefined,
      };
    }
    if (!err.response) {
      return { code: err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' ? 'timeout' : 'network' };
    }
    // Không trả message thô từ server/axios (tiếng Anh, có thể lộ chi tiết) — UI dùng errors.<code>
    return { code: toAppError(err).code, status };
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const appError = toAppError(err);
    if (appError.code !== 'unknown') return { ...(err as ApiError), code: appError.code };
  }
  return { code: 'unknown' };
}

// ─── Kết nối với auth store (đăng ký từ useAuthStore để tránh import vòng) ─────────────

type AuthHandlers = {
  getAccessToken: () => string | null;
  /** Đổi refresh token lấy access token mới; ném ApiError nếu thất bại */
  refreshAccessToken: () => Promise<string>;
  onSessionInvalid: (reason: Exclude<LogoutReason, 'user'>) => void;
};

let authHandlers: AuthHandlers | null = null;

export function registerAuthHandlers(handlers: AuthHandlers) {
  authHandlers = handlers;
}

let refreshInFlight: Promise<string> | null = null;
let refreshCount = 0;

/** Single-flight: mọi request 401 cùng lúc dùng chung một lần gọi refresh */
function refreshOnce(handlers: AuthHandlers): Promise<string> {
  if (!refreshInFlight) {
    refreshCount += 1;
    refreshInFlight = handlers.refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Chỉ dùng cho màn dev/auth: đếm số lần gọi refresh để kiểm tra single-flight */
export const getRefreshCount = () => refreshCount;

// ─── Instance ─────────────────────────────────────────────────────────────

export const apiClient = create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

if (USE_MOCK_API) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMockAdapter } = require('./mock/mockAuthServer') as typeof import('./mock/mockAuthServer');
  const realAdapter: AxiosAdapter = getAdapter(axios.defaults.adapter);
  apiClient.defaults.adapter = createMockAdapter(realAdapter);
}

apiClient.interceptors.request.use((config) => {
  const token = config.skipAuth ? null : authHandlers?.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(undefined, async (err: unknown) => {
  const error = toApiError(err);
  const config = isAxiosError(err) ? err.config : undefined;
  const handlers = authHandlers;

  if (!config || !handlers || config.skipAuth) throw error;

  // Admin khóa tài khoản giữa phiên → kết thúc phiên ngay, màn Đăng nhập hiện thông báo khóa
  if (error.code === 'account_locked' && !config.skipAuthRefresh) {
    handlers.onSessionInvalid('locked');
    throw error;
  }

  if (error.status !== 401 || config.skipAuthRefresh || config._retried) throw error;
  config._retried = true;

  const sentToken = String(config.headers.Authorization ?? '').replace(/^Bearer /, '');
  const currentToken = handlers.getAccessToken();

  let token: string;
  try {
    // Request bay trước khi refresh xong (mang token cũ) → chỉ cần thử lại với token mới
    token = currentToken && currentToken !== sentToken ? currentToken : await refreshOnce(handlers);
  } catch (refreshErr) {
    const refreshError = toApiError(refreshErr);
    // Mất mạng/server lỗi khi refresh: giữ phiên, báo lỗi mạng cho request gốc
    if (isTransientError(refreshError)) throw refreshError;
    handlers.onSessionInvalid(refreshError.code === 'account_locked' ? 'locked' : 'expired');
    throw { code: 'unauthorized', status: 401 } satisfies ApiError;
  }

  config.headers.Authorization = `Bearer ${token}`;
  return apiClient(config);
});