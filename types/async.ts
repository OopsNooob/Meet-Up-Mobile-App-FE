/**
 * Pattern trạng thái dữ liệu dùng chung cho mọi màn hình.
 * Một màn hình luôn ở đúng 1 trong 4 trạng thái: loading / empty / error / success.
 * Render bằng `<AsyncView state={...}>` (components/common/AsyncView.tsx).
 *
 * Nguyên tắc: không giả vờ realtime — nếu dữ liệu cũ hoặc thiếu thì phải nói rõ lý do
 * (error.code, isStale, updatedAt).
 */

/** Lý do dữ liệu không có / không tải được. Mỗi code có thông điệp riêng trong i18n `errors.<code>`. */
export const APP_ERROR_CODES = [
  'offline', // thiết bị mất mạng
  'network', // gọi server thất bại
  'timeout',
  'unauthorized', // hết phiên đăng nhập
  'forbidden', // không có quyền (vd. không phải thành viên meetup)
  'not_found',
  'server',
  'gps_denied', // người dùng từ chối quyền vị trí
  'gps_off', // tắt dịch vụ vị trí
  'unknown',
] as const;
export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export type AppError = {
  code: AppErrorCode;
  /** Thông điệp cụ thể (đã dịch) — nếu bỏ trống sẽ dùng thông điệp mặc định theo code. */
  message?: string;
};

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: AppError }
  | {
      status: 'success';
      data: T;
      /** ISO time dữ liệu được cập nhật lần cuối — hiển thị cho người dùng nếu có. */
      updatedAt?: string;
      /** true nếu dữ liệu đã cũ (vd. vị trí > 5 phút, đang offline dùng cache). */
      isStale?: boolean;
    };

export const asyncLoading = (): AsyncState<never> => ({ status: 'loading' });

export const asyncError = (code: AppErrorCode, message?: string): AsyncState<never> => ({
  status: 'error',
  error: { code, message },
});

/** Tạo state success, tự chuyển sang `empty` nếu data là mảng rỗng / null. */
export function asyncFromData<T>(
  data: T | null | undefined,
  meta?: { updatedAt?: string; isStale?: boolean },
): AsyncState<T> {
  if (data == null || (Array.isArray(data) && data.length === 0)) return { status: 'empty' };
  return { status: 'success', data, ...meta };
}

function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && (APP_ERROR_CODES as readonly string[]).includes(value);
}

/** Chuẩn hóa mọi lỗi (throw từ service/axios/...) về AppError. */
export function toAppError(err: unknown): AppError {
  if (err && typeof err === 'object') {
    const e = err as { code?: unknown; message?: unknown; response?: { status?: number } };
    if (isAppErrorCode(e.code)) {
      return { code: e.code, message: typeof e.message === 'string' ? e.message : undefined };
    }
    const status = e.response?.status;
    if (status === 401) return { code: 'unauthorized' };
    if (status === 403) return { code: 'forbidden' };
    if (status === 404) return { code: 'not_found' };
    if (status && status >= 500) return { code: 'server' };
    if (e.code === 'ECONNABORTED') return { code: 'timeout' };
    if (e.code === 'ERR_NETWORK') return { code: 'network' };
  }
  return { code: 'unknown' };
}
