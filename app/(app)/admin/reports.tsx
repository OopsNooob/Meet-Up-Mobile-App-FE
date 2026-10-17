import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';

// TODO FE-18: danh sách báo cáo vi phạm + xử lý (open/reviewing/resolved/dismissed).
export default function AdminReportsScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen task="FE-18" title={t('screens.admin_reports')} />;
}