import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { useAppStore } from '@/store/useAppStore';
import { fontSize, fontWeight, iconSize, radius, spacing } from '@/theme';

export function LanguageToggle() {
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const setLanguage = useAppStore((s) => s.setLanguage);

  const toggle = useSinglePress(() => {
    const next = i18n.language === 'vi' ? 'en' : 'vi';
    setLanguage(next);
    i18n.changeLanguage(next);
  }, 500);

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel="Language"
      hitSlop={spacing.sm}
      style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
    >
      <Globe size={iconSize.sm - 2} color={colors.primary} />
      <Text style={[styles.label, { color: colors.text }]}>{i18n.language === 'vi' ? 'VI' : 'EN'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginRight: spacing.md,
  },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
