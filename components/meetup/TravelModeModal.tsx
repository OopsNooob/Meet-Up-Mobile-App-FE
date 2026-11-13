import { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Navigation, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { Button } from '@/components/common/Button';
import { radius, spacing } from '@/theme';
import { MOCK_MEETUP_MEMBERS } from '@/store/useRecommendationStore';
import type { RoutingPreference, TravelMode } from '@/types/recommendation';

interface TravelModeModalProps {
  visible: boolean;
  onClose: () => void;
  memberTravelModes: Record<string, TravelMode>;
  onSelectTravelMode: (participantId: string, mode: TravelMode) => void;
  routingPreference: RoutingPreference;
}

export function TravelModeModal({
  visible,
  onClose,
  memberTravelModes,
  onSelectTravelMode,
  routingPreference,
}: TravelModeModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const handleClose = useSinglePress(onClose, 400);

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
          maxHeight: '85%',
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
          fontSize: 18,
          fontWeight: '700',
          color: colors.text,
        },
        closeBtn: {
          padding: 4,
        },
        body: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.md,
        },
        subtitle: {
          fontSize: 13,
          color: colors.subtext,
          lineHeight: 19,
        },
        memberCard: {
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        },
        memberHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        memberName: {
          fontSize: 15,
          fontWeight: '700',
          color: colors.text,
        },
        modeRow: {
          flexDirection: 'row',
          gap: 8,
        },
        modeBtn: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        modeBtnActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primaryLight,
        },
        modeBtnText: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.subtext,
        },
        modeBtnTextActive: {
          fontWeight: '700',
          color: colors.primary,
        },
        betaBox: {
          backgroundColor: colors.warningLight,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.warning,
          padding: 10,
        },
        betaText: {
          fontSize: 12,
          color: colors.warning,
          lineHeight: 17,
          fontWeight: '500',
        },
        routingCard: {
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 6,
        },
        sectionTitle: {
          fontSize: 12,
          fontWeight: '700',
          color: colors.subtext,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        routingBadge: {
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
        },
        routingBadgeText: {
          fontSize: 12,
          fontWeight: '700',
        },
        routingNote: {
          fontSize: 12,
          color: colors.subtext,
          lineHeight: 17,
        },
        footer: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      }),
    [colors]
  );

  const hasTwoWheeler = Object.values(memberTravelModes).includes('TWO_WHEELER');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Navigation size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>
                {t('fe2.recommendation.travel_modal_title')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              {t('fe2.recommendation.travel_modal_subtitle')}
            </Text>

            {/* Member Travel Modes (TWO_WHEELER vs DRIVE only) */}
            {MOCK_MEETUP_MEMBERS.map((member) => {
              const currentMode = memberTravelModes[member.participantId] ?? 'TWO_WHEELER';
              const displayName =
                member.name === 'Bạn' ? t('fe2.common.you') : member.name;

              return (
                <View key={member.participantId} style={styles.memberCard}>
                  <View style={styles.memberHeader}>
                    <Text style={styles.memberName}>{displayName}</Text>
                  </View>
                  <View style={styles.modeRow}>
                    <TouchableOpacity
                      style={[
                        styles.modeBtn,
                        currentMode === 'TWO_WHEELER' && styles.modeBtnActive,
                      ]}
                      onPress={() => onSelectTravelMode(member.participantId, 'TWO_WHEELER')}
                    >
                      <Text style={{ fontSize: 15 }}>🛵</Text>
                      <Text
                        style={[
                          styles.modeBtnText,
                          currentMode === 'TWO_WHEELER' && styles.modeBtnTextActive,
                        ]}
                      >
                        {t('fe2.recommendation.travel_mode_two_wheeler')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modeBtn,
                        currentMode === 'DRIVE' && styles.modeBtnActive,
                      ]}
                      onPress={() => onSelectTravelMode(member.participantId, 'DRIVE')}
                    >
                      <Text style={{ fontSize: 15 }}>🚗</Text>
                      <Text
                        style={[
                          styles.modeBtnText,
                          currentMode === 'DRIVE' && styles.modeBtnTextActive,
                        ]}
                      >
                        {t('fe2.recommendation.travel_mode_drive')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Google Maps Two-Wheeler Caution Note (FE-24) */}
            {hasTwoWheeler && (
              <View style={styles.betaBox}>
                <Text style={styles.betaText}>
                  {t('fe2.recommendation.two_wheeler_beta_note')}
                </Text>
              </View>
            )}

            {/* Read-only Server Traffic Routing Badge (FE-24: No client toggle) */}
            <View style={styles.routingCard}>
              <Text style={styles.sectionTitle}>
                {t('fe2.recommendation.routing_status_section')}
              </Text>
              <View
                style={[
                  styles.routingBadge,
                  {
                    backgroundColor:
                      routingPreference === 'TRAFFIC_AWARE'
                        ? colors.successLight
                        : colors.warningLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.routingBadgeText,
                    {
                      color:
                        routingPreference === 'TRAFFIC_AWARE'
                          ? colors.success
                          : colors.warning,
                    },
                  ]}
                >
                  {routingPreference === 'TRAFFIC_AWARE'
                    ? t('fe2.recommendation.traffic_aware_badge')
                    : t('fe2.recommendation.traffic_unaware_badge')}
                </Text>
              </View>
              <Text style={styles.routingNote}>
                {t('fe2.recommendation.routing_config_note')}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={t('fe2.common.understood')}
              variant="primary"
              fullWidth
              onPress={handleClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

