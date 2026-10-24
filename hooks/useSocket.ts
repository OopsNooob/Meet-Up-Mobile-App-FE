/**
 * FE-06 — Socket client và vòng đời location
 * - Kết nối Socket.IO với JWT auth
 * - Reconnect an toàn, không nhân đôi listener
 * - Subscribe/unsubscribe event vị trí và meetup
 */
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { onLogout, useAuthStore } from '../store/useAuthStore';

const SOCKET_URL = 'http://10.0.2.2:3000'; // Android Emulator → localhost

type SocketEvent =
  | 'LocationUpdated'
  | 'MeetupMemberChanged'
  | 'PreferenceUpdated'
  | 'RecommendationReady'
  | 'VoteUpdated'
  | 'MeetupFinalized';

export type LocationUpdatedPayload = {
  userId: string;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: string; // ISO string
};

let globalSocket: Socket | null = null;

export function useSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const listenerMapRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  // Khởi tạo kết nối 1 lần duy nhất
  useEffect(() => {
    if (!token) return;
    if (globalSocket?.connected) return;

    globalSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    globalSocket.on('connect', () => {
      console.log('[Socket] Connected:', globalSocket?.id);
    });

    globalSocket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    globalSocket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      // Không disconnect khi component unmount — socket dùng chung toàn app
      // Chỉ disconnect khi logout (gọi disconnectSocket)
    };
  }, [token]);

  /**
   * Đăng ký lắng nghe event — tự dọn listener cũ trước khi thêm mới
   * → tránh nhân đôi listener khi component re-mount hoặc reconnect
   */
  const on = useCallback(<T = unknown>(event: SocketEvent, handler: (data: T) => void) => {
    if (!globalSocket) return;

    const key = event;
    // Xóa listener cũ nếu có
    const oldHandler = listenerMapRef.current.get(key);
    if (oldHandler) {
      globalSocket.off(event, oldHandler);
    }

    globalSocket.on(event, handler as any);
    listenerMapRef.current.set(key, handler as any);
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

  const isConnected = () => globalSocket?.connected ?? false;

  return { on, off, emit, isConnected };
}

// FE-01: phiên kết thúc (đăng xuất / hết hạn / bị khóa) → ngắt socket để không giữ kết nối của user cũ
onLogout(() => disconnectSocket());

/** Gọi khi logout để ngắt kết nối hoàn toàn */
export function disconnectSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
    console.log('[Socket] Disconnected by user logout');
  }
}
