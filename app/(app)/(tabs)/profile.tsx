import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pencil, Tags } from 'lucide-react-native';
import { AsyncView, Avatar, Button, Card, ConfirmDialog, Screen } from '@/components/common';
import { PreferenceSummary } from '@/components/profile/PreferenceSummary';
import { routes } from '@/constants/routes';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { selectIsAdmin, useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { fontSize, fontWeight, spacing } from '@/theme';

type MenuLink = { label: string; href: Href };

// FE-02: sở thích ở đây chỉ là dữ liệu điền sẵn cho meetup mới, không ghi đè preference meetup (FE-09).
export default function ProfileTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { theme, setTheme } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore(selectIsAdmin);
  const preferences = useProfileStore((s) => s.preferences);
  const tags = useProfileStore((s) => s.tags);
  const loadPreferences = useProfileStore((s) => s.loadPreferences);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

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
    { label: 'Auth session (FE-01)', href: routes.devAuth },
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
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {user?.name}
          </Text>
          <Text style={{ color: colors.subtext }} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </Card>
      <Button
        label={t('profile.edit')}
        icon={Pencil}
        variant="secondary"
        fullWidth
        onPress={() => router.push(routes.profileEdit)}
        testID="profile-edit"
      />

      <Text style={[styles.section, { color: colors.subtext }]}>{t('profile.preferences_title')}</Text>
      <Card style={styles.preferences}>
        <Text style={[styles.hint, { color: colors.subtext }]}>{t('profile.preferences_prefill_hint')}</Text>
        <AsyncView
          state={preferences}
          onRetry={loadPreferences}
          empty={{
            icon: Tags,
            title: t('profile.preferences_empty_title'),
            description: t('profile.preferences_empty_description'),
            actionLabel: t('profile.preferences_choose'),
            onAction: () => router.push(routes.profileEdit),
          }}
        >
          {(data) => <PreferenceSummary preferences={data} tags={tags} />}
        </AsyncView>
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
        // logout() gọi API rồi xóa phiên; dialog tự hiện loading tới khi xong, Stack.Protected đưa về Đăng nhập
        onConfirm={() => logout()}
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
  preferences: { gap: spacing.md },
  hint: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
  logout: { marginTop: spacing.xl },
});