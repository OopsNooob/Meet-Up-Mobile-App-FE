import { create } from 'zustand';
import { friendshipService, toFriendError } from '@/services/friendshipService';
import { onLogout, useAuthStore } from '@/store/useAuthStore';
import type { AppError } from '@/types/async';
import type {
  Friend,
  FriendError,
  FriendErrorCode,
  FriendRequest,
  FriendshipEvent,
  FriendUser,
  Relationship,
  UserSearchResult,
} from '@/types/friend';

/**
 * Bạn bè + lời mời kết bạn (FE-03) — nguồn state DUY NHẤT cho danh sách bạn, lời mời đến/đã gửi và badge.
 * Kết quả tìm kiếm không lưu quan hệ riêng: quan hệ luôn suy ra từ 3 danh sách ở đây (`selectRelationship`).
 *
 * Cho FE-07 (chọn thành viên meetup): dùng `useFriends()` trong hooks/useFriends.ts, không phụ thuộc UI FE-03.
 *
 * - Thao tác ghi: optimistic, lỗi thì hoàn tác đúng phần của người đó rồi ném FriendError cho màn hình báo lỗi.
 * - Mỗi người chỉ có 1 thao tác đang chạy (`pendingUserIds`) → chống bấm nhiều lần, UI disable nút.
 * - Đăng xuất → xóa sạch; response về muộn của phiên cũ bị bỏ qua.
 */

export interface LoadMeta {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: AppError;
  updatedAt?: string;
  /** Lần tải gần nhất lỗi nhưng vẫn còn dữ liệu cũ đang hiển thị */
  isStale?: boolean;
}

interface FriendState {
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  friendsMeta: LoadMeta;
  requestsMeta: LoadMeta;
  pendingUserIds: Record<string, true>;

  /** Không ném lỗi — trạng thái nằm ở friendsMeta/requestsMeta. Trả lỗi (nếu có) để màn hình báo khi pull-to-refresh. */
  loadFriends: () => Promise<AppError | null>;
  loadRequests: () => Promise<AppError | null>;
  refreshAll: () => Promise<AppError | null>;
  /** Kết quả tìm kiếm mới lệch với state → tải lại danh sách (server là nguồn đúng) */
  reconcileSearchResults: (results: readonly UserSearchResult[]) => void;

  // Các hàm ghi ném FriendError khi lỗi
  sendRequest: (user: FriendUser) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  unfriend: (userId: string) => Promise<void>;

  /** Điểm cắm realtime (socket BE-03 khi có) */
  applyEvent: (event: FriendshipEvent) => void;
  reset: () => void;
}

const INITIAL = {
  friends: [] as Friend[],
  incoming: [] as FriendRequest[],
  outgoing: [] as FriendRequest[],
  friendsMeta: { status: 'idle' } as LoadMeta,
  requestsMeta: { status: 'idle' } as LoadMeta,
  pendingUserIds: {} as Record<string, true>,
};

/** Tăng khi đăng xuất → mọi response thuộc phiên cũ bị bỏ */
let session = 0;
/** Số thao tác ghi đang chạy + có thao tác ghi bắt đầu kể từ khi một lần tải bắt đầu */
let inflightMutations = 0;
let mutationSeq = 0;
/** Lần tải bị bỏ vì chồng lên thao tác ghi → tải lại khi các thao tác xong */
let resyncPending = false;

type MetaKey = 'friendsMeta' | 'requestsMeta';
const inflightLoads = new Map<MetaKey, { session: number; seq: number; promise: Promise<AppError | null> }>();

/** Lỗi cho thấy state cục bộ đã cũ so với server → tải lại thay vì chỉ hoàn tác */
const OUT_OF_SYNC_CODES = new Set<FriendErrorCode>([
  'request_exists',
  'already_friends',
  'request_not_found',
  'target_locked',
  'target_not_found',
]);
const isOutOfSync = (error: FriendError) => error.friendCode !== undefined && OUT_OF_SYNC_CODES.has(error.friendCode);

