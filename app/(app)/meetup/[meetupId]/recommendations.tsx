import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '@/components/map/NativeMap';
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
  Navigation,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { PlaceCard, PlaceItem } from '@/components/meetup/PlaceCard';
import { FilterSortModal } from '@/components/meetup/FilterSortModal';
import { TravelModeModal } from '@/components/meetup/TravelModeModal';
import { PlaceCardSkeleton } from '@/components/common/Skeleton';
import { routes } from '@/constants/routes';
import { radius } from '@/theme';
import {
  MISSING_LOCATION_MEMBER,
  MOCK_MEETUP_MEMBERS,
  selectComputedRecommendations,
  SortOption,
  useRecommendationStore,
} from '@/store/useRecommendationStore';
import type { OpeningFilterMode, TravelMode, WeatherPolicy } from '@/types/recommendation';

const INITIAL_PAGE_SIZE = 4;
const LOAD_MORE_STEP = 3;

export default function RecommendationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef<MapView>(null);
  const { meetupId = 'meetup-1' } = useLocalSearchParams<{ meetupId: string }>();

  const storeState = useRecommendationStore();
  const {
    runId,
    contextStatus,
    openingFilter,
    weatherPolicy,
    sortBy,
    memberTravelModes,
    effectiveRoutingPreference,
    currentViewerId,
    votedCandidateKey,
    finalizedCandidateKey,
    setOpeningFilter,
    setWeatherPolicy,
    setSortBy,
    setMemberTravelMode,
    recordImpressionIfNeeded,
    rerunForUpdatedContext,
    resetAllFiltersAndScenarios,
  } = storeState;

  const { places: processedPlaces, runWarnings } = useMemo(
    () => selectComputedRecommendations(storeState),
    [storeState]
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [travelModalVisible, setTravelModalVisible] = useState(false);
  const [selectedMapPlace, setSelectedMapPlace] = useState<PlaceItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  // Trigger brief Skeleton shimmer when filter, sort, or travel mode changes
  const triggerFilterSkeleton = useCallback(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 420);
  }, []);

  const handleSelectSortBy = useCallback(
    (nextSort: SortOption) => {
      setSortBy(nextSort);
      triggerFilterSkeleton();
    },
    [setSortBy, triggerFilterSkeleton]
  );

  const handleSelectOpeningFilter = useCallback(
    (nextFilter: OpeningFilterMode) => {
      setOpeningFilter(nextFilter);
      triggerFilterSkeleton();
    },
    [setOpeningFilter, triggerFilterSkeleton]
  );

  const handleSelectWeatherPolicy = useCallback(
    (nextPolicy: WeatherPolicy) => {
      setWeatherPolicy(nextPolicy);
      triggerFilterSkeleton();
    },
    [setWeatherPolicy, triggerFilterSkeleton]
  );

  const handleSelectTravelMode = useCallback(
    (participantId: string, mode: TravelMode) => {
      setMemberTravelMode(participantId, mode);
      triggerFilterSkeleton();
    },
    [setMemberTravelMode, triggerFilterSkeleton]
  );

  const handleRerun = useSinglePress(() => {
    rerunForUpdatedContext();
    triggerFilterSkeleton();
  }, 500);

  const handleOpenChat = useSinglePress(() => {
    router.push(routes.meetupChat(meetupId));
  }, 600);

  const handleOpenTravelModal = useSinglePress(() => {
    setTravelModalVisible(true);
  }, 400);

  const handleOpenFilterModal = useSinglePress(() => {
    setFilterModalVisible(true);
  }, 400);

  const handleResetFilters = useCallback(() => {
    resetAllFiltersAndScenarios();
    triggerFilterSkeleton();
  }, [resetAllFiltersAndScenarios, triggerFilterSkeleton]);

  // Slice places for Lazy Loading
  const paginatedPlaces = useMemo(
    () => processedPlaces.slice(0, visibleCount),
    [processedPlaces, visibleCount]
  );

  const hasMorePlaces = visibleCount < processedPlaces.length;

  const handleLoadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMorePlaces) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, processedPlaces.length));
      setIsLoadingMore(false);
    }, 550);
  }, [hasMorePlaces, isLoading, isLoadingMore, isRefreshing, processedPlaces.length]);

  // FE-22: Tự động ghi nhận RecommendationShown đúng 1 lần cho mỗi runId khi kết quả thực sự hiển thị
  useEffect(() => {
    if (!isLoading && paginatedPlaces.length > 0) {
      recordImpressionIfNeeded(paginatedPlaces);
    }
  }, [isLoading, runId, paginatedPlaces, recordImpressionIfNeeded]);

  // Pull-to-Refresh
  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setVisibleCount(INITIAL_PAGE_SIZE);
      setIsRefreshing(false);
    }, 700);
  }, 800);

  const handlePlacePress = useSinglePress((place: PlaceItem) =>
    router.push(routes.placeDetail(place.placeId))
  );

  const handleWhyPress = useSinglePress((place: PlaceItem) =>
    router.push(routes.placeExplanation(place.placeId, place.name))
  );

  const currentViewerMember = useMemo(
    () =>
      MOCK_MEETUP_MEMBERS.find((m) => m.participantId === currentViewerId) ??
      MOCK_MEETUP_MEMBERS[0],
    [currentViewerId]
  );

  const sortLabel = useMemo(() => {
    if (sortBy === 'rank') return t('fe2.recommendation.sort_rank');
    if (sortBy === 'avgEta') return t('fe2.recommendation.sort_avg_eta');
    if (sortBy === 'maxEta') return t('fe2.recommendation.sort_max_eta');
    return t('fe2.recommendation.sort_rating');
  }, [sortBy, t]);

  const openingFilterPillLabel = useMemo(() => {
    if (openingFilter === 'OPEN_AT_SCHEDULED_TIME') {
      return t('fe2.recommendation.filter_open_scheduled', { time: '19:00' });
    }
    if (openingFilter === 'OPEN_AT_REQUEST_TIME') {
      return t('fe2.recommendation.filter_open_now');
    }
    return t('fe2.recommendation.filter_open_any');
  }, [openingFilter, t]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={handleOpenChat}
              style={{ padding: 6, marginRight: 4 }}
              accessibilityLabel={t('fe2.chat.screen_title')}
            >
              <MessageSquare size={21} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Scheduled Time + Travel Mode Bar */}
      <View style={styles.contextStrip}>
        <View style={styles.contextLeft}>
          <Clock
            size={14}
            color={contextStatus === 'STALE_CONTEXT' ? colors.danger : colors.primary}
          />
          <Text style={styles.contextLabel}>
            {t('fe2.recommendation.scheduled_at_label')}{' '}
            <Text
              style={{
                fontWeight: '700',
                color: contextStatus === 'STALE_CONTEXT' ? colors.danger : colors.text,
              }}
            >
              {contextStatus === 'STALE_CONTEXT'
                ? t('fe2.recommendation.scheduled_time_stale_value')
                : t('fe2.recommendation.scheduled_time_value')}
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.travelBtn, { borderColor: colors.primary }]}
          onPress={handleOpenTravelModal}
        >
          <Navigation size={13} color={colors.primary} />
          <Text style={[styles.travelBtnText, { color: colors.primary }]}>
            {t('fe2.recommendation.travel_mode_btn')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* STALE_CONTEXT Warning Banner + Re-run CTA */}
      {contextStatus === 'STALE_CONTEXT' && (
        <View
          style={[
            styles.staleBanner,
            { backgroundColor: colors.dangerLight, borderBottomColor: colors.danger },
          ]}
        >
          <Text style={[styles.staleBannerTitle, { color: colors.danger }]}>
            {t('fe2.recommendation.stale_banner_title', { newTime: '21:30' })}
          </Text>
          <Text style={[styles.staleBannerDesc, { color: colors.text }]}>
            {t('fe2.recommendation.stale_banner_desc', { oldTime: '19:00' })}
          </Text>
          <TouchableOpacity
            style={[styles.rerunBtn, { backgroundColor: colors.danger }]}
            onPress={handleRerun}
          >
            <RefreshCw size={14} color="#fff" />
            <Text style={styles.rerunBtnText}>
              {t('fe2.recommendation.stale_rerun_btn')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WEATHER_FILTER_RELAXED Warning Banner */}
      {runWarnings.includes('WEATHER_FILTER_RELAXED') && (
        <View
          style={[
            styles.alertBanner,
            { backgroundColor: colors.infoLight, borderBottomColor: colors.info },
          ]}
        >
          <Text style={[styles.alertBannerText, { color: colors.info }]}>
            {t('fe2.recommendation.weather_relaxed_banner')}
          </Text>
        </View>
      )}

      {/* TRAFFIC_DATA_UNAVAILABLE Warning Banner */}
      {runWarnings.includes('TRAFFIC_DATA_UNAVAILABLE') && (
        <View
          style={[
            styles.alertBanner,
            { backgroundColor: colors.warningLight, borderBottomColor: colors.warning },
          ]}
        >
          <Text style={[styles.alertBannerText, { color: colors.warning }]}>
            {t('fe2.recommendation.traffic_fallback_banner')}
          </Text>
        </View>
      )}

      {/* Missing Location Banner */}
      <View style={styles.missingBanner}>
        <Text style={styles.missingText}>
          {t('fe2.recommendation.missing_location', {
            name: MISSING_LOCATION_MEMBER,
            count: MOCK_MEETUP_MEMBERS.length,
          })}
        </Text>
      </View>

      {/* Control Bar: View Mode Segment + Filter/Policy Trigger */}
      <View style={styles.controlBar}>
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

        <TouchableOpacity
          style={styles.filterSortTrigger}
          onPress={handleOpenFilterModal}
        >
          <SlidersHorizontal size={15} color={colors.primary} />
          <Text style={styles.filterSortTriggerText}>
            {t('fe2.recommendation.filter_sort_btn')}
          </Text>
          {(openingFilter !== 'OPEN_AT_SCHEDULED_TIME' || weatherPolicy !== 'WARN_ONLY') && (
            <View style={styles.activeDot} />
          )}
        </TouchableOpacity>
      </View>

      {/* Filter & Context summary pills bar */}
      <View style={styles.summaryBar}>
        <View style={styles.pillRow}>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>{sortLabel}</Text>
          </View>
          <View style={[styles.activePill, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.activePillText, { color: colors.success }]}>
              {openingFilterPillLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.resultCount}>
          {t('fe2.recommendation.result_count', { count: processedPlaces.length })}
        </Text>
      </View>

      {/* Main Content Area: List (with Skeleton + Lazy Loading + Pull-to-Refresh) or Map */}
      {viewMode === 'list' ? (
        isLoading ? (
          <View style={styles.list}>
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={paginatedPlaces}
            keyExtractor={(item) => item.placeId}
            renderItem={({ item }) => (
              <PlaceCard
                place={item}
                scheduledTimeText="19:00"
                weatherPolicy={weatherPolicy}
                routingPreference={effectiveRoutingPreference}
                currentViewerName={currentViewerMember.name}
                isVoted={votedCandidateKey === item.canonicalCandidateKey}
                isFinalized={finalizedCandidateKey === item.canonicalCandidateKey}
                onPress={handlePlacePress}
                onWhyPress={handleWhyPress}
              />
            )}
            contentContainerStyle={styles.list}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                progressBackgroundColor={colors.surface}
              />
            }
            ListFooterComponent={
              processedPlaces.length === 0 ? null : isLoadingMore ? (
                <View style={styles.lazyFooter}>
                  <Text style={[styles.lazyFooterText, { color: colors.primary }]}>
                    {t('fe2.recommendation.loading_more_places')}
                  </Text>
                  <PlaceCardSkeleton />
                </View>
              ) : !hasMorePlaces ? (
                <Text style={styles.allLoadedText}>
                  {t('fe2.recommendation.all_places_loaded', {
                    count: processedPlaces.length,
                  })}
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {t('fe2.recommendation.empty_filtered')}
                </Text>
              </View>
            }
          />
        )
      ) : (
        /* Map View */
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: 10.7745,
              longitude: 106.701,
              latitudeDelta: 0.025,
              longitudeDelta: 0.025,
            }}
          >
            {/* Member Markers */}
            {MOCK_MEETUP_MEMBERS.map((m) => {
              const displayName = m.name === 'Bạn' ? t('fe2.common.you') : m.name;
              return (
                <Marker
                  key={m.participantId}
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
                  <Text style={styles.mapCardRank}>
                    #{selectedMapPlace.rank} • {selectedMapPlace.name}
                  </Text>
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
                  <Text style={styles.metaText}>
                    {t('fe2.recommendation.avg_prefix')}{' '}
                    {Math.round(selectedMapPlace.avgEtaSeconds / 60)} {t('fe2.common.min')}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.purple }]}>
                    🎯 {Math.round(selectedMapPlace.viewerFeature.memberUtility * 100)}%
                  </Text>
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

      {/* Filter & Policy Bottom Sheet Modal */}
      <FilterSortModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        sortBy={sortBy}
        onSelectSortBy={handleSelectSortBy}
        openingFilter={openingFilter}
        onSelectOpeningFilter={handleSelectOpeningFilter}
        weatherPolicy={weatherPolicy}
        onSelectWeatherPolicy={handleSelectWeatherPolicy}
        onReset={handleResetFilters}
      />

      {/* Travel Mode & Traffic Info Modal */}
      <TravelModeModal
        visible={travelModalVisible}
        onClose={() => setTravelModalVisible(false)}
        memberTravelModes={memberTravelModes}
        onSelectTravelMode={handleSelectTravelMode}
        routingPreference={effectiveRoutingPreference}
      />
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    contextStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    contextLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    contextLabel: {
      fontSize: 12,
      color: c.subtext,
    },
    travelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: c.primaryLight,
    },
    travelBtnText: {
      fontSize: 11,
      fontWeight: '700',
    },
    staleBanner: {
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 6,
    },
    staleBannerTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    staleBannerDesc: {
      fontSize: 12,
      lineHeight: 17,
    },
    rerunBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      borderRadius: radius.sm,
      marginTop: 2,
    },
    rerunBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    alertBanner: {
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    alertBannerText: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    missingBanner: {
      backgroundColor: c.warningLight,
      borderBottomWidth: 1,
      borderBottomColor: c.warning,
      paddingHorizontal: 16,
      paddingVertical: 7,
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
      gap: 8,
    },
    pillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
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
    lazyFooter: {
      paddingTop: 4,
      paddingBottom: 12,
      gap: 8,
    },
    lazyFooterText: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    allLoadedText: {
      textAlign: 'center',
      fontSize: 12,
      color: c.placeholder,
      paddingVertical: 14,
      fontStyle: 'italic',
    },
    emptyState: { paddingVertical: 48, alignItems: 'center' },
    emptyText: {
      textAlign: 'center',
      color: c.placeholder,
      fontSize: 14,
      lineHeight: 22,
    },
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    mapCardRank: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    mapCardAddress: {
      fontSize: 12,
      color: c.placeholder,
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
      gap: 10,
      marginTop: 2,
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
      fontSize: 13,
      fontWeight: '700',
    },
  });
