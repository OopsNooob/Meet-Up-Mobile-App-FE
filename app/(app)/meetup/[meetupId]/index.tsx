import { useCallback, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ban, Mail, Pencil, XCircle } from 'lucide-react-native';
import { Button, Card, ConfirmDialog, InlineAlert, LoadingState, Screen, useToast } from '@/components/common';
import { InvitationResponseActions } from '@/components/meetup/InvitationResponseActions';
import { MeetupErrorState } from '@/components/meetup/MeetupErrorState';
import { MeetupFeatureLinks } from '@/components/meetup/MeetupFeatureLinks';
import { MeetupInfoCard } from '@/components/meetup/MeetupInfoCard';
import { MeetupMembersSection } from '@/components/meetup/MeetupMembersSection';
import {
  canCancelMeetup,
  canEditMeetup,
  getMyMember,
  isMeetupActive,
  isMeetupOrganizer,
  isPendingInvitation,
} from '@/constants/meetup';
import { routes, type MeetupRouteParams } from '@/constants/routes';
import { useMeetupDetail } from '@/hooks/useMeetupDetail';
import { useMeetupMembers } from '@/hooks/useMeetupMembers';
import { useMeetupRealtime } from '@/hooks/useMeetupRealtime';
import { useTheme } from '@/hooks/useTheme';
import { meetupService, toMeetupError } from '@/services/meetupService';
import { useAuthStore } from '@/store/useAuthStore';
import { fontSize, fontWeight, spacing } from '@/theme';
import type { MeetupDetail } from '@/types/meetup';
import { formatMeetupDateTime, getMeetupErrorMessage } from '@/utils/meetup';

export default function MeetupDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const { meetupId } = useLocalSearchParams<MeetupRouteParams>();
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const { state, reload, refresh } = useMeetupDetail(meetupId);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const meetup = state.status === 'success' ? state.data : null;
  const { members, organizer } = useMeetupMembers(meetup);

  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void refresh();
      focusedOnce.current = true;
    }, [refresh]),
  );

  useMeetupRealtime(meetupId, () => void refresh());

  const onRefresh = async () => {
    setRefreshing(true);
    const error = await refresh();
    setRefreshing(false);
    if (error) toast.show(getMeetupErrorMessage(t, error), { tone: 'danger' });
  };

  const handleCancel = async () => {
    if (!meetup) return;
    try {
      await meetupService.cancel(meetup.id);
    } catch (err) {
      const error = toMeetupError(err);
      if (error.meetupCode === 'not_editable') void refresh();
      throw { code: 'unknown', message: getMeetupErrorMessage(t, error) };
    }
    setConfirmCancel(false);
    toast.show(t('meetup.toast.cancelled'), { tone: 'success' });
    void refresh();
  };

  if (state.status === 'loading') {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status !== 'success' || !meetup) {
    return (
      <Screen>
        <MeetupErrorState error={state.status === 'error' ? state.error : undefined} onRetry={reload} />
      </Screen>
    );
  }

  const isOrganizer = isMeetupOrganizer(meetup, myId);
  const canEdit = canEditMeetup(meetup, myId);
  const canCancel = canCancelMeetup(meetup, myId);
  const active = isMeetupActive(meetup.status);
  const myStatus = getMyMember(meetup, myId)?.status;
  const invitedPending = isPendingInvitation(meetup, myId);
  const organizerName = organizer?.name ?? t('meetup.member_unknown');
  const showFeatures = active && (isOrganizer || myStatus === 'accepted');

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      footer={
        canEdit || canCancel ? (
          <View style={styles.footer}>
            {canEdit && (
              <Button
                label={t('meetup.action.edit')}
                icon={Pencil}
                variant="secondary"
                style={styles.flex}
                onPress={() => router.push(routes.meetupEdit(meetup.id))}
                testID="meetup-edit"
              />
            )}
            {canCancel && (
              <Button
                label={t('meetup.action.cancel')}
                icon={Ban}
                variant="danger"
                style={styles.flex}
                onPress={() => setConfirmCancel(true)}
                testID="meetup-cancel"
              />
            )}
          </View>
        ) : undefined
      }
    >
      <StatusBanner meetup={meetup} isOrganizer={isOrganizer} />

      {invitedPending && <InvitationPanel meetup={meetup} organizerName={organizerName} />}
      {!isOrganizer && myStatus === 'declined' && (
        <InlineAlert tone="info" icon={XCircle} title={t('meetup.invitation.declined_title')} message={t('meetup.invitation.declined_message')} />
      )}

      <MeetupInfoCard meetup={meetup} organizer={organizer ?? { id: meetup.organizerId, name: organizerName }} isOrganizerMe={isOrganizer} />

      <MeetupMembersSection members={members} />

      {showFeatures && <MeetupFeatureLinks meetupId={meetup.id} />}

      <ConfirmDialog
        visible={confirmCancel}
        title={t('meetup.cancel_confirm.title')}
        message={t('meetup.cancel_confirm.message', { title: meetup.title })}
        confirmLabel={t('meetup.cancel_confirm.confirm')}
        cancelLabel={t('meetup.cancel_confirm.keep')}
        tone="danger"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
      />
    </Screen>
  );
}

function InvitationPanel({ meetup, organizerName }: { meetup: MeetupDetail; organizerName: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={styles.invitation} testID="meetup-invitation-panel">
      <View style={styles.invitationHeader}>
        <Mail size={fontSize.lg} color={colors.primary} />
        <Text style={[styles.invitationTitle, { color: colors.text }]} accessibilityRole="header">
          {t('meetup.invitation.detail_title')}
        </Text>
      </View>
      <Text style={{ color: colors.subtext, fontSize: fontSize.sm }}>
        {t('meetup.invitation.detail_message', { name: organizerName })}
      </Text>
      <InvitationResponseActions meetup={meetup} size="md" />
    </Card>
  );
}

function StatusBanner({ meetup, isOrganizer }: { meetup: MeetupDetail; isOrganizer: boolean }) {
  const { t, i18n } = useTranslation();
  switch (meetup.status) {
    case 'cancelled':
      return (
        <InlineAlert
          tone="danger"
          icon={Ban}
          title={t('meetup.banner.cancelled_title')}
          message={
            meetup.cancelledAt
              ? t('meetup.banner.cancelled_at', { time: formatMeetupDateTime(meetup.cancelledAt, i18n.language) })
              : t('meetup.banner.cancelled_message')
          }
        />
      );
    case 'selected':
      return (
        <InlineAlert
          tone="success"
          title={t('meetup.banner.selected_title')}
          message={isOrganizer ? t('meetup.banner.selected_organizer') : t('meetup.banner.selected_message')}
        />
      );
    case 'finished':
      return <InlineAlert tone="info" title={t('meetup.banner.finished_title')} message={t('meetup.banner.finished_message')} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  invitation: { gap: spacing.sm },
  invitationHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  invitationTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
});
