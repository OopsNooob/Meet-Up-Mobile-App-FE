import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, radius, spacing } from '@/theme';

export interface OptionChipsProps<T extends string | number> {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  getLabel: (value: T) => string;
  disabled?: boolean;
  label?: string;
  testID?: string;
}

export function OptionChips<T extends string | number>({
  options,
  value,
  onChange,
  getLabel,
  disabled = false,
  label,
  testID,
}: OptionChipsProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={String(option)}
            onPress={() => onChange(option)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            hitSlop={spacing.xs}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? colors.primaryLight : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
          >
            {selected && <Check size={iconSize.sm} color={colors.primary} />}
            <Text style={[styles.label, { color: selected ? colors.primary : colors.text }]}>{getLabel(option)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
