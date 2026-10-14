/**
 * useTheme — Trả về color token theo theme hiện tại (light/dark).
 * Token màu định nghĩa ở `theme/colors.ts`; spacing/radius/fontSize ở `theme/tokens.ts`.
 */
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