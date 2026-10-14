/**
 * Enum nghiệp vụ dùng chung — đồng bộ với docs/06_database_schema.dbml.
 * Không khai báo lại các union này ở nơi khác.
 */

export type UserRole = 'user' | 'admin';

export const MEETUP_STATUSES = ['draft', 'inviting', 'choosing', 'selected', 'cancelled', 'finished'] as const;
export type MeetupStatus = (typeof MEETUP_STATUSES)[number];

export type MeetupMemberStatus = 'invited' | 'accepted' | 'declined' | 'left' | 'removed';

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

/** Nhãn quy mô kết quả gợi ý địa điểm (FE-10). */
export type RouteStrategy = 'exact' | 'batch' | 'cluster';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
