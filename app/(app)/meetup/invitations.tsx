import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';
import { routes } from '@/constants/routes';

// TODO FE-08: danh sách lời mời meetup + chấp nhận/từ chối (không phản hồi meetup đã hủy/chốt).
export default function MeetupInvitationsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      task="FE-08"
      title={t('screens.meetup_invitations')}
      links={[{ label: `${t('screens.meetup_detail')} (demo-meetup)`, href: routes.meetupDetail('demo-meetup') }]}
    />
  );
}