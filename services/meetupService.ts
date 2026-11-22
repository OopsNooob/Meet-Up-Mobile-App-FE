import { apiClient, toApiError, type ApiError } from '@/services/apiClient';
import {
  computeInvitationDeadline,
  DEFAULT_MEETUP_PLACE_TYPES,
  isActiveMember,
  isMeetupActive,
} from '@/constants/meetup';
import type {
  CreateMeetupRequest,
  InviteParticipantsRequest,
  MeetupDetailResponse,
  MeetupListResponse,
  MeetupParticipantResponse,
  MeetupSummaryResponse,
  UpdateMeetupRequest,
} from '@/types/api';
import type {
  InvitationResponse,
  Meetup,
  MeetupDetail,
  MeetupError,
  MeetupErrorCode,
  MeetupFormValues,
  MeetupMember,
} from '@/types/meetup';

export const MEETUP_PATHS = {
  list: '/meetups',
  meetup: (meetupId: string) => `/meetups/${encodeURIComponent(meetupId)}`,
  cancel: (meetupId: string) => `/meetups/${encodeURIComponent(meetupId)}/cancel`,
  invitations: (meetupId: string) => `/meetups/${encodeURIComponent(meetupId)}/invitations`,
  respondInvitation: (meetupId: string, response: InvitationResponse) =>
    `/meetups/${encodeURIComponent(meetupId)}/invitations/${response}`,
  participant: (meetupId: string, userId: string) =>
    `/meetups/${encodeURIComponent(meetupId)}/participants/${encodeURIComponent(userId)}`,
} as const;

export const MEETUP_LIST_PAGE_SIZE = 50;

const MEETUP_SERVER_CODES: Record<string, MeetupErrorCode> = {
  MEETUP_NOT_FOUND: 'meetup_not_found',
  MEETUP_FORBIDDEN: 'not_organizer',
  NOT_MEETUP_MEMBER: 'not_member',
  MEETUP_INVITEE_UNAVAILABLE: 'invitee_not_friend',
  NOT_MEETUP_ORGANIZER: 'not_organizer',
  MEETUP_NOT_EDITABLE: 'not_editable',
  MEETUP_CANCELLED: 'not_editable',
  MEETUP_FINALIZED: 'not_editable',
  INVALID_SCHEDULED_AT: 'invalid_schedule',
  SCHEDULED_AT_IN_PAST: 'invalid_schedule',
  INVITEE_NOT_FRIEND: 'invitee_not_friend',
};

const STATUS_FALLBACK: Partial<Record<number, MeetupErrorCode>> = {
  403: 'not_organizer',
  404: 'meetup_not_found',
  409: 'not_editable',
};

export function toMeetupError(err: unknown): MeetupError {
  const raw = err as MeetupError | undefined;
  const normalized = toApiError(err);
  const error: ApiError = {
    ...normalized,
    status: normalized.status ?? raw?.status,
    serverCode: normalized.serverCode ?? raw?.serverCode,
  };
  const meetupCode =
    raw?.meetupCode ??
    (error.serverCode ? MEETUP_SERVER_CODES[error.serverCode] : undefined) ??
    (error.status ? STATUS_FALLBACK[error.status] : undefined);
  return { ...error, ...(meetupCode ? { meetupCode } : {}), ...(raw?.partial ? { partial: true } : {}) };
}

export function toInvitationError(err: unknown): MeetupError {
  const error = toMeetupError(err);
  if (error.meetupCode === 'meetup_not_found') return error;
  if (error.status === 409 || error.meetupCode === 'not_editable') return { ...error, meetupCode: 'invitation_closed' };
  if (error.status === 403 || error.code === 'forbidden' || error.meetupCode === 'not_organizer') {
    return { ...error, meetupCode: 'not_member' };
  }
  return error;
}

export const isMeetupGoneError = (error: MeetupError) =>
  error.meetupCode === 'meetup_not_found' ||
  error.meetupCode === 'not_member' ||
  error.status === 404 ||
  error.status === 403;

async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (err) {
    throw toMeetupError(err);
  }
}

const toMeetup = (dto: MeetupSummaryResponse): Meetup => ({
  id: dto.id,
  organizerId: dto.organizerId,
  title: dto.title,
  description: dto.description ?? null,
  scheduledAt: dto.scheduledAt,
  invitationDeadlineAt: dto.invitationDeadlineAt,
  voteDeadlineAt: dto.voteDeadlineAt,
  searchRadiusM: dto.searchRadiusM,
  placeType: dto.placeType,
  status: dto.status,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  cancelledAt: dto.cancelledAt,
  finishedAt: dto.finishedAt,
});

const toMember = (dto: MeetupParticipantResponse): MeetupMember => ({
  participantId: dto.id,
  userId: dto.userId,
  invitedById: dto.invitedById,
  status: dto.status,
  respondedAt: dto.respondedAt,
});

