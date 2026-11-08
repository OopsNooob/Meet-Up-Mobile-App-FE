import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { UserDto } from '@/services/authService';
import type {
  FriendDto,
  FriendRequestDto,
  FriendUserDto,
  SendRequestResultDto,
  UserSearchResultDto,
} from '@/services/friendshipService';

/**
 * Mock backend BE-03 (bạn bè). Được gọi từ adapter trong mockAuthServer.ts để dùng chung xác thực token mock.
 * TODO(BE-03): xóa khi có API thật.
 *
 * Dữ liệu nằm trong bộ nhớ (mất khi reload JS) nhưng sống qua đăng xuất/đăng nhập → test 2 tài khoản
 * user@meetup.dev và admin@meetup.dev trên cùng máy. Người "demo" (Lan, Minh...) không đăng nhập được;
 * hành động của họ giả lập bằng mockFriendDebug (màn dev/auth).
 */

type DirectoryEntry = { user: UserDto; locked: boolean };
type Status = 'pending' | 'accepted' | 'rejected';
/** Giống bảng friendships: 1 dòng cho mỗi cặp, userA < userB */
type Row = { id: string; userA: string; userB: string; requestedBy: string; status: Status; requestedAt: string; respondedAt?: string };

const demoPeople: DirectoryEntry[] = [
  ['u-lan', 'lan@meetup.dev', 'Trần Thị Lan'],
  ['u-minh', 'minh@meetup.dev', 'Lê Văn Minh'],
  ['u-hoa', 'hoa@meetup.dev', 'Phạm Thu Hoa'],
  ['u-khoa', 'khoa@meetup.dev', 'Nguyễn Đăng Khoa'],
  ['u-thu', 'thu@meetup.dev', 'Võ Minh Thư'],
].map(([id, email, displayName]) => ({
  user: { id, email, displayName, avatarUrl: null, role: 'user' as const },
  locked: false,
}));

let seq = 0;
const nextId = () => `fr-${Date.now()}-${(seq += 1)}`;
const pairKey = (x: string, y: string) => (x < y ? [x, y] : [y, x]) as [string, string];

function seedRow(from: string, to: string, status: Status): Row {
  const [userA, userB] = pairKey(from, to);
  const at = new Date(Date.now() - 86_400_000).toISOString();
  return { id: nextId(), userA, userB, requestedBy: from, status, requestedAt: at, respondedAt: status === 'pending' ? undefined : at };
}

let rows: Row[] = [seedRow('u-lan', 'u1', 'accepted'), seedRow('u-minh', 'u1', 'pending'), seedRow('u1', 'u-hoa', 'pending')];

// ─── Giả lập lỗi + hành động của người demo (màn dev/auth) ───────────────────

export type MockFriendFailure = 'none' | 'offline' | 'server';
let failure: MockFriendFailure = 'none';

