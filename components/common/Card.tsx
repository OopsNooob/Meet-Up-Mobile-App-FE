import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { radius, spacing } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({ children, onPress, padded = true, style, testID }: CardProps) {
  const { colors } = useTheme();
  const handlePress = useSinglePress(() => onPress?.());
  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
    padded && styles.padded,
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={cardStyle}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [cardStyle, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  padded: { padding: spacing.lg },
});
