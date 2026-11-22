import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarClock, CheckCircle2, Crown, LogOut, Mail, MapPin, UserMinus, XCircle, type LucideIcon } from 'lucide-react-native';
import { Badge, Card, StatusLabel } from '@/components/common';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, spacing, type Tone } from '@/theme';
import type { Meetup, MeetupMemberStatus } from '@/types/meetup';
import { formatMeetupDateTime, formatRadius } from '@/utils/meetup';

const MY_STATUS_STYLE: Record<MeetupMemberStatus, { tone: Tone; icon: LucideIcon }> = {
  invited: { tone: 'warning', icon: Mail },
  accepted: { tone: 'success', icon: CheckCircle2 },
  declined: { tone: 'danger', icon: XCircle },
  left: { tone: 'neutral', icon: LogOut },
  removed: { tone: 'neutral', icon: UserMinus },
};

export interface MeetupCardProps {
  meetup: Meetup;
  isOrganizer: boolean;
  myStatus?: MeetupMemberStatus;
  onPress: () => void;
}

export function MeetupCard({ meetup, isOrganizer, myStatus, onPress }: MeetupCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const locale = i18n.language;
  const dimmed = meetup.status === 'cancelled' || meetup.status === 'finished';

  return (
    <Card onPress={onPress} style={[styles.card, dimmed && styles.dimmed]} testID={`meetup-card-${meetup.id}`}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {meetup.title}
        </Text>
      </View>
      <View style={styles.badges}>
        <StatusLabel kind={`meetup_${meetup.status}`} />
        {isOrganizer && <Badge label={t('meetup.list.organizer_badge')} tone="purple" icon={Crown} />}
        {!isOrganizer && myStatus && (
          <Badge label={t(`meetup.list.my_status.${myStatus}`)} {...MY_STATUS_STYLE[myStatus]} />
        )}
      </View>
      <View style={styles.meta}>
        <CalendarClock size={iconSize.sm} color={colors.subtext} />
        <Text style={[styles.metaText, { color: colors.subtext }]}>{formatMeetupDateTime(meetup.scheduledAt, locale)}</Text>
      </View>
      <View style={styles.meta}>
        <MapPin size={iconSize.sm} color={colors.subtext} />
        <Text style={[styles.metaText, { color: colors.subtext }]}>
          {t(`meetup.place_types.${meetup.placeType}`, { defaultValue: meetup.placeType })} ·{' '}
          {t('meetup.list.within', { radius: formatRadius(meetup.searchRadiusM, locale) })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  dimmed: { opacity: 0.7 },
  header: { flexDirection: 'row' },
  title: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { fontSize: fontSize.sm },
});
