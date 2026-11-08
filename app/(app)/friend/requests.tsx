import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Inbox, Send } from 'lucide-react-native';
import { AsyncView, Button, Screen, useToast } from '@/components/common';
import { FriendRow } from '@/components/friend/FriendRow';
import { RelationshipActions } from '@/components/friend/RelationshipActions';
import { routes } from '@/constants/routes';
import { useFriendRequests } from '@/hooks/useFriends';
import { useTheme } from '@/hooks/useTheme';
import { useFriendStore } from '@/store/useFriendStore';
import { spacing } from '@/theme';
import type { FriendRequestDirection } from '@/types/friend';
import { getFriendErrorMessage } from '@/utils/friendErrors';

// FE-03: lời mời đã nhận (chấp nhận/từ chối) và đã gửi (hủy). Xử lý xong thì tự rời danh sách.
export default function FriendRequestsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const { incoming, outgoing, incomingState, outgoingState, refresh } = useFriendRequests();
  const [tab, setTab] = useState<FriendRequestDirection>('incoming');
  const [refreshing, setRefreshing] = useState(false);

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

  const isIncoming = tab === 'incoming';

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.tabs} accessibilityRole="tablist">
        <Button
          label={t('friend.incoming_tab', { count: incoming.length })}
          variant={isIncoming ? 'primary' : 'secondary'}
          size="sm"
          style={styles.tab}
          onPress={() => setTab('incoming')}
        />
        <Button
          label={t('friend.outgoing_tab', { count: outgoing.length })}
          variant={isIncoming ? 'secondary' : 'primary'}
          size="sm"
          style={styles.tab}
          onPress={() => setTab('outgoing')}
        />
      </View>

      <AsyncView
        state={isIncoming ? incomingState : outgoingState}
        onRetry={refresh}
        empty={
          isIncoming
            ? { icon: Inbox, title: t('friend.incoming_empty_title') }
            : {
                icon: Send,
                title: t('friend.outgoing_empty_title'),
                actionLabel: t('friend.find_friends'),
                onAction: () => router.push(routes.friendSearch),
              }
        }
      >
        {(requests) => (
          <View style={styles.list}>
            {requests.map((request) => (
              <FriendRow key={request.id} user={request.user} actions={<RelationshipActions user={request.user} />} />
            ))}
          </View>
        )}
      </AsyncView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1 },
  list: { gap: spacing.sm },
});
