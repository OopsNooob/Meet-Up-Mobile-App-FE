import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { DARK, LIGHT } from '@/theme/colors';

export type { ColorTokens } from '@/theme/colors';

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const colors = useMemo(() => (theme === 'dark' ? DARK : LIGHT), [theme]);
  const isDark = theme === 'dark';
  return { colors, isDark, theme };
}