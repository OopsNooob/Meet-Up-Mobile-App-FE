export type UserRole = 'user' | 'admin';

export const MEETUP_STATUSES = ['draft', 'inviting', 'choosing', 'selected', 'cancelled', 'finished'] as const;
export type MeetupStatus = (typeof MEETUP_STATUSES)[number];

export type MeetupMemberStatus = 'invited' | 'accepted' | 'declined' | 'left' | 'removed';

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export type RouteStrategy = 'exact' | 'batch' | 'cluster';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
