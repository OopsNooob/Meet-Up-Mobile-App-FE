/**
 * PlaceCard — Card địa điểm trong danh sách gợi ý (FE-10 + FE-22 → FE-27)
 * Full dark mode (useTheme) + i18n (useTranslation)
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useSinglePress } from '../../hooks/useSinglePress';
import type {
  RecommendationPlaceItem,
  RoutingPreference,
  ScaleLabel,
  ViewerFeature,
  WeatherPolicy,
} from '@/types/recommendation';

export type { ScaleLabel };

export type PlaceItem = RecommendationPlaceItem & {
  viewerFeature: ViewerFeature;
};

type Props = {
  place: PlaceItem;
  scheduledTimeText?: string;
  weatherPolicy?: WeatherPolicy;
  routingPreference?: RoutingPreference;
  currentViewerName?: string;
  isVoted?: boolean;
  isFinalized?: boolean;
  onPress?: (place: PlaceItem) => void;
  onWhyPress?: (place: PlaceItem) => void;
};

export function PlaceCard({
  place,
  scheduledTimeText = '19:00',
  weatherPolicy = 'WARN_ONLY',
  routingPreference = 'TRAFFIC_AWARE',
  currentViewerName = 'Bạn',
  isVoted = false,
  isFinalized = false,
  onPress,
  onWhyPress,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = useSinglePress(() => onPress?.(place), 600);
  const handleWhyPress = useSinglePress(() => onWhyPress?.(place), 600);

  const SCALE_BG: Record<ScaleLabel, string> = {
    exact: colors.successLight,
    batch: colors.primaryLight,
    cluster: colors.warningLight,
  };

  const SCALE_LABEL: Record<ScaleLabel, string> = {
    exact: t('fe2.recommendation.scale_exact'),
    batch: t('fe2.recommendation.scale_batch'),
    cluster: t('fe2.recommendation.scale_cluster'),
  };

  const avgEtaMin = Math.round(place.avgEtaSeconds / 60);
  const maxEtaMin = Math.round(place.maxEtaSeconds / 60);
  const closingMins =
    place.opening.secondsUntilClose !== null
      ? Math.round(place.opening.secondsUntilClose / 60)
      : null;

  const viewerScorePct = Math.round(place.viewerFeature.memberUtility * 100);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isFinalized && { borderColor: colors.success, borderWidth: 2 },
        !isFinalized && isVoted && { borderColor: colors.primary, borderWidth: 1.5 },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.rankRow}>
            <Text style={styles.rank}>#{place.rank}</Text>
            {isFinalized && (
              <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.statusBadgeText, { color: colors.success }]}>
                  {t('fe2.recommendation.finalized_badge')}
                </Text>
              </View>
            )}
            {!isFinalized && isVoted && (
              <View style={[styles.statusBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                  {t('fe2.recommendation.voted_badge')}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {place.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {place.address}
          </Text>
        </View>
        <View style={[styles.scaleBadge, { backgroundColor: SCALE_BG[place.scaleLabel] }]}>
          <Text style={[styles.scaleBadgeText, { color: colors.subtext }]}>
            {SCALE_LABEL[place.scaleLabel]}
          </Text>
        </View>
      </View>

      {/* Status chips: Rating + Scheduled Opening (FE-23) + Regular Hours fallback */}
      <View style={styles.infoRow}>
        {place.rating !== null ? (
          <View style={[styles.chip, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.chipText, { color: colors.subtext }]}>
              ⭐ {place.rating.toFixed(1)}
            </Text>
          </View>
        ) : (
          <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.chipText, { color: colors.placeholder }]}>
              {t('fe2.common.no_rating')}
            </Text>
          </View>
        )}

        {place.opening.statusAtScheduled === 'OPEN' && (
          <View style={[styles.chip, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.chipText, { color: colors.success }]}>
              {t('fe2.recommendation.open_at_scheduled', { time: scheduledTimeText })}
            </Text>
          </View>
        )}

        {place.opening.statusAtScheduled === 'CLOSED' && (
          <View style={[styles.chip, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.chipText, { color: colors.danger }]}>
              {t('fe2.recommendation.closed_at_scheduled', { time: scheduledTimeText })}
            </Text>
          </View>
        )}

        {place.opening.statusAtScheduled === 'UNKNOWN' && (
          <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.chipText, { color: colors.placeholder }]}>
              {t('fe2.recommendation.unknown_at_scheduled')}
            </Text>
          </View>
        )}

        {place.opening.fallbackToRegularHours && (
          <View style={[styles.chip, { backgroundColor: colors.infoLight }]}>
            <Text style={[styles.chipText, { color: colors.info }]}>
              {t('fe2.recommendation.regular_hours_badge')}
            </Text>
          </View>
        )}
      </View>

      {/* FE-26: Closing Soon Warning Badge */}
      {place.opening.closingStatus === 'CLOSING_SOON' && place.opening.nextClosingAt && (
        <View
          style={[
            styles.closingSoonBanner,
            { backgroundColor: colors.warningLight, borderColor: colors.warning },
          ]}
        >
          <Text style={[styles.closingSoonText, { color: colors.warning }]}>
            {t('fe2.recommendation.closing_soon_badge', {
              closeTime: place.opening.nextClosingAt,
              mins: closingMins ?? 45,
            })}
          </Text>
        </View>
      )}

      {/* FE-25: Outdoor Exposure & Weather Badges (Hidden when weatherPolicy === 'OFF') */}
      {weatherPolicy !== 'OFF' && (
        <View style={styles.infoRow}>
          {place.weather.outdoorExposure === 'INDOOR' && (
            <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.chipText, { color: colors.subtext }]}>
                {t('fe2.recommendation.indoor_badge')}
              </Text>
            </View>
          )}
          {place.weather.outdoorExposure === 'OUTDOOR' && (
            <View style={[styles.chip, { backgroundColor: colors.infoLight }]}>
              <Text style={[styles.chipText, { color: colors.info }]}>
                {t('fe2.recommendation.outdoor_badge')}
              </Text>
            </View>
          )}
          {place.weather.dataStatus === 'AVAILABLE' && place.weather.hasWeatherWarning && (
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.danger },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.danger }]}>
                {t('fe2.recommendation.weather_warn_badge', {
                  prob: place.weather.precipitationProbabilityPct ?? 80,
                })}
              </Text>
            </View>
          )}
          {place.weather.dataStatus === 'AVAILABLE' &&
            !place.weather.hasWeatherWarning &&
            place.weather.temperatureCelsius !== null && (
              <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.chipText, { color: colors.subtext }]}>
                  {t('fe2.recommendation.weather_ok_badge', {
                    temp: place.weather.temperatureCelsius,
                    prob: place.weather.precipitationProbabilityPct ?? 0,
                  })}
                </Text>
              </View>
            )}
        </View>
      )}

      {/* ETA summary */}
      <View style={styles.etaRow}>
        <View style={[styles.etaBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.etaLabel, { color: colors.placeholder }]}>
            {t('fe2.common.avg_eta')}
          </Text>
          <Text style={[styles.etaValue, { color: colors.text }]}>
            {avgEtaMin} {t('fe2.common.min')}
          </Text>
        </View>
        <View
          style={[
            styles.etaBox,
            { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.etaLabel, { color: colors.placeholder }]}>
            {t('fe2.common.max_eta')}
          </Text>
          <Text style={[styles.etaValue, { color: colors.text }]}>
            {maxEtaMin} {t('fe2.common.min')}
          </Text>
        </View>
      </View>

      {/* FE-24: ETA per member + Travel Mode + Traffic Delta */}
      <View style={styles.memberEta}>
        {place.memberEtas.map((m) => {
          const etaMin = Math.round(m.etaSeconds / 60);
          const staticMin = Math.round(m.staticDurationSeconds / 60);
          const trafficDeltaMin =
            routingPreference === 'TRAFFIC_AWARE' ? Math.max(0, etaMin - staticMin) : 0;
          const modeIcon = m.travelMode === 'DRIVE' ? '🚗' : '🛵';
          const modeLabel =
            m.travelMode === 'DRIVE'
              ? t('fe2.recommendation.travel_mode_drive')
              : t('fe2.recommendation.travel_mode_two_wheeler');

          return (
            <View key={m.participantId} style={styles.memberRow}>
              <Text style={[styles.memberName, { color: colors.subtext }]}>
                {modeIcon} {m.name === 'Bạn' ? t('fe2.common.you') : m.name}{' '}
                <Text style={{ fontSize: 11, color: colors.placeholder }}>({modeLabel})</Text>
              </Text>
              <View style={styles.memberEtaRight}>
                {trafficDeltaMin > 0 && (
                  <Text style={[styles.trafficDeltaText, { color: colors.warning }]}>
                    ({t('fe2.recommendation.traffic_delta', { mins: trafficDeltaMin })})
                  </Text>
                )}
                <Text style={[styles.memberEtaText, { color: colors.primary }]}>
                  {etaMin} {t('fe2.common.min')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* FE-27: Viewer-only Personal Utility & Matched Tags Strip */}
      <View
        style={[
          styles.viewerStrip,
          { backgroundColor: colors.purpleLight, borderColor: colors.purple },
        ]}
      >
        <View style={styles.viewerTopRow}>
          <Text style={[styles.viewerMatchText, { color: colors.purple }]}>
            🎯{' '}
            {t('fe2.recommendation.viewer_match_label', {
              name: currentViewerName === 'Bạn' ? t('fe2.common.you') : currentViewerName,
              score: viewerScorePct,
            })}
          </Text>
        </View>
        {place.viewerFeature.matchedTags.length > 0 && (
          <View style={styles.viewerTagsRow}>
            {place.viewerFeature.matchedTags.map((tag) => {
              const isAvoid = tag.level === 'avoid';
              const isHigh = tag.level === 'high';
              return (
                <View
                  key={tag.tagCode}
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: isAvoid
                        ? colors.dangerLight
                        : isHigh
                          ? colors.successLight
                          : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagPillText,
                      {
                        color: isAvoid
                          ? colors.danger
                          : isHigh
                            ? colors.success
                            : colors.subtext,
                      },
                    ]}
                  >
                    {t(`preference.level.${tag.level}` as any)}: {t(`tags.${tag.tagCode}` as any)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Why button */}
      <TouchableOpacity
        style={[styles.whyBtn, { borderTopColor: colors.divider }]}
        onPress={handleWhyPress}
      >
        <Text style={[styles.whyBtnText, { color: colors.purple }]}>
          {t('fe2.recommendation.why_button')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    header: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rank: { fontSize: 12, color: c.placeholder, fontWeight: '700' },
    statusBadge: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    statusBadgeText: { fontSize: 10, fontWeight: '700' },
    name: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 2 },
    address: { fontSize: 12, color: c.placeholder, marginTop: 2 },
    scaleBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    scaleBadgeText: { fontSize: 11, fontWeight: '600' },
    infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontWeight: '600' },
    closingSoonBanner: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 8,
    },
    closingSoonText: { fontSize: 11, fontWeight: '700' },
    etaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    etaBox: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
    etaLabel: { fontSize: 10, fontWeight: '600' },
    etaValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
    memberEta: { gap: 5, marginBottom: 10 },
    memberRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    memberName: { fontSize: 12 },
    memberEtaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    trafficDeltaText: { fontSize: 11, fontWeight: '600' },
    memberEtaText: { fontSize: 12, fontWeight: '700' },
    viewerStrip: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
      gap: 6,
    },
    viewerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    viewerMatchText: { fontSize: 12, fontWeight: '700' },
    viewerTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tagPill: {
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    tagPillText: { fontSize: 10, fontWeight: '700' },
    whyBtn: { borderTopWidth: 1, paddingTop: 10, alignItems: 'center' },
    whyBtnText: { fontSize: 13, fontWeight: '600' },
  });