export const mockFriendDebug = {
  getFailure: () => failure,
  setFailure(next: MockFriendFailure) {
    failure = next;
  },
  /** Một người demo chưa có quan hệ gửi lời mời cho `userId`. Trả tên người gửi hoặc null nếu hết người. */
  simulateIncomingRequest(userId: string): string | null {
    const sender = demoPeople.find((p) => !p.locked && !findRow(p.user.id, userId));
    if (!sender) return null;
    rows.push({ ...seedRow(sender.user.id, userId, 'pending'), requestedAt: new Date().toISOString() });
    return sender.user.displayName;
  },
  /** Người demo rút lại mọi lời mời đang gửi cho `userId` (test "Lời mời không còn tồn tại") */
  cancelIncomingRequests(userId: string): number {
    const before = rows.length;
    rows = rows.filter((r) => !(r.status === 'pending' && isMember(r, userId) && r.requestedBy !== userId && isDemo(r.requestedBy)));
    return before - rows.length;
  },
  /** Khóa/mở khóa người demo "Khoa" (test gửi lời mời tới tài khoản vừa bị khóa) */
  toggleDemoLock(): boolean {
    const khoa = demoPeople.find((p) => p.user.id === 'u-khoa')!;
    khoa.locked = !khoa.locked;
    return khoa.locked;
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const isDemo = (userId: string) => demoPeople.some((p) => p.user.id === userId);
const isMember = (row: Row, userId: string) => row.userA === userId || row.userB === userId;
const otherOf = (row: Row, userId: string) => (row.userA === userId ? row.userB : row.userA);

function findRow(x: string, y: string) {
  const [userA, userB] = pairKey(x, y);
  return rows.find((r) => r.userA === userA && r.userB === userB);
}

const toUserDto = (user: UserDto): FriendUserDto => ({ id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl });

/** Bỏ dấu tiếng Việt để tìm "lan" ra "Trần Thị Lan" */
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

type Fail = (status: number, code: string) => unknown;

export const isMockFriendPath = (path: string) => path === '/friends' || path.startsWith('/friends/');

export function handleFriendRequest(
  method: string,
  path: string,
  body: Record<string, unknown>,
  me: UserDto,
  authAccounts: DirectoryEntry[],
  config: InternalAxiosRequestConfig,
  fail: Fail,
): { status: number; data: unknown } | null {
  if (failure === 'offline') throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
  if (failure === 'server') throw fail(500, 'INTERNAL_SERVER_ERROR');

  const directory = [...authAccounts, ...demoPeople];
  const entryOf = (userId: string) => directory.find((e) => e.user.id === userId);
  const userDto = (userId: string): FriendUserDto => {
    const entry = entryOf(userId);
    return entry ? toUserDto(entry.user) : { id: userId, displayName: '?', avatarUrl: null };
  };
  const toRequestDto = (row: Row): FriendRequestDto => ({ id: row.id, user: userDto(otherOf(row, me.id)), createdAt: row.requestedAt });
  const toFriendDto = (row: Row): FriendDto => ({ friendshipId: row.id, user: userDto(otherOf(row, me.id)), since: row.respondedAt ?? row.requestedAt });
  const params = (config.params ?? {}) as Record<string, string>;

  if (method === 'get' && path === '/friends/search') {
    const q = normalize(String(params.q ?? '').trim());
    if (q.length < 2) return { status: 200, data: [] };
    const results: UserSearchResultDto[] = directory
      .filter((e) => e.user.id !== me.id && !e.locked)
      .filter((e) => normalize(e.user.displayName).includes(q) || e.user.email.toLowerCase().includes(q))
      .slice(0, Number(params.limit) || 20)
      .map((e) => {
        const row = findRow(me.id, e.user.id);
        if (!row || row.status === 'rejected') return { user: toUserDto(e.user), relationship: 'none' };
        if (row.status === 'accepted') return { user: toUserDto(e.user), relationship: 'friend' };
        return { user: toUserDto(e.user), relationship: row.requestedBy === me.id ? 'outgoing' : 'incoming', requestId: row.id };
      });
    return { status: 200, data: results };
  }

  if (method === 'get' && path === '/friends') {
    return { status: 200, data: rows.filter((r) => r.status === 'accepted' && isMember(r, me.id)).map(toFriendDto) };
  }

  if (method === 'get' && path === '/friends/requests') {
    const incoming = params.direction === 'incoming';
    const list = rows.filter(
      (r) => r.status === 'pending' && isMember(r, me.id) && (r.requestedBy === me.id) !== incoming,
    );
    return { status: 200, data: list.map(toRequestDto) };
  }

  if (method === 'post' && path === '/friends/requests') {
    const targetId = String(body.targetUserId ?? '');
    if (targetId === me.id) throw fail(400, 'SELF_FRIEND_REQUEST');
    const target = entryOf(targetId);
    if (!target) throw fail(404, 'USER_NOT_FOUND');
    if (target.locked) throw fail(403, 'TARGET_ACCOUNT_LOCKED');

    const now = new Date().toISOString();
    const row = findRow(me.id, targetId);
    if (row?.status === 'accepted') throw fail(409, 'ALREADY_FRIENDS');
    if (row?.status === 'pending' && row.requestedBy === me.id) throw fail(409, 'FRIEND_REQUEST_EXISTS');
    if (row?.status === 'pending') {
      // Đối phương đã gửi trước (hai người gửi gần như cùng lúc) → chấp nhận luôn
      Object.assign(row, { status: 'accepted', respondedAt: now });
      return { status: 200, data: { status: 'accepted', friend: toFriendDto(row) } satisfies SendRequestResultDto };
    }
    // TODO(BE-03): lời mời đã bị từ chối — mock cho gửi lại bằng cách mở lại dòng cũ
    const next: Row = row
      ? Object.assign(row, { id: nextId(), requestedBy: me.id, status: 'pending', requestedAt: now, respondedAt: undefined })
      : { id: nextId(), ...seedPair(me.id, targetId), requestedBy: me.id, status: 'pending', requestedAt: now };
    if (!row) rows.push(next);
    return { status: 201, data: { status: 'pending', request: toRequestDto(next) } satisfies SendRequestResultDto };
  }

  const requestMatch = /^\/friends\/requests\/([^/]+)(?:\/(accept|reject))?$/.exec(path);
  if (requestMatch) {
    const [, requestId, action] = requestMatch;
    const row = rows.find((r) => r.id === decodeURIComponent(requestId) && r.status === 'pending' && isMember(r, me.id));
    const isRecipient = row !== undefined && row.requestedBy !== me.id;

    if (method === 'post' && action === 'accept') {
      if (!row || !isRecipient) throw fail(404, 'FRIEND_REQUEST_NOT_FOUND');
      if (entryOf(row.requestedBy)?.locked) throw fail(403, 'TARGET_ACCOUNT_LOCKED');
      Object.assign(row, { status: 'accepted', respondedAt: new Date().toISOString() });
      return { status: 200, data: toFriendDto(row) };
    }
    if (method === 'post' && action === 'reject') {
      if (!row || !isRecipient) throw fail(404, 'FRIEND_REQUEST_NOT_FOUND');
      Object.assign(row, { status: 'rejected', respondedAt: new Date().toISOString() });
      return { status: 204, data: undefined };
    }
    if (method === 'delete' && !action) {
      if (!row || isRecipient) throw fail(404, 'FRIEND_REQUEST_NOT_FOUND');
      rows = rows.filter((r) => r !== row);
      return { status: 204, data: undefined };
    }
  }

  const friendMatch = /^\/friends\/([^/]+)$/.exec(path);
  if (method === 'delete' && friendMatch) {
    const row = findRow(me.id, decodeURIComponent(friendMatch[1]));
    if (!row || row.status !== 'accepted') throw fail(404, 'FRIENDSHIP_NOT_FOUND');
    rows = rows.filter((r) => r !== row);
    return { status: 204, data: undefined };
  }

  return null;
}

function seedPair(x: string, y: string) {
  const [userA, userB] = pairKey(x, y);
  return { userA, userB };
}
