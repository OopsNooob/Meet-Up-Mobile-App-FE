/**
 * FE-04 + FE-06 — Hook quản lý GPS permission và phát vị trí qua Socket
 * Đồng bộ với chính sách quyền riêng tư từ Backend (docs/11_location_privacy_api.md)
 */
import { useState, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { usePrivacyStore } from '../store/usePrivacyStore';

export type LocationState = {
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: Date;
  isStale: boolean; // true nếu > 5 phút
  isApproximate?: boolean;
};

type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

const STALE_TTL_MS = 5 * 60 * 1000; // 5 phút

// Mock vị trí Hồ Chí Minh để test UI
const MOCK_LOCATION = { lat: 10.7769, lng: 106.7009, accuracy: 15 };

export function useLocation() {
  const [permission, setPermission] = useState<PermissionStatus>('granted');
  const [location, setLocation] = useState<LocationState | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { emit } = useSocket();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { settings, isEffectiveSharingActive } = usePrivacyStore();

  // Kiểm tra stale mỗi 30s
  useEffect(() => {
    const staleCheck = setInterval(() => {
      setLocation((prev) => {
        if (!prev) return prev;
        const isStale = Date.now() - prev.updatedAt.getTime() > STALE_TTL_MS;
        return { ...prev, isStale };
      });
    }, 30_000);
    return () => clearInterval(staleCheck);
  }, []);

  const requestPermission = async () => {
    setPermission('granted');
  };

  const getEffectiveSample = (): LocationState => {
    const now = new Date();
    if (settings.useApproximateLocation) {
      // Làm tròn 2 số thập phân (~1.1km) theo quy ước Backend S2
      const approxLat = Math.round(MOCK_LOCATION.lat * 100) / 100;
      const approxLng = Math.round(MOCK_LOCATION.lng * 100) / 100;
      return {
        lat: approxLat,
        lng: approxLng,
        accuracy: Math.max(MOCK_LOCATION.accuracy, 1000),
        updatedAt: now,
        isStale: false,
        isApproximate: true,
      };
    }
    return {
      ...MOCK_LOCATION,
      updatedAt: now,
      isStale: false,
      isApproximate: false,
    };
  };

  const startSharing = () => {
    if (permission !== 'granted') return;
    if (!isEffectiveSharingActive()) return;

    setIsSharing(true);

    const publishLocation = () => {
      if (!isEffectiveSharingActive()) {
        stopSharing();
        return;
      }
      const sample = getEffectiveSample();
      setLocation(sample);
      emit('location:update', {
        lat: sample.lat,
        lng: sample.lng,
        accuracy: sample.accuracy,
        timestamp: sample.updatedAt.toISOString(),
        mode: settings.sharingMode,
      });
    };

    // Gửi ngay lập tức
    publishLocation();

    // Định kỳ 30s
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(publishLocation, 30_000);
  };

  const stopSharing = () => {
    setIsSharing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return { permission, location, isSharing, requestPermission, startSharing, stopSharing };
}
