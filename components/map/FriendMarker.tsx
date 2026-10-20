/**
 * FriendMarker — Marker bạn bè trên bản đồ (FE-05)
 * Hỗ trợ độ chính xác vị trí theo contract Backend 1 S2:
 * - Precise: ghim chính xác với độ chính xác gốc
 * - Approximate: làm tròn 2 số thập phân (~1.1 km), hiển thị huy hiệu khiên bảo mật
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react-native';
import { useSinglePress } from '../../hooks/useSinglePress';
import { LocationPrecision } from '../../types/privacy';

export type Friend = {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: Date;
  isStale: boolean;
  precision?: LocationPrecision;
};

type Props = {
  friend: Friend;
  onPress?: (friend: Friend) => void;
};

// Màu marker overlay trên bản đồ
const FRESH_COLOR = '#3b82f6';
const STALE_COLOR = '#f97316';
const APPROX_COLOR = '#8b5cf6'; // Tím cho approximate privacy location

export function FriendMarker({ friend, onPress }: Props) {
  const { t } = useTranslation();
  const handlePress = useSinglePress(() => onPress?.(friend), 600);
  const [now] = useState(() => Date.now());

  function formatUpdatedAt(date: Date): string {
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('fe2.map.just_updated');
    if (diffMin < 60) return t('fe2.map.minutes_ago', { count: diffMin });
    return t('fe2.map.hours_ago', { count: Math.floor(diffMin / 60) });
  }

  const isApproximate = friend.precision === 'approximate' || friend.accuracy >= 1000;
  let bubbleColor = friend.isStale ? STALE_COLOR : FRESH_COLOR;
  if (isApproximate && !friend.isStale) {
    bubbleColor = APPROX_COLOR;
  }

  return (
    <Marker
      coordinate={{ latitude: friend.lat, longitude: friend.lng }}
      onPress={handlePress}
    >
      <View style={styles.container}>
        <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
          <View style={styles.titleRow}>
            {isApproximate && <Shield size={12} color="#fff" style={{ marginRight: 3 }} />}
            <Text style={styles.name} numberOfLines={1}>{friend.name}</Text>
          </View>

          <Text style={styles.time}>{formatUpdatedAt(friend.updatedAt)}</Text>

          {friend.isStale && (
            <Text style={styles.staleLabel}>{t('fe2.common.stale_label')}</Text>
          )}

          {isApproximate && !friend.isStale && (
            <Text style={styles.approxLabel}>{t('fe2.map.precision_approximate')}</Text>
          )}

          {!isApproximate && friend.accuracy > 100 && !friend.isStale && (
            <Text style={styles.accuracyWarn}>~{Math.round(friend.accuracy)}m</Text>
          )}
        </View>
        <View style={[styles.pin, { borderTopColor: bubbleColor }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  bubble: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 145,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  name: { color: '#fff', fontWeight: '700', fontSize: 12 },
  time: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 2 },
  staleLabel: { color: '#fff', fontSize: 10, fontWeight: '600', marginTop: 2 },
  approxLabel: { color: '#ede9fe', fontSize: 9, fontWeight: '700', marginTop: 2 },
  accuracyWarn: { color: '#fde68a', fontSize: 10, marginTop: 2 },
  pin: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