export const toDetail = (dto: MeetupDetailResponse): MeetupDetail => ({
  ...toMeetup(dto),
  members: (dto.participants ?? []).map(toMember),
});

const uniqueIds = (ids: string[]) => [...new Set(ids)];

export function getActiveInviteeIds(meetup: MeetupDetail): string[] {
  return meetup.members.filter((m) => m.userId !== meetup.organizerId && isActiveMember(m)).map((m) => m.userId);
}

function buildUpdatePatch(original: Meetup, values: MeetupFormValues): UpdateMeetupRequest {
  const patch: UpdateMeetupRequest = {};
  const title = values.title.trim();
  if (title !== original.title) patch.title = title;
  if (values.scheduledAt.getTime() !== new Date(original.scheduledAt).getTime()) {
    patch.scheduledAt = values.scheduledAt.toISOString();
    patch.invitationDeadlineAt = computeInvitationDeadline(values.scheduledAt).toISOString();
  }
  if (values.placeType && values.placeType !== original.placeType) patch.placeType = values.placeType;
  if (values.searchRadiusM !== original.searchRadiusM) patch.searchRadiusM = values.searchRadiusM;
  return patch;
}

export const meetupService = {
  async getPlaceTypes(): Promise<string[]> {
    return [...DEFAULT_MEETUP_PLACE_TYPES];
  },

  listMine(): Promise<Meetup[]> {
    return call(async () => {
      const { data } = await apiClient.get<MeetupListResponse>(MEETUP_PATHS.list, {
        params: { offset: 0, limit: MEETUP_LIST_PAGE_SIZE },
      });
      return data.items.map(toMeetup);
    });
  },

  get(meetupId: string): Promise<MeetupDetail> {
    return call(async () => toDetail((await apiClient.get<MeetupDetailResponse>(MEETUP_PATHS.meetup(meetupId))).data));
  },

  create(values: MeetupFormValues): Promise<string> {
    return call(async () => {
      const body: CreateMeetupRequest = {
        title: values.title.trim(),
        scheduledAt: values.scheduledAt.toISOString(),
        invitationDeadlineAt: computeInvitationDeadline(values.scheduledAt).toISOString(),
        searchRadiusM: values.searchRadiusM,
        placeType: values.placeType ?? '',
        inviteeIds: uniqueIds(values.inviteeIds),
      };
      const { data } = await apiClient.post<MeetupSummaryResponse>(MEETUP_PATHS.list, body);
      return data.id;
    });
  },

  async update(original: MeetupDetail, values: MeetupFormValues): Promise<void> {
    const patch = buildUpdatePatch(original, values);
    const before = new Set(getActiveInviteeIds(original));
    const after = new Set(uniqueIds(values.inviteeIds).filter((id) => id !== original.organizerId));
    const added = [...after].filter((id) => !before.has(id));
    const removed = [...before].filter((id) => !after.has(id));

    const steps: (() => Promise<unknown>)[] = [];
    if (Object.keys(patch).length > 0) steps.push(() => apiClient.patch(MEETUP_PATHS.meetup(original.id), patch));
    if (added.length > 0) {
      const body: InviteParticipantsRequest = { inviteeIds: added };
      steps.push(() => apiClient.post(MEETUP_PATHS.invitations(original.id), body));
    }
    for (const userId of removed) steps.push(() => apiClient.delete(MEETUP_PATHS.participant(original.id, userId)));

    let done = 0;
    try {
      for (const step of steps) {
        await step();
        done += 1;
      }
    } catch (err) {
      const error = toMeetupError(err);
      throw done > 0 ? { ...error, partial: true } : error;
    }
  },

  cancel(meetupId: string): Promise<void> {
    return call(async () => {
      await apiClient.post(MEETUP_PATHS.cancel(meetupId));
    });
  },

  async listInvitedMeetupDetails(myId: string): Promise<MeetupDetail[]> {
    const summaries = await meetupService.listMine();
    const candidates = summaries.filter((m) => m.organizerId !== myId && isMeetupActive(m.status));
    const results = await Promise.allSettled(candidates.map((m) => meetupService.get(m.id)));

    const details: MeetupDetail[] = [];
    let firstError: MeetupError | null = null;
    for (const result of results) {
      if (result.status === 'fulfilled') details.push(result.value);
      else if (!isMeetupGoneError(result.reason as MeetupError)) firstError ??= result.reason as MeetupError;
    }
    if (firstError && details.length === 0) throw firstError;
    return details;
  },

  async respondInvitation(meetupId: string, response: InvitationResponse): Promise<MeetupDetail | null> {
    try {
      const { data } = await apiClient.post<MeetupDetailResponse | undefined>(
        MEETUP_PATHS.respondInvitation(meetupId, response),
      );
      return data?.participants ? toDetail(data) : null;
    } catch (err) {
      throw toInvitationError(err);
    }
  },
};
