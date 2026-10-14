import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { selectIsAdmin, useAuthStore } from '@/store/useAuthStore';
import { fontWeight } from '@/theme';

/**
 * Stack của luồng đã đăng nhập. Đây là "sổ đăng ký" màn hình: mọi màn stack mới
 * khai báo ở đây kèm title (xem CONVENTIONS.md → "Thêm màn hình mới").
 * URL không chứa tên group, vd. app/(app)/meetup/[meetupId]/index.tsx ↔ /meetup/123.
 */
export default function AppLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isAdmin = useAuthStore(selectIsAdmin);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: fontWeight.bold },
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Meetup — FE-07, FE-08, FE-09, FE-10, FE-12, FE-15 */}
      <Stack.Screen name="meetup/create" options={{ title: t('screens.meetup_create') }} />
      <Stack.Screen name="meetup/invitations" options={{ title: t('screens.meetup_invitations') }} />
      <Stack.Screen name="meetup/[meetupId]/index" options={{ title: t('screens.meetup_detail') }} />
      <Stack.Screen name="meetup/[meetupId]/edit" options={{ title: t('screens.meetup_edit') }} />
      <Stack.Screen name="meetup/[meetupId]/preferences" options={{ title: t('screens.meetup_preferences') }} />
      <Stack.Screen name="meetup/[meetupId]/recommendations" options={{ title: t('fe2.recommendation.screen_title') }} />
      <Stack.Screen name="meetup/[meetupId]/vote" options={{ title: t('screens.meetup_vote') }} />
      <Stack.Screen name="meetup/[meetupId]/chat" options={{ title: t('fe2.chat.screen_title') }} />

      {/* Bạn bè — FE-03 */}
      <Stack.Screen name="friend/search" options={{ title: t('screens.friend_search') }} />
      <Stack.Screen name="friend/requests" options={{ title: t('screens.friend_requests') }} />

      {/* Địa điểm — FE-11, FE-14, FE-16 */}
      <Stack.Screen name="place/[placeId]/index" options={{ title: t('fe2.place_detail.screen_title') }} />
      <Stack.Screen
        name="place/[placeId]/explanation"
        options={{ title: t('fe2.ai_explanation.screen_title'), presentation: 'modal' }}
      />
      <Stack.Screen name="history" options={{ title: t('screens.history') }} />
      <Stack.Screen name="favorites" options={{ title: t('screens.favorites') }} />

      {/* Cài đặt — FE-04, FE-17 */}
      <Stack.Screen name="settings/location" options={{ title: t('fe2.location.screen_title') }} />
      <Stack.Screen name="settings/nearby" options={{ title: t('fe2.nearby.screen_title') }} />

      {/* Admin — FE-18: chỉ truy cập được khi role = admin */}
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin/users" options={{ title: t('screens.admin_users') }} />
        <Stack.Screen name="admin/reports" options={{ title: t('screens.admin_reports') }} />
      </Stack.Protected>

      {/* Màn test nội bộ */}
      <Stack.Screen name="dev/components" options={{ title: t('screens.dev_components') }} />
      <Stack.Screen name="dev/notifications" options={{ title: 'Notifications (FE-13)' }} />
      <Stack.Screen name="dev/performance" options={{ title: 'Performance (FE-20)' }} />
    </Stack>
  );
}