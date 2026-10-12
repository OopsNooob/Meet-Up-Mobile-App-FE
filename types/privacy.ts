/**
 * Types cho Bounded Context Location & Privacy
 * Đồng bộ chính xác với Backend 1 (S2) - docs/11_location_privacy_api.md
 */

export const SHARING_MODES = ['off', 'friends', 'selected_friends', 'meetup_only'] as const;
export type SharingMode = (typeof SHARING_MODES)[number];

export type LocationPrecision = 'precise' | 'approximate';

export interface PrivacySettings {
  sharingMode: SharingMode;
  sharingExpiresAt: string | null; // ISO 8601 with timezone hoặc null (vô thời hạn)
  isLocationSharingEnabled: boolean; // Hiệu lực thực tế tại thời điểm đọc
  useApproximateLocation: boolean; // Làm tròn 2 số thập phân, sai số >= 1000m
  nearbyFeatureEnabled: boolean; // Cờ độc lập cho tính năng phát hiện bạn ở gần
  selectedFriendIds: string[]; // 1..100 UUID bạn bè được chia sẻ khi ở mode selected_friends
  updatedAt: string | null;
}

export interface SavePrivacySettingsPayload {
  sharingMode: SharingMode;
  sharingExpiresAt: string | null;
  useApproximateLocation: boolean;
  nearbyFeatureEnabled: boolean;
  selectedFriendIds: string[];
}

export interface SelectedFriend {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

export interface LocationPermissionCheckResult {
  allowed: boolean;
  precision: LocationPrecision | null;
  expiresAt: string | null;
}
