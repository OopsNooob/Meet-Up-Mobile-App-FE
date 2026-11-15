import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFriends } from '@/hooks/useFriends';
import { useAuthStore } from '@/store/useAuthStore';
import type { MeetupDetail, MeetupMemberView } from '@/types/meetup';
import { resolveMemberUser } from '@/utils/meetup';

export function useMeetupMembers(meetup: MeetupDetail | null) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const { friends } = useFriends();
  const friendsById = useMemo(() => new Map(friends.map((f) => [f.user.id, f])), [friends]);
  const unknownLabel = t('meetup.member_unknown');

  return useMemo(() => {
    if (!meetup) return { members: [] as MeetupMemberView[], organizer: null };
    const resolve = (userId: string) => {
      const { isKnown: _isKnown, ...user } = resolveMemberUser(userId, me, friendsById, unknownLabel);
      return user;
    };

    const members: MeetupMemberView[] = meetup.members.map((member) => ({
      member,
      user: resolve(member.userId),
      isMe: member.userId === me?.id,
      isOrganizer: member.userId === meetup.organizerId,
    }));
    if (!members.some((m) => m.isOrganizer)) {
      members.push({
        member: {
          participantId: `organizer:${meetup.organizerId}`,
          userId: meetup.organizerId,
          invitedById: meetup.organizerId,
          status: 'accepted',
          respondedAt: null,
        },
        user: resolve(meetup.organizerId),
        isMe: meetup.organizerId === me?.id,
        isOrganizer: true,
      });
    }
    return { members, organizer: resolve(meetup.organizerId) };
  }, [meetup, me, friendsById, unknownLabel]);
}
