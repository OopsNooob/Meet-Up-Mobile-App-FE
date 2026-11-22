import { create } from 'zustand';
import { canRespondToInvitation, isMeetupActive, isPendingInvitation } from '@/constants/meetup';
import { isMeetupGoneError, meetupService, toMeetupError } from '@/services/meetupService';
import { onLogout, useAuthStore } from '@/store/useAuthStore';
import type { AppError } from '@/types/async';
import type { InvitationResponse, Meetup, MeetupDetail, MeetupError } from '@/types/meetup';

export interface MeetupListMeta {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: AppError;
  updatedAt?: string;
}

interface MeetupState {
  meetups: Meetup[];
  meta: MeetupListMeta;
  details: Record<string, MeetupDetail>;
  invitationIds: string[];
  invitationsMeta: MeetupListMeta;
  respondingIds: Record<string, InvitationResponse>;

  loadMine: () => Promise<AppError | null>;
  upsert: (meetup: Meetup) => void;
  setDetail: (detail: MeetupDetail) => void;
  removeMeetup: (meetupId: string) => void;
  refreshDetail: (meetupId: string) => Promise<MeetupError | null>;

  loadInvitations: () => Promise<AppError | null>;
  respondInvitation: (meetupId: string, response: InvitationResponse) => Promise<boolean>;
  reset: () => void;
}

const INITIAL = {
  meetups: [] as Meetup[],
  meta: { status: 'idle' } as MeetupListMeta,
  details: {} as Record<string, MeetupDetail>,
  invitationIds: [] as string[],
  invitationsMeta: { status: 'idle' } as MeetupListMeta,
  respondingIds: {} as Record<string, InvitationResponse>,
};

const getMyUserId = () => useAuthStore.getState().user?.id ?? null;

function sortMeetups(list: Meetup[]): Meetup[] {
  const time = (m: Meetup) => new Date(m.scheduledAt).getTime();
  const active = list.filter((m) => isMeetupActive(m.status)).sort((a, b) => time(a) - time(b));
  const closed = list.filter((m) => !isMeetupActive(m.status)).sort((a, b) => time(b) - time(a));
  return [...active, ...closed];
}

const toSummary = ({ members: _members, ...meetup }: MeetupDetail): Meetup => meetup;

function sortInvitationIds(ids: Iterable<string>, details: Record<string, MeetupDetail>): string[] {
  const time = (id: string) => new Date(details[id]?.scheduledAt ?? 0).getTime();
  return [...new Set(ids)].filter((id) => details[id]).sort((a, b) => time(a) - time(b));
}

let requestSeq = 0;
let invitationSeq = 0;
let session = 0;
let responseSeq = 0;

