import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Calendar, Map, User, Users } from 'lucide-react-native';
import { LanguageToggle } from '@/components/common';
import { useFriendRequestsSync, useIncomingRequestCount } from '@/hooks/useFriends';
import { useMeetupInvitationCount, useMeetupInvitationsSync } from '@/hooks/useMeetupInvitations';
import { useTheme } from '@/hooks/useTheme';

/** Badge quá dài làm vỡ tab bar */
const MAX_BADGE_COUNT = 99;
const toBadge = (count: number) => (count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : count || undefined);

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // FE-03: badge số lời mời kết bạn đang chờ trên tab Bạn bè
  useFriendRequestsSync();
  const incomingCount = useIncomingRequestCount();
  const friendsBadge = toBadge(incomingCount);
  useMeetupInvitationsSync();
  const meetupsBadge = toBadge(useMeetupInvitationCount());
  const badgeStyle = { backgroundColor: colors.danger, color: colors.onPrimary };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: () => <LanguageToggle />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.map'), tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="meetups"
        options={{
          title: t('tabs.meetups'),
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
          tabBarBadge: meetupsBadge,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: t('tabs.friends'),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          tabBarBadge: friendsBadge,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}