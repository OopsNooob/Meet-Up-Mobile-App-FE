import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types/auth';

/**
 * Lưu phiên đăng nhập bằng expo-secure-store (Keystore/Keychain).
 * Token KHÔNG bao giờ được ghi vào AsyncStorage/localStorage hay log.
 *
 * Web không có SecureStore → chỉ giữ trong bộ nhớ: reload trang là mất phiên (chấp nhận được, app nhắm Android).
 */

const KEYS = {
  accessToken: 'meetup.auth.access_token',
  refreshToken: 'meetup.auth.refresh_token',
  user: 'meetup.auth.user',
} as const;

const isSecureStoreSupported = Platform.OS !== 'web';
const memoryStore = new Map<string, string>();

async function getItem(key: string): Promise<string | null> {
  if (!isSecureStoreSupported) return memoryStore.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (!isSecureStoreSupported) {
    memoryStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (!isSecureStoreSupported) {
    memoryStore.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export type StoredSession = {
  accessToken: string | null;
  refreshToken: string | null;
  /** Hồ sơ lần cuối lấy được — dùng khi mở app lúc mất mạng */
  user: User | null;
};

function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const tokenStorage = {
  async load(): Promise<StoredSession> {
    try {
      const [accessToken, refreshToken, user] = await Promise.all([
        getItem(KEYS.accessToken),
        getItem(KEYS.refreshToken),
        getItem(KEYS.user),
      ]);
      return { accessToken, refreshToken, user: parseUser(user) };
    } catch {
      // Keystore không giải mã được (vd. restore backup sang máy khác) → coi như chưa đăng nhập
      await tokenStorage.clear();
      return { accessToken: null, refreshToken: null, user: null };
    }
  },

  getRefreshToken(): Promise<string | null> {
    return getItem(KEYS.refreshToken).catch(() => null);
  },

  async saveTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    await Promise.all([setItem(KEYS.accessToken, tokens.accessToken), setItem(KEYS.refreshToken, tokens.refreshToken)]);
  },

  async saveUser(user: User): Promise<void> {
    await setItem(KEYS.user, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    await Promise.all(Object.values(KEYS).map((key) => deleteItem(key).catch(() => undefined)));
  },
};