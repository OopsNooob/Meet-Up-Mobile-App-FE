import type { ApiError } from '@/services/apiClient';
import type { MeetupMemberStatus, MeetupStatus } from '@/types/domain';
import type { FriendUser } from '@/types/friend';

export type { MeetupMemberStatus, MeetupStatus };

export interface Meetup {
  id: string;
  organizerId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  invitationDeadlineAt: string;
  voteDeadlineAt: string | null;
  searchRadiusM: number;
  placeType: string;
  status: MeetupStatus;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  finishedAt: string | null;
}

export interface MeetupMember {
  participantId: string;
  userId: string;
  invitedById: string;
  status: MeetupMemberStatus;
  respondedAt: string | null;
}

export interface MeetupDetail extends Meetup {
  members: MeetupMember[];
}

export interface MeetupMemberView {
  member: MeetupMember;
  user: FriendUser;
  isMe: boolean;
  isOrganizer: boolean;
}

export type InvitationResponse = 'accept' | 'reject';

export type InvitationBlockReason = 'cancelled' | 'selected' | 'finished' | 'expired' | 'not_open';

export interface MeetupFormValues {
  title: string;
  scheduledAt: Date;
  placeType: string | null;
  searchRadiusM: number;
  inviteeIds: string[];
}

export const MEETUP_ERROR_CODES = [
  'meetup_not_found',
  'not_organizer',
  'not_editable',
  'invalid_schedule',
  'invitee_not_friend',
  'not_member',
  'invitation_closed',
] as const;
export type MeetupErrorCode = (typeof MEETUP_ERROR_CODES)[number];

export type MeetupError = ApiError & {
  meetupCode?: MeetupErrorCode;
  partial?: boolean;
};
