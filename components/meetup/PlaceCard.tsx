/**
 * PlaceCard — Card địa điểm trong danh sách gợi ý (FE-10)
 * Full dark mode (useTheme) + i18n (useTranslation)
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useSinglePress } from '../../hooks/useSinglePress';

export type ScaleLabel = 'exact' | 'batch' | 'cluster';

export type PlaceItem = {
  placeId: string;
  name: string;
  rating: number | null;
  isOpenNow: boolean | null;
  address: string;
  avgEta: number;
  maxEta: number;
  etaPerMember: { userId: string; name: string; eta: number }[];
  scaleLabel: ScaleLabel;
  rank: number;
  lat?: number;
  lng?: number;
};

type Props = {
  place: PlaceItem;
  onPress?: (place: PlaceItem) => void;
  onWhyPress?: (place: PlaceItem) => void;
};

export function PlaceCard({ place, onPress, onWhyPress }: Props) {
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

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rank}>#{place.rank}</Text>
          <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
          <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
        </View>
        <View style={[styles.scaleBadge, { backgroundColor: SCALE_BG[place.scaleLabel] }]}>
          <Text style={[styles.scaleBadgeText, { color: colors.subtext }]}>{SCALE_LABEL[place.scaleLabel]}</Text>
        </View>
      </View>

      {/* Status chips */}
      <View style={styles.infoRow}>
        {place.rating !== null ? (
          <View style={[styles.chip, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.chipText, { color: colors.subtext }]}>⭐ {place.rating.toFixed(1)}</Text>
          </View>
        ) : (
          <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.chipText, { color: colors.placeholder }]}>{t('fe2.common.no_rating')}</Text>
          </View>
        )}
        {place.isOpenNow === true && (
          <View style={[styles.chip, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.chipText, { color: colors.success }]}>{t('fe2.common.open_now')}</Text>
          </View>
        )}
        {place.isOpenNow === false && (
          <View style={[styles.chip, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.chipText, { color: colors.danger }]}>{t('fe2.common.closed')}</Text>
          </View>
        )}
        {place.isOpenNow === null && (
          <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.chipText, { color: colors.placeholder }]}>⏱ {t('fe2.common.no_opening_hours')}</Text>
          </View>
        )}
      </View>

      {/* ETA summary */}
      <View style={styles.etaRow}>
        <View style={[styles.etaBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.etaLabel, { color: colors.placeholder }]}>{t('fe2.common.avg_eta')}</Text>
          <Text style={[styles.etaValue, { color: colors.text }]}>{place.avgEta} {t('fe2.common.min')}</Text>
        </View>
        <View style={[styles.etaBox, { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary }]}>
          <Text style={[styles.etaLabel, { color: colors.placeholder }]}>{t('fe2.common.max_eta')}</Text>
          <Text style={[styles.etaValue, { color: colors.text }]}>{place.maxEta} {t('fe2.common.min')}</Text>
        </View>
      </View>

      {/* ETA per member */}
      <View style={styles.memberEta}>
        {place.etaPerMember.map((m) => (
          <View key={m.userId} style={styles.memberRow}>
            <Text style={[styles.memberName, { color: colors.subtext }]}>{m.name}</Text>
            <Text style={[styles.memberEtaText, { color: colors.primary }]}>{m.eta} {t('fe2.common.min')}</Text>
          </View>
        ))}
      </View>

      {/* Why button */}
      <TouchableOpacity style={[styles.whyBtn, { borderTopColor: colors.divider }]} onPress={handleWhyPress}>
        <Text style={[styles.whyBtnText, { color: colors.purple }]}>{t('fe2.recommendation.why_button')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
    header: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    rank: { fontSize: 11, color: c.placeholder, fontWeight: '600' },
    name: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 2 },
    address: { fontSize: 12, color: c.placeholder, marginTop: 2 },
    scaleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    scaleBadgeText: { fontSize: 11, fontWeight: '600' },
    infoRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontWeight: '600' },
    etaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    etaBox: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
    etaLabel: { fontSize: 10, fontWeight: '600' },
    etaValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
    memberEta: { gap: 4, marginBottom: 10 },
    memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
    memberName: { fontSize: 12 },
    memberEtaText: { fontSize: 12, fontWeight: '600' },
    whyBtn: { borderTopWidth: 1, paddingTop: 10, alignItems: 'center' },
    whyBtnText: { fontSize: 13, fontWeight: '600' },
  });
