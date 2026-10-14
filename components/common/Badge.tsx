import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, radius, spacing, toneColors, type Tone } from '@/theme';

export interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

/** Nhãn nhỏ dạng pill. Với trạng thái nghiệp vụ, dùng <StatusLabel> thay vì tự chọn màu. */
export function Badge({ label, tone = 'neutral', icon: Icon, style }: BadgeProps) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {Icon && <Icon size={iconSize.sm - 4} color={fg} />}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
