import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme, type ColorTokens } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { controlHeight, fontSize, fontWeight, iconSize, radius, spacing } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void | Promise<unknown>;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = useMemo(() => getPalette(colors, variant), [colors, variant]);
  const isDisabled = disabled || loading;
  const handlePress = useSinglePress(() => onPress?.());

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          height: controlHeight[size],
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {Icon && <Icon size={size === 'sm' ? iconSize.sm : iconSize.md} color={palette.fg} />}
          <Text
            style={[styles.label, { color: palette.fg, fontSize: size === 'sm' ? fontSize.sm : fontSize.md }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function getPalette(c: ColorTokens, variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return { bg: c.surface, fg: c.primary, border: c.border };
    case 'danger':
      return { bg: c.danger, fg: c.onPrimary, border: c.danger };
    case 'ghost':
      return { bg: 'transparent', fg: c.primary, border: 'transparent' };
    default:
      return { bg: c.primary, fg: c.onPrimary, border: c.primary };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontWeight: fontWeight.semibold },
});
