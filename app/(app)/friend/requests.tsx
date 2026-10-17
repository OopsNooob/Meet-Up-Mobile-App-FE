import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';

// TODO FE-03: lời mời kết bạn đã nhận/đã gửi — chấp nhận, từ chối, hủy.
export default function FriendRequestsScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen task="FE-03" title={t('screens.friend_requests')} />;
}