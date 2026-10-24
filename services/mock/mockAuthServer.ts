import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponseDto, TokensDto, UserDto } from '@/services/authService';

/**
 * Mock backend BE-01 chạy bằng axios adapter → interceptor refresh/retry được test y như với API thật.
 * Chỉ bật khi USE_MOCK_API. Request không thuộc /auth/* được chuyển tiếp sang adapter thật.
 *
 * Dữ liệu nằm trong bộ nhớ: tài khoản đăng ký mới mất khi reload JS (tài khoản có sẵn thì không).
 * Token mock không phải JWT thật và không chứa thông tin nhạy cảm.
 */

const MOCK_DELAY_MS = 700;
/** Access token sống 60 giây để dễ test tự refresh */
const ACCESS_TOKEN_TTL_MS = 60_000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MOCK_PASSWORD = '12345678';
export const MOCK_GOOGLE_ID_TOKEN = 'mock-google-id-token';

type MockAccount = { user: UserDto; password: string | null; lockedReason?: string };

const seedAccounts: MockAccount[] = [
  {
    user: { id: 'u1', email: 'user@meetup.dev', displayName: 'Người dùng Demo', avatarUrl: null, role: 'user', shareLocation: true },
    password: MOCK_PASSWORD,
  },
  {
    user: { id: 'admin-1', email: 'admin@meetup.dev', displayName: 'Admin', avatarUrl: null, role: 'admin', shareLocation: false },
    password: MOCK_PASSWORD,
  },
  {
    user: { id: 'u-locked', email: 'locked@meetup.dev', displayName: 'Tài khoản bị khóa', avatarUrl: null, role: 'user' },
    password: MOCK_PASSWORD,
    lockedReason: 'Vi phạm quy định cộng đồng (mock)',
  },
  {
    user: { id: 'u-google', email: 'google.user@gmail.com', displayName: 'Google User', avatarUrl: null, role: 'user' },
    password: null,
  },
];

const accounts = new Map(seedAccounts.map((a) => [a.user.email, a]));
const revokedRefreshTokens = new Set<string>();
/** Token phát hành trước các mốc này coi như hết hạn/bị thu hồi (dùng cho màn dev/auth) */
let accessNotBefore = 0;
let refreshNotBefore = 0;

/** Email đặc biệt để giả lập lỗi hạ tầng khi đăng nhập/đăng ký */
const NETWORK_ERROR_EMAIL = 'offline@meetup.dev';
const SERVER_ERROR_EMAIL = 'error500@meetup.dev';

export const MOCK_ACCOUNTS_HINT = [
  `user@meetup.dev / ${MOCK_PASSWORD}`,
  `admin@meetup.dev / ${MOCK_PASSWORD}`,
  `locked@meetup.dev → tài khoản bị khóa`,
  `${NETWORK_ERROR_EMAIL} → mất mạng · ${SERVER_ERROR_EMAIL} → lỗi server`,
].join('\n');

/** Công cụ cho màn dev/auth (chỉ có tác dụng ở chế độ mock) */
export const mockAuthDebug = {
  expireAccessTokens() {
    accessNotBefore = Date.now();
  },
  revokeRefreshTokens() {
    refreshNotBefore = Date.now();
  },
  lockAccount(email: string) {
    const account = accounts.get(email);
    if (account) account.lockedReason = 'Bị khóa từ màn Dev (mock)';
  },
};

// ─── Token mock: mock.<kind>.<userId>.<issuedAt>.<expiresAt>.<nonce> ─────────────

let nonce = 0;
function issueToken(kind: 'at' | 'rt', userId: string, ttl: number) {
  const now = Date.now();
  return `mock.${kind}.${userId}.${now}.${now + ttl}.${(nonce += 1)}`;
}

function issueTokens(userId: string): TokensDto {
  return {
    accessToken: issueToken('at', userId, ACCESS_TOKEN_TTL_MS),
    refreshToken: issueToken('rt', userId, REFRESH_TOKEN_TTL_MS),
  };
}

function readToken(token: string | undefined, kind: 'at' | 'rt'): string | null {
  const parts = token?.split('.') ?? [];
  if (parts.length !== 6 || parts[0] !== 'mock' || parts[1] !== kind) return null;
  const [, , userId, issuedAt, expiresAt] = parts;
  const notBefore = kind === 'at' ? accessNotBefore : refreshNotBefore;
  if (Number(expiresAt) <= Date.now() || Number(issuedAt) < notBefore) return null;
  return userId;
}

