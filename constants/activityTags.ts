import type { ActivityTag, PreferenceLevel } from '@/types/preference';

/**
 * Danh sách tag mặc định khi backend chưa trả về (hoặc lỗi). Nguồn duy nhất — không khai báo tag ở màn hình.
 * Nhãn hiển thị lấy từ i18n `tags.<code>`, thiếu key thì dùng `displayName` từ backend.
 * TODO BE-02: đồng bộ mã với bảng `activity_tags` khi có API thật.
 */
export const DEFAULT_ACTIVITY_TAGS: readonly ActivityTag[] = [
  { code: 'food' },
  { code: 'coffee' },
  { code: 'movie' },
  { code: 'mall' },
  { code: 'park' },
  { code: 'entertainment' },
];

/** Thứ tự khi bấm TagChip: chưa chọn → high → normal → avoid → chưa chọn */
export const PREFERENCE_LEVEL_CYCLE: readonly (PreferenceLevel | null)[] = [null, 'high', 'normal', 'avoid'];
