import { Tabs } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Map, Calendar, Users, Settings } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSinglePress } from '../../hooks/useSinglePress';

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const { i18n } = useTranslation();

  const toggleLanguage = useSinglePress(() => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  }, 500);

  return (
    <Tabs 
      screenOptions={{ 
        headerShown: true, 
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerRight: () => (
          <TouchableOpacity
            onPress={toggleLanguage}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 14,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              marginRight: 14,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700' }}>
              {i18n.language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
            </Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: t('tabs.map'),
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }} 
      />
      <Tabs.Screen 
        name="meetups" 
        options={{ 
          title: t('tabs.meetups'),
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }} 
      />
      <Tabs.Screen 
        name="friends" 
        options={{ 
          title: t('tabs.friends'),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }} 
      />
    </Tabs>
  );
}
