import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { controlHeight, fontSize, fontWeight, radius, spacing } from '@/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({ label, error, hint, containerStyle, editable = true, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>}
      <TextInput
        {...inputProps}
        editable={editable}
        placeholderTextColor={colors.placeholder}
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          inputProps.multiline && styles.multiline,
          {
            color: colors.text,
            backgroundColor: editable ? colors.surface : colors.surfaceAlt,
            borderColor,
          },
        ]}
      />
      {error ? (
        <Text style={[styles.helper, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: colors.placeholder }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, alignSelf: 'stretch' },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  input: {
    minHeight: controlHeight.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
  },
  multiline: { paddingVertical: spacing.md, textAlignVertical: 'top', minHeight: controlHeight.md * 2 },
  helper: { fontSize: fontSize.xs },
});
