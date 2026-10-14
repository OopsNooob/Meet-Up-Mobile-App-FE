import { useEffect } from 'react';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import '@/locales/i18n'; // Khởi tạo i18n
import { ToastProvider } from '@/components/common';
import { useFCM, handleInitialNotification } from '@/hooks/useFCM';
import { useTheme } from '@/hooks/useTheme';
import { selectIsLoggedIn, useAuthStore } from '@/store/useAuthStore';

// Giữ splash cho tới khi biết trạng thái đăng nhập (tránh nháy màn login rồi mới vào app).
SplashScreen.preventAutoHideAsync();

/**
 * Root navigator — chỉ chọn luồng theo trạng thái đăng nhập:
 *   - (auth): login/register khi chưa đăng nhập
 *   - (app):  toàn bộ màn sau đăng nhập (tabs + các màn stack)
 * Guard dùng Stack.Protected: guard đổi sang false thì tự chuyển luồng và xóa history.
 */
export default function RootLayout() {
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { colors, isDark } = useTheme();

  // FE-13: Khởi tạo FCM listener toàn app
  useFCM();

  useEffect(() => {
    // TODO FE-01: hydrate phiên đăng nhập thật từ secure store
    useAuthStore.setState({ isHydrated: true });

    // FE-13: Xử lý notification khi app mở từ killed state
    handleInitialNotification();
  }, []);

  useEffect(() => {
    if (isHydrated) SplashScreen.hideAsync();
  }, [isHydrated]);

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  // Luôn render navigator ngay lần đầu (Expo Router yêu cầu) — splash che trong lúc chờ hydrate.
  return (
    <ThemeProvider value={navTheme}>
      <ToastProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}