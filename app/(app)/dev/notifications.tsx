import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { scheduleMockNotification, useFCM } from '@/hooks/useFCM';
import { useSinglePress } from '@/hooks/useSinglePress';
import { InAppNotificationBanner } from '@/components/common/InAppNotificationBanner';
import { routes } from '@/constants/routes';

export default function NotificationsTestScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [bannerInfo, setBannerInfo] = useState<{
    visible: boolean;
    title: string;
    body: string;
    type?: 'meetup_invite' | 'meetup_finalized' | 'meetup_reminder' | 'meetup_cancelled';
  } | null>(null);

  // Khởi chạy FCM listener & xin quyền (bắt buộc trên Android 13+)
  useFCM();

  const handleTest = useSinglePress(
    (type: 'meetup_invite' | 'meetup_finalized' | 'meetup_reminder' | 'meetup_cancelled') => {
      scheduleMockNotification(type, 'test-meetup-id');

      const TITLES: Record<typeof type, { title: string; body: string }> = {
        meetup_invite: {
          title: t('fe2.dev_notifications.invite_title'),
          body: t('fe2.dev_notifications.invite_body'),
        },
        meetup_finalized: {
          title: t('fe2.dev_notifications.finalized_title'),
          body: t('fe2.dev_notifications.finalized_body'),
        },
        meetup_reminder: {
          title: t('fe2.dev_notifications.reminder_title'),
          body: t('fe2.dev_notifications.reminder_body'),
        },
        meetup_cancelled: {
          title: t('fe2.dev_notifications.cancelled_title'),
          body: t('fe2.dev_notifications.cancelled_body'),
        },
      };

      setBannerInfo({
        visible: true,
        title: TITLES[type].title,
        body: TITLES[type].body,
        type,
      });
    },
    1000
  );

  return (
    <View style={styles.container}>
      {/* In-app foreground notification banner */}
      <InAppNotificationBanner
        visible={!!bannerInfo?.visible}
        title={bannerInfo?.title || ''}
        body={bannerInfo?.body || ''}
        onDismiss={() => setBannerInfo(null)}
        onPress={() => {
          const type = bannerInfo?.type;
          setBannerInfo(null);
          if (type === 'meetup_finalized') {
            router.push(routes.meetupRecommendations('test-meetup-id'));
          } else if (type === 'meetup_reminder') {
            router.push(routes.meetupChat('test-meetup-id'));
          } else {
            router.push(routes.meetupDetail('test-meetup-id'));
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('fe2.dev_notifications.screen_title')}</Text>
        <Text style={styles.subtitle}>{t('fe2.dev_notifications.screen_subtitle')}</Text>

        <TouchableOpacity style={styles.button} onPress={() => handleTest('meetup_invite')}>
          <Text style={styles.buttonText}>{t('fe2.dev_notifications.btn_invite')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={() => handleTest('meetup_finalized')}
        >
          <Text style={styles.buttonText}>{t('fe2.dev_notifications.btn_finalized')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.warning }]}
          onPress={() => handleTest('meetup_reminder')}
        >
          <Text style={styles.buttonText}>{t('fe2.dev_notifications.btn_reminder')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.danger }]}
          onPress={() => handleTest('meetup_cancelled')}
        >
          <Text style={styles.buttonText}>{t('fe2.dev_notifications.btn_cancelled')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 16 },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: c.subtext, marginBottom: 16, lineHeight: 20 },
    button: {
      backgroundColor: c.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });
