import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';
import { routes, type MeetupRouteParams } from '@/constants/routes';

// TODO FE-12: vote realtime + chốt địa điểm (một vote/người, khóa thao tác sau khi chốt).
export default function MeetupVoteScreen() {
  const { t } = useTranslation();
  const { meetupId } = useLocalSearchParams<MeetupRouteParams>();
  return (
    <PlaceholderScreen
      task="FE-12"
      title={`${t('screens.meetup_vote')} #${meetupId}`}
      links={[{ label: t('fe2.recommendation.screen_title'), href: routes.meetupRecommendations(meetupId) }]}
    />
  );
}