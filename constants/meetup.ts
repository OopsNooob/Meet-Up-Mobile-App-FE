import type { InvitationBlockReason, Meetup, MeetupDetail, MeetupMember, MeetupStatus } from '@/types/meetup';

export const DEFAULT_MEETUP_PLACE_TYPES = [
  'cafe',
  'restaurant',
  'bar',
  'movie_theater',
  'shopping_mall',
  'park',
  'bowling_alley',
] as const;

export const MEETUP_RADIUS_OPTIONS_M = [500, 1000, 2000, 3000, 5000, 10000] as const;
export const DEFAULT_MEETUP_RADIUS_M = 2000;

export const MEETUP_TITLE_MAX_LENGTH = 150;

export const MEETUP_MIN_LEAD_MINUTES = 10;

const MINUTE_MS = 60_000;

export function computeInvitationDeadline(scheduledAt: Date, now: Date = new Date()): Date {
  const preferred = new Date(scheduledAt.getTime() - 30 * MINUTE_MS);
  if (preferred.getTime() > now.getTime() + MINUTE_MS) return preferred;
  return new Date(scheduledAt.getTime() - 5 * MINUTE_MS);
}

export const earliestScheduleTime = (now: Date = new Date()) => new Date(now.getTime() + MEETUP_MIN_LEAD_MINUTES * MINUTE_MS);

export function defaultScheduleTime(now: Date = new Date()): Date {
  const d = new Date(now.getTime() + 60 * MINUTE_MS);
  d.setMinutes(0, 0, 0);
  if (d.getTime() < now.getTime() + 60 * MINUTE_MS) d.setHours(d.getHours() + 1);
  return d;
}

export const EDITABLE_MEETUP_STATUSES: readonly MeetupStatus[] = ['draft', 'inviting', 'choosing'];
export const CANCELLABLE_MEETUP_STATUSES: readonly MeetupStatus[] = ['draft', 'inviting', 'choosing', 'selected'];

export const isMeetupOrganizer = (meetup: Pick<Meetup, 'organizerId'>, userId: string | null | undefined) =>
  !!userId && meetup.organizerId === userId;

export const canEditMeetup = (meetup: Pick<Meetup, 'organizerId' | 'status'>, userId: string | null | undefined) =>
  isMeetupOrganizer(meetup, userId) && EDITABLE_MEETUP_STATUSES.includes(meetup.status);

export const canCancelMeetup = (meetup: Pick<Meetup, 'organizerId' | 'status'>, userId: string | null | undefined) =>
  isMeetupOrganizer(meetup, userId) && CANCELLABLE_MEETUP_STATUSES.includes(meetup.status);

export const isMeetupActive = (status: MeetupStatus) => status !== 'cancelled' && status !== 'finished';

export const isActiveMember = (member: Pick<MeetupMember, 'status'>) =>
  member.status === 'invited' || member.status === 'accepted';

export const RESPONDABLE_MEETUP_STATUSES: readonly MeetupStatus[] = ['inviting', 'choosing'];

export const getMyMember = (meetup: Pick<MeetupDetail, 'members'>, userId: string | null | undefined) =>
  userId ? meetup.members.find((m) => m.userId === userId) : undefined;

export const isPendingInvitation = (meetup: MeetupDetail, userId: string | null | undefined) =>
  !!userId && meetup.organizerId !== userId && getMyMember(meetup, userId)?.status === 'invited';

export function getInvitationBlockReason(
  meetup: Pick<Meetup, 'status' | 'invitationDeadlineAt'>,
  now: number = Date.now(),
): InvitationBlockReason | null {
  switch (meetup.status) {
    case 'cancelled':
      return 'cancelled';
    case 'selected':
      return 'selected';
    case 'finished':
      return 'finished';
    case 'draft':
      return 'not_open';
  }
  const deadline = new Date(meetup.invitationDeadlineAt).getTime();
  if (Number.isFinite(deadline) && deadline <= now) return 'expired';
  return RESPONDABLE_MEETUP_STATUSES.includes(meetup.status) ? null : 'not_open';
}

export const canRespondToInvitation = (meetup: MeetupDetail, userId: string | null | undefined, now?: number) =>
  isPendingInvitation(meetup, userId) && getInvitationBlockReason(meetup, now) === null;
