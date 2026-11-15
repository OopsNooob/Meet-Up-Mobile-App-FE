import { useEffect, useRef } from 'react';
import { useSocket, type SocketEvent } from '@/hooks/useSocket';

const MEETUP_EVENTS: SocketEvent[] = [
  'MeetupMemberChanged.v1',
  'MeetupMemberChanged',
  'MeetupUpdated.v1',
  'MeetupCancelled.v1',
  'MeetupFinished.v1',
  'MeetupFinalized.v1',
  'MeetupFinalized',
];

const COALESCE_MS = 400;

export function useMeetupRealtime(meetupId: string | undefined, onChange: () => void) {
  const { status, on, off, joinMeetup } = useSocket();
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const connected = status === 'connected';
  const wasConnected = useRef(false);

  useEffect(() => {
    if (!meetupId || !connected) return;

    joinMeetup(meetupId);
    if (wasConnected.current) onChangeRef.current();
    wasConnected.current = true;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (payload: { meetupId?: string } | null) => {
      if (payload?.meetupId && payload.meetupId !== meetupId) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), COALESCE_MS);
    };

    MEETUP_EVENTS.forEach((event) => on(event, handler));
    return () => {
      if (timer) clearTimeout(timer);
      MEETUP_EVENTS.forEach((event) => off(event));
    };
  }, [meetupId, connected, on, off, joinMeetup]);

  return { connected };
}
