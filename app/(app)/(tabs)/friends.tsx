import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Inbox, Search, UserMinus, Users } from 'lucide-react-native';
import { AsyncView, Button, ConfirmDialog, Screen, useToast } from '@/components/common';
import { FriendRow } from '@/components/friend/FriendRow';
import { routes } from '@/constants/routes';
import { useFriends, useIncomingRequestCount } from '@/hooks/useFriends';
import { useTheme } from '@/hooks/useTheme';
import { useFriendStore } from '@/store/useFriendStore';
import { spacing } from '@/theme';
import type { Friend } from '@/types/friend';
import { getFriendErrorMessage } from '@/utils/friendErrors';

// FE-03: danh sách bạn bè. Dùng chung state với tìm kiếm/lời mời qua useFriendStore.
export default function FriendsTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const { state, refresh, unfriend, pendingUserIds } = useFriends();
  const incomingCount = useIncomingRequestCount();
  const [refreshing, setRefreshing] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Friend | null>(null);

  // Chưa có realtime (TODO(BE-03)): tải lại mỗi lần quay lại tab
  useFocusEffect(
    useCallback(() => {
      void useFriendStore.getState().refreshAll();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const error = await useFriendStore.getState().refreshAll();
    setRefreshing(false);
    if (error) toast.show(getFriendErrorMessage(t, error), { tone: 'danger' });
  };

  const confirmUnfriend = async () => {
    if (!confirmTarget) return;
    try {
      await unfriend(confirmTarget.user.id);
    } catch (err) {
      // ConfirmDialog tự hiện message này và giữ dialog mở
      throw { code: 'unknown', message: getFriendErrorMessage(t, err) };
    }
    setConfirmTarget(null);
  };

  return (
    <Screen
      scroll
      edges={['left', 'right']}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.actions}>
        <Button
          label={t('friend.find_friends')}
          icon={Search}
          variant="secondary"
          style={styles.action}
          onPress={() => router.push(routes.friendSearch)}
        />
        <Button
          label={incomingCount > 0 ? t('friend.requests_with_count', { count: incomingCount }) : t('friend.requests')}
          icon={Inbox}
          variant={incomingCount > 0 ? 'primary' : 'secondary'}
          style={styles.action}
          onPress={() => router.push(routes.friendRequests)}
        />
      </View>

      <AsyncView
        state={state}
        onRetry={refresh}
        empty={{
          icon: Users,
          title: t('friend.list_empty_title'),
          description: t('friend.list_empty_description'),
          actionLabel: t('friend.find_friends'),
          onAction: () => router.push(routes.friendSearch),
        }}
      >
        {(friends) => (
          <View style={styles.list}>
            {friends.map((friend) => (
              <FriendRow
                key={friend.user.id}
                user={friend.user}
                actions={
                  <Button
                    label={t('friend.unfriend')}
                    icon={UserMinus}
                    variant="ghost"
                    size="sm"
                    disabled={pendingUserIds[friend.user.id] === true}
                    onPress={() => setConfirmTarget(friend)}
                  />
                }
              />
            ))}
          </View>
        )}
      </AsyncView>

      <ConfirmDialog
        visible={confirmTarget !== null}
        title={t('friend.unfriend_confirm_title', { name: confirmTarget?.user.name ?? '' })}
        message={t('friend.unfriend_confirm_message')}
        confirmLabel={t('friend.unfriend')}
        tone="danger"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmUnfriend}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  list: { gap: spacing.sm },
});
