import type { TFunction } from 'i18next';
import { PREFERENCE_LEVEL_CYCLE } from '@/constants/activityTags';
import { PREFERENCE_LEVELS } from '@/types/domain';
import type {
  ActivityTag,
  MeetupMemberPreference,
  PreferenceLevel,
  PreferenceSelection,
  ProfilePreference,
} from '@/types/preference';

/**
 * FE-09 gọi khi điền sẵn form sở thích meetup từ hồ sơ.
 * Hàm thuần: không đọc store, không gọi API, không sửa input — luôn trả mảng MỚI.
 * Kết quả mang `source: 'profile_fallback'`; khi thành viên xác nhận/sửa trong meetup thì FE-09 đổi thành 'meetup_input'.
 */
export function buildMeetupPreferenceFromProfile(
  profilePrefs: readonly ProfilePreference[] | null | undefined,
): MeetupMemberPreference[] {
  const byTag = new Map<string, PreferenceLevel>();
  for (const pref of profilePrefs ?? []) {
    if ((PREFERENCE_LEVELS as readonly string[]).includes(pref.level)) byTag.set(pref.tagCode, pref.level);
  }
  return [...byTag].map(([tagCode, level]) => ({ tagCode, level, source: 'profile_fallback' }));
}

export function nextPreferenceLevel(level: PreferenceLevel | null): PreferenceLevel | null {
  const index = PREFERENCE_LEVEL_CYCLE.indexOf(level);
  return PREFERENCE_LEVEL_CYCLE[(index + 1) % PREFERENCE_LEVEL_CYCLE.length];
}

export function toSelection(prefs: readonly { tagCode: string; level: PreferenceLevel }[]): PreferenceSelection {
  return Object.fromEntries(prefs.map((p) => [p.tagCode, p.level]));
}

export function fromSelection(selection: PreferenceSelection): ProfilePreference[] {
  return Object.entries(selection).map(([tagCode, level]) => ({ tagCode, level }));
}

export function isSameSelection(a: PreferenceSelection, b: PreferenceSelection): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

export function tagLabel(t: TFunction, tag: ActivityTag): string {
  return t(`tags.${tag.code}`, { defaultValue: tag.displayName ?? tag.code });
}
