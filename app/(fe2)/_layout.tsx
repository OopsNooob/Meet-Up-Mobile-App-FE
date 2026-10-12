import { Stack } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { Globe } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSinglePress } from '../../hooks/useSinglePress';

export default function Fe2Layout() {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();

  const toggleLanguage = useSinglePress(() => {
    const nextLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  }, 500);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
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
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                marginRight: 4,
              }}
            >
              <Globe size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700' }}>
                {i18n.language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen name="location-settings" options={{ title: t('fe2.location.screen_title') }} />
        <Stack.Screen name="map" options={{ title: t('fe2.map.screen_title') }} />
        <Stack.Screen name="recommendation" options={{ title: t('fe2.recommendation.screen_title') }} />
        <Stack.Screen name="place-detail" options={{ title: t('fe2.place_detail.screen_title') }} />
        <Stack.Screen name="chat" options={{ title: t('fe2.chat.screen_title') }} />
        <Stack.Screen name="ai-explanation" options={{ title: t('fe2.ai_explanation.screen_title'), presentation: 'modal' }} />
        <Stack.Screen name="nearby" options={{ title: t('fe2.nearby.screen_title') }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications (FE-13)' }} />
        <Stack.Screen name="performance" options={{ title: 'Performance (FE-20)' }} />
      </Stack>
    </>
  );
}
