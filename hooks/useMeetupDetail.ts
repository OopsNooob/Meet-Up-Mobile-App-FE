import { useCallback, useEffect, useRef, useState } from 'react';
import { meetupService, toMeetupError } from '@/services/meetupService';
import { useMeetupStore } from '@/store/useMeetupStore';
import type { AsyncState } from '@/types/async';
import type { MeetupDetail, MeetupError } from '@/types/meetup';

export type MeetupDetailState = AsyncState<MeetupDetail> & { error?: MeetupError };

export function useMeetupDetail(meetupId: string | undefined) {
  const [state, setState] = useState<MeetupDetailState>({ status: 'loading' });
  const requestId = useRef(0);

  const fetchDetail = useCallback(
    async (silent: boolean): Promise<MeetupError | null> => {
      if (!meetupId) {
        setState({ status: 'error', error: { code: 'not_found', meetupCode: 'meetup_not_found' } });
        return null;
      }
      const id = ++requestId.current;
      if (!silent) setState({ status: 'loading' });
      try {
        const detail = await meetupService.get(meetupId);
        if (id !== requestId.current) return null;
        setState({ status: 'success', data: detail, updatedAt: new Date().toISOString() });
        useMeetupStore.getState().upsert(detail);
        return null;
      } catch (err) {
        const error = toMeetupError(err);
        if (id !== requestId.current) return null;
        const fatal = error.meetupCode === 'meetup_not_found' || error.code === 'forbidden' || error.status === 403;
        setState((prev) => (silent && prev.status === 'success' && !fatal ? prev : { status: 'error', error }));
        return error;
      }
    },
    [meetupId],
  );

  const reload = useCallback(() => fetchDetail(false), [fetchDetail]);
  const refresh = useCallback(() => fetchDetail(true), [fetchDetail]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload, refresh };
}
