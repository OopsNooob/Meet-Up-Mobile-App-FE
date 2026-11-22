import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MailOpen } from 'lucide-react-native';
import { AsyncView, Screen, useToast } from '@/components/common';
import { InvitationCard } from '@/components/meetup/InvitationCard';
import { routes } from '@/constants/routes';
import { useFriends } from '@/hooks/useFriends';
import { useMeetupInvitations } from '@/hooks/useMeetupInvitations';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { useMeetupStore } from '@/store/useMeetupStore';
import { spacing } from '@/theme';
import { getMeetupErrorMessage, resolveMemberUser } from '@/utils/meetup';

export default function MeetupInvitationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const me = useAuthStore((s) => s.user);
  const { friends } = useFriends();
  const { state, refresh } = useMeetupInvitations();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void useMeetupStore.getState().loadInvitations();
    }, []),
  );

  const friendsById = useMemo(() => new Map(friends.map((f) => [f.user.id, f])), [friends]);
  const unknownLabel = t('meetup.member_unknown');
  const organizerName = (organizerId: string) => resolveMemberUser(organizerId, me, friendsById, unknownLabel).name;

  const onRefresh = async () => {
    setRefreshing(true);
    const error = await useMeetupStore.getState().loadInvitations();
    setRefreshing(false);
    if (error) toast.show(getMeetupErrorMessage(t, error), { tone: 'danger' });
  };

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <AsyncView
        state={state}
        onRetry={refresh}
        empty={{
          icon: MailOpen,
          title: t('meetup.invitation.empty_title'),
          description: t('meetup.invitation.empty_description'),
          actionLabel: t('meetup.invitation.go_to_meetups'),
          onAction: () => router.navigate(routes.tabMeetups),
        }}
      >
        {(invitations) => (
          <View style={styles.list}>
            {invitations.map((meetup) => (
              <InvitationCard
                key={meetup.id}
                meetup={meetup}
                organizerName={organizerName(meetup.organizerId)}
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
  list: { gap: spacing.md },
});
