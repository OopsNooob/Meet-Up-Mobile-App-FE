import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ban, Check, CheckCircle2, Clock, Flag, X, type LucideIcon } from 'lucide-react-native';
import { Badge, Button, useToast } from '@/components/common';
import { getInvitationBlockReason, isPendingInvitation } from '@/constants/meetup';
import { useAuthStore } from '@/store/useAuthStore';
import { useMeetupStore } from '@/store/useMeetupStore';
import { spacing, type Tone } from '@/theme';
import type { InvitationBlockReason, InvitationResponse, MeetupDetail } from '@/types/meetup';
import { getMeetupErrorMessage } from '@/utils/meetup';

const BLOCKED_STYLE: Record<InvitationBlockReason, { tone: Tone; icon: LucideIcon }> = {
  cancelled: { tone: 'danger', icon: Ban },
  selected: { tone: 'success', icon: Flag },
  finished: { tone: 'neutral', icon: CheckCircle2 },
  expired: { tone: 'warning', icon: Clock },
  not_open: { tone: 'neutral', icon: Clock },
};

export interface InvitationResponseActionsProps {
  meetup: MeetupDetail;
  size?: 'sm' | 'md';
  onResponded?: (response: InvitationResponse) => void;
}

export function InvitationResponseActions({ meetup, size = 'sm', onResponded }: InvitationResponseActionsProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const responding = useMeetupStore((s) => s.respondingIds[meetup.id]);

  if (!isPendingInvitation(meetup, myId)) return null;

  const blocked = getInvitationBlockReason(meetup);
  if (blocked) {
    const { tone, icon } = BLOCKED_STYLE[blocked];
    return <Badge label={t(`meetup.invitation.blocked.${blocked}`)} tone={tone} icon={icon} />;
  }

  const respond = (response: InvitationResponse) => async () => {
    try {
      const done = await useMeetupStore.getState().respondInvitation(meetup.id, response);
      if (!done) return;
      toast.show(t(response === 'accept' ? 'meetup.invitation.accepted_toast' : 'meetup.invitation.rejected_toast', { title: meetup.title }), {
        tone: response === 'accept' ? 'success' : 'info',
      });
      onResponded?.(response);
    } catch (err) {
      toast.show(getMeetupErrorMessage(t, err), { tone: 'danger' });
    }
  };

  return (
    <View style={styles.row}>
      <Button
        label={t('meetup.invitation.accept')}
        icon={Check}
        size={size}
        style={styles.flex}
        loading={responding === 'accept'}
        disabled={!!responding}
        onPress={respond('accept')}
        testID={`invitation-accept-${meetup.id}`}
      />
      <Button
        label={t('meetup.invitation.reject')}
        icon={X}
        variant="secondary"
        size={size}
        style={styles.flex}
        loading={responding === 'reject'}
        disabled={!!responding}
        onPress={respond('reject')}
        testID={`invitation-reject-${meetup.id}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
