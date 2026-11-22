import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isMeetupGoneError, meetupService, toMeetupError } from '@/services/meetupService';
import { useMeetupStore } from '@/store/useMeetupStore';
import type { AsyncState } from '@/types/async';
import type { MeetupDetail, MeetupError } from '@/types/meetup';

export type MeetupDetailState = AsyncState<MeetupDetail> & { error?: MeetupError };

type FetchMeta = { status: 'loading' | 'success' } | { status: 'error'; error: MeetupError };

const NOT_FOUND: MeetupError = { code: 'not_found', meetupCode: 'meetup_not_found' };

export function useMeetupDetail(meetupId: string | undefined) {
  const detail = useMeetupStore((s) => (meetupId ? s.details[meetupId] : undefined));
  const [meta, setMeta] = useState<FetchMeta>(() =>
    meetupId && useMeetupStore.getState().details[meetupId] ? { status: 'success' } : { status: 'loading' },
  );
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const requestId = useRef(0);

  const fetchDetail = useCallback(
    async (silent: boolean): Promise<MeetupError | null> => {
      if (!meetupId) {
        setMeta({ status: 'error', error: NOT_FOUND });
        return null;
      }
      const id = ++requestId.current;
      if (!silent) setMeta({ status: 'loading' });
      try {
        const fresh = await meetupService.get(meetupId);
        if (id !== requestId.current) return null;
        useMeetupStore.getState().setDetail(fresh);
        setUpdatedAt(new Date().toISOString());
        setMeta({ status: 'success' });
        return null;
      } catch (err) {
        const error = toMeetupError(err);
        if (id !== requestId.current) return null;
        const fatal = isMeetupGoneError(error) || error.code === 'forbidden';
        if (fatal) useMeetupStore.getState().removeMeetup(meetupId);
        setMeta((prev) => (silent && prev.status === 'success' && !fatal ? prev : { status: 'error', error }));
        return error;
      }
    },
    [meetupId],
  );

  const reload = useCallback(() => fetchDetail(false), [fetchDetail]);
  const refresh = useCallback(() => fetchDetail(true), [fetchDetail]);

  useEffect(() => {
    const cached = !!meetupId && !!useMeetupStore.getState().details[meetupId];
    void fetchDetail(cached);
  }, [meetupId, fetchDetail]);

  const state = useMemo<MeetupDetailState>(() => {
    if (meta.status === 'error') return { status: 'error', error: meta.error };
    if (detail) return { status: 'success', data: detail, updatedAt };
    if (meta.status === 'success') return { status: 'error', error: NOT_FOUND };
    return { status: 'loading' };
  }, [meta, detail, updatedAt]);

  return { state, reload, refresh };
}