export const useMeetupStore = create<MeetupState>((set, get) => ({
  ...INITIAL,

  loadMine: async () => {
    const seq = ++requestSeq;
    if (get().meta.status !== 'success') set({ meta: { status: 'loading' } });
    try {
      const meetups = await meetupService.listMine();
      if (seq !== requestSeq) return null;
      set({ meetups: sortMeetups(meetups), meta: { status: 'success', updatedAt: new Date().toISOString() } });
      return null;
    } catch (err) {
      const error = err as AppError;
      if (seq !== requestSeq) return null;
      if (get().meta.status !== 'success') set({ meta: { status: 'error', error } });
      return error;
    }
  },

  upsert: (meetup) => {
    const others = get().meetups.filter((m) => m.id !== meetup.id);
    set({ meetups: sortMeetups([...others, meetup]) });
  },

  setDetail: (detail) => {
    const myId = getMyUserId();
    set((s) => {
      const details = { ...s.details, [detail.id]: detail };
      const ids = s.invitationIds.filter((id) => id !== detail.id);
      if (isPendingInvitation(detail, myId)) ids.push(detail.id);
      const inList = s.meetups.some((m) => m.id === detail.id);
      return {
        details,
        invitationIds: sortInvitationIds(ids, details),
        meetups:
          inList || s.meta.status === 'success'
            ? sortMeetups([...s.meetups.filter((m) => m.id !== detail.id), toSummary(detail)])
            : s.meetups,
      };
    });
  },

  removeMeetup: (meetupId) => {
    set((s) => {
      const { [meetupId]: _removed, ...details } = s.details;
      return {
        details,
        invitationIds: s.invitationIds.filter((id) => id !== meetupId),
        meetups: s.meetups.filter((m) => m.id !== meetupId),
      };
    });
  },

  refreshDetail: async (meetupId) => {
    const s = session;
    try {
      const detail = await meetupService.get(meetupId);
      if (s === session) get().setDetail(detail);
      return null;
    } catch (err) {
      const error = toMeetupError(err);
      if (s === session && isMeetupGoneError(error)) get().removeMeetup(meetupId);
      return error;
    }
  },

  loadInvitations: async () => {
    const myId = getMyUserId();
    if (!myId) return null;
    const s = session;
    const seq = ++invitationSeq;
    const responseSeqAtStart = responseSeq;
    if (get().invitationsMeta.status !== 'success') set({ invitationsMeta: { status: 'loading' } });
    try {
      const fetched = await meetupService.listInvitedMeetupDetails(myId);
      if (s !== session || seq !== invitationSeq) return null;
      if (responseSeq !== responseSeqAtStart) return get().loadInvitations();
      set((st) => {
        const details = { ...st.details };
        fetched.forEach((d) => (details[d.id] = d));
        const pendingIds = fetched.filter((d) => isPendingInvitation(d, myId)).map((d) => d.id);
        const keep = st.invitationIds.filter((id) => st.respondingIds[id]);
        return {
          details,
          invitationIds: sortInvitationIds([...pendingIds, ...keep], details),
          invitationsMeta: { status: 'success', updatedAt: new Date().toISOString() },
        };
      });
      return null;
    } catch (err) {
      const error = toMeetupError(err);
      if (s !== session || seq !== invitationSeq) return null;
      if (get().invitationsMeta.status !== 'success') set({ invitationsMeta: { status: 'error', error } });
      return error;
    }
  },

  respondInvitation: async (meetupId, response) => {
    if (get().respondingIds[meetupId]) return false;
    const s = session;
    set((st) => ({ respondingIds: { ...st.respondingIds, [meetupId]: response } }));
    try {
      const detail = await meetupService.respondInvitation(meetupId, response);
      if (s !== session) return true;
      responseSeq += 1;
      if (detail) get().setDetail(detail);
      else if (await get().refreshDetail(meetupId)) {
        const cached = get().details[meetupId];
        const myId = getMyUserId();
        if (cached && myId) {
          const status = response === 'accept' ? 'accepted' : 'declined';
          const respondedAt = new Date().toISOString();
          get().setDetail({
            ...cached,
            members: cached.members.map((m) => (m.userId === myId ? { ...m, status, respondedAt } : m)),
          });
        }
      }
      set((st) => ({ invitationIds: st.invitationIds.filter((id) => id !== meetupId) }));
      return true;
    } catch (err) {
      const error = toMeetupError(err);
      if (s === session) {
        if (isMeetupGoneError(error)) get().removeMeetup(meetupId);
        else if (error.meetupCode === 'invitation_closed') await get().refreshDetail(meetupId);
      }
      throw error;
    } finally {
      if (s === session) {
        set((st) => {
          const { [meetupId]: _done, ...rest } = st.respondingIds;
          return { respondingIds: rest };
        });
      }
    }
  },

  reset: () => {
    session += 1;
    requestSeq += 1;
    invitationSeq += 1;
    set(INITIAL);
  },
}));

export const selectInvitations = (s: MeetupState): MeetupDetail[] =>
  s.invitationIds.map((id) => s.details[id]).filter((d): d is MeetupDetail => !!d);

export const selectRespondableInvitationCount = (s: MeetupState): number => {
  const myId = getMyUserId();
  const now = Date.now();
  return s.invitationIds.reduce((n, id) => {
    const detail = s.details[id];
    return detail && canRespondToInvitation(detail, myId, now) ? n + 1 : n;
  }, 0);
};

onLogout(() => useMeetupStore.getState().reset());
