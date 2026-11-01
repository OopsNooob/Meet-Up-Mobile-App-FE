import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, spacing } from '@/theme';
import { PREFERENCE_LEVELS } from '@/types/domain';
import type { ActivityTag, PreferenceSelection } from '@/types/preference';
import { tagLabel } from '@/utils/preferences';
import { Badge } from './Badge';
import { PREFERENCE_LEVEL_STYLE, TagChip } from './TagChip';

export interface TagLevelPickerProps {
  tags: readonly ActivityTag[];
  value: PreferenceSelection;
  /** Nhận selection MỚI (không sửa `value` cũ) */
  onChange: (next: PreferenceSelection) => void;
  disabled?: boolean;
  showLegend?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Lưới TagChip chọn mức high/normal/avoid cho từng tag. Dùng chung FE-02 (hồ sơ) và FE-09 (meetup). */
export function TagLevelPicker({ tags, value, onChange, disabled, showLegend = true, style }: TagLevelPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {showLegend && (
        <View style={styles.legend}>
          {PREFERENCE_LEVELS.map((level) => (
            <Badge
              key={level}
              label={t(`preference.level.${level}`)}
              tone={PREFERENCE_LEVEL_STYLE[level].tone}
              icon={PREFERENCE_LEVEL_STYLE[level].icon}
            />
          ))}
          <Text style={[styles.hint, { color: colors.subtext }]}>{t('preference.legend_hint')}</Text>
        </View>
      )}
      <View style={styles.chips}>
        {tags.map((tag) => (
          <TagChip
            key={tag.code}
            label={tagLabel(t, tag)}
            level={value[tag.code] ?? null}
            disabled={disabled}
            testID={`tag-chip-${tag.code}`}
            onChange={(level) => {
              const { [tag.code]: _removed, ...rest } = value;
              onChange(level ? { ...rest, [tag.code]: level } : rest);
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  hint: { fontSize: fontSize.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
