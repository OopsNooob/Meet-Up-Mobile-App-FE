import { useTranslation } from 'react-i18next';
import { Check, UserCheck, UserPlus } from 'lucide-react-native';
import { Badge, Button, useToast } from '@/components/common';
import { useRelationship } from '@/hooks/useFriends';
import { useFriendStore } from '@/store/useFriendStore';
import type { FriendUser, Relationship } from '@/types/friend';
import { getFriendErrorMessage } from '@/utils/friendErrors';

export interface RelationshipActionsProps {
  user: FriendUser;
  /** Quan hệ BE trả kèm kết quả tìm kiếm — chỉ dùng khi store chưa tải xong danh sách */
  fallback?: Exclude<Relationship, 'self'>;
}

/**
 * Nút theo quan hệ: Kết bạn / Đã gửi · Hủy / Chấp nhận · Từ chối / Bạn bè. Với chính mình: chỉ nhãn "Bạn".
 * Quan hệ đọc từ useFriendStore → mọi nơi hiển thị cùng người này đổi cùng lúc.
 */
export function RelationshipActions({ user, fallback }: RelationshipActionsProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { relationship: local, requestId, isPending } = useRelationship(user.id);
  const listsLoaded = useFriendStore(
    (s) => s.friendsMeta.status === 'success' && s.requestsMeta.status === 'success',
  );
  const relationship = local === 'self' || listsLoaded || !fallback ? local : fallback;

  const run = (action: () => Promise<void>, successMessage?: string) => async () => {
    try {
      await action();
      if (successMessage) toast.show(successMessage, { tone: 'success' });
    } catch (err) {
      toast.show(getFriendErrorMessage(t, err), { tone: 'danger' });
    }
  };

  const store = useFriendStore.getState;

  switch (relationship) {
    case 'self':
      return <Badge label={t('friend.is_self')} tone="neutral" />;
    case 'friend':
      return <Badge label={t('friend.is_friend')} tone="success" icon={UserCheck} />;
    case 'outgoing':
      return (
        <>
          <Badge label={t('friend.sent')} tone="info" />
          <Button
            label={t('friend.cancel_request')}
            variant="ghost"
            size="sm"
            // Lời mời vừa gửi chưa có id thật (đang chờ server) → chưa hủy được
            disabled={isPending || !requestId || requestId.startsWith('local-')}
            onPress={run(() => store().cancelRequest(requestId!))}
          />
        </>
      );
    case 'incoming':
      return (
        <>
          <Button
            label={t('friend.accept')}
            size="sm"
            icon={Check}
            loading={isPending}
            disabled={!requestId}
            onPress={run(() => store().acceptRequest(requestId!), t('friend.accepted_toast', { name: user.name }))}
          />
          <Button
            label={t('friend.reject')}
            variant="secondary"
            size="sm"
            disabled={isPending || !requestId}
            onPress={run(() => store().rejectRequest(requestId!))}
          />
        </>
      );
    case 'none':
      return (
        <Button
          label={t('friend.add')}
          size="sm"
          icon={UserPlus}
          loading={isPending}
          onPress={run(() => store().sendRequest(user))}
        />
      );
  }
}
