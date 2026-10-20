import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, radius, spacing, toneColors } from '@/theme';

export type InlineAlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_ICONS: Record<InlineAlertTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export interface InlineAlertProps {
  title: string;
  message?: string;
  tone?: InlineAlertTone;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

/** Thông báo nằm trong luồng nội dung (lỗi submit form, cảnh báo đầu màn). Lỗi cả màn → ErrorState; tin ngắn → useToast. */
export function InlineAlert({ title, message, tone = 'info', icon, style }: InlineAlertProps) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  const Icon = icon ?? TONE_ICONS[tone];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.container, { backgroundColor: bg, borderColor: fg }, style]}
    >
      <Icon size={iconSize.md} color={fg} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {message ? <Text style={[styles.message, { color: colors.subtext }]}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  texts: { flex: 1, gap: spacing.xxs },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  message: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
});