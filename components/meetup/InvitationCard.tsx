import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarClock, MapPin, UserRound, Users } from 'lucide-react-native';
import { Card, StatusLabel } from '@/components/common';
import { InvitationResponseActions } from '@/components/meetup/InvitationResponseActions';
import { isActiveMember } from '@/constants/meetup';
import { useSinglePress } from '@/hooks/useSinglePress';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, spacing } from '@/theme';
import type { MeetupDetail } from '@/types/meetup';
import { formatMeetupDateTime } from '@/utils/meetup';

export interface InvitationCardProps {
  meetup: MeetupDetail;
  organizerName: string;
  onPress: () => void;
}

export function InvitationCard({ meetup, organizerName, onPress }: InvitationCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const handlePress = useSinglePress(onPress);
  const locale = i18n.language;
  const memberCount = meetup.members.filter(isActiveMember).length;
  const acceptedCount = meetup.members.filter((m) => m.status === 'accepted').length;

  const metaRows = [
    { icon: UserRound, text: t('meetup.invitation.from', { name: organizerName }) },
    { icon: CalendarClock, text: formatMeetupDateTime(meetup.scheduledAt, locale) },
    { icon: MapPin, text: t(`meetup.place_types.${meetup.placeType}`, { defaultValue: meetup.placeType }) },
    { icon: Users, text: t('meetup.invitation.member_count', { count: memberCount, accepted: acceptedCount }) },
  ];

  return (
    <Card style={styles.card} testID={`invitation-card-${meetup.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={meetup.title}
        onPress={handlePress}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
        testID={`invitation-open-${meetup.id}`}
      >
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {meetup.title}
        </Text>
        <StatusLabel kind={`meetup_${meetup.status}`} />
        {metaRows.map(({ icon: Icon, text }) => (
          <View key={text} style={styles.meta}>
            <Icon size={iconSize.sm} color={colors.subtext} />
            <Text style={[styles.metaText, { color: colors.subtext }]} numberOfLines={1}>
              {text}
            </Text>
          </View>
        ))}
      </Pressable>
      <InvitationResponseActions meetup={meetup} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  content: { gap: spacing.sm },
  pressed: { opacity: 0.7 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { flex: 1, fontSize: fontSize.sm },
});