const byNewest = (a: FriendRequest, b: FriendRequest) => b.createdAt.localeCompare(a.createdAt);
const byName = (a: Friend, b: Friend) => a.user.name.localeCompare(b.user.name);
const withoutUser = <T extends { user: FriendUser }>(list: T[], userId: string) => list.filter((x) => x.user.id !== userId);
const localRequestId = (userId: string) => `local-${userId}`;

export const getMyUserId = () => useAuthStore.getState().user?.id ?? null;

export const useFriendStore = create<FriendState>((set, get) => {
  const isCurrent = (s: number) => s === session;

  /** Đánh dấu thao tác cho `userId`; false nếu người này đang có thao tác khác */
  const begin = (userId: string) => {
    if (get().pendingUserIds[userId]) return false;
    inflightMutations += 1;
    mutationSeq += 1;
    set((s) => ({ pendingUserIds: { ...s.pendingUserIds, [userId]: true } }));
    return true;
  };

  /** Tải lại từ server ngay, hoặc ngay sau khi các thao tác ghi đang chạy kết thúc */
  const scheduleResync = () => {
    if (inflightMutations > 0) {
      resyncPending = true;
      return;
    }
    resyncPending = false;
    void get().refreshAll();
  };

  const end = (userId: string, s: number) => {
    if (!isCurrent(s)) return;
    inflightMutations -= 1;
    set((st) => {
      const { [userId]: _, ...rest } = st.pendingUserIds;
      return { pendingUserIds: rest };
    });
    if (inflightMutations === 0 && resyncPending) scheduleResync();
  };

  /** Nhiều nơi cùng gọi tải (focus, polling, lần đầu) → dùng chung một request */
  const load = (metaKey: MetaKey, loader: () => Promise<Partial<FriendState>>): Promise<AppError | null> => {
    const s = session;
    const running = inflightLoads.get(metaKey);
    // Chỉ dùng lại khi chưa có thao tác ghi nào kể từ lúc request kia bắt đầu
    if (running?.session === s && running.seq === mutationSeq) return running.promise;
    const promise = loadOnce(metaKey, loader).finally(() => {
      if (inflightLoads.get(metaKey)?.promise === promise) inflightLoads.delete(metaKey);
    });
    inflightLoads.set(metaKey, { session: s, seq: mutationSeq, promise });
    return promise;
  };

  const loadOnce = async (metaKey: MetaKey, loader: () => Promise<Partial<FriendState>>): Promise<AppError | null> => {
    const s = session;
    const seqAtStart = mutationSeq;
    const hasData = get()[metaKey].status === 'success';
    if (!hasData) set({ [metaKey]: { status: 'loading' } satisfies LoadMeta });
    try {
      const data = await loader();
      if (!isCurrent(s)) return null;
      // Có thao tác ghi chen giữa → response có thể cũ hơn state optimistic: không ghi đè, tải lại sau
      if (inflightMutations > 0 || mutationSeq !== seqAtStart) {
        scheduleResync();
        return null;
      }
      set({ ...data, [metaKey]: { status: 'success', updatedAt: new Date().toISOString() } satisfies LoadMeta });
      return null;
    } catch (err) {
      const error = toFriendError(err);
      if (!isCurrent(s)) return null;
      // Đã có dữ liệu → giữ lại, đánh dấu cũ (không giả vờ là mới); chưa có → hiện lỗi + thử lại
      const meta: LoadMeta = hasData ? { ...get()[metaKey], isStale: true } : { status: 'error', error };
      set({ [metaKey]: meta });
      return error;
    }
  };

  /** Lỗi do state cục bộ đã cũ → tải lại; luôn ném lại lỗi cho màn hình */
  const fail = (err: unknown, s: number): never => {
    const error = toFriendError(err);
    if (isCurrent(s) && isOutOfSync(error)) resyncPending = true;
    throw error;
  };

  return {
    ...INITIAL,

    loadFriends: () => load('friendsMeta', async () => ({ friends: (await friendshipService.listFriends()).sort(byName) })),

    loadRequests: () =>
      load('requestsMeta', async () => {
        const [incoming, outgoing] = await Promise.all([
          friendshipService.listRequests('incoming'),
          friendshipService.listRequests('outgoing'),
        ]);
        return { incoming: incoming.sort(byNewest), outgoing: outgoing.sort(byNewest) };
      }),

    refreshAll: async () => {
      const [friendsError, requestsError] = await Promise.all([get().loadFriends(), get().loadRequests()]);
      return friendsError ?? requestsError;
    },

    reconcileSearchResults: (results) => {
      const state = get();
      if (state.friendsMeta.status !== 'success' || state.requestsMeta.status !== 'success') return;
      const me = getMyUserId();
      const outOfSync = results.some(
        (r) => !state.pendingUserIds[r.user.id] && selectRelationship(state, r.user.id, me).relationship !== r.relationship,
      );
      if (outOfSync) scheduleResync();
    },

    sendRequest: async (user) => {
      const me = getMyUserId();
      // Chặn ở UI; BE vẫn kiểm tra lại (SELF_FRIEND_REQUEST)
      if (user.id === me) throw { code: 'forbidden', friendCode: 'self_request' } satisfies FriendError;

      const current = selectRelationship(get(), user.id, me);
      if (current.relationship === 'friend' || current.relationship === 'outgoing') return;
      // Người kia đã gửi cho mình → "Kết bạn" nghĩa là chấp nhận lời mời đó, không tạo lời mời trùng
      if (current.relationship === 'incoming' && current.requestId) return get().acceptRequest(current.requestId);

      if (!begin(user.id)) return;
      const s = session;
      const tempId = localRequestId(user.id);
      set((st) => ({
        outgoing: [{ id: tempId, direction: 'outgoing', user, createdAt: new Date().toISOString() }, ...st.outgoing],
      }));
      try {
        const result = await friendshipService.sendRequest(user.id);
        if (!isCurrent(s)) return;
        if (result.status === 'pending') {
          set((st) => ({ outgoing: st.outgoing.map((r) => (r.id === tempId ? result.request : r)) }));
        } else {
          // BE chấp nhận luôn vì đối phương đã gửi cho mình gần như cùng lúc
          set((st) => ({
            outgoing: st.outgoing.filter((r) => r.id !== tempId),
            incoming: withoutUser(st.incoming, user.id),
            friends: [...withoutUser(st.friends, user.id), result.friend].sort(byName),
          }));
        }
      } catch (err) {
        if (isCurrent(s)) set((st) => ({ outgoing: st.outgoing.filter((r) => r.id !== tempId) }));
        fail(err, s);
      } finally {
        end(user.id, s);
      }
    },

    acceptRequest: async (requestId) => {
      const request = get().incoming.find((r) => r.id === requestId);
      if (!request || !begin(request.user.id)) return;
      const s = session;
      const userId = request.user.id;
      set((st) => ({
        incoming: st.incoming.filter((r) => r.id !== requestId),
        friends: [...withoutUser(st.friends, userId), { user: request.user, since: new Date().toISOString() }].sort(byName),
      }));
      try {
        const friend = await friendshipService.acceptRequest(requestId);
        if (isCurrent(s)) set((st) => ({ friends: [...withoutUser(st.friends, userId), friend].sort(byName) }));
      } catch (err) {
        if (isCurrent(s)) {
          const error = toFriendError(err);
          set((st) => ({
            friends: withoutUser(st.friends, userId),
            // Lời mời đã bị hủy/xử lý ở nơi khác → không đưa lại, chờ tải lại từ server
            incoming: isOutOfSync(error) ? st.incoming : [...st.incoming, request].sort(byNewest),
          }));
        }
        fail(err, s);
      } finally {
        end(userId, s);
      }
    },

    rejectRequest: async (requestId) => {
      const request = get().incoming.find((r) => r.id === requestId);
      if (!request || !begin(request.user.id)) return;
      const s = session;
      set((st) => ({ incoming: st.incoming.filter((r) => r.id !== requestId) }));
      try {
        await friendshipService.rejectRequest(requestId);
      } catch (err) {
        if (isCurrent(s) && !isOutOfSync(toFriendError(err))) {
          set((st) => ({ incoming: [...st.incoming, request].sort(byNewest) }));
        }
        fail(err, s);
      } finally {
        end(request.user.id, s);
      }
    },

    cancelRequest: async (requestId) => {
      const request = get().outgoing.find((r) => r.id === requestId);
      // Lời mời optimistic chưa có id thật → chưa hủy được
      if (!request || requestId.startsWith('local-') || !begin(request.user.id)) return;
      const s = session;
      set((st) => ({ outgoing: st.outgoing.filter((r) => r.id !== requestId) }));
      try {
        await friendshipService.cancelRequest(requestId);
      } catch (err) {
        if (isCurrent(s) && !isOutOfSync(toFriendError(err))) {
          set((st) => ({ outgoing: [...st.outgoing, request].sort(byNewest) }));
        }
        fail(err, s);
      } finally {
        end(request.user.id, s);
      }
    },

    unfriend: async (userId) => {
      const friend = get().friends.find((f) => f.user.id === userId);
      if (!friend || !begin(userId)) return;
      const s = session;
      set((st) => ({ friends: withoutUser(st.friends, userId) }));
      try {
        await friendshipService.unfriend(userId);
      } catch (err) {
        const error = toFriendError(err);
        if (isCurrent(s) && error.status === 404) {
          // Đã không còn là bạn ở server → kết quả đúng như mong muốn, chỉ cần đồng bộ lại
          resyncPending = true;
          return;
        }
        if (isCurrent(s)) set((st) => ({ friends: [...st.friends, friend].sort(byName) }));
        throw error;
      } finally {
        end(userId, s);
      }
    },

    applyEvent: (event) => {
      set((st) => {
        switch (event.type) {
          case 'request_received':
            return {
              incoming: [event.request, ...st.incoming.filter((r) => r.id !== event.request.id)].sort(byNewest),
            };
          case 'request_accepted':
            return {
              outgoing: st.outgoing.filter((r) => r.id !== event.requestId),
              incoming: st.incoming.filter((r) => r.id !== event.requestId),
              friends: [...withoutUser(st.friends, event.friend.user.id), event.friend].sort(byName),
            };
          case 'request_closed':
            return {
              outgoing: st.outgoing.filter((r) => r.id !== event.requestId),
              incoming: st.incoming.filter((r) => r.id !== event.requestId),
            };
          case 'unfriended':
            return { friends: withoutUser(st.friends, event.userId) };
        }
      });
    },

    reset: () => {
      session += 1;
      inflightMutations = 0;
      resyncPending = false;
      inflightLoads.clear();
      set(INITIAL);
    },
  };
});

// ─── Selector ───────────────────────────────────────────────────────────────

type RelationshipState = Pick<FriendState, 'friends' | 'incoming' | 'outgoing'>;

/** Quan hệ của mình với `userId`, suy ra từ state — dùng cho kết quả tìm kiếm, profile người khác... */
export function selectRelationship(
  state: RelationshipState,
  userId: string,
  myUserId: string | null,
): { relationship: Relationship; requestId?: string } {
  if (userId === myUserId) return { relationship: 'self' };
  if (state.friends.some((f) => f.user.id === userId)) return { relationship: 'friend' };
  const incoming = state.incoming.find((r) => r.user.id === userId);
  if (incoming) return { relationship: 'incoming', requestId: incoming.id };
  const outgoing = state.outgoing.find((r) => r.user.id === userId);
  if (outgoing) return { relationship: 'outgoing', requestId: outgoing.id };
  return { relationship: 'none' };
}

export const selectIncomingCount = (s: FriendState) => s.incoming.length;

onLogout(() => useFriendStore.getState().reset());
