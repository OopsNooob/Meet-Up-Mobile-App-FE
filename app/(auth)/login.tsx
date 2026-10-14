import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Screen } from '@/components/common';
import { routes } from '@/constants/routes';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore, type User } from '@/store/useAuthStore';
import { fontSize, fontWeight, spacing } from '@/theme';

const MOCK_USER: User = { id: '1', email: 'test@gmail.com', name: 'Tester', role: 'user', shareLocation: true };
const MOCK_ADMIN: User = { id: 'admin-1', email: 'admin@meetup.dev', name: 'Admin', role: 'admin', shareLocation: false };

// TODO FE-01: đăng nhập thật (email/Google), trạng thái lỗi, tài khoản bị khóa.
export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const login = useAuthStore((s) => s.login);

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} contentStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: colors.text }]}>MeetUp</Text>
        <Badge label="TODO FE-01" tone="warning" />
      </View>
      <View style={styles.actions}>
        <Button label={t('auth.login_google')} fullWidth onPress={() => login(MOCK_USER, 'fake-jwt-token')} />
        <Button
          label={t('auth.login_admin_demo')}
          variant="secondary"
          fullWidth
          onPress={() => login(MOCK_ADMIN, 'fake-admin-token')}
        />
        <Button label={t('auth.go_register')} variant="ghost" fullWidth onPress={() => router.push(routes.register)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', gap: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSize.display, fontWeight: fontWeight.bold },
  actions: { gap: spacing.md },
});