import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';

// TODO FE-03: tìm kiếm người dùng và gửi lời mời kết bạn (không cho tự kết bạn).
export default function FriendSearchScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen task="FE-03" title={t('screens.friend_search')} />;
}