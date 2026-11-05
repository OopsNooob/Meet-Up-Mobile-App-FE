import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { LocateFixed, ShieldCheck, Radar, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { FriendMarker, Friend } from '@/components/map/FriendMarker';
import { FriendInfoModal } from '@/components/map/FriendInfoModal';
import { useSocket } from '@/hooks/useSocket';
import { usePrivacyStore } from '@/store/usePrivacyStore';
import { routes } from '@/constants/routes';
import type { LocationUpdatedPayload } from '@/hooks/useSocket';

const MOCK_FRIENDS: Friend[] = [
  {
    userId: 'u1',
    name: 'Việt',
    lat: 10.7769,
    lng: 106.7009,
    accuracy: 12,
    updatedAt: new Date(),
    isStale: false,
    precision: 'precise',
  },
  {
    userId: 'u2',
    name: 'Minh',
    lat: 10.7795,
    lng: 106.6988,
    accuracy: 45,
    updatedAt: new Date(Date.now() - 7 * 60 * 1000),
    isStale: true,
    precision: 'precise',
  },
  {
    userId: 'u3',
    name: 'Lan',
    lat: 10.77,
    lng: 106.7,
    accuracy: 1000,
    updatedAt: new Date(Date.now() - 2 * 60 * 1000),
    isStale: false,
    precision: 'approximate',
  },
];

export default function FriendMapScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef<MapView>(null);

  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting'
  );
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { on, off, isConnected } = useSocket();
  const { settings, isEffectiveSharingActive } = usePrivacyStore();

  useEffect(() => {
    const timer = setTimeout(
      () => setSocketStatus(isConnected() ? 'connected' : 'disconnected'),
      1000
    );
    return () => clearTimeout(timer);
  }, [isConnected]);

  useEffect(() => {
    on<LocationUpdatedPayload & { precision?: 'precise' | 'approximate' }>(
      'LocationUpdated',
      (payload) => {
        setFriends((prev) =>
          prev.map((f) =>
            f.userId === payload.userId
              ? {
                  ...f,
                  lat: payload.lat,
                  lng: payload.lng,
                  accuracy: payload.accuracy,
                  updatedAt: new Date(payload.updatedAt),
                  isStale: false,
                  precision:
                    payload.precision || (payload.accuracy >= 1000 ? 'approximate' : 'precise'),
                }
              : f
          )
        );
      }
    );
    return () => off('LocationUpdated');
  }, [on, off]);

  const handleFriendPress = useSinglePress((friend: Friend) => {
    setSelectedFriend(friend);
    setModalVisible(true);
  }, 400);

  const handleCenterMyLocation = useSinglePress(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: 10.7769,
        longitude: 106.7009,
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

  // Cập nhật vị trí bạn bè theo thời gian thực để test ngay trên bản đồ
  const handleSimulateMovement = useSinglePress(() => {
    setFriends((prev) =>
      prev.map((f) => {
        const deltaLat = (Math.random() - 0.5) * 0.0025;
        const deltaLng = (Math.random() - 0.5) * 0.0025;
        return {
          ...f,
          lat: Number((f.lat + deltaLat).toFixed(5)),
          lng: Number((f.lng + deltaLng).toFixed(5)),
          updatedAt: new Date(),
          isStale: false,
        };
      })
    );
  }, 400);

  const toggleSocketConnection = () => {
    setSocketStatus((prev) => (prev === 'connected' ? 'disconnected' : 'connected'));
  };

  const STATUS_LABEL: Record<typeof socketStatus, string> = {
    connecting: t('fe2.map.socket_connecting'),
    connected: t('fe2.map.socket_connected'),
    disconnected: t('fe2.map.socket_disconnected'),
  };

  const STATUS_COLORS = {
    connecting: { bg: colors.warningLight, dot: colors.warning },
    connected: { bg: colors.successLight, dot: colors.success },
    disconnected: { bg: colors.dangerLight, dot: colors.danger },
  };

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
          onPress={toggleSocketConnection}
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
            onPress={handleSimulateMovement}
          >
            <RefreshCw size={11} color="#fff" />
            <Text style={styles.movePillText} numberOfLines={1}>
              {t('fe2.map.simulate_move_btn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
        {friends.map((friend) => (
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
        visible={modalVisible}
        friend={selectedFriend}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
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
