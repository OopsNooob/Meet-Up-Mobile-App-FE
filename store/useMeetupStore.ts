import { create } from 'zustand';
import { isMeetupActive } from '@/constants/meetup';
import { meetupService } from '@/services/meetupService';
import { onLogout } from '@/store/useAuthStore';
import type { AppError } from '@/types/async';
import type { Meetup } from '@/types/meetup';

export interface MeetupListMeta {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: AppError;
  updatedAt?: string;
}

interface MeetupState {
  meetups: Meetup[];
  meta: MeetupListMeta;
  loadMine: () => Promise<AppError | null>;
  upsert: (meetup: Meetup) => void;
  reset: () => void;
}

const INITIAL = { meetups: [] as Meetup[], meta: { status: 'idle' } as MeetupListMeta };

function sortMeetups(list: Meetup[]): Meetup[] {
  const time = (m: Meetup) => new Date(m.scheduledAt).getTime();
  const active = list.filter((m) => isMeetupActive(m.status)).sort((a, b) => time(a) - time(b));
  const closed = list.filter((m) => !isMeetupActive(m.status)).sort((a, b) => time(b) - time(a));
  return [...active, ...closed];
}

let requestSeq = 0;

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

  reset: () => {
    requestSeq += 1;
    set(INITIAL);
  },
}));

onLogout(() => useMeetupStore.getState().reset());
