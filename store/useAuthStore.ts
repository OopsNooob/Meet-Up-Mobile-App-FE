import { create } from 'zustand';
import { isTransientError, registerAuthHandlers, toApiError } from '@/services/apiClient';
import { authService, type AuthSession, type RegisterInput } from '@/services/authService';
import { signInWithGoogle } from '@/services/googleAuth';
import { tokenStorage } from '@/services/tokenStorage';
import type { LogoutReason, User } from '@/types/auth';

export type { LogoutReason, User } from '@/types/auth';

/**
 * Phiên đăng nhập (FE-01) — nguồn duy nhất cho user/token của toàn app.
 *
 * Cho Frontend 2:
 *   - Trong component: `const { user, isAuthenticated } = useAuth();`
 *   - Ngoài React (socket, service): `getAccessToken()`
 *   - Gọi API: dùng `apiClient` (services/apiClient.ts) — tự gắn token + tự refresh
 *   - Phiên kết thúc (đăng xuất/hết hạn/bị khóa): `onLogout((reason) => ...)`
 */

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** Đã đọc xong phiên đã lưu lúc mở app (splash che tới khi true) */
  isHydrated: boolean;
  /** Lý do phiên trước kết thúc ngoài ý muốn → màn Đăng nhập hiện thông báo tương ứng */
  lastLogoutReason: Exclude<LogoutReason, 'user'> | null;
  lockedReason: string | null;

  hydrate: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  /** 'cancelled' khi người dùng đóng hộp thoại Google — không phải lỗi */
  loginWithGoogle: () => Promise<'success' | 'cancelled'>;
  /** Không bao giờ ném lỗi: API logout lỗi/mất mạng thì vẫn xóa phiên cục bộ */
  logout: (reason?: LogoutReason, lockedReason?: string) => Promise<void>;
  /** FE-02: cập nhật hồ sơ sau khi sửa profile */
  setUser: (user: User) => void;
  clearLogoutReason: () => void;
}

// ─── Sự kiện kết thúc phiên ───────────────────────────────────────────────

type LogoutListener = (reason: LogoutReason) => void;
const logoutListeners = new Set<LogoutListener>();

/** Đăng ký callback khi phiên kết thúc (vd. FE-06 ngắt socket). Trả về hàm hủy đăng ký. */
export function onLogout(listener: LogoutListener): () => void {
  logoutListeners.add(listener);
  return () => {
    logoutListeners.delete(listener);
  };
}

// ─── Store ─────────────────────────────────────────────────────────────────

/** Splash không chờ quá lâu khi mạng chập chờn lúc mở app */
const HYDRATE_TIMEOUT_MS = 8_000;

/** Nhiều request cùng hết phiên → chỉ một lần đăng xuất, listener chỉ chạy một lần */
let endingSession: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => {
  const startSession = async (session: AuthSession) => {
    await tokenStorage.saveTokens(session);
    await tokenStorage.saveUser(session.user);
    set({ user: session.user, accessToken: session.accessToken, lastLogoutReason: null, lockedReason: null });
  };

  return {
    user: null,
    accessToken: null,
    isHydrated: false,
    lastLogoutReason: null,
    lockedReason: null,

    hydrate: async () => {
      try {
        const stored = await tokenStorage.load();
        if (!stored.refreshToken) return;

        // Có token → xác minh với server; access token hết hạn thì interceptor tự refresh
        set({ accessToken: stored.accessToken });
        try {
          const user = await authService.getMe({ timeout: HYDRATE_TIMEOUT_MS });
          await tokenStorage.saveUser(user);
          set({ user });
        } catch (err) {
          const error = toApiError(err);
          if (isTransientError(error)) {
            // Mất mạng/server lỗi: vẫn vào app bằng hồ sơ đã lưu, không bắt đăng nhập lại
            if (stored.user) set({ user: stored.user });
          } else if (get().accessToken) {
            await get().logout(error.code === 'account_locked' ? 'locked' : 'expired', error.lockedReason);
          }
        }
      } finally {
        set({ isHydrated: true });
      }
    },

    loginWithEmail: async (email, password) => {
      await startSession(await authService.login(email, password));
    },

    register: async (input) => {
      await startSession(await authService.register(input));
    },

    loginWithGoogle: async () => {
      const result = await signInWithGoogle();
      if (result.type === 'cancelled') return 'cancelled';
      await startSession(await authService.loginWithGoogle(result.idToken));
      return 'success';
    },

    logout: (reason = 'user', lockedReason) => {
      if (!get().user && !get().accessToken) return Promise.resolve();

      endingSession ??= (async () => {
        if (reason === 'user') {
          const refreshToken = await tokenStorage.getRefreshToken();
          if (refreshToken) await authService.logout(refreshToken).catch(() => undefined);
        }

        await tokenStorage.clear();
        // user = null → Stack.Protected trong app/_layout.tsx bỏ toàn bộ (app) khỏi lịch sử, chuyển về (auth)
        set({
          user: null,
          accessToken: null,
          lastLogoutReason: reason === 'user' ? null : reason,
          lockedReason: lockedReason ?? null,
        });

        logoutListeners.forEach((listener) => {
          try {
            listener(reason);
          } catch {
            // listener lỗi không được chặn việc đăng xuất
          }
        });
      })().finally(() => {
        endingSession = null;
      });
      return endingSession;
    },

    setUser: (user) => {
      set({ user });
      void tokenStorage.saveUser(user);
    },

    clearLogoutReason: () => set({ lastLogoutReason: null, lockedReason: null }),
  };
});

registerAuthHandlers({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshAccessToken: async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) throw { code: 'unauthorized', status: 401 };
    const tokens = await authService.refresh(refreshToken);
    await tokenStorage.saveTokens(tokens);
    useAuthStore.setState({ accessToken: tokens.accessToken });
    return tokens.accessToken;
  },
  onSessionInvalid: (reason) => {
    void useAuthStore.getState().logout(reason);
  },
});

// ─── API công khai ──────────────────────────────────────────────────────────

export const selectIsLoggedIn = (s: AuthState) => s.user !== null;
export const selectIsAuthenticated = selectIsLoggedIn;
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'admin';

/** Access token hiện tại (dùng ngoài React). Có thể đã hết hạn — gọi API qua apiClient để được tự refresh. */
export const getAccessToken = () => useAuthStore.getState().accessToken;

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  return { user, isAuthenticated: user !== null, getAccessToken, logout };
}