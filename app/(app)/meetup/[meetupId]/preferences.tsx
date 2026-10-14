import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';
import type { MeetupRouteParams } from '@/constants/routes';

// TODO FE-09: sở thích tạm thời cho meetup — lưu riêng, không ghi đè preference profile (FE-02).
export default function MeetupPreferencesScreen() {
  const { t } = useTranslation();
  const { meetupId } = useLocalSearchParams<MeetupRouteParams>();
  return <PlaceholderScreen task="FE-09" title={`${t('screens.meetup_preferences')} #${meetupId}`} />;
}