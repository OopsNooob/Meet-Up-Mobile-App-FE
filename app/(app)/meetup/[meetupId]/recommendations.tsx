import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  List,
  Map as MapIcon,
  SlidersHorizontal,
  Star,
  Clock,
  Sparkles,
  MessageSquare,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { PlaceCard, PlaceItem } from '@/components/meetup/PlaceCard';
import { FilterSortModal, SortOption } from '@/components/meetup/FilterSortModal';
import { PlaceCardSkeleton } from '@/components/common/Skeleton';
import { routes } from '@/constants/routes';
import { radius } from '@/theme';

const MOCK_PLACES: PlaceItem[] = [
  {
    placeId: 'p1',
    rank: 1,
    name: 'The Coffee House - Nguyễn Huệ',
    address: '86 Nguyễn Huệ, Q.1, TP.HCM',
    rating: 4.5,
    isOpenNow: true,
    avgEta: 12,
    maxEta: 18,
    scaleLabel: 'exact',
    lat: 10.7745,
    lng: 106.7032,
    etaPerMember: [
      { userId: 'u1', name: 'Bạn', eta: 10 },
      { userId: 'u2', name: 'Việt', eta: 18 },
      { userId: 'u3', name: 'Minh', eta: 8 },
    ],
  },
  {
    placeId: 'p2',
    rank: 2,
    name: 'Phúc Long - Lê Lợi',
    address: '138 Lê Lợi, Q.1, TP.HCM',
    rating: 4.2,
    isOpenNow: true,
    avgEta: 15,
    maxEta: 22,
    scaleLabel: 'exact',
    lat: 10.7728,
    lng: 106.6994,
    etaPerMember: [
      { userId: 'u1', name: 'Bạn', eta: 12 },
      { userId: 'u2', name: 'Việt', eta: 22 },
      { userId: 'u3', name: 'Minh', eta: 11 },
    ],
  },
  {
    placeId: 'p3',
    rank: 3,
    name: 'Highlands Coffee - Vincom',
    address: '72 Lê Thánh Tôn, Q.1, TP.HCM',
    rating: 3.9,
    isOpenNow: null,
    avgEta: 18,
    maxEta: 28,
    scaleLabel: 'batch',
    lat: 10.7781,
    lng: 106.7018,
    etaPerMember: [
      { userId: 'u1', name: 'Bạn', eta: 9 },
      { userId: 'u2', name: 'Việt', eta: 28 },
      { userId: 'u3', name: 'Minh', eta: 17 },
    ],
  },
  {
    placeId: 'p4',
    rank: 4,
    name: 'Trung Nguyên Legend',
    address: '17 Nguyễn Trãi, Q.1, TP.HCM',
    rating: 4.1,
    isOpenNow: false,
    avgEta: 20,
    maxEta: 30,
    scaleLabel: 'cluster',
    lat: 10.7695,
    lng: 106.6922,
    etaPerMember: [
      { userId: 'u1', name: 'Bạn', eta: 15 },
      { userId: 'u2', name: 'Việt', eta: 30 },
      { userId: 'u3', name: 'Minh', eta: 15 },
    ],
  },
  {
    placeId: 'p5',
    rank: 5,
    name: 'Gong Cha - Đồng Khởi',
    address: '34 Đồng Khởi, Q.1, TP.HCM',
    rating: null,
    isOpenNow: true,
    avgEta: 22,
    maxEta: 35,
    scaleLabel: 'cluster',
    lat: 10.7762,
    lng: 106.7048,
    etaPerMember: [
      { userId: 'u1', name: 'Bạn', eta: 20 },
      { userId: 'u2', name: 'Việt', eta: 35 },
      { userId: 'u3', name: 'Minh', eta: 11 },
    ],
  },
];

const MOCK_MEMBERS = [
  { id: 'u1', name: 'Bạn', lat: 10.7712, lng: 106.6975 },
  { id: 'u2', name: 'Việt', lat: 10.7801, lng: 106.7062 },
  { id: 'u3', name: 'Minh', lat: 10.7758, lng: 106.6921 },
];

const MISSING_LOCATION_MEMBER = 'Lan';

