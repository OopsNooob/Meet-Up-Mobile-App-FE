import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useSocket, type SocketEvent } from '@/hooks/useSocket';
import { selectIsLoggedIn, useAuthStore } from '@/store/useAuthStore';
import { selectInvitations, selectRespondableInvitationCount, useMeetupStore } from '@/store/useMeetupStore';
import { asyncFromData, type AsyncState } from '@/types/async';
import type { MeetupDetail } from '@/types/meetup';

export function useMeetupInvitations() {
  const invitations = useMeetupStore(useShallow(selectInvitations));
  const meta = useMeetupStore((s) => s.invitationsMeta);
  const respondingIds = useMeetupStore((s) => s.respondingIds);

  const state = useMemo<AsyncState<MeetupDetail[]>>(() => {
    if (meta.status === 'error' && meta.error) return { status: 'error', error: meta.error };
    if (meta.status !== 'success') return { status: 'loading' };
    return asyncFromData(invitations, { updatedAt: meta.updatedAt });
  }, [invitations, meta]);

  return { state, invitations, respondingIds, refresh: useMeetupStore.getState().loadInvitations };
}

export const useMeetupInvitationCount = () => useMeetupStore(selectRespondableInvitationCount);

const INVITATION_DETAIL_EVENTS: SocketEvent[] = [
  'MeetupUpdated.v1',
  'MeetupCancelled.v1',
  'MeetupFinished.v1',
  'MeetupFinalized.v1',
  'MeetupFinalized',
];
const MEMBER_EVENTS: SocketEvent[] = ['MeetupMemberChanged.v1', 'MeetupMemberChanged'];
const CREATED_EVENT: SocketEvent = 'MeetupCreated.v1';

const COALESCE_MS = 400;

type MeetupEventPayload = { meetupId?: string; userId?: string; inviteeIds?: string[] } | null;

export function useMeetupInvitationsSync() {
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  const { status, on, off } = useSocket();
  const connected = status === 'connected';
  const wasConnected = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    const load = () => void useMeetupStore.getState().loadInvitations();
    load();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') load();
    });
    return () => subscription.remove();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !connected) return;
    const store = useMeetupStore.getState;
    if (wasConnected.current) void store().loadInvitations();
    wasConnected.current = true;

    let listTimer: ReturnType<typeof setTimeout> | null = null;
    const detailTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const scheduleList = () => {
      if (listTimer) clearTimeout(listTimer);
      listTimer = setTimeout(() => void store().loadInvitations(), COALESCE_MS);
    };
    const scheduleDetail = (meetupId: string) => {
      const existing = detailTimers.get(meetupId);
      if (existing) clearTimeout(existing);
      detailTimers.set(
        meetupId,
        setTimeout(() => {
          detailTimers.delete(meetupId);
          void store().refreshDetail(meetupId);
        }, COALESCE_MS),
      );
    };
    const myId = () => useAuthStore.getState().user?.id;
    const isListed = (meetupId?: string) => !!meetupId && store().invitationIds.includes(meetupId);

    const onCreated = (payload: MeetupEventPayload) => {
      const me = myId();
      if (me && payload?.inviteeIds?.includes(me)) scheduleList();
    };
    const onMember = (payload: MeetupEventPayload) => {
      if (payload?.userId && payload.userId === myId()) scheduleList();
      else if (isListed(payload?.meetupId)) scheduleDetail(payload!.meetupId!);
    };
    const onLifecycle = (payload: MeetupEventPayload) => {
      if (isListed(payload?.meetupId)) scheduleDetail(payload!.meetupId!);
    };

    on(CREATED_EVENT, onCreated);
    MEMBER_EVENTS.forEach((event) => on(event, onMember));
    INVITATION_DETAIL_EVENTS.forEach((event) => on(event, onLifecycle));
    return () => {
      if (listTimer) clearTimeout(listTimer);
      detailTimers.forEach((timer) => clearTimeout(timer));
      off(CREATED_EVENT);
      MEMBER_EVENTS.forEach((event) => off(event));
      INVITATION_DETAIL_EVENTS.forEach((event) => off(event));
    };
  }, [isLoggedIn, connected, on, off]);
}
