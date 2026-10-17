import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';
import type { MeetupRouteParams } from '@/constants/routes';

// TODO FE-07: sửa meetup (chỉ người tạo, chỉ khi chưa chốt/hủy).
export default function MeetupEditScreen() {
  const { t } = useTranslation();
  const { meetupId } = useLocalSearchParams<MeetupRouteParams>();
  return <PlaceholderScreen task="FE-07" title={`${t('screens.meetup_edit')} #${meetupId}`} />;
}