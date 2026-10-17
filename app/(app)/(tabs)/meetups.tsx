import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';
import { routes } from '@/constants/routes';

// TODO FE-07: danh sách meetup (đang diễn ra / sắp tới), nút tạo meetup.
export default function MeetupsTab() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      task="FE-07"
      title={t('screens.meetup_list')}
      edges={['left', 'right']}
      links={[
        { label: t('screens.meetup_create'), href: routes.meetupCreate },
        { label: t('screens.meetup_invitations'), href: routes.meetupInvitations },
        { label: `${t('screens.meetup_detail')} (demo-meetup)`, href: routes.meetupDetail('demo-meetup') },
      ]}
    />
  );
}