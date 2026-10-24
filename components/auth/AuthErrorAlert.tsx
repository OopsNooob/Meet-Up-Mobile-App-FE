import { useTranslation } from 'react-i18next';
import { Lock, WifiOff } from 'lucide-react-native';
import { InlineAlert } from '@/components/common';
import type { ApiError } from '@/services/apiClient';

/**
 * Lỗi đăng nhập/đăng ký hiển thị trong form.
 * Tài khoản bị khóa có thông báo riêng (icon khóa + lý do), khác hẳn lỗi sai mật khẩu.
 */
export function AuthErrorAlert({ error }: { error: ApiError }) {
  const { t } = useTranslation();

  if (error.code === 'account_locked') {
    const description = t('errors.account_locked.description');
    return (
      <InlineAlert
        tone="danger"
        icon={Lock}
        title={t('errors.account_locked.title')}
        message={error.lockedReason ? `${description}\n${t('auth.locked_reason', { reason: error.lockedReason })}` : description}
      />
    );
  }

  const isConnection = error.code === 'network' || error.code === 'offline' || error.code === 'timeout';
  return (
    <InlineAlert
      tone={isConnection ? 'warning' : 'danger'}
      icon={isConnection ? WifiOff : undefined}
      title={t(`errors.${error.code}.title`)}
      message={t(`errors.${error.code}.description`)}
    />
  );
}