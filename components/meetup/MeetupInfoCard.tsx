import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Hourglass, MapPin, Radar, type LucideIcon } from 'lucide-react-native';
import { Avatar, Card, StatusLabel } from '@/components/common';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, spacing } from '@/theme';
import type { FriendUser } from '@/types/friend';
import type { Meetup } from '@/types/meetup';
import { formatMeetupDateTime, formatRadius } from '@/utils/meetup';

export interface MeetupInfoCardProps {
  meetup: Meetup;
  organizer: FriendUser;
  isOrganizerMe: boolean;
}

export function MeetupInfoCard({ meetup, organizer, isOrganizerMe }: MeetupInfoCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const locale = i18n.language;

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          {meetup.title}
        </Text>
        <StatusLabel kind={`meetup_${meetup.status}`} />
      </View>

      <InfoRow icon={CalendarClock} label={t('meetup.detail.scheduled_at')}>
        {formatMeetupDateTime(meetup.scheduledAt, locale)}
      </InfoRow>
      <InfoRow icon={MapPin} label={t('meetup.detail.place_type')}>
        {t(`meetup.place_types.${meetup.placeType}`, { defaultValue: meetup.placeType })}
      </InfoRow>
      <InfoRow icon={Radar} label={t('meetup.detail.radius')}>
        {formatRadius(meetup.searchRadiusM, locale)}
      </InfoRow>
      {(meetup.status === 'draft' || meetup.status === 'inviting') && (
        <InfoRow icon={Hourglass} label={t('meetup.detail.invitation_deadline')}>
          {formatMeetupDateTime(meetup.invitationDeadlineAt, locale)}
        </InfoRow>
      )}

      <View style={[styles.organizer, { borderTopColor: colors.divider }]}>
        <Avatar name={organizer.name} uri={organizer.avatarUrl} size="sm" />
        <View style={styles.flex}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('meetup.detail.organizer')}</Text>
          <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
            {isOrganizerMe ? t('meetup.detail.organizer_me', { name: organizer.name }) : organizer.name}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Icon size={iconSize.md} color={colors.subtext} />
      <View style={styles.flex}>
        <Text style={[styles.infoLabel, { color: colors.subtext }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  titleRow: { gap: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  infoLabel: { fontSize: fontSize.xs },
  infoValue: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  organizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
