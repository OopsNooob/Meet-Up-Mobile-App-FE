import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, radius, spacing } from '@/theme';
import { toAppError } from '@/types/async';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' cho thao tác phá hủy: hủy meetup, khóa tài khoản... */
  tone?: 'primary' | 'danger';
  /**
   * Nếu trả về Promise: nút xác nhận hiện loading, dialog giữ mở tới khi xong.
   * Promise reject → hiện lỗi ngay trong dialog, không đóng.
   */
  onConfirm: () => void | Promise<unknown>;
  onCancel: () => void;
}

/**
 * Hộp thoại xác nhận cho thao tác quan trọng (hủy meetup, chốt địa điểm, khóa tài khoản admin...).
 * Màn hình tự giữ state `visible`; đóng dialog trong onConfirm/onCancel.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      const appError = toAppError(err);
      setError(appError.message ?? t(`errors.${appError.code}.description`));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (busy) return;
    setError(null);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={handleCancel}>
        {/* Chặn sự kiện bấm xuyên qua dialog */}
        <Pressable style={[styles.dialog, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            {title}
          </Text>
          {message && <Text style={[styles.message, { color: colors.subtext }]}>{message}</Text>}
          {error && <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>}
          <View style={styles.actions}>
            <Button label={cancelLabel ?? t('common.cancel')} variant="ghost" onPress={handleCancel} disabled={busy} />
            <Button
              label={confirmLabel ?? t('common.confirm')}
              variant={tone === 'danger' ? 'danger' : 'primary'}
              onPress={handleConfirm}
              loading={busy}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  dialog: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  message: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
});
