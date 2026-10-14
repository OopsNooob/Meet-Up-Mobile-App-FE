import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';
import { routes } from '@/constants/routes';

// TODO FE-18: danh sách tài khoản + khóa/mở khóa (dùng ConfirmDialog tone="danger").
export default function AdminUsersScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      task="FE-18"
      title={t('screens.admin_users')}
      links={[{ label: t('screens.admin_reports'), href: routes.adminReports }]}
    />
  );
}