import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useSinglePress } from '../../hooks/useSinglePress';
import { PlaceCard, PlaceItem } from '../../components/meetup/PlaceCard';
import { PlaceCardSkeleton } from '../../components/common/Skeleton';

const MOCK_PLACES: PlaceItem[] = [
  { placeId: 'p1', rank: 1, name: 'The Coffee House - Nguyễn Huệ', address: '86 Nguyễn Huệ, Q.1, TP.HCM', rating: 4.5, isOpenNow: true, avgEta: 12, maxEta: 18, scaleLabel: 'exact', etaPerMember: [{ userId: 'u1', name: 'Bạn', eta: 10 }, { userId: 'u2', name: 'Việt', eta: 18 }, { userId: 'u3', name: 'Minh', eta: 8 }] },
  { placeId: 'p2', rank: 2, name: 'Phúc Long - Lê Lợi', address: '138 Lê Lợi, Q.1, TP.HCM', rating: 4.2, isOpenNow: true, avgEta: 15, maxEta: 22, scaleLabel: 'exact', etaPerMember: [{ userId: 'u1', name: 'Bạn', eta: 12 }, { userId: 'u2', name: 'Việt', eta: 22 }, { userId: 'u3', name: 'Minh', eta: 11 }] },
  { placeId: 'p3', rank: 3, name: 'Highlands Coffee - Vincom', address: '72 Lê Thánh Tôn, Q.1, TP.HCM', rating: 3.9, isOpenNow: null, avgEta: 18, maxEta: 28, scaleLabel: 'batch', etaPerMember: [{ userId: 'u1', name: 'Bạn', eta: 9 }, { userId: 'u2', name: 'Việt', eta: 28 }, { userId: 'u3', name: 'Minh', eta: 17 }] },
  { placeId: 'p4', rank: 4, name: 'Trung Nguyên Legend', address: '17 Nguyễn Trãi, Q.1, TP.HCM', rating: 4.1, isOpenNow: false, avgEta: 20, maxEta: 30, scaleLabel: 'cluster', etaPerMember: [{ userId: 'u1', name: 'Bạn', eta: 15 }, { userId: 'u2', name: 'Việt', eta: 30 }, { userId: 'u3', name: 'Minh', eta: 15 }] },
  { placeId: 'p5', rank: 5, name: 'Gong Cha - Đồng Khởi', address: '34 Đồng Khởi, Q.1, TP.HCM', rating: null, isOpenNow: true, avgEta: 22, maxEta: 35, scaleLabel: 'cluster', etaPerMember: [{ userId: 'u1', name: 'Bạn', eta: 20 }, { userId: 'u2', name: 'Việt', eta: 35 }, { userId: 'u3', name: 'Minh', eta: 11 }] },
];

const MISSING_LOCATION_MEMBER = 'Lan';

export default function RecommendationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [places, setPlaces] = useState<PlaceItem[]>(MOCK_PLACES);
  const [filterOpenNow, setFilterOpenNow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setPlaces((prev) =>
        prev.map((p) => ({
          ...p,
          avgEta: Math.max(5, p.avgEta + (Math.random() > 0.5 ? 1 : -1)),
        }))
      );
      setIsRefreshing(false);
    }, 1100);
  }, 1000);

  const filteredPlaces = filterOpenNow ? places.filter((p) => p.isOpenNow === true) : places;

  const handlePlacePress = useSinglePress((place: PlaceItem) =>
    router.push({ pathname: '/(fe2)/place-detail' as any, params: { placeId: place.placeId } })
  );

  const handleWhyPress = useSinglePress((place: PlaceItem) =>
    router.push({ pathname: '/(fe2)/ai-explanation' as any, params: { placeId: place.placeId, placeName: place.name } })
  );

  const toggleFilter = useSinglePress(() => setFilterOpenNow((v) => !v), 300);

  return (
    <View style={styles.container}>
      <View style={styles.missingBanner}>
        <Text style={styles.missingText}>
          {t('fe2.recommendation.missing_location', { name: MISSING_LOCATION_MEMBER, count: MOCK_PLACES[0].etaPerMember.length })}
        </Text>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filterOpenNow && { backgroundColor: colors.successLight, borderColor: colors.success }]}
          onPress={toggleFilter}
        >
          <Text style={[styles.filterText, filterOpenNow && { color: colors.success, fontWeight: '700' }]}>
            {t('fe2.recommendation.filter_open_now')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.resultCount}>{t('fe2.recommendation.result_count', { count: filteredPlaces.length })}</Text>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.placeId}
          renderItem={({ item }) => <PlaceCard place={item} onPress={handlePlacePress} onWhyPress={handleWhyPress} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('fe2.recommendation.empty_filtered')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    missingBanner: { backgroundColor: c.warningLight, borderBottomWidth: 1, borderBottomColor: c.warning, paddingHorizontal: 16, paddingVertical: 8 },
    missingText: { fontSize: 12, color: c.warning },
    filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    filterChip: { borderWidth: 1, borderColor: c.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    filterText: { fontSize: 13, color: c.subtext },
    resultCount: { fontSize: 12, color: c.placeholder },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
    emptyState: { paddingVertical: 48, alignItems: 'center' },
    emptyText: { textAlign: 'center', color: c.placeholder, fontSize: 14, lineHeight: 22 },
  });
