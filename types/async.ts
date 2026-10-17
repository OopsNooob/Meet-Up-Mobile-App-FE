export const APP_ERROR_CODES = [
  'offline',
  'network',
  'timeout',
  'unauthorized',
  'forbidden',
  'not_found',
  'server',
  'gps_denied',
  'gps_off',
  'unknown',
] as const;
export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export type AppError = {
  code: AppErrorCode;
  message?: string;
};

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: AppError }
  | {
      status: 'success';
      data: T;
      updatedAt?: string;
      isStale?: boolean;
    };

export const asyncLoading = (): AsyncState<never> => ({ status: 'loading' });

export const asyncError = (code: AppErrorCode, message?: string): AsyncState<never> => ({
  status: 'error',
  error: { code, message },
});

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
