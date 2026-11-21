import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { LocateFixed, ShieldCheck, Radar, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { useFriends } from '@/hooks/useFriends';
import { useLocation } from '@/hooks/useLocation';
import { FriendMarker, Friend } from '@/components/map/FriendMarker';
import { FriendInfoModal } from '@/components/map/FriendInfoModal';
import { InlineAlert } from '@/components/common/InlineAlert';
import { SkeletonBox } from '@/components/common/Skeleton';
import { useSocket } from '@/hooks/useSocket';
import { usePrivacyStore } from '@/store/usePrivacyStore';
import { locationService } from '@/services/locationService';
import { toApiError } from '@/services/apiClient';
import type { AppError } from '@/types/async';
import type {
  FriendLocationUnavailablePayload,
  FriendLocationUpdatedPayload,
  ProjectedLocationResponse,
} from '@/types/api';
import { routes } from '@/constants/routes';
import type { LocationUpdatedPayload } from '@/hooks/useSocket';

const FRIEND_LOCATION_TTL_MS = 300_000;

function mapProjectedToFriend(
  ownerId: string,
  loc: ProjectedLocationResponse,
  metaName?: string
): Friend {
  const updatedAt = new Date(loc.recordedAt);
  return {
    userId: ownerId,
    name: metaName ?? `#${ownerId.slice(0, 6)}`,
    lat: loc.latitude,
    lng: loc.longitude,
    accuracy: loc.accuracy,
    updatedAt,
    isStale: Date.now() - updatedAt.getTime() > FRIEND_LOCATION_TTL_MS,
    precision: loc.isApproximate ? 'approximate' : 'precise',
  };
}

async function fetchActiveLiveLocations(): Promise<Friend[]> {
  const live = await locationService.listFriendLiveLocations();
  const nowMs = Date.now();
  return live.items
    .filter(
      (item) => nowMs - new Date(item.location.recordedAt).getTime() <= FRIEND_LOCATION_TTL_MS
    )
    .map((item) => mapProjectedToFriend(item.ownerId, item.location));
}

export default function FriendMapScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef<MapView>(null);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [locationError, setLocationError] = useState<AppError | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasLoadedLiveLocations, setHasLoadedLiveLocations] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { status: socketStatus, on, off } = useSocket();
  const { settings, fetchPrivacySettings, isEffectiveSharingActive } = usePrivacyStore();
  const { state: friendsState, friends: friendList, refresh: refreshFriends } = useFriends();
  const {
    syncError: publishError,
    clearSyncError,
    publishSingleSample,
    startSharing,
    stopSharing,
  } = useLocation();
  const isSharingEnabled = isEffectiveSharingActive();

  const friendMetaById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of friendList) {
      map.set(item.user.id, item.user.name);
    }
    return map;
  }, [friendList]);

  const displayedFriends = useMemo(
    () =>
      friends.map((friend) => ({
        ...friend,
        name: friendMetaById.get(friend.userId) ?? friend.name,
      })),
    [friends, friendMetaById]
  );

  const activeSelectedFriend = useMemo(() => {
    if (!selectedFriend) return null;
    return displayedFriends.find((f) => f.userId === selectedFriend.userId) ?? selectedFriend;
  }, [displayedFriends, selectedFriend]);

  const isSelectedFriendVisible =
    modalVisible &&
    Boolean(
      activeSelectedFriend &&
        displayedFriends.some((f) => f.userId === activeSelectedFriend.userId)
    );

  useEffect(() => {
    void fetchPrivacySettings();
  }, [fetchPrivacySettings]);

  useEffect(() => {
    if (!isSharingEnabled) {
      stopSharing();
      return;
    }
    let cancelled = false;
    const begin = async () => {
      if (cancelled) return;
      await startSharing();
    };
    void begin();
    return () => {
      cancelled = true;
      stopSharing();
    };
  }, [isSharingEnabled, startSharing, stopSharing]);

  const loadFriendLocations = useCallback(async () => {
    try {
      const visible = await fetchActiveLiveLocations();
      setFriends(visible);
      setLocationError(null);
      setHasLoadedLiveLocations(true);
    } catch (err) {
      setLocationError(toApiError(err));
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void socketStatus;
    fetchActiveLiveLocations()
      .then((visible) => {
        if (!active) return;
        setFriends(visible);
        setLocationError(null);
        setHasLoadedLiveLocations(true);
      })
      .catch((err) => {
        if (!active) return;
        setLocationError(toApiError(err));
      })
      .finally(() => {
        if (active) setIsInitialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [socketStatus]);

  useEffect(() => {
    const expiryTimer = setInterval(() => {
      const nowMs = Date.now();
      setFriends((prev) => {
        const active = prev.filter(
          (f) => nowMs - f.updatedAt.getTime() <= FRIEND_LOCATION_TTL_MS
        );
        return active.length === prev.length ? prev : active;
      });
    }, 30_000);
    return () => clearInterval(expiryTimer);
  }, []);

  useEffect(() => {
    const upsertProjectedLocation = (ownerId: string, loc: ProjectedLocationResponse) => {
      const mapped = mapProjectedToFriend(ownerId, loc);
      setFriends((prev) => {
        const exists = prev.some((f) => f.userId === ownerId);
        return exists ? prev.map((f) => (f.userId === ownerId ? mapped : f)) : [...prev, mapped];
      });
    };

    const handleFriendLiveUpdated = (payload: FriendLocationUpdatedPayload) => {
      if (!payload?.ownerId || !payload?.location) return;
      upsertProjectedLocation(payload.ownerId, payload.location);
    };

    const handleFriendLiveUnavailable = (payload: FriendLocationUnavailablePayload) => {
      if (!payload?.ownerId) return;
      setFriends((prev) => prev.filter((f) => f.userId !== payload.ownerId));
      setSelectedFriend((prev) => (prev?.userId === payload.ownerId ? null : prev));
    };

    const applyRealtimePayload = (
      payload: LocationUpdatedPayload & { precision?: 'precise' | 'approximate' }
    ) => {
      const targetId = payload.ownerId ?? payload.userId;
      if (!targetId) return;

      const lat = payload.location?.latitude ?? payload.lat;
      const lng = payload.location?.longitude ?? payload.lng;
      const accuracy = payload.location?.accuracy ?? payload.accuracy ?? 15;
      const recordedAt = payload.location?.recordedAt ?? payload.updatedAt;
      const isApprox = payload.location?.isApproximate;

      if (typeof lat === 'number' && typeof lng === 'number') {
        const precision =
          isApprox === true || payload.precision === 'approximate' || accuracy >= 1000
            ? 'approximate'
            : 'precise';
        const updatedAt = recordedAt ? new Date(recordedAt) : new Date();
        setFriends((prev) => {
          const exists = prev.some((f) => f.userId === targetId);
          if (exists) {
            return prev.map((f) =>
              f.userId === targetId
                ? { ...f, lat, lng, accuracy, updatedAt, isStale: false, precision }
                : f
            );
          }
          return [
            ...prev,
            {
              userId: targetId,
              name: `#${targetId.slice(0, 6)}`,
              lat,
              lng,
              accuracy,
              updatedAt,
              isStale: false,
              precision,
            },
          ];
        });
        return;
      }

      // Integration event LocationUpdated.v1 only references ownerId → refetch projected location
      void locationService
        .getProjectedLocation({ ownerId: targetId, scope: 'friends' })
        .then((loc) => {
          if (!loc) return;
          upsertProjectedLocation(targetId, loc);
        })
        .catch(() => {});
    };

    const registered: Parameters<typeof off>[0][] = [];
    const subscribe = <T,>(event: Parameters<typeof on<T>>[0], handler: (data: T) => void) => {
      registered.push(event);
      on(event, handler);
    };

    subscribe('friend:location:updated', handleFriendLiveUpdated);
    subscribe('friend:location:unavailable', handleFriendLiveUnavailable);
    subscribe('location:updated', applyRealtimePayload);
    subscribe('LocationUpdated', applyRealtimePayload);
    subscribe('LocationUpdated.v1', applyRealtimePayload);

    return () => {
      registered.forEach((event) => off(event));
    };
  }, [on, off, socketStatus]);

  const handleFriendPress = useSinglePress((friend: Friend) => {
    setSelectedFriend(friend);
    setModalVisible(true);
    void locationService
      .checkPermission({ ownerId: friend.userId, scope: 'friends' })
      .then((perm) => {
        if (!perm.allowed || !perm.precision) return;
        const nextPrecision = perm.precision;
        setSelectedFriend((prev) =>
          prev && prev.userId === friend.userId
            ? { ...prev, precision: nextPrecision }
            : prev
        );
        setFriends((prev) =>
          prev.map((item) =>
            item.userId === friend.userId
              ? { ...item, precision: nextPrecision }
              : item
          )
        );
      })
      .catch(() => {});
  }, 400);

  const handleCenterMyLocation = useSinglePress(async () => {
    let latitude = 10.7769;
    let longitude = 106.7009;
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.granted) {
        const pos =
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null)) ?? (await Location.getLastKnownPositionAsync());
        if (pos) {
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          if (isEffectiveSharingActive()) {
            void publishSingleSample();
          }
        }
      }
    } catch {
      // Fallback to default region center
    }
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      600
    );
  }, 500);

  const handleGoPrivacy = useSinglePress(() => {
    router.push(routes.settingsLocation);
  }, 500);

  const handleGoNearby = useSinglePress(() => {
    router.push(routes.settingsNearby);
  }, 500);

  const handleRefreshLocations = useSinglePress(async () => {
    clearSyncError();
    await refreshFriends();
    await loadFriendLocations();
  }, 500);

  const STATUS_LABEL: Record<typeof socketStatus, string> = {
    connected: t('fe2.map.socket_connected'),
    disconnected: t('fe2.map.socket_disconnected'),
  };

  const STATUS_COLORS = {
    connected: { bg: colors.successLight, dot: colors.success },
    disconnected: { bg: colors.dangerLight, dot: colors.danger },
  };

  const activeError =
    locationError ??
    publishError ??
    (!hasLoadedLiveLocations && friendsState.status === 'error' ? friendsState.error : null);

  const myPrivacyLabel = useMemo(() => {
    if (!isEffectiveSharingActive()) return t('fe2.map.my_status_off');
    if (settings.useApproximateLocation) return t('fe2.map.my_status_approx');
    return t('fe2.map.my_status_precise');
  }, [isEffectiveSharingActive, settings.useApproximateLocation, t]);

  return (
    <View style={styles.container}>
      {/* Top Status & Quick Action Bar */}
      <View style={[styles.statusBar, { backgroundColor: STATUS_COLORS[socketStatus].bg }]}>
        <TouchableOpacity
          style={styles.statusLeft}
          onPress={handleRefreshLocations}
          activeOpacity={0.75}
        >
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[socketStatus].dot }]} />
          <Text style={styles.statusText} numberOfLines={1} ellipsizeMode="tail">
            {STATUS_LABEL[socketStatus]}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusActions}>
          <TouchableOpacity
            style={[
              styles.myPrivacyPill,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleGoPrivacy}
          >
            <Text style={[styles.myPrivacyText, { color: colors.text }]} numberOfLines={1}>
              {myPrivacyLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.movePill, { backgroundColor: colors.primary }]}
            onPress={handleRefreshLocations}
          >
            <RefreshCw size={11} color="#fff" />
            <Text style={styles.movePillText} numberOfLines={1}>
              {t('fe2.common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeError && (
        <View style={{ paddingHorizontal: 10, paddingTop: 6 }}>
          <InlineAlert
            tone="danger"
            title={t(`errors.${activeError.code}.title` as any)}
            message={t(`errors.${activeError.code}.description` as any)}
          />
        </View>
      )}

      {isInitialLoading && displayedFriends.length === 0 && (
        <View
          style={[
            styles.loadingBanner,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <SkeletonBox width={14} height={14} borderRadius={7} />
          <Text style={[styles.loadingBannerText, { color: colors.subtext }]}>
            {t('fe2.map.loading_live_locations')}
          </Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 10.7769,
          longitude: 106.7009,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {displayedFriends.map((friend) => (
          <FriendMarker key={friend.userId} friend={friend} onPress={handleFriendPress} />
        ))}
      </MapView>

      {/* Floating Action Buttons (FABs) */}
      <View style={styles.fabColumn}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleGoPrivacy}
          accessibilityLabel={t('fe2.map.settings_shortcut')}
        >
          <ShieldCheck size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleGoNearby}
          accessibilityLabel={t('fe2.map.nearby_shortcut')}
        >
          <Radar size={20} color={colors.purple} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={handleCenterMyLocation}
          accessibilityLabel={t('fe2.map.my_location')}
        >
          <LocateFixed size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        {[
          { color: colors.primary, label: t('fe2.map.legend_fresh') },
          { color: '#8b5cf6', label: t('fe2.map.legend_approximate') },
          { color: colors.warning, label: t('fe2.map.legend_stale') },
          { color: colors.placeholder, label: t('fe2.map.legend_offline') },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Friend Detail Bottom Sheet Modal */}
      <FriendInfoModal
        visible={isSelectedFriendVisible}
        friend={activeSelectedFriend}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    loadingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderBottomWidth: 1,
    },
    loadingBannerText: { fontSize: 12, fontWeight: '500' },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 7,
      gap: 6,
    },
    statusLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    statusText: { flexShrink: 1, fontSize: 12, color: c.subtext, fontWeight: '600' },
    statusActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    myPrivacyPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    myPrivacyText: { fontSize: 11, fontWeight: '600' },
    movePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 12,
    },
    movePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    legend: {
      position: 'absolute',
      bottom: 24,
      left: 12,
      backgroundColor: c.surface,
      borderRadius: 10,
      padding: 10,
      gap: 6,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 11, color: c.subtext },
    fabColumn: {
      position: 'absolute',
      right: 16,
      bottom: 24,
      gap: 12,
      alignItems: 'center',
    },
    fab: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
  });
