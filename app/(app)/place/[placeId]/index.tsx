import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sparkles, CheckCircle2, Navigation } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { PlaceDetailSkeleton } from '@/components/common/Skeleton';
import { routes } from '@/constants/routes';

const MOCK_DETAIL = {
  placeId: 'p1', name: 'The Coffee House - Nguyễn Huệ',
  address: '86 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  rating: 4.5, totalReviews: 1420,
  isOpenNow: true as boolean | null,
  openingHours: ['Thứ 2–6: 7:00 – 22:00', 'Thứ 7–CN: 7:30 – 22:30'],
  avgEta: 12, maxEta: 18,
  etaPerMember: [
    { userId: 'u1', name: 'Bạn', eta: 10 },
    { userId: 'u2', name: 'Việt', eta: 18 },
    { userId: 'u3', name: 'Minh', eta: 8 },
  ],
};

export default function PlaceDetailScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { placeId } = useLocalSearchParams<{ placeId: string }>();

  const openingHours = useMemo(() => {
    return i18n.language === 'vi'
      ? ['Thứ 2–6: 7:00 – 22:00', 'Thứ 7–CN: 7:30 – 22:30']
      : ['Mon–Fri: 7:00 AM – 10:00 PM', 'Sat–Sun: 7:30 AM – 10:30 PM'];
  }, [i18n.language]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [place, setPlace] = useState({ ...MOCK_DETAIL, placeId: placeId || MOCK_DETAIL.placeId });

  const handleVote = useSinglePress(() => {
    setHasVoted((prev) => !prev);
  }, 400);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setPlace((prev) => ({
        ...prev,
        avgEta: Math.max(5, prev.avgEta + (Math.random() > 0.5 ? 1 : -1)),
        etaPerMember: prev.etaPerMember.map((m) => ({
          ...m,
          eta: Math.max(3, m.eta + (Math.random() > 0.5 ? 1 : -1)),
        })),
      }));
      setIsRefreshing(false);
    }, 1000);
  }, 1000);

  const handleOpenNavigation = useSinglePress(() => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('fe2.common.error'), t('fe2.common.maps_open_error'));
    });
  }, 1000);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      {isLoading ? (
        <PlaceDetailSkeleton />
      ) : (
        <>
          <Text style={styles.name}>{place.name}</Text>
          <Text style={styles.address}>{place.address}</Text>

          {/* Opening hours */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('fe2.place_detail.opening_hours_section')}</Text>
        {place.isOpenNow === true && (
          <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>{t('fe2.common.open_now')}</Text>
          </View>
        )}
        {place.isOpenNow === false && (
          <View style={[styles.badge, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.badgeText, { color: colors.danger }]}>{t('fe2.common.closed')}</Text>
          </View>
        )}
        {place.isOpenNow === null && (
          <>
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.badgeText, { color: colors.placeholder }]}>⏱ {t('fe2.common.no_opening_hours')}</Text>
            </View>
            <Text style={styles.noDataHint}>{t('fe2.place_detail.no_data_hint')}</Text>
          </>
        )}
        {place.isOpenNow !== null && openingHours.map((h, i) => (
          <Text key={i} style={styles.hoursText}>{h}</Text>
        ))}
      </View>

      {/* Rating */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('fe2.place_detail.rating_section')}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingNumber}>{place.rating}</Text>
          <Text style={{ fontSize: 14 }}>⭐⭐⭐⭐⭐</Text>
          <Text style={styles.reviewCount}>{t('fe2.place_detail.reviews_count', { count: place.totalReviews.toLocaleString() })}</Text>
        </View>
      </View>

      {/* ETA */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('fe2.place_detail.eta_section')}</Text>
        <View style={styles.etaSummary}>
          <View style={styles.etaBox}>
            <Text style={styles.etaLabel}>{t('fe2.common.avg_eta')}</Text>
            <Text style={styles.etaValue}>{place.avgEta} {t('fe2.common.min')}</Text>
          </View>
          <View style={[styles.etaBox, { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary }]}>
            <Text style={styles.etaLabel}>{t('fe2.common.max_eta')}</Text>
            <Text style={styles.etaValue}>{place.maxEta} {t('fe2.common.min')}</Text>
          </View>
        </View>
        {place.etaPerMember.map((m) => (
          <View key={m.userId} style={styles.memberRow}>
            <Text style={styles.memberName}>{m.name === 'Bạn' ? t('fe2.common.you') : m.name}</Text>
            <Text style={[styles.memberEta, { color: colors.primary }]}>{m.eta} {t('fe2.common.min')}</Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.purpleLight, borderColor: colors.purple }]}
          onPress={() => router.push(routes.placeExplanation(place.placeId, place.name))}
        >
          <Sparkles size={18} color={colors.purple} />
          <Text style={[styles.actionBtnText, { color: colors.purple }]}>
            {t('fe2.recommendation.why_button')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            hasVoted
              ? { backgroundColor: colors.successLight, borderColor: colors.success }
              : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
          onPress={handleVote}
        >
          <CheckCircle2 size={18} color={hasVoted ? colors.success : colors.subtext} />
          <Text
            style={[
              styles.actionBtnText,
              { color: hasVoted ? colors.success : colors.subtext },
            ]}
          >
            {hasVoted ? t('fe2.place_detail.voted_this_place') : t('fe2.place_detail.vote_this_place')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={handleOpenNavigation}
        >
          <Navigation size={18} color="#fff" />
          <Text style={[styles.actionBtnText, { color: '#fff' }]}>
            {t('fe2.common.send_directions')}
          </Text>
        </TouchableOpacity>
      </View>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 12, paddingBottom: 32 },
    name: { fontSize: 22, fontWeight: '800', color: c.text },
    address: { fontSize: 13, color: c.placeholder, marginTop: 4, marginBottom: 8 },
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.subtext },
    badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    badgeText: { fontSize: 13, fontWeight: '600' },
    hoursText: { fontSize: 13, color: c.subtext },
    noDataHint: { fontSize: 12, color: c.placeholder, lineHeight: 18, fontStyle: 'italic' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ratingNumber: { fontSize: 28, fontWeight: '800', color: c.text },
    reviewCount: { fontSize: 12, color: c.placeholder },
    etaSummary: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    etaBox: { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 8, padding: 10, alignItems: 'center' },
    etaLabel: { fontSize: 10, color: c.placeholder, fontWeight: '600' },
    etaValue: { fontSize: 18, fontWeight: '700', color: c.text, marginTop: 2 },
    memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: c.divider },
    memberName: { fontSize: 13, color: c.subtext },
    memberEta: { fontSize: 13, fontWeight: '700' },
    navBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    navBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    actionColumn: { gap: 10, marginTop: 8 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    actionBtnText: { fontWeight: '700', fontSize: 15 },
  });
