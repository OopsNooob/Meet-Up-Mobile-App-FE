/**
 * Color tokens cho light/dark. Không dùng mã màu trực tiếp trong component —
 * luôn lấy qua `useTheme().colors`.
 */
export type ColorTokens = {
  background: string;
  surface: string; // card, panel
  surfaceAlt: string; // input, chip, subtle
  text: string;
  subtext: string;
  placeholder: string;
  border: string;
  divider: string;
  // Semantic
  primary: string;
  primaryLight: string;
  onPrimary: string; // chữ/icon trên nền primary, success, danger...
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  neutral: string;
  neutralLight: string;
  purple: string;
  purpleLight: string;
  // Special
  ownBubble: string; // chat bubble gửi đi
  otherBubble: string; // chat bubble nhận
  ownBubbleText: string;
  otherBubbleText: string;
  overlay: string; // modal backdrop
};

export const LIGHT: ColorTokens = {
  background: '#f5f7fa',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f6',
  text: '#111111',
  subtext: '#374151',
  placeholder: '#9ca3af',
  border: '#d1d5db',
  divider: '#f0f0f0',
  primary: '#3b82f6',
  primaryLight: '#eff6ff',
  onPrimary: '#ffffff',
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f97316',
  warningLight: '#fffbeb',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  info: '#0ea5e9',
  infoLight: '#e0f2fe',
  neutral: '#6b7280',
  neutralLight: '#f3f4f6',
  purple: '#6366f1',
  purpleLight: '#ede9fe',
  ownBubble: '#3b82f6',
  otherBubble: '#f3f4f6',
  ownBubbleText: '#ffffff',
  otherBubbleText: '#111111',
  overlay: 'rgba(0,0,0,0.5)',
};

export const DARK: ColorTokens = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  text: '#f1f5f9',
  subtext: '#cbd5e1',
  placeholder: '#64748b',
  border: '#475569',
  divider: '#1e293b',
  primary: '#60a5fa',
  primaryLight: '#1e3a5f',
  onPrimary: '#0f172a',
  success: '#4ade80',
  successLight: '#14532d',
  warning: '#fb923c',
  warningLight: '#431407',
  danger: '#f87171',
  dangerLight: '#450a0a',
  info: '#38bdf8',
  infoLight: '#0c4a6e',
  neutral: '#94a3b8',
  neutralLight: '#334155',
  purple: '#a5b4fc',
  purpleLight: '#312e81',
  ownBubble: '#2563eb',
  otherBubble: '#334155',
  ownBubbleText: '#ffffff',
  otherBubbleText: '#f1f5f9',
  overlay: 'rgba(0,0,0,0.7)',
};

/** Các tone ngữ nghĩa dùng chung cho Badge/StatusLabel/Toast. */
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

export function toneColors(colors: ColorTokens, tone: Tone): { fg: string; bg: string } {
  return { fg: colors[tone], bg: colors[`${tone}Light`] };
}
