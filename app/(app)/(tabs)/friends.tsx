import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';
import { routes } from '@/constants/routes';

// TODO FE-03: danh sách bạn bè, trạng thái lời mời, không cho tự kết bạn.
export default function FriendsTab() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      task="FE-03"
      title={t('screens.friend_list')}
      edges={['left', 'right']}
      links={[
        { label: t('screens.friend_search'), href: routes.friendSearch },
        { label: t('screens.friend_requests'), href: routes.friendRequests },
      ]}
    />
  );
}