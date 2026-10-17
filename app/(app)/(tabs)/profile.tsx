import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Button, Card, ConfirmDialog, Screen } from '@/components/common';
import { routes } from '@/constants/routes';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { selectIsAdmin, useAuthStore } from '@/store/useAuthStore';
import { fontSize, fontWeight, spacing } from '@/theme';

type MenuLink = { label: string; href: Href };

// TODO FE-02: hồ sơ + sở thích profile (chỉ là dữ liệu điền sẵn, không ghi đè preference meetup).
export default function ProfileTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { theme, setTheme } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore(selectIsAdmin);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const settingsLinks: MenuLink[] = [
    { label: t('fe2.location.screen_title'), href: routes.settingsLocation },
    { label: t('fe2.nearby.screen_title'), href: routes.settingsNearby },
    { label: t('screens.history'), href: routes.history },
    { label: t('screens.favorites'), href: routes.favorites },
  ];
  const adminLinks: MenuLink[] = [
    { label: t('screens.admin_users'), href: routes.adminUsers },
    { label: t('screens.admin_reports'), href: routes.adminReports },
  ];
  const devLinks: MenuLink[] = [
    { label: t('screens.dev_components'), href: routes.devComponents },
    { label: 'Notifications (FE-13)', href: routes.devNotifications },
    { label: 'Performance (FE-20)', href: routes.devPerformance },
    { label: 'Recommendation (FE-10)', href: routes.meetupRecommendations('demo-meetup') },
    { label: 'Group Chat (FE-15)', href: routes.meetupChat('demo-meetup') },
    { label: 'Place Detail (FE-11)', href: routes.placeDetail('p1') },
    { label: 'AI Explanation (FE-16)', href: routes.placeExplanation('p1', 'Test Place') },
  ];

  const renderLinks = (links: MenuLink[]) =>
    links.map((link) => (
      <Button key={link.label} label={link.label} variant="secondary" fullWidth onPress={() => router.push(link.href)} />
    ));

  return (
    <Screen scroll edges={['left', 'right']}>
      <Card style={styles.userCard}>
        <Avatar name={user?.name ?? '?'} uri={user?.avatarUrl} size="lg" />
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
          <Text style={{ color: colors.subtext }}>{user?.email}</Text>
          <Badge label="TODO FE-02" tone="warning" />
        </View>
      </Card>

      <Card style={styles.row}>
        <Text style={{ color: colors.text }}>{t('profile.dark_mode')}</Text>
        <Switch
          value={theme === 'dark'}
          onValueChange={(on) => setTheme(on ? 'dark' : 'light')}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </Card>

      <Text style={[styles.section, { color: colors.subtext }]}>{t('profile.settings')}</Text>
      {renderLinks(settingsLinks)}

      {isAdmin && (
        <>
          <Text style={[styles.section, { color: colors.subtext }]}>{t('profile.admin')}</Text>
          {renderLinks(adminLinks)}
        </>
      )}

      {__DEV__ && (
        <>
          <Text style={[styles.section, { color: colors.subtext }]}>{t('profile.dev_menu')}</Text>
          {renderLinks(devLinks)}
        </>
      )}

      <Button label={t('auth.logout')} variant="danger" fullWidth onPress={() => setConfirmLogout(true)} style={styles.logout} />

      <ConfirmDialog
        visible={confirmLogout}
        title={t('auth.logout_confirm_title')}
        message={t('auth.logout_confirm_message')}
        confirmLabel={t('auth.logout')}
        tone="danger"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  userCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  userInfo: { flex: 1, gap: spacing.xs },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: spacing.md },
  logout: { marginTop: spacing.xl },
});