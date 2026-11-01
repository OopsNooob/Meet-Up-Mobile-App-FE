import { create } from 'zustand';
import { DEFAULT_ACTIVITY_TAGS } from '@/constants/activityTags';
import { toApiError } from '@/services/apiClient';
import { profileService, type AvatarFile } from '@/services/profileService';
import { onLogout, useAuthStore } from '@/store/useAuthStore';
import { asyncFromData, type AsyncState } from '@/types/async';
import type { ActivityTag, ProfilePreference } from '@/types/preference';

/**
 * Sở thích mặc định trong hồ sơ (FE-02). Tên/avatar KHÔNG ở đây — nằm trong `useAuthStore.user`.
 *
 * Cho FE-09: đọc `preferences` rồi gọi `buildMeetupPreferenceFromProfile()` (utils/preferences.ts) để điền sẵn.
 * Store này không có hàm nào ghi vào preference của meetup.
 */

interface ProfileState {
  /** `empty` = chưa chọn sở thích nào */
  preferences: AsyncState<ProfilePreference[]>;
  /** Danh sách tag từ backend; lỗi/chưa có API thì dùng DEFAULT_ACTIVITY_TAGS */
  tags: readonly ActivityTag[];

  loadPreferences: () => Promise<void>;
  // Các hàm ghi dưới đây ném ApiError khi lỗi — màn hình hiện lỗi, dữ liệu đang hiển thị giữ nguyên
  savePreferences: (prefs: readonly ProfilePreference[]) => Promise<void>;
  /** Thành công → cập nhật `useAuthStore.user` để header, danh sách bạn bè... thấy ngay */
  updateDisplayName: (displayName: string) => Promise<void>;
  uploadAvatar: (file: AvatarFile) => Promise<void>;
}

const INITIAL = { preferences: { status: 'loading' } as AsyncState<ProfilePreference[]>, tags: DEFAULT_ACTIVITY_TAGS };

let loadId = 0;

export const useProfileStore = create<ProfileState>((set) => ({
  ...INITIAL,

  loadPreferences: async () => {
    const id = ++loadId;
    set({ preferences: { status: 'loading' } });
    const [prefs, tags] = await Promise.allSettled([profileService.getPreferences(), profileService.getActivityTags()]);
    if (id !== loadId) return;
    set({
      preferences:
        prefs.status === 'fulfilled'
          ? asyncFromData(prefs.value, { updatedAt: new Date().toISOString() })
          : { status: 'error', error: toApiError(prefs.reason) },
      ...(tags.status === 'fulfilled' && tags.value.length > 0 ? { tags: tags.value } : {}),
    });
  },

  savePreferences: async (prefs) => {
    const saved = await profileService.updatePreferences(prefs);
    loadId += 1;
    set({ preferences: asyncFromData(saved, { updatedAt: new Date().toISOString() }) });
  },

  updateDisplayName: async (displayName) => {
    useAuthStore.getState().setUser(await profileService.updateProfile({ displayName }));
  },

  uploadAvatar: async (file) => {
    useAuthStore.getState().setUser(await profileService.uploadAvatar(file));
  },
}));

const NO_PREFERENCES: readonly ProfilePreference[] = [];

/** Selector tiện cho FE-09: mảng sở thích hiện có (rỗng nếu chưa tải/chưa chọn) */
export const selectProfilePreferences = (s: ProfileState): readonly ProfilePreference[] =>
  s.preferences.status === 'success' ? s.preferences.data : NO_PREFERENCES;

onLogout(() => {
  loadId += 1;
  useProfileStore.setState(INITIAL);
});
