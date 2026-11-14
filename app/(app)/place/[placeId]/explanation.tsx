import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { InlineAlert } from '@/components/common/InlineAlert';
import { ErrorState } from '@/components/common/StateViews';
import { ExplanationSkeleton } from '@/components/common/Skeleton';
import {
  selectComputedRecommendations,
  useRecommendationStore,
} from '@/store/useRecommendationStore';

export default function AiExplanationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { placeId, placeName } = useLocalSearchParams<{
    placeId: string;
    placeName: string;
  }>();

  const storeState = useRecommendationStore();
  const { activeMeetupId, apiError, hasServerData, replayRunOnServer, loadRecommendationsForMeetup } =
    storeState;
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
  const [replayStatus, setReplayStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const handleClose = useSinglePress(() => router.back(), 500);

  const handleRefresh = useSinglePress(async () => {
    setIsRefreshing(true);
    if (hasServerData && activeMeetupId) {
      const replay = await replayRunOnServer(activeMeetupId);
      setReplayStatus(replay?.replayConsistent ? 'ok' : 'error');
    } else if (activeMeetupId) {
      await loadRecommendationsForMeetup(activeMeetupId);
    }
    setIsRefreshing(false);
  }, 700);

  const openingStatusAtScheduled = place?.opening.statusAtScheduled;
  const openingHighlightText = useMemo(() => {
    if (openingStatusAtScheduled === 'OPEN') {
      return t('fe2.ai_explanation.highlight_opening_open');
    }
    if (openingStatusAtScheduled === 'CLOSED') {
      return t('fe2.ai_explanation.highlight_opening_closed');
    }
    return t('fe2.ai_explanation.highlight_opening_unknown');
  }, [openingStatusAtScheduled, t]);

  const rawWarnings = place?.explanation.warnings;
  const friendlyWarnings = useMemo(() => {
    return (rawWarnings ?? []).map((code) => {
      if (code === 'CLOSING_SOON_AT_MEETUP_TIME') return t('fe2.ai_explanation.warn_closing_soon');
      if (code === 'BAD_WEATHER_OUTDOOR') return t('fe2.ai_explanation.warn_bad_weather');
      if (code === 'OPENING_FROM_REGULAR_HOURS') return t('fe2.ai_explanation.warn_regular_hours');
      if (code === 'OPENING_STATUS_UNKNOWN') return t('fe2.ai_explanation.warn_unknown_hours');
      return code;
    });
  }, [rawWarnings, t]);

  if (!place) {
    return (
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ErrorState error={apiError ?? undefined} onRetry={handleRefresh} />
        </View>
      </View>
    );
  }

  const avgEtaMin = Math.round(place.avgEtaSeconds / 60);
  const maxEtaMin = Math.round(place.maxEtaSeconds / 60);
  const viewerEtaMin = Math.round(place.viewerFeature.etaSeconds / 60);

  const aiSummaryText = place.explanation.aiSummaryKey
    ? t(place.explanation.aiSummaryKey as any)
    : t('fe2.ai_explanation.highlight_fair', { avg: avgEtaMin, max: maxEtaMin });

  const travelModeLabel =
    place.viewerFeature.travelMode === 'DRIVE'
      ? t('fe2.recommendation.travel_mode_drive')
      : t('fe2.recommendation.travel_mode_two_wheeler');

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('fe2.ai_explanation.screen_title')}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.placeholder }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.placeName} numberOfLines={1}>
          #{place.rank} • {placeName ?? place.name}
        </Text>

        <ScrollView
          style={{ maxHeight: 420 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.purple]}
              tintColor={colors.purple}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          {isLoading ? (
            <ExplanationSkeleton />
          ) : (
            <View style={{ gap: 12 }}>
              {replayStatus === 'ok' && (
                <InlineAlert
                  tone="success"
                  title={t('fe2.common.replay_audit_title')}
                  message={t('fe2.common.replay_consistent_msg')}
                />
              )}
              {replayStatus === 'error' && (
                <InlineAlert
                  tone="warning"
                  title={t('fe2.common.replay_audit_title')}
                  message={t('fe2.common.replay_failed_msg')}
                />
              )}
              <View style={{ gap: 8 }}>
                <View style={[styles.aiBadge, { backgroundColor: colors.purpleLight }]}>
                  <Text style={[styles.aiBadgeText, { color: colors.purple }]}>
                    {t('fe2.ai_explanation.ai_badge')}
                  </Text>
                </View>
                <Text style={styles.explanationText}>{aiSummaryText}</Text>
              </View>

              {/* Personal Fit Summary for Current Viewer */}
              <View
                style={[
                  styles.sectionBox,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.purple }]}>
                  🎯 {t('fe2.ai_explanation.viewer_reason_section')}
                </Text>
                <Text style={styles.factMeta}>
                  •{' '}
                  {t('fe2.ai_explanation.viewer_fit_line', {
                    total: Math.round(place.viewerFeature.memberUtility * 100),
                    travel: Math.round(place.viewerFeature.travelUtility * 100),
                    pref: Math.round(place.viewerFeature.preferenceUtility * 100),
                    quality: Math.round(place.viewerFeature.placeQualityUtility * 100),
                  })}
                </Text>
                <Text style={styles.factMeta}>
                  •{' '}
                  {t('fe2.ai_explanation.viewer_eta_line', {
                    mode: travelModeLabel,
                    mins: viewerEtaMin,
                  })}
                </Text>
              </View>

              {/* Group Highlights (Clean & Concise) */}
              <View
                style={[
                  styles.sectionBox,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={styles.sectionTitle}>
                  ✨ {t('fe2.ai_explanation.facts_section')}
                </Text>
                <View style={styles.highlightsList}>
                  <Text style={styles.factMeta}>
                    • {t('fe2.ai_explanation.highlight_avg_eta', { mins: avgEtaMin })}
                  </Text>
                  <Text style={styles.factMeta}>
                    • {t('fe2.ai_explanation.highlight_max_eta', { mins: maxEtaMin })}
                  </Text>
                  <Text style={styles.factMeta}>• {openingHighlightText}</Text>
                </View>
              </View>

              {/* Friendly Warnings if any */}
              {friendlyWarnings.length > 0 && (
                <View
                  style={[
                    styles.sectionBox,
                    { backgroundColor: colors.warningLight, borderColor: colors.warning },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.warning }]}>
                    ⚠️ {t('fe2.ai_explanation.warnings_section')}
                  </Text>
                  {friendlyWarnings.map((w, idx) => (
                    <Text
                      key={idx}
                      style={{ fontSize: 12, color: colors.warning, fontWeight: '600' }}
                    >
                      • {w}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={styles.disclaimer}>{t('fe2.ai_explanation.disclaimer')}</Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.okBtn, { backgroundColor: colors.primary }]}
          onPress={handleClose}
        >
          <Text style={styles.okBtnText}>{t('fe2.common.understood')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    modal: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    title: { fontSize: 18, fontWeight: '800', color: c.text },
    closeBtn: { padding: 4 },
    closeText: { fontSize: 18 },
    placeName: {
      fontSize: 13,
      color: c.placeholder,
      fontWeight: '600',
      marginBottom: 14,
    },
    aiBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    aiBadgeText: { fontSize: 11, fontWeight: '700' },
    explanationText: { fontSize: 14, color: c.subtext, lineHeight: 22 },
    sectionBox: {
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      gap: 6,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    factMeta: {
      fontSize: 13,
      color: c.subtext,
      lineHeight: 20,
    },
    highlightsList: {
      gap: 4,
    },
    disclaimer: {
      fontSize: 11,
      color: c.placeholder,
      fontStyle: 'italic',
      marginTop: 2,
    },
    okBtn: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    okBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
