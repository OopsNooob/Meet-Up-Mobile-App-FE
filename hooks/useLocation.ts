/**
 * FE-05 & FE-06 — Hook quản lý GPS permission và phát vị trí qua Socket
 */
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useSocket } from './useSocket';
import { usePrivacyStore } from '../store/usePrivacyStore';

export type LocationState = {
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: Date;
  isStale: boolean;
  isApproximate?: boolean;
};

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

const STALE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_LOCATION = { lat: 10.7769, lng: 106.7009, accuracy: 15 };

export function useLocation() {
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [location, setLocation] = useState<LocationState | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { emit } = useSocket();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { settings, isEffectiveSharingActive } = usePrivacyStore();

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((res) => {
        if (res.granted) setPermission('granted');
        else if (!res.canAskAgain) setPermission('blocked');
        else if (res.status === 'denied') setPermission('denied');
        else setPermission('undetermined');
      })
      .catch(() => setPermission('granted'));
  }, []);

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
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      if (res.granted) {
        setPermission('granted');
        return true;
      }
      setPermission(res.canAskAgain ? 'denied' : 'blocked');
      return false;
    } catch {
      setPermission('denied');
      return false;
    }
  };

  const fetchRealSample = async (): Promise<LocationState> => {
    const now = new Date();
    let coords = FALLBACK_LOCATION;

    try {
      let pos: Location.LocationObject | null = null;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch {
        pos = await Location.getLastKnownPositionAsync();
      }
      if (pos) {
        coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 15,
        };
      }
    } catch {
      // Keep fallback coordinates when location services are disabled
    }

    if (settings.useApproximateLocation) {
      const approxLat = Math.round(coords.lat * 100) / 100;
      const approxLng = Math.round(coords.lng * 100) / 100;
      return {
        lat: approxLat,
        lng: approxLng,
        accuracy: Math.max(coords.accuracy, 1000),
        updatedAt: now,
        isStale: false,
        isApproximate: true,
      };
    }

    return {
      ...coords,
      updatedAt: now,
      isStale: false,
      isApproximate: false,
    };
  };

  const stopSharing = () => {
    setIsSharing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startSharing = async () => {
    const granted = permission === 'granted' ? true : await requestPermission();
    if (!granted) return;
    if (!isEffectiveSharingActive()) return;

    setIsSharing(true);

    const publishLocation = async () => {
      if (!isEffectiveSharingActive()) {
        stopSharing();
        return;
      }
      const sample = await fetchRealSample();
      setLocation(sample);
      emit('location:update', {
        latitude: sample.lat,
        longitude: sample.lng,
        accuracy: sample.accuracy,
        recordedAt: sample.updatedAt.toISOString(),
      });
    };

    void publishLocation();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      void publishLocation();
    }, 30_000);
  };

  return {
    permission,
    setPermission,
    location,
    isSharing,
    requestPermission,
    startSharing,
    stopSharing,
  };
}
