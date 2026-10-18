import { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { Button } from '@/components/common/Button';
import { radius, spacing } from '@/theme';

export type SortOption = 'avgEta' | 'maxEta' | 'rating';

interface FilterSortModalProps {
  visible: boolean;
  onClose: () => void;
  sortBy: SortOption;
  onSelectSortBy: (sort: SortOption) => void;
  filterOpenNow: boolean;
  onToggleOpenNow: (openNow: boolean) => void;
  onReset: () => void;
}

export function FilterSortModal({
  visible,
  onClose,
  sortBy,
  onSelectSortBy,
  filterOpenNow,
  onToggleOpenNow,
  onReset,
}: FilterSortModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const SORT_OPTIONS: { id: SortOption; labelKey: string }[] = [
    { id: 'avgEta', labelKey: 'fe2.recommendation.sort_avg_eta' },
    { id: 'maxEta', labelKey: 'fe2.recommendation.sort_max_eta' },
    { id: 'rating', labelKey: 'fe2.recommendation.sort_rating' },
  ];

  const handleApply = useSinglePress(() => {
    onClose();
  }, 300);

  const handleReset = useSinglePress(() => {
    onReset();
    onClose();
  }, 300);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        },
        container: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: spacing.xl,
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
          gap: spacing.lg,
        },
        sectionTitle: {
          fontSize: 14,
          fontWeight: '700',
          color: colors.subtext,
          marginBottom: spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        sortGroup: {
          gap: 8,
        },
        sortItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
        },
        sortItemSelected: {
          borderColor: colors.primary,
          backgroundColor: colors.primaryLight,
        },
        sortItemText: {
          fontSize: 15,
          fontWeight: '500',
          color: colors.text,
        },
        sortItemTextSelected: {
          fontWeight: '700',
          color: colors.primary,
        },
        radio: {
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        radioSelected: {
          borderColor: colors.primary,
          backgroundColor: colors.primary,
        },
        filterRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
        },
        filterLabel: {
          fontSize: 15,
          fontWeight: '500',
          color: colors.text,
        },
        footer: {
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          marginTop: spacing.sm,
        },
        resetBtn: {
          flex: 1,
        },
        applyBtn: {
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>{t('fe2.recommendation.filter_sort_btn')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {/* Sort Section */}
            <View>
              <Text style={styles.sectionTitle}>{t('fe2.recommendation.sort_by')}</Text>
              <View style={styles.sortGroup}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.sortItem, isSelected && styles.sortItemSelected]}
                      onPress={() => onSelectSortBy(opt.id)}
                    >
                      <Text
                        style={[styles.sortItemText, isSelected && styles.sortItemTextSelected]}
                      >
                        {t(opt.labelKey as any)}
                      </Text>
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Filter Section */}
            <View>
              <Text style={styles.sectionTitle}>{t('fe2.recommendation.filter_sort_btn')}</Text>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>{t('fe2.recommendation.filter_open_now')}</Text>
                <Switch
                  value={filterOpenNow}
                  onValueChange={onToggleOpenNow}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.footer}>
              <View style={styles.resetBtn}>
                <Button
                  label={t('fe2.recommendation.reset_filter')}
                  variant="secondary"
                  fullWidth
                  onPress={handleReset}
                />
              </View>
              <View style={styles.applyBtn}>
                <Button
                  label={t('fe2.recommendation.apply_filter')}
                  variant="primary"
                  fullWidth
                  onPress={handleApply}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