function findById(userId: string) {
  return [...accounts.values()].find((a) => a.user.id === userId);
}

// ─── Adapter ───────────────────────────────────────────────────────────────

class MockHttpError {
  constructor(
    readonly status: number,
    readonly body?: object,
  ) {}
}

const fail = (status: number, code: string, extra?: object) =>
  new MockHttpError(status, { statusCode: status, code, message: code, ...extra });

const lockedError = (account: MockAccount) => fail(403, 'ACCOUNT_LOCKED', { lockedReason: account.lockedReason });

function authenticate(config: InternalAxiosRequestConfig): MockAccount {
  const header = String(config.headers.Authorization ?? '');
  const userId = readToken(header.replace(/^Bearer /, ''), 'at');
  const account = userId ? findById(userId) : undefined;
  if (!account) throw fail(401, 'UNAUTHORIZED');
  if (account.lockedReason) throw lockedError(account);
  return account;
}

function checkSpecialEmail(email: string, config: InternalAxiosRequestConfig) {
  if (email === NETWORK_ERROR_EMAIL) throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
  if (email === SERVER_ERROR_EMAIL) throw fail(500, 'INTERNAL_SERVER_ERROR');
}

function handle(method: string, path: string, body: Record<string, string>, config: InternalAxiosRequestConfig) {
  const email = (body.email ?? '').trim().toLowerCase();

  if (method === 'post' && path === '/auth/login') {
    checkSpecialEmail(email, config);
    const account = accounts.get(email);
    if (!account || account.password === null || account.password !== body.password) {
      throw fail(401, 'INVALID_CREDENTIALS');
    }
    if (account.lockedReason) throw lockedError(account);
    return { status: 200, data: { ...issueTokens(account.user.id), user: account.user } satisfies AuthResponseDto };
  }

  if (method === 'post' && path === '/auth/register') {
    checkSpecialEmail(email, config);
    if (accounts.has(email)) throw fail(409, 'EMAIL_ALREADY_EXISTS');
    const user: UserDto = { id: `u-${Date.now()}`, email, displayName: body.displayName, avatarUrl: null, role: 'user' };
    accounts.set(email, { user, password: body.password });
    return { status: 201, data: { ...issueTokens(user.id), user } satisfies AuthResponseDto };
  }

  if (method === 'post' && path === '/auth/google') {
    if (body.idToken !== MOCK_GOOGLE_ID_TOKEN) throw fail(401, 'INVALID_GOOGLE_TOKEN');
    const account = accounts.get('google.user@gmail.com')!;
    if (account.lockedReason) throw lockedError(account);
    return { status: 200, data: { ...issueTokens(account.user.id), user: account.user } satisfies AuthResponseDto };
  }

  if (method === 'post' && path === '/auth/refresh') {
    const userId = revokedRefreshTokens.has(body.refreshToken) ? null : readToken(body.refreshToken, 'rt');
    const account = userId ? findById(userId) : undefined;
    if (!account) throw fail(401, 'INVALID_REFRESH_TOKEN');
    if (account.lockedReason) throw lockedError(account);
    // Rotation: refresh token cũ hết hiệu lực ngay sau khi dùng
    revokedRefreshTokens.add(body.refreshToken);
    return { status: 200, data: issueTokens(account.user.id) satisfies TokensDto };
  }

  if (method === 'post' && path === '/auth/logout') {
    if (body.refreshToken) revokedRefreshTokens.add(body.refreshToken);
    return { status: 204, data: undefined };
  }

  if (method === 'get' && path === '/auth/me') {
    return { status: 200, data: authenticate(config).user };
  }

  return null;
}

export function createMockAdapter(fallback: AxiosAdapter): AxiosAdapter {
  return async (config) => {
    const path = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '');
    if (!path.startsWith('/auth/') || path.startsWith('/auth/privacy')) return fallback(config);

    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : {};

    const toResponse = (status: number, data: unknown): AxiosResponse => ({
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
      request: {},
    });

    try {
      const result = handle((config.method ?? 'get').toLowerCase(), path, body, config);
      if (!result) throw fail(404, 'NOT_FOUND');
      return toResponse(result.status, result.data);
    } catch (err) {
      if (!(err instanceof MockHttpError)) throw err;
      throw new AxiosError(
        `Request failed with status code ${err.status}`,
        err.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        toResponse(err.status, err.body),
      );
    }
  };
}