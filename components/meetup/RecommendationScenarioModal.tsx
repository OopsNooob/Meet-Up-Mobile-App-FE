import { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, UserCheck, Activity } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { Button } from '@/components/common/Button';
import { radius, spacing } from '@/theme';
import {
  MOCK_MEETUP_MEMBERS,
  useRecommendationStore,
} from '@/store/useRecommendationStore';

interface RecommendationScenarioModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RecommendationScenarioModal({
  visible,
  onClose,
}: RecommendationScenarioModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const {
    runId,
    contextStatus,
    effectiveRoutingPreference,
    simulateWeatherFilterRelaxed,
    simulateSilentFeedbackError,
    currentViewerId,
    impressedRunIds,
    feedbackLogs,
    setCurrentViewerId,
    toggleStaleContextScenario,
    toggleTrafficFallbackScenario,
    toggleWeatherRelaxedScenario,
    toggleSilentFeedbackError,
    resetAllFiltersAndScenarios,
  } = useRecommendationStore();

  const isCurrentRunImpressed = impressedRunIds.includes(runId);

  const handleClose = useSinglePress(onClose, 400);
  const handleReset = useSinglePress(resetAllFiltersAndScenarios, 400);

  const formatActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'RecommendationShown':
        return t('fe2.recommendation.log_action_shown');
      case 'PlaceVoted':
        return t('fe2.recommendation.log_action_vote');
      case 'VoteChanged':
        return t('fe2.recommendation.log_action_vote_changed');
      case 'MeetupPlaceSelected':
        return t('fe2.recommendation.log_action_finalized');
      case 'NavigationOpened':
        return t('fe2.recommendation.log_action_nav');
      case 'FavoriteAdded':
        return t('fe2.recommendation.log_action_favorite');
      default:
        return actionType;
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        },
        container: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '88%',
          paddingBottom: spacing.lg,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitle: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.text,
          flex: 1,
        },
        closeBtn: {
          padding: 4,
        },
        body: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.lg,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
        },
        sectionTitle: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.subtext,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        descText: {
          fontSize: 12,
          color: colors.subtext,
          lineHeight: 17,
          marginBottom: 8,
        },
        viewerRow: {
          flexDirection: 'row',
          gap: 8,
        },
        viewerChip: {
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
        },
        viewerChipActive: {
          borderColor: colors.purple,
          backgroundColor: colors.purpleLight,
        },
        viewerChipText: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.subtext,
        },
        viewerChipTextActive: {
          fontWeight: '700',
          color: colors.purple,
        },
        scenarioCard: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          marginBottom: 8,
          gap: 12,
        },
        scenarioInfo: {
          flex: 1,
          gap: 3,
        },
        scenarioTitle: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.text,
        },
        scenarioSub: {
          fontSize: 11,
          color: colors.subtext,
          lineHeight: 16,
        },
        impressionBox: {
          backgroundColor: colors.successLight,
          borderColor: colors.success,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: 10,
          marginBottom: 8,
        },
        impressionText: {
          fontSize: 12,
          fontWeight: '700',
          color: colors.success,
        },
        logItem: {
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 10,
          marginBottom: 6,
          gap: 3,
        },
        logTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        logType: {
          fontSize: 12,
          fontWeight: '700',
          color: colors.primary,
        },
        logStatus: {
          fontSize: 10,
          fontWeight: '700',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
        },
        logMeta: {
          fontSize: 11,
          color: colors.subtext,
        },
        footer: {
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          gap: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        btnCol: {
          flex: 1,
        },
      }),
    [colors]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Sparkles size={20} color={colors.purple} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {t('fe2.recommendation.qol_modal_title')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Viewer Switcher */}
            <View>
              <View style={styles.sectionHeader}>
                <UserCheck size={16} color={colors.purple} />
                <Text style={styles.sectionTitle}>
                  {t('fe2.recommendation.qol_viewer_section')}
                </Text>
              </View>
              <Text style={styles.descText}>
                {t('fe2.recommendation.qol_viewer_desc')}
              </Text>
              <View style={styles.viewerRow}>
                {MOCK_MEETUP_MEMBERS.map((m) => {
                  const isSelected = currentViewerId === m.participantId;
                  const displayName = m.name === 'Bạn' ? t('fe2.common.you') : m.name;
                  return (
                    <TouchableOpacity
                      key={m.participantId}
                      style={[styles.viewerChip, isSelected && styles.viewerChipActive]}
                      onPress={() => setCurrentViewerId(m.participantId)}
                    >
                      <Text
                        style={[
                          styles.viewerChipText,
                          isSelected && styles.viewerChipTextActive,
                        ]}
                      >
                        👤 {displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Quick Scenarios */}
            <View>
              <Text style={styles.sectionTitle}>
                {t('fe2.recommendation.qol_scenarios_section')}
              </Text>

              <View style={styles.scenarioCard}>
                <View style={styles.scenarioInfo}>
                  <Text style={styles.scenarioTitle}>
                    {t('fe2.recommendation.qol_scenario_stale')}
                  </Text>
                  <Text style={styles.scenarioSub}>
                    {t('fe2.recommendation.qol_scenario_stale_sub')}
                  </Text>
                </View>
                <Switch
                  value={contextStatus === 'STALE_CONTEXT'}
                  onValueChange={toggleStaleContextScenario}
                  trackColor={{ false: colors.border, true: colors.warning }}
                />
              </View>

              <View style={styles.scenarioCard}>
                <View style={styles.scenarioInfo}>
                  <Text style={styles.scenarioTitle}>
                    {t('fe2.recommendation.qol_scenario_weather_relaxed')}
                  </Text>
                  <Text style={styles.scenarioSub}>
                    {t('fe2.recommendation.qol_scenario_weather_relaxed_sub')}
                  </Text>
                </View>
                <Switch
                  value={simulateWeatherFilterRelaxed}
                  onValueChange={toggleWeatherRelaxedScenario}
                  trackColor={{ false: colors.border, true: colors.info }}
                />
              </View>

              <View style={styles.scenarioCard}>
                <View style={styles.scenarioInfo}>
                  <Text style={styles.scenarioTitle}>
                    {t('fe2.recommendation.qol_scenario_traffic_fallback')}
                  </Text>
                  <Text style={styles.scenarioSub}>
                    {t('fe2.recommendation.qol_scenario_traffic_fallback_sub')}
                  </Text>
                </View>
                <Switch
                  value={effectiveRoutingPreference === 'TRAFFIC_UNAWARE'}
                  onValueChange={toggleTrafficFallbackScenario}
                  trackColor={{ false: colors.border, true: colors.warning }}
                />
              </View>

              <View style={styles.scenarioCard}>
                <View style={styles.scenarioInfo}>
                  <Text style={styles.scenarioTitle}>
                    {t('fe2.recommendation.qol_scenario_silent_err')}
                  </Text>
                  <Text style={styles.scenarioSub}>
                    {t('fe2.recommendation.qol_scenario_silent_err_sub')}
                  </Text>
                </View>
                <Switch
                  value={simulateSilentFeedbackError}
                  onValueChange={toggleSilentFeedbackError}
                  trackColor={{ false: colors.border, true: colors.danger }}
                />
              </View>
            </View>

            {/* Activity History */}
            <View>
              <View style={styles.sectionHeader}>
                <Activity size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('fe2.recommendation.qol_impression_section')}
                </Text>
              </View>

              {isCurrentRunImpressed && (
                <View style={styles.impressionBox}>
                  <Text style={styles.impressionText}>
                    ✓ {t('fe2.recommendation.qol_impression_status', { runId })}
                  </Text>
                </View>
              )}

              {feedbackLogs.length === 0 ? (
                <Text style={styles.descText}>
                  {t('fe2.recommendation.qol_no_logs')}
                </Text>
              ) : (
                feedbackLogs.slice(0, 6).map((log) => {
                  const isRetry = log.status === 'SILENT_RETRY_QUEUED';
                  const memberObj = MOCK_MEETUP_MEMBERS.find(
                    (m) => m.participantId === log.participantId
                  );
                  const actorName =
                    memberObj?.name === 'Bạn'
                      ? t('fe2.common.you')
                      : memberObj?.name ?? log.participantId;
                  return (
                    <View key={log.eventId} style={styles.logItem}>
                      <View style={styles.logTop}>
                        <Text style={styles.logType}>{formatActionLabel(log.actionType)}</Text>
                        <Text
                          style={[
                            styles.logStatus,
                            {
                              backgroundColor: isRetry
                                ? colors.warningLight
                                : colors.successLight,
                              color: isRetry ? colors.warning : colors.success,
                            },
                          ]}
                        >
                          {isRetry
                            ? t('fe2.recommendation.log_status_pending')
                            : t('fe2.recommendation.log_status_saved')}
                        </Text>
                      </View>
                      <Text style={styles.logMeta}>
                        {actorName} • {log.timestamp}
                        {log.rank
                          ? ` • ${t('fe2.recommendation.log_rank_prefix', { rank: log.rank })}`
                          : ''}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.btnCol}>
              <Button
                label={t('fe2.recommendation.reset_filter')}
                variant="secondary"
                fullWidth
                onPress={handleReset}
              />
            </View>
            <View style={styles.btnCol}>
              <Button
                label={t('fe2.common.understood')}
                variant="primary"
                fullWidth
                onPress={handleClose}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
