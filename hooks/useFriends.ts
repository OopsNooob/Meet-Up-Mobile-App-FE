import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { getMyUserId, selectIncomingCount, selectRelationship, useFriendStore, type LoadMeta } from '@/store/useFriendStore';
import { selectIsLoggedIn, useAuthStore } from '@/store/useAuthStore';
import { asyncFromData, type AsyncState } from '@/types/async';

/**
 * Hook đọc state bạn bè (FE-03) cho màn hình và feature khác.
 *
 * FE-07 (chọn thành viên meetup):
 *   const { state, friends, refresh } = useFriends();
 *   <AsyncView state={state} onRetry={refresh}>{(list) => ...}</AsyncView>
 */

/** Badge lời mời đến: tải lại định kỳ khi app đang mở. TODO(BE-03): thay bằng event socket khi có. */
const REQUESTS_POLL_MS = 60_000;

function toAsyncState<T>(list: T[], meta: LoadMeta): AsyncState<T[]> {
  if (meta.status === 'error' && meta.error) return { status: 'error', error: meta.error };
  if (meta.status !== 'success') return { status: 'loading' };
  return asyncFromData(list, { updatedAt: meta.updatedAt, isStale: meta.isStale });
}

/** Tự tải lần đầu nếu chưa tải */
function useEnsureLoaded(meta: LoadMeta, load: () => Promise<unknown>) {
  useEffect(() => {
    if (meta.status === 'idle') void load();
  }, [meta.status, load]);
}

export function useFriends() {
  const friends = useFriendStore((s) => s.friends);
  const meta = useFriendStore((s) => s.friendsMeta);
  const loadFriends = useFriendStore((s) => s.loadFriends);
  const unfriend = useFriendStore((s) => s.unfriend);
  const pendingUserIds = useFriendStore((s) => s.pendingUserIds);
  useEnsureLoaded(meta, loadFriends);

  const state = useMemo(() => toAsyncState(friends, meta), [friends, meta]);
  return { state, friends, refresh: loadFriends, unfriend, pendingUserIds };
}

export function useFriendRequests() {
  const incoming = useFriendStore((s) => s.incoming);
  const outgoing = useFriendStore((s) => s.outgoing);
  const meta = useFriendStore((s) => s.requestsMeta);
  const loadRequests = useFriendStore((s) => s.loadRequests);
  const acceptRequest = useFriendStore((s) => s.acceptRequest);
  const rejectRequest = useFriendStore((s) => s.rejectRequest);
  const cancelRequest = useFriendStore((s) => s.cancelRequest);
  const pendingUserIds = useFriendStore((s) => s.pendingUserIds);
  useEnsureLoaded(meta, loadRequests);

  const incomingState = useMemo(() => toAsyncState(incoming, meta), [incoming, meta]);
  const outgoingState = useMemo(() => toAsyncState(outgoing, meta), [outgoing, meta]);
  return {
    incoming,
    outgoing,
    incomingState,
    outgoingState,
    refresh: loadRequests,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    pendingUserIds,
  };
}

/** Quan hệ của mình với một người — luôn khớp danh sách bạn/lời mời trong store */
export function useRelationship(userId: string) {
  const myUserId = useAuthStore((s) => s.user?.id ?? null);
  const friends = useFriendStore((s) => s.friends);
  const incoming = useFriendStore((s) => s.incoming);
  const outgoing = useFriendStore((s) => s.outgoing);
  const isPending = useFriendStore((s) => s.pendingUserIds[userId] === true);
  const { relationship, requestId } = useMemo(
    () => selectRelationship({ friends, incoming, outgoing }, userId, myUserId),
    [friends, incoming, outgoing, userId, myUserId],
  );
  return { relationship, requestId, isPending };
}

export const useIncomingRequestCount = () => useFriendStore(selectIncomingCount);

/**
 * Giữ badge lời mời đến cập nhật khi chưa có realtime: tải ngay, khi app quay lại foreground
 * và mỗi REQUESTS_POLL_MS lúc app đang mở. Gắn một lần ở layout tabs.
 */
export function useFriendRequestsSync() {
  const isLoggedIn = useAuthStore(selectIsLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) return;
    const load = () => {
      if (getMyUserId()) void useFriendStore.getState().loadRequests();
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(load, REQUESTS_POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    load();
    start();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        load();
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [isLoggedIn]);
}
