import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ErrorState } from '@/components/common';
import { routes } from '@/constants/routes';
import type { MeetupError } from '@/types/meetup';

export function MeetupErrorState({ error, onRetry }: { error?: MeetupError; onRetry: () => void | Promise<unknown> }) {
  const { t } = useTranslation();
  const notFound = error?.meetupCode === 'meetup_not_found' || error?.code === 'not_found';
  const forbidden = error?.status === 403 || error?.code === 'forbidden';

  if (notFound || forbidden) {
    return (
      <ErrorState
        error={error}
        title={t(notFound ? 'meetup.errors.not_found_title' : 'meetup.errors.not_member_title')}
        message={t(notFound ? 'meetup.errors.meetup_not_found' : 'meetup.errors.not_member')}
        retryLabel={t('meetup.back_to_list')}
        onRetry={() => (router.canGoBack() ? router.back() : router.replace(routes.tabMeetups))}
      />
    );
  }
  return <ErrorState error={error} onRetry={onRetry} />;
}
