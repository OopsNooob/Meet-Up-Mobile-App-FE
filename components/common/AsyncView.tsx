import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/theme';
import type { AsyncState } from '@/types/async';
import { EmptyState, ErrorState, LoadingState, type EmptyStateProps, type LoadingStateProps } from './StateViews';
import { StatusLabel } from './StatusLabel';

export interface AsyncViewProps<T> {
  state: AsyncState<T>;
  /** Render khi có dữ liệu. */
  children: (data: T) => ReactNode;
  onRetry?: () => void | Promise<unknown>;
  loading?: LoadingStateProps;
  /** Nội dung trạng thái rỗng — nên luôn truyền title riêng cho từng màn. */
  empty?: Partial<EmptyStateProps>;
}

/**
 * Render thống nhất 4 trạng thái loading / empty / error / success.
 * Khi success nhưng `isStale`, tự hiện nhãn "dữ liệu cũ" kèm thời điểm cập nhật
 * để không giả vờ dữ liệu là realtime.
 */
export function AsyncView<T>({ state, children, onRetry, loading, empty }: AsyncViewProps<T>) {
  const { t } = useTranslation();

  switch (state.status) {
    case 'loading':
      return <LoadingState {...loading} />;
    case 'empty':
      return <EmptyState title={t('common.empty_title')} {...empty} />;
    case 'error':
      return <ErrorState error={state.error} onRetry={onRetry} />;
    case 'success':
      return (
        <>
          {state.isStale && (
            <View style={styles.staleRow}>
              <StatusLabel
                kind="stale"
                detail={state.updatedAt ? t('common.updated_at', { time: formatTime(state.updatedAt) }) : undefined}
              />
            </View>
          )}
          {children(state.data)}
        </>
      );
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  staleRow: { marginBottom: spacing.sm },
});
