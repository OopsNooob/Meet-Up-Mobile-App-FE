import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Calendar, Map, User, Users } from 'lucide-react-native';
import { LanguageToggle } from '@/components/common';
import { useTheme } from '@/hooks/useTheme';

/** Bottom tabs của luồng chính: Bản đồ · Meetup · Bạn bè · Hồ sơ. */
export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

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
        options={{ title: t('tabs.meetups'), tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="friends"
        options={{ title: t('tabs.friends'), tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}