export default function RecommendationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef<MapView>(null);
  const { meetupId = 'meetup-1' } = useLocalSearchParams<{ meetupId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [places, setPlaces] = useState<PlaceItem[]>(MOCK_PLACES);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('avgEta');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedMapPlace, setSelectedMapPlace] = useState<PlaceItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
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
    }, 1000);
  }, 1000);

  // Filter & Sort processed list
  const processedPlaces = useMemo(() => {
    let result = [...places];
    if (filterOpenNow) {
      result = result.filter((p) => p.isOpenNow === true);
    }
    result.sort((a, b) => {
      if (sortBy === 'avgEta') return a.avgEta - b.avgEta;
      if (sortBy === 'maxEta') return a.maxEta - b.maxEta;
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });
    return result;
  }, [places, filterOpenNow, sortBy]);

  const handlePlacePress = useSinglePress((place: PlaceItem) =>
    router.push(routes.placeDetail(place.placeId))
  );

  const handleWhyPress = useSinglePress((place: PlaceItem) =>
    router.push(routes.placeExplanation(place.placeId, place.name))
  );

  const handleResetFilters = () => {
    setFilterOpenNow(false);
    setSortBy('avgEta');
  };

  const sortLabel = useMemo(() => {
    if (sortBy === 'avgEta') return t('fe2.recommendation.sort_avg_eta');
    if (sortBy === 'maxEta') return t('fe2.recommendation.sort_max_eta');
    return t('fe2.recommendation.sort_rating');
  }, [sortBy, t]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(routes.meetupChat(meetupId))}
              style={{ padding: 6, marginRight: 4 }}
              accessibilityLabel={t('fe2.chat.screen_title')}
            >
              <MessageSquare size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Missing Location Banner */}
      <View style={styles.missingBanner}>
        <Text style={styles.missingText}>
          {t('fe2.recommendation.missing_location', {
            name: MISSING_LOCATION_MEMBER,
            count: MOCK_PLACES[0].etaPerMember.length,
          })}
        </Text>
      </View>

      {/* Control Bar: View Mode Segment + Filter/Sort Trigger */}
      <View style={styles.controlBar}>
        {/* View Mode Segmented Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <List
              size={16}
              color={viewMode === 'list' ? colors.primary : colors.placeholder}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === 'list' && { color: colors.primary, fontWeight: '700' },
              ]}
            >
              {t('fe2.recommendation.view_list')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'map' && styles.segmentBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <MapIcon
              size={16}
              color={viewMode === 'map' ? colors.primary : colors.placeholder}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === 'map' && { color: colors.primary, fontWeight: '700' },
              ]}
            >
              {t('fe2.recommendation.view_map')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter & Sort Button */}
        <TouchableOpacity
          style={styles.filterSortTrigger}
          onPress={() => setFilterModalVisible(true)}
        >
          <SlidersHorizontal size={15} color={colors.primary} />
          <Text style={styles.filterSortTriggerText}>
            {t('fe2.recommendation.filter_sort_btn')}
          </Text>
          {filterOpenNow && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* Filter summary pills bar */}
      <View style={styles.summaryBar}>
        <View style={styles.pillRow}>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>{sortLabel}</Text>
          </View>
          {filterOpenNow && (
            <View style={[styles.activePill, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.activePillText, { color: colors.success }]}>
                {t('fe2.recommendation.filter_open_now')}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.resultCount}>
          {t('fe2.recommendation.result_count', { count: processedPlaces.length })}
        </Text>
      </View>

      {/* Main Content Area: List or Map */}
      {viewMode === 'list' ? (
        isLoading ? (
          <View style={styles.list}>
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={processedPlaces}
            keyExtractor={(item) => item.placeId}
            renderItem={({ item }) => (
              <PlaceCard
                place={item}
                onPress={handlePlacePress}
                onWhyPress={handleWhyPress}
              />
            )}
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
        )
      ) : (
        /* Map View */
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: 10.7745,
              longitude: 106.701,
              latitudeDelta: 0.025,
              longitudeDelta: 0.025,
            }}
          >
            {/* Member Markers */}
            {MOCK_MEMBERS.map((m) => {
              const displayName = m.name === 'Bạn' ? t('fe2.common.you') : m.name;
              return (
                <Marker
                  key={m.id}
                  coordinate={{ latitude: m.lat, longitude: m.lng }}
                  title={`${t('fe2.recommendation.map_member_label')}: ${displayName}`}
                >
                  <View style={styles.memberPin}>
                    <Text style={styles.memberPinText}>{displayName[0]}</Text>
                  </View>
                </Marker>
              );
            })}

            {/* Recommended Place Markers */}
            {processedPlaces.map((place) => {
              if (!place.lat || !place.lng) return null;
              const isSelected = selectedMapPlace?.placeId === place.placeId;
              return (
                <Marker
                  key={place.placeId}
                  coordinate={{ latitude: place.lat, longitude: place.lng }}
                  onPress={() => setSelectedMapPlace(place)}
                >
                  <View
                    style={[
                      styles.placePin,
                      isSelected && styles.placePinSelected,
                      place.rank === 1 && { backgroundColor: '#f59e0b' },
                    ]}
                  >
                    <Text style={styles.placePinText}>#{place.rank}</Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Map Floating Preview Card */}
          {selectedMapPlace && (
            <View style={styles.mapCard}>
              <View style={styles.mapCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapCardRank}>#{selectedMapPlace.rank} • {selectedMapPlace.name}</Text>
                  <Text style={styles.mapCardAddress} numberOfLines={1}>
                    {selectedMapPlace.address}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedMapPlace(null)}
                  style={styles.mapCardClose}
                >
                  <X size={16} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <View style={styles.mapCardMeta}>
                {selectedMapPlace.rating !== null && (
                  <View style={styles.metaRow}>
                    <Star size={13} color="#f59e0b" fill="#f59e0b" />
                    <Text style={styles.metaText}>{selectedMapPlace.rating}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Clock size={13} color={colors.primary} />
                  <Text style={styles.metaText}>{t('fe2.recommendation.avg_prefix')} {selectedMapPlace.avgEta} {t('fe2.common.min')}</Text>
                </View>
              </View>

              <View style={styles.mapCardActions}>
                <TouchableOpacity
                  style={[styles.mapActionBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => handleWhyPress(selectedMapPlace)}
                >
                  <Sparkles size={14} color={colors.primary} />
                  <Text style={[styles.mapActionBtnText, { color: colors.primary }]}>
                    {t('fe2.recommendation.why_button')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mapActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handlePlacePress(selectedMapPlace)}
                >
                  <Text style={[styles.mapActionBtnText, { color: '#fff' }]}>
                    {t('fe2.place_detail.screen_title')}
                  </Text>
                  <ChevronRight size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Filter and Sort Bottom Sheet Modal */}
      <FilterSortModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        sortBy={sortBy}
        onSelectSortBy={setSortBy}
        filterOpenNow={filterOpenNow}
        onToggleOpenNow={setFilterOpenNow}
        onReset={handleResetFilters}
      />
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    missingBanner: {
      backgroundColor: c.warningLight,
      borderBottomWidth: 1,
      borderBottomColor: c.warning,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    missingText: { fontSize: 12, color: c.warning },
    controlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
      gap: 12,
    },
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      padding: 3,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmentBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.sm,
    },
    segmentBtnActive: {
      backgroundColor: c.surface,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    segmentText: {
      fontSize: 13,
      color: c.subtext,
      fontWeight: '500',
    },
    filterSortTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterSortTriggerText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
    },
    summaryBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    pillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    activePill: {
      backgroundColor: c.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    activePillText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.primary,
    },
    resultCount: { fontSize: 12, color: c.placeholder },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
    emptyState: { paddingVertical: 48, alignItems: 'center' },
    emptyText: { textAlign: 'center', color: c.placeholder, fontSize: 14, lineHeight: 22 },
    mapContainer: { flex: 1 },
    map: { flex: 1 },
    memberPin: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.purple,
      borderWidth: 2,
      borderColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
    },
    memberPinText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    placePin: {
      backgroundColor: c.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#fff',
      elevation: 4,
    },
    placePinSelected: {
      borderColor: '#f59e0b',
      borderWidth: 3,
      transform: [{ scale: 1.15 }],
    },
    placePinText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 12,
    },
    mapCard: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: 14,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    mapCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    mapCardRank: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    mapCardAddress: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 2,
    },
    mapCardClose: {
      padding: 4,
    },
    mapCardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.subtext,
    },
    mapCardActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    mapActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: radius.md,
    },
    mapActionBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
