import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { UserDto } from '@/services/authService';
import type { ActivityTagDto, PreferencesDto, PreferenceTagDto } from '@/services/profileService';
import { PREFERENCE_LEVELS } from '@/types/domain';

/**
 * Mock backend BE-02 (hồ sơ + sở thích mặc định). Được gọi từ adapter trong mockAuthServer.ts
 * để dùng chung xác thực token mock. TODO BE-02: xóa khi có API thật.
 *
 * Khác mock auth: dữ liệu được lưu vào AsyncStorage để test "mở lại app" vẫn còn tên/avatar/sở thích.
 * Chỉ chứa dữ liệu demo của tài khoản mock — không có token hay mật khẩu.
 */

const STORAGE_KEY = 'meetup.mock.profiles';
/** Upload chậm hơn để thấy rõ trạng thái "Đang tải ảnh lên" */
const UPLOAD_EXTRA_DELAY_MS = 1_200;

type StoredProfile = { displayName?: string; avatarUrl?: string | null; preferences?: PreferencesDto };

let profiles: Record<string, StoredProfile> = {};
let loading: Promise<void> | null = null;

const MOCK_ACTIVITY_TAGS: ActivityTagDto[] = [
  { id: 1, code: 'food', displayName: 'Ăn uống', isActive: true },
  { id: 2, code: 'coffee', displayName: 'Cà phê', isActive: true },
  { id: 3, code: 'movie', displayName: 'Xem phim', isActive: true },
  { id: 4, code: 'mall', displayName: 'Trung tâm thương mại', isActive: true },
  { id: 5, code: 'park', displayName: 'Công viên', isActive: true },
  { id: 6, code: 'entertainment', displayName: 'Giải trí', isActive: true },
];

// ─── Giả lập lỗi (màn dev/auth) ──────────────────────────────────────────────

export type MockProfileFailure = 'none' | 'offline' | 'server';
let failure: MockProfileFailure = 'none';

export const mockProfileDebug = {
  getFailure: () => failure,
  setFailure(next: MockProfileFailure) {
    failure = next;
  },
};

// ─── Lưu trữ ────────────────────────────────────────────────────────────────

/** Đọc dữ liệu đã lưu (một lần) rồi áp lên các user mock để /auth/me trả tên/avatar đã sửa */
export function loadMockProfiles(users: UserDto[]): Promise<void> {
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      profiles = raw ? (JSON.parse(raw) as Record<string, StoredProfile>) : {};
    })
    .catch(() => {
      profiles = {};
    })
    .then(() => users.forEach(applyStoredProfile));
  return loading;
}

function applyStoredProfile(user: UserDto) {
  const stored = profiles[user.id];
  if (stored?.displayName !== undefined) user.displayName = stored.displayName;
  if (stored?.avatarUrl !== undefined) user.avatarUrl = stored.avatarUrl;
}

async function saveProfile(userId: string, patch: StoredProfile) {
  profiles = { ...profiles, [userId]: { ...profiles[userId], ...patch } };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles)).catch(() => undefined);
}

// ─── Handler ────────────────────────────────────────────────────────────────

export const isMockProfilePath = (path: string) => path.startsWith('/users/me') || path === '/activity-tags';

type Fail = (status: number, code: string) => unknown;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * RN: FormData có getParts() trả về { fieldName, uri, type }.
 * Web: FormData chuẩn chứa Blob → đổi sang data URL (blob: URL mất khi reload trang).
 */
async function readUploadedFile(data: unknown): Promise<{ uri: string; type?: string } | null> {
  const parts = (data as { getParts?: () => { fieldName: string; uri?: string; type?: string }[] })?.getParts?.();
  if (parts) {
    const file = parts.find((part) => part.fieldName === 'file');
    return file?.uri ? { uri: file.uri, type: file.type } : null;
  }
  const blob = typeof FormData !== 'undefined' && data instanceof FormData ? data.get('file') : null;
  if (blob instanceof Blob) return { uri: await blobToDataUrl(blob), type: blob.type };
  return null;
}

function isValidPreferenceTags(tags: unknown): tags is PreferenceTagDto[] {
  return (
    Array.isArray(tags) &&
    tags.every(
      (tag) =>
        typeof tag?.tagCode === 'string' && (PREFERENCE_LEVELS as readonly string[]).includes(tag?.level as string),
    )
  );
}

export async function handleProfileRequest(
  method: string,
  path: string,
  body: Record<string, unknown>,
  user: UserDto,
  config: InternalAxiosRequestConfig,
  fail: Fail,
): Promise<{ status: number; data: unknown } | null> {
  if (failure === 'offline') throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
  if (failure === 'server') throw fail(500, 'INTERNAL_SERVER_ERROR');

  if (method === 'get' && path === '/activity-tags') {
    return { status: 200, data: MOCK_ACTIVITY_TAGS };
  }

  if (method === 'patch' && path === '/users/me') {
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (!displayName || displayName.length > 100) throw fail(400, 'VALIDATION_ERROR');
    user.displayName = displayName;
    await saveProfile(user.id, { displayName });
    return { status: 200, data: user };
  }

  if (method === 'post' && path === '/users/me/avatar') {
    await new Promise((resolve) => setTimeout(resolve, UPLOAD_EXTRA_DELAY_MS));
    const file = await readUploadedFile(config.data);
    if (!file || (file.type && !file.type.startsWith('image/'))) throw fail(400, 'INVALID_FILE');
    // Mock: dùng luôn file cục bộ đã nén làm URL avatar
    user.avatarUrl = file.uri;
    await saveProfile(user.id, { avatarUrl: file.uri });
    return { status: 200, data: user };
  }

  if (method === 'get' && path === '/users/me/preferences') {
    return { status: 200, data: profiles[user.id]?.preferences ?? ({ tags: [], updatedAt: null } satisfies PreferencesDto) };
  }

  if (method === 'put' && path === '/users/me/preferences') {
    if (!isValidPreferenceTags(body.tags)) throw fail(400, 'VALIDATION_ERROR');
    const preferences: PreferencesDto = {
      tags: body.tags.map(({ tagCode, level }) => ({ tagCode, level })),
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(user.id, { preferences });
    return { status: 200, data: preferences };
  }

  return null;
}
