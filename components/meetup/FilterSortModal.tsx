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
import { SlidersHorizontal, X, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { Button } from '@/components/common/Button';
import { radius, spacing } from '@/theme';
import type { OpeningFilterMode, WeatherPolicy } from '@/types/recommendation';
import type { SortOption } from '@/store/useRecommendationStore';

export type { SortOption };

interface FilterSortModalProps {
  visible: boolean;
  onClose: () => void;
  sortBy: SortOption;
  onSelectSortBy: (sort: SortOption) => void;
  openingFilter: OpeningFilterMode;
  onSelectOpeningFilter: (mode: OpeningFilterMode) => void;
  weatherPolicy: WeatherPolicy;
  onSelectWeatherPolicy: (policy: WeatherPolicy) => void;
  onReset: () => void;
}

export function FilterSortModal({
  visible,
  onClose,
  sortBy,
  onSelectSortBy,
  openingFilter,
  onSelectOpeningFilter,
  weatherPolicy,
  onSelectWeatherPolicy,
  onReset,
}: FilterSortModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const OPENING_OPTIONS: { id: OpeningFilterMode; titleKey: string; subKey: string }[] = [
    {
      id: 'OPEN_AT_SCHEDULED_TIME',
      titleKey: 'fe2.recommendation.opening_filter_scheduled',
      subKey: 'fe2.recommendation.opening_filter_scheduled_sub',
    },
    {
      id: 'OPEN_AT_REQUEST_TIME',
      titleKey: 'fe2.recommendation.opening_filter_request',
      subKey: 'fe2.recommendation.opening_filter_request_sub',
    },
    {
      id: 'ANY',
      titleKey: 'fe2.recommendation.opening_filter_any',
      subKey: 'fe2.recommendation.opening_filter_any_sub',
    },
  ];

  const WEATHER_OPTIONS: { id: WeatherPolicy; titleKey: string; subKey: string }[] = [
    {
      id: 'WARN_ONLY',
      titleKey: 'fe2.recommendation.weather_policy_warn',
      subKey: 'fe2.recommendation.weather_policy_warn_sub',
    },
    {
      id: 'FILTER_OUTDOOR',
      titleKey: 'fe2.recommendation.weather_policy_filter',
      subKey: 'fe2.recommendation.weather_policy_filter_sub',
    },
    {
      id: 'OFF',
      titleKey: 'fe2.recommendation.weather_policy_off',
      subKey: 'fe2.recommendation.weather_policy_off_sub',
    },
  ];

  const SORT_OPTIONS: { id: SortOption; labelKey: string }[] = [
    { id: 'rank', labelKey: 'fe2.recommendation.sort_rank' },
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
          gap: spacing.lg,
        },
        sectionTitle: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.subtext,
          marginBottom: spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        group: {
          gap: 8,
        },
        optionItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 11,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          gap: 10,
        },
        optionItemSelected: {
          borderColor: colors.primary,
          backgroundColor: colors.primaryLight,
        },
        optionTextWrap: {
          flex: 1,
          gap: 2,
        },
        optionTitle: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text,
        },
        optionTitleSelected: {
          fontWeight: '700',
          color: colors.primary,
        },
        optionSub: {
          fontSize: 12,
          color: colors.subtext,
          lineHeight: 17,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>{t('fe2.recommendation.filter_sort_btn')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* FE-23: Opening Filter Mode */}
            <View>
              <Text style={styles.sectionTitle}>
                {t('fe2.recommendation.opening_filter_title')}
              </Text>
              <View style={styles.group}>
                {OPENING_OPTIONS.map((opt) => {
                  const isSelected = openingFilter === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => onSelectOpeningFilter(opt.id)}
                    >
                      <View style={styles.optionTextWrap}>
                        <Text
                          style={[
                            styles.optionTitle,
                            isSelected && styles.optionTitleSelected,
                          ]}
                        >
                          {t(opt.titleKey as any)}
                        </Text>
                        <Text style={styles.optionSub}>{t(opt.subKey as any)}</Text>
                      </View>
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* FE-25: Weather Policy */}
            <View>
              <Text style={styles.sectionTitle}>
                {t('fe2.recommendation.weather_policy_title')}
              </Text>
              <View style={styles.group}>
                {WEATHER_OPTIONS.map((opt) => {
                  const isSelected = weatherPolicy === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => onSelectWeatherPolicy(opt.id)}
                    >
                      <View style={styles.optionTextWrap}>
                        <Text
                          style={[
                            styles.optionTitle,
                            isSelected && styles.optionTitleSelected,
                          ]}
                        >
                          {t(opt.titleKey as any)}
                        </Text>
                        <Text style={styles.optionSub}>{t(opt.subKey as any)}</Text>
                      </View>
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort Section */}
            <View>
              <Text style={styles.sectionTitle}>{t('fe2.recommendation.sort_by')}</Text>
              <View style={styles.group}>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => onSelectSortBy(opt.id)}
                    >
                      <View style={styles.optionTextWrap}>
                        <Text
                          style={[
                            styles.optionTitle,
                            isSelected && styles.optionTitleSelected,
                          ]}
                        >
                          {t(opt.labelKey as any)}
                        </Text>
                      </View>
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
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
                label={t('fe2.recommendation.apply_filter')}
                variant="primary"
                fullWidth
                onPress={handleApply}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
