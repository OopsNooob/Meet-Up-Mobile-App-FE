import type { PreferenceLevel } from './domain';

export type { PreferenceLevel } from './domain';

/** Tag hoạt động/bối cảnh (bảng `activity_tags`). `displayName` chỉ có khi lấy từ backend. */
export type ActivityTag = {
  code: string;
  displayName?: string;
};

/**
 * FE-02 — sở thích dài hạn trong hồ sơ (`user_preference_tags`).
 * CHỈ dùng để điền sẵn form meetup, không bao giờ ghi vào preference của meetup đã có.
 */
export type ProfilePreference = {
  tagCode: string;
  level: PreferenceLevel;
};

export type MeetupPreferenceSource = 'meetup_input' | 'profile_fallback';

/**
 * FE-09 — sở thích tạm thời của một thành viên cho MỘT meetup (`meetup_participant_preferences`).
 * Đây là nguồn chính khi xếp hạng địa điểm (BR-21).
 */
export type MeetupMemberPreference = {
  tagCode: string;
  level: PreferenceLevel;
  source: MeetupPreferenceSource;
};

/** Trạng thái chọn trong UI: tagCode → mức. Tag không có key = chưa chọn. */
export type PreferenceSelection = Readonly<Record<string, PreferenceLevel>>;
