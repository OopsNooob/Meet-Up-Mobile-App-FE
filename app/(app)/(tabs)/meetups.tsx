import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, Inbox } from 'lucide-react-native';
import { AsyncView, Button, Screen, useToast } from '@/components/common';
import { MeetupCard } from '@/components/meetup/MeetupCard';
import { routes } from '@/constants/routes';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { useMeetupStore } from '@/store/useMeetupStore';
import { spacing } from '@/theme';
import { asyncFromData, type AsyncState } from '@/types/async';
import type { Meetup } from '@/types/meetup';
import { getMeetupErrorMessage } from '@/utils/meetup';

export default function MeetupsTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const meetups = useMeetupStore((s) => s.meetups);
  const meta = useMeetupStore((s) => s.meta);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void useMeetupStore.getState().loadMine();
    }, []),
  );

  const state = useMemo<AsyncState<Meetup[]>>(() => {
    if (meta.status === 'error' && meta.error) return { status: 'error', error: meta.error };
    if (meta.status !== 'success') return { status: 'loading' };
    return asyncFromData(meetups, { updatedAt: meta.updatedAt });
  }, [meetups, meta]);

  const onRefresh = async () => {
    setRefreshing(true);
    const error = await useMeetupStore.getState().loadMine();
    setRefreshing(false);
    if (error) toast.show(getMeetupErrorMessage(t, error), { tone: 'danger' });
  };

  return (
    <Screen
      scroll
      edges={['left', 'right']}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.actions}>
        <Button
          label={t('meetup.create')}
          icon={CalendarPlus}
          style={styles.action}
          onPress={() => router.push(routes.meetupCreate)}
          testID="meetup-create-button"
        />
        <Button
          label={t('screens.meetup_invitations')}
          icon={Inbox}
          variant="secondary"
          style={styles.action}
          onPress={() => router.push(routes.meetupInvitations)}
        />
      </View>

      <AsyncView
        state={state}
        onRetry={() => useMeetupStore.getState().loadMine()}
        empty={{
          icon: CalendarPlus,
          title: t('meetup.list_empty'),
          description: t('meetup.list.empty_description'),
          actionLabel: t('meetup.create'),
          onAction: () => router.push(routes.meetupCreate),
        }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((meetup) => (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                isOrganizer={meetup.organizerId === myId}
                onPress={() => router.push(routes.meetupDetail(meetup.id))}
              />
            ))}
          </View>
        )}
      </AsyncView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  list: { gap: spacing.md },
});
