import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react-native';
import { Button, EmptyState, StatusLabel } from '@/components/common';
import { FriendRow } from '@/components/friend/FriendRow';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, spacing } from '@/theme';
import type { MeetupMemberStatus, MeetupMemberView } from '@/types/meetup';

const INITIAL_VISIBLE = 20;

const STATUS_ORDER: Record<MeetupMemberStatus, number> = { accepted: 0, invited: 1, declined: 2, left: 3, removed: 4 };

export interface MeetupMembersSectionProps {
  members: MeetupMemberView[];
}

export function MeetupMembersSection({ members }: MeetupMembersSectionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () =>
      [...members].sort(
        (a, b) =>
          Number(b.isOrganizer) - Number(a.isOrganizer) ||
          STATUS_ORDER[a.member.status] - STATUS_ORDER[b.member.status] ||
          a.user.name.localeCompare(b.user.name),
      ),
    [members],
  );

  const counts = useMemo(() => {
    const c: Record<MeetupMemberStatus, number> = { accepted: 0, invited: 0, declined: 0, left: 0, removed: 0 };
    members.forEach((m) => (c[m.member.status] += 1));
    return c;
  }, [members]);

  const visible = expanded ? sorted : sorted.slice(0, INITIAL_VISIBLE);

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.text }]} accessibilityRole="header">
        {t('meetup.detail.members_title', { count: members.length })}
      </Text>
      <Text style={[styles.summary, { color: colors.subtext }]}>
        {t('meetup.detail.members_summary', { accepted: counts.accepted, invited: counts.invited, declined: counts.declined })}
      </Text>

      {members.length === 0 ? (
        <EmptyState icon={Users} title={t('meetup.detail.members_empty')} />
      ) : (
        visible.map(({ member, user, isMe, isOrganizer }) => (
          <FriendRow
            key={member.participantId}
            user={user}
            subtitle={isOrganizer ? t('meetup.detail.role_organizer') : isMe ? t('meetup.detail.role_me') : undefined}
            actions={<StatusLabel kind={`member_${member.status}`} />}
          />
        ))
      )}

      {sorted.length > INITIAL_VISIBLE && (
        <Button
          label={expanded ? t('meetup.detail.members_collapse') : t('meetup.detail.members_show_all', { count: sorted.length })}
          variant="ghost"
          onPress={() => setExpanded((v) => !v)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  summary: { fontSize: fontSize.sm },
});
