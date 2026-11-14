import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  CheckCircle2,
  Navigation,
  Heart,
  MapPinCheck,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { InlineAlert } from '@/components/common/InlineAlert';
import { ErrorState } from '@/components/common/StateViews';
import { PlaceDetailSkeleton, ReviewItemSkeleton } from '@/components/common/Skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { routes } from '@/constants/routes';
import {
  selectComputedRecommendations,
  useRecommendationStore,
} from '@/store/useRecommendationStore';

export default function PlaceDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { placeId } = useLocalSearchParams<{ placeId: string }>();

  const storeState = useRecommendationStore();
  const {
    runId,
    activeMeetupId,
    apiError,
    hasServerData,
    contextStatus,
    weatherPolicy,
    effectiveRoutingPreference,
    votedCandidateKey,
    finalizedCandidateKey,
    favoriteCandidateKeys,
    loadRecommendationsForMeetup,
    castVoteOnServer,
    finalizeOnServer,
    toggleFavoriteOnServer,
    sendFeedbackToServer,
    toggleVotePlace,
    finalizePlace,
    toggleFavoritePlace,
    recordFeedbackEvent,
  } = storeState;

  const { places } = useMemo(
    () => selectComputedRecommendations(storeState),
    [storeState]
  );

  const place = useMemo(
    () => places.find((p) => p.placeId === placeId) ?? places[0],
    [places, placeId]
  );

  const isLoading = storeState.isApiLoading;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [finalizeDialogVisible, setFinalizeDialogVisible] = useState(false);

  // Lazy loading state for Community Reviews
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(2);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);

  const allReviews = useMemo(
    () => [
      {
        id: 'r1',
        author: t('fe2.place_detail.review_1_author'),
        time: t('fe2.place_detail.review_1_time'),
        text: t('fe2.place_detail.review_1_text'),
        stars: '⭐⭐⭐⭐⭐',
      },
      {
        id: 'r2',
        author: t('fe2.place_detail.review_2_author'),
        time: t('fe2.place_detail.review_2_time'),
        text: t('fe2.place_detail.review_2_text'),
        stars: '⭐⭐⭐⭐⭐',
      },
      {
        id: 'r3',
        author: t('fe2.place_detail.review_3_author'),
        time: t('fe2.place_detail.review_3_time'),
        text: t('fe2.place_detail.review_3_text'),
        stars: '⭐⭐⭐⭐',
      },
      {
        id: 'r4',
        author: t('fe2.place_detail.review_4_author'),
        time: t('fe2.place_detail.review_4_time'),
        text: t('fe2.place_detail.review_4_text'),
        stars: '⭐⭐⭐⭐⭐',
      },
      {
        id: 'r5',
        author: t('fe2.place_detail.review_5_author'),
        time: t('fe2.place_detail.review_5_time'),
        text: t('fe2.place_detail.review_5_text'),
        stars: '⭐⭐⭐⭐⭐',
      },
    ],
    [t]
  );

  const hasMoreReviews = visibleReviewsCount < allReviews.length;

  const handleLoadMoreReviews = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMoreReviews || !hasMoreReviews) return;
    setIsLoadingMoreReviews(true);
    setTimeout(() => {
      setVisibleReviewsCount((prev) => Math.min(prev + 2, allReviews.length));
      setIsLoadingMoreReviews(false);
    }, 550);
  }, [allReviews.length, hasMoreReviews, isLoading, isLoadingMoreReviews, isRefreshing]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 60;
      if (isCloseToBottom && hasMoreReviews && !isLoadingMoreReviews) {
        handleLoadMoreReviews();
      }
    },
    [handleLoadMoreReviews, hasMoreReviews, isLoadingMoreReviews]
  );

  const handleRefresh = useSinglePress(async () => {
    setIsRefreshing(true);
    if (activeMeetupId) {
      await loadRecommendationsForMeetup(activeMeetupId);
    }
    setVisibleReviewsCount(2);
    setIsRefreshing(false);
  }, 800);

  const isStale = contextStatus === 'STALE_CONTEXT';
  const isAnyFinalized = finalizedCandidateKey !== null;

  const handleVote = useSinglePress(async () => {
    if (!place || isStale || isAnyFinalized) return;
    if (hasServerData && activeMeetupId) {
      await castVoteOnServer(activeMeetupId, place.canonicalCandidateKey, place.rank);
    } else {
      toggleVotePlace(place.canonicalCandidateKey, place.rank);
    }
  }, 350);

  const handleOpenExplanation = useSinglePress(() => {
    if (!place) return;
    router.push(routes.placeExplanation(place.placeId, place.name));
  }, 600);

  const handleOpenFinalizeDialog = useSinglePress(() => {
    if (!place || isStale || finalizedCandidateKey === place.canonicalCandidateKey) return;
    setFinalizeDialogVisible(true);
  }, 500);

  const handleConfirmFinalize = useSinglePress(async () => {
    if (!place) return;
    setFinalizeDialogVisible(false);
    if (hasServerData && activeMeetupId) {
      await finalizeOnServer(activeMeetupId, place.canonicalCandidateKey, place.rank);
    } else {
      finalizePlace(place.canonicalCandidateKey, place.rank);
    }
  }, 500);

  const handleFavorite = useSinglePress(async () => {
    if (!place) return;
    if (hasServerData) {
      await toggleFavoriteOnServer(place.canonicalCandidateKey, place.rank);
    } else {
      toggleFavoritePlace(place.canonicalCandidateKey, place.rank);
    }
  }, 350);

  const handleOpenNavigation = useSinglePress(() => {
    if (!place) return;
    if (hasServerData && activeMeetupId) {
      void sendFeedbackToServer(
        activeMeetupId,
        'NAVIGATION_OPENED',
        place.canonicalCandidateKey,
        place.rank
      );
    } else {
      recordFeedbackEvent('NavigationOpened', place.canonicalCandidateKey, place.rank);
    }
    const query = place.address?.trim() ? place.address : `${place.lat},${place.lng}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('fe2.common.error'), t('fe2.common.maps_open_error'));
    });
  }, 800);

  const openingHoursKeys = place?.opening.hoursKeys;
  const openingHours = useMemo(
    () => (openingHoursKeys ?? []).map((key) => t(key as any)),
    [openingHoursKeys, t]
  );

  if (!place) {
    return (
      <View style={styles.container}>
        <ErrorState
          error={apiError ?? undefined}
          onRetry={activeMeetupId ? handleRefresh : undefined}
        />
      </View>
    );
  }

  const isVoted = votedCandidateKey === place.canonicalCandidateKey;
  const isFinalized = finalizedCandidateKey === place.canonicalCandidateKey;
  const isFavorite = favoriteCandidateKeys.includes(place.canonicalCandidateKey);
  const avgEtaMin = Math.round(place.avgEtaSeconds / 60);
  const maxEtaMin = Math.round(place.maxEtaSeconds / 60);
  const closingMins =
    place.opening.secondsUntilClose !== null
      ? Math.round(place.opening.secondsUntilClose / 60)
      : null;

  const utilityRows = [
    {
      label: t('fe2.place_detail.utility_travel'),
      value: place.viewerFeature.travelUtility,
      color: colors.primary,
    },
    {
      label: t('fe2.place_detail.utility_preference'),
      value: place.viewerFeature.preferenceUtility,
      color: colors.purple,
    },
    {
      label: t('fe2.place_detail.utility_quality'),
      value: place.viewerFeature.placeQualityUtility,
      color: colors.warning,
    },
    {
      label: t('fe2.place_detail.utility_total'),
      value: place.viewerFeature.memberUtility,
      color: colors.success,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      onScroll={handleScroll}
      scrollEventThrottle={160}
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
          {apiError && (
            <InlineAlert
              tone="danger"
              title={t(`errors.${apiError.code}.title` as any)}
              message={t(`errors.${apiError.code}.description` as any)}
            />
          )}
          <View style={styles.titleRow}>
            <Text style={styles.rankBadge}>#{place.rank}</Text>
            <Text style={styles.name}>{place.name}</Text>
          </View>
          <Text style={styles.address}>{place.address}</Text>

          {/* Scheduled Opening Hours & Closing Soon Alert */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t('fe2.place_detail.opening_hours_section')}
            </Text>

            <Text style={styles.subMeta}>
              {t('fe2.place_detail.scheduled_check_label')}{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {isStale
                  ? t('fe2.recommendation.scheduled_time_stale_value')
                  : t('fe2.recommendation.scheduled_time_value')}
              </Text>
            </Text>

            <View style={styles.badgeRow}>
              {place.opening.statusAtScheduled === 'OPEN' && (
                <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.badgeText, { color: colors.success }]}>
                    {t('fe2.recommendation.open_at_scheduled', { time: '19:00' })}
                  </Text>
                </View>
              )}
              {place.opening.statusAtScheduled === 'CLOSED' && (
                <View style={[styles.badge, { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.badgeText, { color: colors.danger }]}>
                    {t('fe2.recommendation.closed_at_scheduled', { time: '19:00' })}
                  </Text>
                </View>
              )}
              {place.opening.statusAtScheduled === 'UNKNOWN' && (
                <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[styles.badgeText, { color: colors.placeholder }]}>
                    {t('fe2.recommendation.unknown_at_scheduled')}
                  </Text>
                </View>
              )}
              {place.opening.fallbackToRegularHours && (
                <View style={[styles.badge, { backgroundColor: colors.infoLight }]}>
                  <Text style={[styles.badgeText, { color: colors.info }]}>
                    {t('fe2.recommendation.regular_hours_badge')}
                  </Text>
                </View>
              )}
            </View>

            {place.opening.closingStatus === 'CLOSING_SOON' &&
              place.opening.nextClosingAt && (
                <View
                  style={[
                    styles.alertBox,
                    { backgroundColor: colors.warningLight, borderColor: colors.warning },
                  ]}
                >
                  <Text style={[styles.alertTitle, { color: colors.warning }]}>
                    {t('fe2.place_detail.closing_soon_alert_title')}
                  </Text>
                  <Text style={[styles.alertBody, { color: colors.text }]}>
                    {t('fe2.place_detail.closing_soon_alert_body', {
                      closeTime: place.opening.nextClosingAt,
                      mins: closingMins ?? 45,
                      scheduledTime: '19:00',
                    })}
                  </Text>
                </View>
              )}

            {place.opening.statusAtScheduled === 'UNKNOWN' ? (
              <Text style={styles.noDataHint}>{t('fe2.place_detail.no_data_hint')}</Text>
            ) : (
              openingHours.map((h, i) => (
                <Text key={i} style={styles.hoursText}>
                  • {h}
                </Text>
              ))
            )}

            {place.opening.fallbackToRegularHours && (
              <Text style={[styles.noDataHint, { color: colors.info }]}>
                {t('fe2.place_detail.regular_hours_hint')}
              </Text>
            )}
          </View>

          {/* Weather & Outdoor Exposure Card */}
          {weatherPolicy !== 'OFF' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {t('fe2.place_detail.weather_section')}
              </Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        place.weather.outdoorExposure === 'OUTDOOR'
                          ? colors.infoLight
                          : colors.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          place.weather.outdoorExposure === 'OUTDOOR'
                            ? colors.info
                            : colors.subtext,
                      },
                    ]}
                  >
                    {place.weather.outdoorExposure === 'OUTDOOR'
                      ? t('fe2.recommendation.outdoor_badge')
                      : t('fe2.recommendation.indoor_badge')}
                  </Text>
                </View>

                {place.weather.dataStatus === 'AVAILABLE' &&
                  place.weather.temperatureCelsius !== null && (
                    <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>
                        {t('fe2.recommendation.weather_ok_badge', {
                          temp: place.weather.temperatureCelsius,
                          prob: place.weather.precipitationProbabilityPct ?? 0,
                        })}
                      </Text>
                    </View>
                  )}
              </View>

              {place.weather.hasWeatherWarning ? (
                <View
                  style={[
                    styles.alertBox,
                    { backgroundColor: colors.dangerLight, borderColor: colors.danger },
                  ]}
                >
                  <Text style={[styles.alertBody, { color: colors.danger, fontWeight: '600' }]}>
                    {t('fe2.place_detail.weather_warning_box', {
                      prob: place.weather.precipitationProbabilityPct ?? 80,
                      wind: place.weather.windSpeedKmh ?? 25,
                    })}
                  </Text>
                </View>
              ) : (
                <Text style={styles.hoursText}>
                  {t('fe2.place_detail.weather_safe_box')}
                </Text>
              )}
            </View>
          )}

          {/* Personal Fit Breakdown */}
          <View
            style={[
              styles.card,
              { borderColor: colors.purple, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.purple }]}>
              🎯 {t('fe2.place_detail.viewer_section_title')}
            </Text>

            {utilityRows.map((row, idx) => {
              const pct = Math.round(row.value * 100);
              return (
                <View key={idx} style={styles.utilityRow}>
                  <View style={styles.utilityLabelRow}>
                    <Text style={styles.utilityLabel}>{row.label}</Text>
                    <Text style={[styles.utilityPct, { color: row.color }]}>{pct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${pct}%`, backgroundColor: row.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}

            {place.viewerFeature.matchedTags.length > 0 && (
              <View style={{ marginTop: 4, gap: 6 }}>
                <Text style={styles.subMeta}>
                  {t('fe2.place_detail.matched_tags_label')}
                </Text>
                <View style={styles.badgeRow}>
                  {place.viewerFeature.matchedTags.map((tag) => {
                    const isAvoid = tag.level === 'avoid';
                    const isHigh = tag.level === 'high';
                    return (
                      <View
                        key={tag.tagCode}
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isAvoid
                              ? colors.dangerLight
                              : isHigh
                                ? colors.successLight
                                : colors.surfaceAlt,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: isAvoid
                                ? colors.danger
                                : isHigh
                                  ? colors.success
                                  : colors.subtext,
                            },
                          ]}
                        >
                          {t(`preference.level.${tag.level}` as any)}:{' '}
                          {t(`tags.${tag.tagCode}` as any)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <Text style={styles.privacyNote}>
              {t('fe2.place_detail.viewer_privacy_note')}
            </Text>
          </View>

          {/* ETA, Travel Mode & Traffic */}
          <View style={styles.card}>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionTitle}>{t('fe2.place_detail.eta_section')}</Text>
              <View
                style={[
                  styles.smallBadge,
                  {
                    backgroundColor:
                      effectiveRoutingPreference === 'TRAFFIC_AWARE'
                        ? colors.successLight
                        : colors.warningLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.smallBadgeText,
                    {
                      color:
                        effectiveRoutingPreference === 'TRAFFIC_AWARE'
                          ? colors.success
                          : colors.warning,
                    },
                  ]}
                >
                  {effectiveRoutingPreference === 'TRAFFIC_AWARE'
                    ? t('fe2.recommendation.traffic_aware_badge')
                    : t('fe2.recommendation.traffic_unaware_badge')}
                </Text>
              </View>
            </View>

            <View style={styles.etaSummary}>
              <View style={styles.etaBox}>
                <Text style={styles.etaLabel}>{t('fe2.common.avg_eta')}</Text>
                <Text style={styles.etaValue}>
                  {avgEtaMin} {t('fe2.common.min')}
                </Text>
              </View>
              <View
                style={[
                  styles.etaBox,
                  {
                    backgroundColor: colors.primaryLight,
                    borderWidth: 1,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={styles.etaLabel}>{t('fe2.common.max_eta')}</Text>
                <Text style={styles.etaValue}>
                  {maxEtaMin} {t('fe2.common.min')}
                </Text>
              </View>
            </View>

            {place.memberEtas.map((m) => {
              const etaMin = Math.round(m.etaSeconds / 60);
              const staticMin = Math.round(m.staticDurationSeconds / 60);
              const deltaMin =
                effectiveRoutingPreference === 'TRAFFIC_AWARE'
                  ? Math.max(0, etaMin - staticMin)
                  : 0;
              const modeIcon = m.travelMode === 'DRIVE' ? '🚗' : '🛵';
              const modeLabel =
                m.travelMode === 'DRIVE'
                  ? t('fe2.recommendation.travel_mode_drive')
                  : t('fe2.recommendation.travel_mode_two_wheeler');

              return (
                <View key={m.participantId} style={styles.memberRow}>
                  <Text style={styles.memberName}>
                    {modeIcon} {m.name === 'Bạn' ? t('fe2.common.you') : m.name} • {modeLabel}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {deltaMin > 0 && (
                      <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '600' }}>
                        {t('fe2.recommendation.traffic_delta', { mins: deltaMin })}
                      </Text>
                    )}
                    <Text style={[styles.memberEta, { color: colors.primary }]}>
                      {etaMin} {t('fe2.common.min')}
                    </Text>
                  </View>
                </View>
              );
            })}

            <Text style={styles.noDataHint}>
              {t('fe2.place_detail.no_departure_note')}
            </Text>
          </View>

          {/* Rating & Lazy-Loaded Community Reviews */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('fe2.place_detail.rating_section')}</Text>
            {place.rating !== null ? (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingNumber}>{place.rating.toFixed(1)}</Text>
                <Text style={{ fontSize: 14 }}>⭐⭐⭐⭐⭐</Text>
                <Text style={styles.reviewCount}>
                  {t('fe2.place_detail.reviews_count', {
                    count: (place.userRatingCount ?? 0).toLocaleString(),
                  })}
                </Text>
              </View>
            ) : (
              <Text style={styles.noDataHint}>{t('fe2.common.no_rating')}</Text>
            )}

            {/* Community Reviews with Lazy Loading */}
            <View style={styles.reviewsDivider} />
            <Text style={styles.sectionTitle}>
              {t('fe2.place_detail.community_reviews_section')}
            </Text>
            {allReviews.slice(0, visibleReviewsCount).map((rev) => (
              <View
                key={rev.id}
                style={[styles.reviewCard, { backgroundColor: colors.surfaceAlt }]}
              >
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>
                    {rev.author} {rev.stars}
                  </Text>
                  <Text style={styles.reviewTime}>{rev.time}</Text>
                </View>
                <Text style={styles.reviewText}>{rev.text}</Text>
              </View>
            ))}

            {isLoadingMoreReviews ? (
              <View style={{ gap: 6, marginTop: 4 }}>
                <Text style={[styles.subMeta, { color: colors.primary, fontWeight: '600' }]}>
                  {t('fe2.place_detail.loading_more_reviews')}
                </Text>
                <ReviewItemSkeleton />
              </View>
            ) : hasMoreReviews ? (
              <TouchableOpacity
                style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                onPress={handleLoadMoreReviews}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  {t('fe2.place_detail.load_more_reviews_btn')}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.noDataHint, { textAlign: 'center', marginTop: 4 }]}>
                {t('fe2.place_detail.all_reviews_loaded')}
              </Text>
            )}
          </View>

          {/* Stale Context Lock Notice */}
          {isStale && (
            <View
              style={[
                styles.alertBox,
                { backgroundColor: colors.dangerLight, borderColor: colors.danger },
              ]}
            >
              <Text style={[styles.alertBody, { color: colors.danger, fontWeight: '700' }]}>
                {t('fe2.place_detail.stale_locked_hint')}
              </Text>
            </View>
          )}

          {/* Same-run Sync Confirmation Note */}
          {(isVoted || isFinalized) && !isStale && (
            <View
              style={[
                styles.alertBox,
                { backgroundColor: colors.successLight, borderColor: colors.success },
              ]}
            >
              <Text style={[styles.alertBody, { color: colors.success, fontWeight: '600' }]}>
                {t('fe2.place_detail.same_run_synced_note', { runId })}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionColumn}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.purpleLight, borderColor: colors.purple },
              ]}
              onPress={handleOpenExplanation}
            >
              <Sparkles size={18} color={colors.purple} />
              <Text style={[styles.actionBtnText, { color: colors.purple }]}>
                {t('fe2.recommendation.why_button')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isStale || isAnyFinalized}
              style={[
                styles.actionBtn,
                isVoted
                  ? { backgroundColor: colors.successLight, borderColor: colors.success }
                  : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                (isStale || isAnyFinalized) && { opacity: 0.55 },
              ]}
              onPress={handleVote}
            >
              {isStale ? (
                <Lock size={18} color={colors.subtext} />
              ) : (
                <CheckCircle2 size={18} color={isVoted ? colors.success : colors.subtext} />
              )}
              <Text
                style={[
                  styles.actionBtnText,
                  { color: isVoted ? colors.success : colors.subtext },
                ]}
              >
                {isVoted
                  ? t('fe2.place_detail.voted_this_place')
                  : t('fe2.place_detail.vote_this_place')}{' '}
                • {t('fe2.recommendation.vote_count_badge', { count: place.voteCount })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isStale || isFinalized}
              style={[
                styles.actionBtn,
                isFinalized
                  ? { backgroundColor: colors.successLight, borderColor: colors.success }
                  : { backgroundColor: colors.infoLight, borderColor: colors.info },
                isStale && { opacity: 0.55 },
              ]}
              onPress={handleOpenFinalizeDialog}
            >
              <MapPinCheck size={18} color={isFinalized ? colors.success : colors.info} />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: isFinalized ? colors.success : colors.info },
                ]}
              >
                {isFinalized
                  ? t('fe2.place_detail.finalized_this_place')
                  : t('fe2.place_detail.finalize_this_place')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                isFavorite
                  ? { backgroundColor: colors.dangerLight, borderColor: colors.danger }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleFavorite}
            >
              <Heart
                size={18}
                color={isFavorite ? colors.danger : colors.subtext}
                fill={isFavorite ? colors.danger : 'transparent'}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: isFavorite ? colors.danger : colors.subtext },
                ]}
              >
                {isFavorite
                  ? t('fe2.place_detail.favorite_added')
                  : t('fe2.place_detail.favorite_add')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
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

      {/* Finalize Confirm Dialog */}
      <ConfirmDialog
        visible={finalizeDialogVisible}
        title={t('fe2.place_detail.finalize_confirm_title')}
        message={t('fe2.place_detail.finalize_confirm_body', {
          name: place.name,
          runId,
        })}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmFinalize}
        onCancel={() => setFinalizeDialogVisible(false)}
      />
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 12, paddingBottom: 32 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rankBadge: {
      backgroundColor: c.primaryLight,
      color: c.primary,
      fontWeight: '800',
      fontSize: 13,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    name: { fontSize: 20, fontWeight: '800', color: c.text, flex: 1 },
    address: { fontSize: 13, color: c.placeholder, marginBottom: 4 },
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, gap: 8 },
    sectionTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.subtext },
    subMeta: { fontSize: 12, color: c.subtext },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    badgeText: { fontSize: 12, fontWeight: '600' },
    smallBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    smallBadgeText: { fontSize: 11, fontWeight: '700' },
    alertBox: {
      borderRadius: 10,
      borderWidth: 1,
      padding: 10,
      gap: 4,
    },
    alertTitle: { fontSize: 13, fontWeight: '800' },
    alertBody: { fontSize: 12, lineHeight: 18 },
    hoursText: { fontSize: 13, color: c.subtext, lineHeight: 19 },
    noDataHint: {
      fontSize: 12,
      color: c.placeholder,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    utilityRow: { gap: 4 },
    utilityLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    utilityLabel: { fontSize: 12, color: c.text, fontWeight: '600' },
    utilityPct: { fontSize: 12, fontWeight: '800' },
    progressTrack: {
      height: 7,
      backgroundColor: c.surfaceAlt,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    privacyNote: {
      fontSize: 11,
      color: c.placeholder,
      lineHeight: 16,
      fontStyle: 'italic',
      marginTop: 4,
    },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ratingNumber: { fontSize: 28, fontWeight: '800', color: c.text },
    reviewCount: { fontSize: 12, color: c.placeholder },
    reviewsDivider: {
      height: 1,
      backgroundColor: c.divider,
      marginVertical: 4,
    },
    reviewCard: {
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reviewAuthor: { fontSize: 12, fontWeight: '700', color: c.text },
    reviewTime: { fontSize: 11, color: c.placeholder },
    reviewText: { fontSize: 12, color: c.subtext, lineHeight: 18 },
    loadMoreBtn: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
      marginTop: 4,
    },
    loadMoreText: { fontSize: 12, fontWeight: '700' },
    etaSummary: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    etaBox: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
    },
    etaLabel: { fontSize: 10, color: c.placeholder, fontWeight: '600' },
    etaValue: { fontSize: 18, fontWeight: '700', color: c.text, marginTop: 2 },
    memberRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 5,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    memberName: { fontSize: 13, color: c.subtext },
    memberEta: { fontSize: 13, fontWeight: '700' },
    actionColumn: { gap: 10, marginTop: 6 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
  });
