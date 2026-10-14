import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';

// TODO FE-07: form tạo meetup (không giới hạn cứng số người).
export default function MeetupCreateScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen task="FE-07" title={t('screens.meetup_create')} />;
}