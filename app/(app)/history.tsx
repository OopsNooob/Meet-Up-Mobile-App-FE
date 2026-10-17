import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';

// TODO FE-14: lịch sử meetup (không hiển thị/lưu lịch sử GPS).
export default function HistoryScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen task="FE-14" title={t('screens.history')} />;
}