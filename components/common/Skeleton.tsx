import { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SkeletonBoxProps {
  width?: number | `${number}%` | 'auto';
  height?: number | `${number}%`;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonBoxProps) {
  const { isDark } = useTheme();
  const [opacityAnim] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacityAnim]);

  const baseColor = isDark ? '#334155' : '#cbd5e1';

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: baseColor,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton mô phỏng 1 thẻ PlaceCard trong danh sách gợi ý địa điểm (FE-10)
 */
export function PlaceCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width={45} height={12} borderRadius={4} />
          <SkeletonBox width="80%" height={18} borderRadius={6} />
          <SkeletonBox width="60%" height={12} borderRadius={4} />
        </View>
        <SkeletonBox width={65} height={22} borderRadius={6} />
      </View>

      {/* Info Row */}
      <View style={styles.infoRow}>
        <SkeletonBox width={60} height={20} borderRadius={8} />
        <SkeletonBox width={75} height={20} borderRadius={8} />
      </View>

      {/* ETA Boxes */}
      <View style={styles.etaRow}>
        <View style={[styles.etaBox, { backgroundColor: colors.surfaceAlt }]}>
          <SkeletonBox width={50} height={10} borderRadius={4} />
          <SkeletonBox width={65} height={16} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <View style={[styles.etaBox, { backgroundColor: colors.surfaceAlt }]}>
          <SkeletonBox width={50} height={10} borderRadius={4} />
          <SkeletonBox width={65} height={16} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Member ETA rows */}
      <View style={{ gap: 6, marginVertical: 4 }}>
        <View style={styles.memberRow}>
          <SkeletonBox width={50} height={12} borderRadius={4} />
          <SkeletonBox width={40} height={12} borderRadius={4} />
        </View>
        <View style={styles.memberRow}>
          <SkeletonBox width={60} height={12} borderRadius={4} />
          <SkeletonBox width={40} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Why button skeleton */}
      <View style={[styles.whyBtn, { borderTopColor: colors.divider }]}>
        <SkeletonBox width={140} height={14} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Skeleton mô phỏng trang chi tiết địa điểm (FE-11)
 */
export function PlaceDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={styles.detailContainer}>
      <SkeletonBox width="85%" height={26} borderRadius={8} />
      <SkeletonBox width="95%" height={14} borderRadius={4} style={{ marginTop: 4, marginBottom: 12 }} />

      {/* Card Giờ mở cửa */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <SkeletonBox width={100} height={14} borderRadius={4} />
        <SkeletonBox width={80} height={22} borderRadius={8} style={{ marginTop: 6 }} />
        <SkeletonBox width="70%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
      </View>

      {/* Card Đánh giá */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <SkeletonBox width={90} height={14} borderRadius={4} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <SkeletonBox width={45} height={32} borderRadius={6} />
          <SkeletonBox width={120} height={16} borderRadius={4} />
        </View>
      </View>

      {/* Card ETA */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <SkeletonBox width={130} height={14} borderRadius={4} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <SkeletonBox width="48%" height={50} borderRadius={8} />
          <SkeletonBox width="48%" height={50} borderRadius={8} />
        </View>
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonBox width="100%" height={14} borderRadius={4} />
          <SkeletonBox width="100%" height={14} borderRadius={4} />
          <SkeletonBox width="100%" height={14} borderRadius={4} />
        </View>
      </View>

      {/* Navigation Button */}
      <SkeletonBox width="100%" height={48} borderRadius={12} style={{ marginTop: 12 }} />
    </View>
  );
}

/**
 * Skeleton mô phỏng màn hình radar bạn bè xung quanh (FE-17)
 */
export function NearbySkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      {/* Intro card */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <SkeletonBox width={150} height={18} borderRadius={6} />
        <SkeletonBox width="90%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
        <SkeletonBox width="75%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
      </View>

      {/* Switch opt-in card */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 6, flex: 1 }}>
            <SkeletonBox width={130} height={16} borderRadius={4} />
            <SkeletonBox width={180} height={12} borderRadius={4} />
          </View>
          <SkeletonBox width={50} height={28} borderRadius={14} />
        </View>
      </View>

      {/* Radius chips card */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <SkeletonBox width={100} height={14} borderRadius={4} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <SkeletonBox width={60} height={30} borderRadius={16} />
          <SkeletonBox width={60} height={30} borderRadius={16} />
          <SkeletonBox width={60} height={30} borderRadius={16} />
          <SkeletonBox width={60} height={30} borderRadius={16} />
        </View>
      </View>

      {/* Detected meetup card skeleton */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <SkeletonBox width={180} height={16} borderRadius={6} />
        <SkeletonBox width="100%" height={42} borderRadius={10} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  etaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  etaBox: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between' },
  whyBtn: { borderTopWidth: 1, paddingTop: 10, alignItems: 'center' },
  detailContainer: { gap: 12 },
  detailCard: { borderRadius: 14, padding: 14, gap: 6 },
});
