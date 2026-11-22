import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { UserDto } from '@/services/authService';
import type {
  CreateMeetupRequest,
  InviteParticipantsRequest,
  MeetupDetailResponse,
  MeetupListResponse,
  MeetupParticipantResponse,
  MeetupStatus,
  UpdateMeetupRequest,
} from '@/types/api';

type Participant = MeetupParticipantResponse;
type Row = Omit<MeetupDetailResponse, 'participants'> & { participants: Participant[] };

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq += 1)}`;
const iso = (ms: number) => new Date(ms).toISOString();
const HOUR = 3_600_000;

function participant(meetupId: string, userId: string, invitedById: string, status: Participant['status']): Participant {
  const now = Date.now();
  return {
    id: nextId('mp'),
    userId,
    invitedById,
    status,
    respondedAt: status === 'invited' ? null : iso(now - HOUR),
    joinedAt: status === 'accepted' ? iso(now - HOUR) : null,
    leftAt: null,
  };
}

function seedMeetup(id: string, organizerId: string, title: string, status: MeetupStatus, inHours: number, others: [string, Participant['status']][]): Row {
  const now = Date.now();
  return {
    id,
    organizerId,
    title,
    description: null,
    scheduledAt: iso(now + inHours * HOUR),
    invitationDeadlineAt: iso(now + inHours * HOUR - HOUR / 2),
    voteDeadlineAt: null,
    searchRadiusM: 2000,
    placeType: 'cafe',
    status,
    createdAt: iso(now - 24 * HOUR),
    updatedAt: iso(now - HOUR),
    cancelledAt: status === 'cancelled' ? iso(now - HOUR) : null,
    finishedAt: null,
    chosenRecommendationPlaceId: null,
    chosenRunId: null,
    chosenById: null,
    chosenAt: null,
    participants: [
      participant(id, organizerId, organizerId, 'accepted'),
      ...others.map(([userId, s]) => participant(id, userId, organizerId, s)),
    ],
  };
}

let rows: Row[] = [
  seedMeetup('m-demo-1', 'u1', 'Cà phê cuối tuần', 'inviting', 48, [
    ['u-lan', 'accepted'],
    ['u-minh', 'invited'],
    ['u-hoa', 'declined'],
  ]),
  seedMeetup('m-demo-2', 'u-lan', 'Meetup của Lan', 'choosing', 72, [['u1', 'accepted']]),
  seedMeetup('m-demo-3', 'u1', 'Đi xem phim (đã hủy)', 'cancelled', 24, [['u-lan', 'invited']]),
  seedMeetup('m-inv-1', 'u-lan', 'Ăn tối thứ Sáu', 'inviting', 30, [['u1', 'invited'], ['u-minh', 'accepted']]),
  seedMeetup('m-inv-2', 'u-lan', 'Chạy bộ sáng (đã chốt)', 'selected', 50, [['u1', 'invited']]),
  seedMeetup('m-inv-3', 'u-lan', 'Bowling #race', 'choosing', 40, [['u1', 'invited']]),
];

const EDITABLE: MeetupStatus[] = ['draft', 'inviting', 'choosing'];
const CANCELLABLE: MeetupStatus[] = ['draft', 'inviting', 'choosing', 'selected'];
const RESPONDABLE: MeetupStatus[] = ['inviting', 'choosing'];

type Fail = (status: number, code: string) => unknown;

export const isMockMeetupPath = (path: string) =>
  path === '/meetups' || /^\/meetups\/[^/]+(\/cancel|\/participants(\/[^/]+)?|\/invitations(\/(accept|reject))?)?$/.test(path);

const toSummary = ({ participants: _p, ...row }: Row) => row;

export function handleMeetupRequest(
  method: string,
  path: string,
  body: Record<string, unknown>,
  me: UserDto,
  config: InternalAxiosRequestConfig,
  fail: Fail,
): { status: number; data: unknown } | null {
  const isMember = (row: Row) => row.participants.some((p) => p.userId === me.id && p.status !== 'removed');
  const touch = (row: Row) => (row.updatedAt = new Date().toISOString());

  if (path === '/meetups') {
    if (method === 'get') {
      const params = (config.params ?? {}) as { offset?: number; limit?: number };
      const mine = rows.filter((r) => r.organizerId === me.id || isMember(r));
      const offset = Number(params.offset ?? 0);
      const limit = Number(params.limit ?? 20);
      const data: MeetupListResponse = { items: mine.slice(offset, offset + limit).map(toSummary), total: mine.length, offset, limit };
      return { status: 200, data };
    }
    if (method === 'post') {
      const req = body as unknown as CreateMeetupRequest;
      if (req.title?.includes('#offline')) throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
      if (req.title?.includes('#500')) throw fail(500, 'INTERNAL_SERVER_ERROR');
      if (!req.title?.trim() || !req.placeType || !(req.searchRadiusM > 0)) throw fail(400, 'VALIDATION_ERROR');
      if (new Date(req.scheduledAt).getTime() <= Date.now()) throw fail(400, 'SCHEDULED_AT_IN_PAST');
      const id = nextId('m');
      const now = new Date().toISOString();
      const row: Row = {
        id,
        organizerId: me.id,
        title: req.title.trim(),
        description: req.description ?? null,
        scheduledAt: req.scheduledAt,
        invitationDeadlineAt: req.invitationDeadlineAt,
        voteDeadlineAt: req.voteDeadlineAt ?? null,
        searchRadiusM: req.searchRadiusM,
        placeType: req.placeType,
        status: 'inviting',
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
        finishedAt: null,
        chosenRecommendationPlaceId: null,
        chosenRunId: null,
        chosenById: null,
        chosenAt: null,
        participants: [
          participant(id, me.id, me.id, 'accepted'),
          ...[...new Set(req.inviteeIds ?? [])].filter((u) => u !== me.id).map((u) => participant(id, u, me.id, 'invited')),
        ],
      };
      rows = [...rows, row];
      return { status: 201, data: toSummary(row) };
    }
    return null;
  }

  const [, , meetupId, sub, targetUserId] = path.split('/').map(decodeURIComponent);
  const row = rows.find((r) => r.id === meetupId);
  if (!row) throw fail(404, 'MEETUP_NOT_FOUND');
  if (!isMember(row) && row.organizerId !== me.id) throw fail(403, 'NOT_MEETUP_MEMBER');

  if (!sub && method === 'get') return { status: 200, data: row satisfies MeetupDetailResponse };

  if (sub === 'invitations' && (targetUserId === 'accept' || targetUserId === 'reject') && method === 'post') {
    const mine = row.participants.find((p) => p.userId === me.id);
    if (!mine || row.organizerId === me.id) throw fail(403, 'MEETUP_FORBIDDEN');
    if (row.title.includes('#race')) {
      row.status = 'selected';
      touch(row);
      throw fail(409, 'MEETUP_FINALIZED');
    }
    if (row.status === 'cancelled') throw fail(409, 'MEETUP_CANCELLED');
    if (!RESPONDABLE.includes(row.status)) throw fail(409, 'MEETUP_FINALIZED');
    if (new Date(row.invitationDeadlineAt).getTime() <= Date.now()) throw fail(409, 'INVITATION_DEADLINE_PASSED');
    if (mine.status !== 'invited') throw fail(409, 'INVITATION_NOT_PENDING');
    const now = new Date().toISOString();
    Object.assign(mine, targetUserId === 'accept' ? { status: 'accepted', respondedAt: now, joinedAt: now } : { status: 'declined', respondedAt: now });
    touch(row);
    return { status: 200, data: row satisfies MeetupDetailResponse };
  }

  if (row.organizerId !== me.id) throw fail(403, 'NOT_MEETUP_ORGANIZER');

  if (sub === 'cancel' && method === 'post') {
    if (!CANCELLABLE.includes(row.status)) throw fail(409, 'MEETUP_NOT_EDITABLE');
    row.status = 'cancelled';
    row.cancelledAt = new Date().toISOString();
    touch(row);
    return { status: 200, data: row };
  }

  if (!EDITABLE.includes(row.status)) throw fail(409, 'MEETUP_NOT_EDITABLE');

  if (!sub && method === 'patch') {
    const req = body as UpdateMeetupRequest;
    if (req.scheduledAt && new Date(req.scheduledAt).getTime() <= Date.now()) throw fail(400, 'SCHEDULED_AT_IN_PAST');
    Object.assign(row, Object.fromEntries(Object.entries(req).filter(([, v]) => v !== undefined)));
    touch(row);
    return { status: 200, data: row };
  }

  if ((sub === 'invitations' || sub === 'participants') && !targetUserId && method === 'post') {
    const req = body as unknown as InviteParticipantsRequest;
    for (const userId of new Set(req.inviteeIds ?? [])) {
      if (userId === me.id) continue;
      const existing = row.participants.find((p) => p.userId === userId);
      if (existing) Object.assign(existing, { status: 'invited', respondedAt: null, joinedAt: null, leftAt: null });
      else row.participants.push(participant(row.id, userId, me.id, 'invited'));
    }
    touch(row);
    return { status: 200, data: row };
  }

  if (sub === 'participants' && targetUserId && method === 'delete') {
    const existing = row.participants.find((p) => p.userId === targetUserId);
    if (!existing || targetUserId === me.id) throw fail(404, 'PARTICIPANT_NOT_FOUND');
    existing.status = 'removed';
    existing.leftAt = new Date().toISOString();
    touch(row);
    return { status: 204, data: undefined };
  }

  return null;
}
