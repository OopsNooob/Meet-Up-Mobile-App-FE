import { Platform } from 'react-native';
import { apiClient } from '@/services/apiClient';
import { toUser, type UserDto } from '@/services/authService';
import type { User } from '@/types/auth';
import type { PreferenceLevel } from '@/types/domain';
import type { ActivityTag, ProfilePreference } from '@/types/preference';

/**
 * Service hồ sơ + sở thích mặc định (FE-02). Mọi chỗ phụ thuộc contract backend nằm trong file này.
 *
 * TODO BE-02: contract dưới đây là GIẢ ĐỊNH (chưa có Swagger) — đang chạy bằng services/mock/mockProfileServer.ts.
 *
 * PATCH /users/me             { displayName }                     → 200 UserDto
 * POST  /users/me/avatar      multipart/form-data, field "file"   → 200 UserDto (avatarUrl mới)
 * GET   /users/me/preferences                                     → 200 PreferencesDto
 * PUT   /users/me/preferences { tags: PreferenceTagDto[] }        → 200 PreferencesDto (thay toàn bộ)
 * GET   /activity-tags                                            → 200 ActivityTagDto[] (chỉ tag đang bật)
 *
 * Chỉ ghi `user_preferences` — KHÔNG đụng tới preference của meetup (FE-09).
 */

export const PROFILE_PATHS = {
  me: '/users/me',
  avatar: '/users/me/avatar',
  preferences: '/users/me/preferences',
  activityTags: '/activity-tags',
} as const;

export type PreferenceTagDto = { tagCode: string; level: PreferenceLevel };
export type PreferencesDto = { tags: PreferenceTagDto[]; updatedAt: string | null };
export type ActivityTagDto = { id: number; code: string; displayName: string; isActive: boolean };

export type AvatarFile = { uri: string; mimeType: string; fileName: string };

/** Upload ảnh lâu hơn request thường */
const UPLOAD_TIMEOUT_MS = 30_000;

export const profileService = {
  async updateProfile(input: { displayName: string }): Promise<User> {
    const res = await apiClient.patch<UserDto>(PROFILE_PATHS.me, { displayName: input.displayName.trim() });
    return toUser(res.data);
  },

  // TODO BE-02: nếu backend chọn presigned URL thì chỉ cần sửa hàm này (xin URL → PUT file → báo backend)
  async uploadAvatar(file: AvatarFile): Promise<User> {
    const form = new FormData();
    if (Platform.OS === 'web') {
      // Trình duyệt cần Blob thật; file.uri là blob:/data: URL cục bộ, không phải gọi API
      const blob = await (await fetch(file.uri)).blob();
      form.append('file', blob, file.fileName);
    } else {
      // React Native nhận object { uri, name, type } làm file trong FormData
      form.append('file', { uri: file.uri, name: file.fileName, type: file.mimeType } as unknown as Blob);
    }
    const res = await apiClient.post<UserDto>(PROFILE_PATHS.avatar, form, {
      // Bắt buộc ghi rõ: mặc định apiClient là JSON → axios sẽ đổi FormData thành JSON.
      // Trình duyệt/RN tự thay bằng multipart kèm boundary (axios resolveConfig).
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
    });
    return toUser(res.data);
  },

  async getPreferences(): Promise<ProfilePreference[]> {
    const res = await apiClient.get<PreferencesDto>(PROFILE_PATHS.preferences);
    return res.data.tags.map(({ tagCode, level }) => ({ tagCode, level }));
  },

  async updatePreferences(prefs: readonly ProfilePreference[]): Promise<ProfilePreference[]> {
    const tags: PreferenceTagDto[] = prefs.map(({ tagCode, level }) => ({ tagCode, level }));
    const res = await apiClient.put<PreferencesDto>(PROFILE_PATHS.preferences, { tags });
    return res.data.tags.map(({ tagCode, level }) => ({ tagCode, level }));
  },

  async getActivityTags(): Promise<ActivityTag[]> {
    const res = await apiClient.get<ActivityTagDto[]>(PROFILE_PATHS.activityTags);
    return res.data.filter((tag) => tag.isActive).map(({ code, displayName }) => ({ code, displayName }));
  },
};
