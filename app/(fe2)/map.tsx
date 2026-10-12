import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useSinglePress } from '../../hooks/useSinglePress';
import { FriendMarker, Friend } from '../../components/map/FriendMarker';
import { useSocket } from '../../hooks/useSocket';
import type { LocationUpdatedPayload } from '../../hooks/useSocket';

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
    lng: 106.70,
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

  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const { on, off, isConnected } = useSocket();

  useEffect(() => {
    const timer = setTimeout(() => setSocketStatus(isConnected() ? 'connected' : 'disconnected'), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    on<LocationUpdatedPayload & { precision?: 'precise' | 'approximate' }>('LocationUpdated', (payload) => {
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
                precision: payload.precision || (payload.accuracy >= 1000 ? 'approximate' : 'precise'),
              }
            : f
        )
      );
    });
    return () => off('LocationUpdated');
  }, [on, off]);

  const handleFriendPress = useSinglePress((friend: Friend) => {
    const diffMin = Math.round((Date.now() - friend.updatedAt.getTime()) / 60000);
    const timeLabel = diffMin < 1 ? t('fe2.map.just_updated') : t('fe2.map.minutes_ago', { count: diffMin });
    const isApprox = friend.precision === 'approximate' || friend.accuracy >= 1000;

    let msg = `${friend.name}\n${timeLabel}`;
    if (friend.isStale) {
      msg += `\n⚠️ ${t('fe2.common.stale_label')}`;
    }
    if (isApprox) {
      msg += `\n🛡️ ${t('fe2.map.precision_approximate')} — Làm tròn 2 số thập phân`;
    } else {
      msg += `\n${t('fe2.map.accuracy_label')}: ~${Math.round(friend.accuracy)}m`;
    }

    Alert.alert(t('fe2.map.location_info'), msg);
  }, 600);

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

  return (
    <View style={styles.container}>
      <View style={[styles.statusBar, { backgroundColor: STATUS_COLORS[socketStatus].bg }]}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[socketStatus].dot }]} />
        <Text style={styles.statusText}>{STATUS_LABEL[socketStatus]}</Text>
      </View>

      <MapView
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
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, color: c.subtext },
    legend: {
      position: 'absolute',
      bottom: 24,
      right: 12,
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
  });
