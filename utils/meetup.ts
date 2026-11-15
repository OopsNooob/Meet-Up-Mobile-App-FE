import type { TFunction } from 'i18next';
import { toMeetupError } from '@/services/meetupService';
import type { User } from '@/types/auth';
import type { Friend, FriendUser } from '@/types/friend';

export function getMeetupErrorMessage(t: TFunction, err: unknown): string {
  const error = toMeetupError(err);
  const base = error.meetupCode ? t(`meetup.errors.${error.meetupCode}`) : t(`errors.${error.code}.description`);
  return error.partial ? `${t('meetup.errors.partial_saved')} ${base}` : base;
}

export function resolveMemberUser(
  userId: string,
  me: Pick<User, 'id' | 'name' | 'avatarUrl'> | null,
  friendsById: ReadonlyMap<string, Friend>,
  unknownLabel: string,
): FriendUser & { isKnown: boolean } {
  if (me && me.id === userId) return { id: userId, name: me.name, avatarUrl: me.avatarUrl, isKnown: true };
  const friend = friendsById.get(userId);
  if (friend) return { ...friend.user, isKnown: true };
  return { id: userId, name: unknownLabel, isKnown: false };
}

export function formatMeetupDateTime(iso: string | Date, locale: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${formatMeetupDate(d, locale)} · ${formatMeetupTime(d, locale)}`;
}

export const formatMeetupDate = (d: Date, locale: string) =>
  d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatMeetupTime = (d: Date, locale: string) =>
  d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });

export function formatRadius(meters: number, locale: string): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
}
