/**
 * FE-06 — Socket client và vòng đời location
 * - Kết nối Socket.IO với JWT auth
 * - Reconnect an toàn, không nhân đôi listener
 * - Subscribe/unsubscribe event vị trí và meetup
 */
import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/services/apiClient';
import { onLogout, useAuthStore } from '../store/useAuthStore';

const SOCKET_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const SOCKET_URL = `${SOCKET_ORIGIN}/realtime`;
const HEARTBEAT_INTERVAL_MS = 30_000;

export type SocketEvent =
  | 'location:updated'
  | 'LocationUpdated'
  | 'LocationUpdated.v1'
  | 'friend:location:updated'
  | 'friend:location:unavailable'
  | 'MeetupCreated.v1'
  | 'MeetupUpdated.v1'
  | 'MeetupCancelled.v1'
  | 'MeetupFinished.v1'
  | 'MeetupMemberChanged'
  | 'MeetupMemberChanged.v1'
  | 'MeetupInviteLinkAccepted'
  | 'MeetupInviteLinkAccepted.v1'
  | 'PreferenceUpdated'
  | 'PreferenceUpdated.v1'
  | 'RecommendationReady'
  | 'RecommendationReady.v1'
  | 'VoteUpdated'
  | 'VoteUpdated.v1'
  | 'MeetupFinalized'
  | 'MeetupFinalized.v1'
  | 'meetup:chat-message'
  | 'MeetupChatMessageCreated.v1'
  | 'direct:chat-message'
  | 'DirectChatMessageCreated.v1'
  | 'NearbyDetected.v1';

export type LocationUpdatedPayload = {
  userId?: string;
  ownerId?: string;
  meetupId?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  updatedAt?: string; // ISO string
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    recordedAt: string;
    isApproximate: boolean;
  };
};

type SocketStatus = 'connected' | 'disconnected';

let globalSocket: Socket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let currentStatus: SocketStatus = 'disconnected';
const statusListeners = new Set<() => void>();

function notifyStatus(next: SocketStatus) {
  if (currentStatus === next) return;
  currentStatus = next;
  statusListeners.forEach((listener) => listener());
}

function subscribeStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function getStatusSnapshot(): SocketStatus {
  return currentStatus;
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (globalSocket?.connected) {
      globalSocket.emit('presence:heartbeat');
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function ensureSocketConnected() {
  if (!globalSocket) {
    const socket = io(SOCKET_URL, {
      auth: (cb) => {
        cb({ token: useAuthStore.getState().accessToken });
      },
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15_000,
    });

    socket.on('connect', () => {
      startHeartbeat();
      socket.emit('presence:heartbeat');
      notifyStatus('connected');
    });

    socket.on('disconnect', () => {
      stopHeartbeat();
      notifyStatus('disconnected');
    });

    socket.on('connect_error', (err: Error) => {
      notifyStatus('disconnected');
      console.warn('[Socket] Connection error:', err.message);
    });

    globalSocket = socket;
    return;
  }

  if (!globalSocket.active) {
    globalSocket.connect();
  }
}

export function useSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const listenerMapRef = useRef<Map<string, (...args: unknown[]) => void>>(new Map());
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const status = useSyncExternalStore(subscribeStatus, getStatusSnapshot, getStatusSnapshot);

  // Khởi tạo kết nối 1 lần duy nhất ở tầng singleton
  useEffect(() => {
    if (!token) return;
    ensureSocketConnected();
  }, [token]);

  /**
   * Đăng ký lắng nghe event — tự dọn listener cũ trước khi thêm mới
   * → tránh nhân đôi listener khi component re-mount hoặc reconnect
   */
  const on = useCallback(<T = unknown>(event: SocketEvent, handler: (data: T) => void) => {
    if (!globalSocket) return;

    const key = event;
    const oldHandler = listenerMapRef.current.get(key);
    if (oldHandler) {
      globalSocket.off(event, oldHandler);
    }

    const wrappedHandler = (data: T) => {
      const maybeObj = data as Record<string, unknown> | null;
      const eventId =
        (typeof maybeObj?.eventId === 'string' && maybeObj.eventId) ||
        (typeof maybeObj?.messageId === 'string' && maybeObj.messageId) ||
        (typeof maybeObj?.id === 'string' && maybeObj.id) ||
        null;
      if (eventId) {
        const processed = processedEventIdsRef.current;
        const key = `${event}:${eventId}`;
        if (processed.has(key)) return;
        processed.add(key);
        if (processed.size > 300) {
          const oldest = processed.values().next().value;
          if (oldest) processed.delete(oldest);
        }
      }
      handler(data);
    };

    globalSocket.on(event, wrappedHandler as (...args: unknown[]) => void);
    listenerMapRef.current.set(key, wrappedHandler as (...args: unknown[]) => void);
  }, []);

  const off = useCallback((event: SocketEvent) => {
    if (!globalSocket) return;
    const handler = listenerMapRef.current.get(event);
    if (handler) {
      globalSocket.off(event, handler);
      listenerMapRef.current.delete(event);
    }
  }, []);

  const emit = useCallback((event: string, payload?: unknown) => {
    if (!globalSocket?.connected) {
      console.warn('[Socket] Emit skipped — not connected');
      return;
    }
    globalSocket.emit(event, payload);
  }, []);

  const joinMeetup = useCallback((meetupId: string) => {
    if (!meetupId) return;
    if (globalSocket?.connected) {
      globalSocket.emit('meetup:join', { meetupId });
    }
  }, []);

  const isConnected = useCallback(() => globalSocket?.connected ?? false, []);

  return { status, isConnected, emit, on, off, joinMeetup };
}

// FE-01: phiên kết thúc (đăng xuất / hết hạn / bị khóa) → ngắt socket để không giữ kết nối của user cũ
onLogout(() => disconnectSocket());

/** Gọi khi logout để ngắt kết nối hoàn toàn */
export function disconnectSocket() {
  stopHeartbeat();
  if (globalSocket) {
    globalSocket.removeAllListeners();
    globalSocket.disconnect();
    globalSocket = null;
    console.log('[Socket] Disconnected by user logout');
  }
  notifyStatus('disconnected');
}
