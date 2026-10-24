import { useEffect } from 'react';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import '@/locales/i18n';
import { ToastProvider } from '@/components/common';
import { useFCM, handleInitialNotification } from '@/hooks/useFCM';
import { useTheme } from '@/hooks/useTheme';
import { selectIsLoggedIn, useAuthStore } from '@/store/useAuthStore';

// Navigator phải render ngay lần đầu; splash che màn hình tới khi hydrate xong
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { colors, isDark } = useTheme();

  useFCM();

  useEffect(() => {
    // Đọc phiên đã lưu + xác minh với server; splash che tới khi xong → vào (app) hoặc (auth)
    void useAuthStore.getState().hydrate();

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