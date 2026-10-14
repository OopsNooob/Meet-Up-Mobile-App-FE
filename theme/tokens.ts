/**
 * Kích thước dùng chung (không phụ thuộc light/dark).
 * Component không hardcode số — dùng các token dưới đây.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // padding chuẩn của màn hình
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15, // body
  lg: 17,
  xl: 20,
  xxl: 24,
  display: 30,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 48,
} as const;

/** Chiều cao control (Button, TextField) để các form thẳng hàng. */
export const controlHeight = {
  sm: 36,
  md: 48,
} as const;

export const avatarSize = {
  sm: 32,
  md: 44,
  lg: 72,
} as const;
