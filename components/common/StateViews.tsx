/**
 * LoadingState / EmptyState / ErrorState — 3 trạng thái "không có dữ liệu" dùng chung.
 * Thường không gọi trực tiếp mà để <AsyncView> chọn; gọi trực tiếp khi màn hình
 * cần trạng thái riêng (vd. GPS bị từ chối trên bản đồ).
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Clock,
  Inbox,
  LocateOff,
  Lock,
  SearchX,
  ServerCrash,
  ShieldAlert,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, spacing } from '@/theme';
import type { AppError, AppErrorCode } from '@/types/async';
import { Button } from './Button';

// ─── Loading ──────────────────────────────────────────────────────────────

export interface LoadingStateProps {
  message?: string;
  /** Skeleton thay cho spinner (vd. PlaceCardSkeleton) — ưu tiên dùng cho danh sách. */
  skeleton?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({ message, skeleton, style }: LoadingStateProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  if (skeleton) return <View style={[styles.skeleton, style]}>{skeleton}</View>;
  return (
    <View style={[styles.center, style]} accessibilityRole="progressbar" accessibilityLabel={message ?? t('common.loading')}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.description, { color: colors.subtext }]}>{message ?? t('common.loading')}</Text>
    </View>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ title, description, icon: Icon = Inbox, actionLabel, onAction, style }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, style]}>
      <Icon size={iconSize.xl} color={colors.placeholder} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: colors.subtext }]}>{description}</Text>}
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} style={styles.action} />}
    </View>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────

const ERROR_ICONS: Record<AppErrorCode, LucideIcon> = {
  offline: WifiOff,
  network: WifiOff,
  timeout: Clock,
  unauthorized: Lock,
  forbidden: ShieldAlert,
  not_found: SearchX,
  server: ServerCrash,
  gps_denied: LocateOff,
  gps_off: LocateOff,
  unknown: AlertTriangle,
};

export interface ErrorStateProps {
  /** Lỗi chuẩn hóa — tự chọn icon + tiêu đề + mô tả theo `error.code`. */
  error?: AppError;
  /** Ghi đè tiêu đề/mô tả mặc định. */
  title?: string;
  message?: string;
  onRetry?: () => void | Promise<unknown>;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({ error, title, message, onRetry, retryLabel, style }: ErrorStateProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const code = error?.code ?? 'unknown';
  const Icon = ERROR_ICONS[code];
  return (
    <View style={[styles.center, style]} accessibilityRole="alert">
      <Icon size={iconSize.xl} color={colors.danger} />
      <Text style={[styles.title, { color: colors.text }]}>{title ?? t(`errors.${code}.title`)}</Text>
      <Text style={[styles.description, { color: colors.subtext }]}>
        {message ?? error?.message ?? t(`errors.${code}.description`)}
      </Text>
      {onRetry && (
        <Button label={retryLabel ?? t('common.retry')} variant="secondary" onPress={onRetry} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  skeleton: { gap: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, textAlign: 'center', marginTop: spacing.sm },
  description: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: fontSize.sm * 1.5 },
  action: { alignSelf: 'center', marginTop: spacing.md },
});
