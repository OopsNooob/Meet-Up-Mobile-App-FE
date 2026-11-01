import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ban, Check, Plus, ThumbsUp, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, radius, spacing, toneColors, type Tone } from '@/theme';
import type { PreferenceLevel } from '@/types/domain';
import { nextPreferenceLevel } from '@/utils/preferences';

/** Màu + icon từng mức — icon khác nhau để không phụ thuộc màu (mù màu) */
export const PREFERENCE_LEVEL_STYLE: Record<PreferenceLevel, { tone: Tone; icon: LucideIcon }> = {
  high: { tone: 'success', icon: ThumbsUp },
  normal: { tone: 'primary', icon: Check },
  avoid: { tone: 'danger', icon: Ban },
};

export interface TagChipProps {
  label: string;
  level: PreferenceLevel | null;
  /** Có thì chip bấm được và nhận mức kế tiếp: chưa chọn → high → normal → avoid → chưa chọn. Không có = chỉ hiển thị. */
  onChange?: (next: PreferenceLevel | null) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Tag sở thích 3 mức high/normal/avoid — dùng chung cho hồ sơ (FE-02) và meetup (FE-09). */
export function TagChip({ label, level, onChange, disabled = false, style, testID }: TagChipProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const selected = level !== null;
  const { fg, bg } = selected ? toneColors(colors, PREFERENCE_LEVEL_STYLE[level].tone) : { fg: colors.subtext, bg: colors.surface };
  const Icon = selected ? PREFERENCE_LEVEL_STYLE[level].icon : Plus;
  const levelLabel = t(`preference.level.${level ?? 'none'}`);

  const content = (
    <>
      <Icon size={iconSize.sm} color={fg} />
      <Text style={[styles.label, { color: selected ? fg : colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  const chipStyle = [styles.chip, { backgroundColor: bg, borderColor: selected ? fg : colors.border }];

  if (!onChange) {
    return (
      <View testID={testID} style={[chipStyle, style]} accessibilityLabel={`${label}, ${levelLabel}`}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={() => onChange(nextPreferenceLevel(level))}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${levelLabel}`}
      accessibilityHint={t('preference.chip_hint')}
      accessibilityState={{ selected, disabled }}
      hitSlop={spacing.xs}
      style={({ pressed }) => [chipStyle, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
