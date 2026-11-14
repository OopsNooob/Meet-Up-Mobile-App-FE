import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, RefreshCw, BellOff, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { NotifType, scheduleMockNotification, useFCM } from '@/hooks/useFCM';
import { useSinglePress } from '@/hooks/useSinglePress';
import { InlineAlert } from '@/components/common/InlineAlert';
import { InAppNotificationBanner } from '@/components/common/InAppNotificationBanner';
import { routes } from '@/constants/routes';

type RecentNotifItem = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
};

export default function NotificationsTestScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    expoPushToken,
    registeredDeviceId,
    registrationError,
    registerTokenWithBackend,
    revokeCurrentDevice,
  } = useFCM();

  const deviceRegistered = Boolean(registeredDeviceId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentList, setRecentList] = useState<RecentNotifItem[]>([]);
  const [bannerInfo, setBannerInfo] = useState<{
    visible: boolean;
    title: string;
    body: string;
    type?: NotifType;
  } | null>(null);

  const handleRefresh = useSinglePress(async () => {
    setIsRefreshing(true);
    if (expoPushToken) {
      await registerTokenWithBackend(expoPushToken);
    }
    setIsRefreshing(false);
  }, 700);

  const navigateByType = useSinglePress((type?: NotifType) => {
    const targetMeetupId = 'meetup-1';
    if (
      type === 'recommendation_ready' ||
      type === 'meetup_finalized' ||
      type === 'meetup.finalized'
    ) {
      router.push(routes.meetupRecommendations(targetMeetupId));
    } else if (type === 'meetup_reminder') {
      router.push(routes.meetupChat(targetMeetupId));
    } else if (type === 'nearby_detected') {
      router.push(routes.settingsNearby);
    } else {
      router.push(routes.meetupDetail(targetMeetupId));
    }
  }, 600);

  const handleRegisterDevice = useSinglePress(async () => {
    const targetToken =
      expoPushToken && expoPushToken.length >= 20
        ? expoPushToken
        : 'ExponentPushToken[dev-simulator-token]';
    await registerTokenWithBackend(targetToken);
  }, 400);
  const handleUnregisterDevice = useSinglePress(async () => {
    await revokeCurrentDevice();
  }, 400);

  const handleTest = useSinglePress((type: NotifType) => {
    scheduleMockNotification(type, 'meetup-1');

    const TITLES: Record<NotifType, { title: string; body: string }> = {
      meetup_invite: {
        title: t('fe2.dev_notifications.invite_title'),
        body: t('fe2.dev_notifications.invite_body'),
      },
      meetup_finalized: {
        title: t('fe2.dev_notifications.finalized_title'),
        body: t('fe2.dev_notifications.finalized_body'),
      },
      'meetup.finalized': {
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
      recommendation_ready: {
        title: t('fe2.dev_notifications.recommendations_title'),
        body: t('fe2.dev_notifications.recommendations_body'),
      },
      nearby_detected: {
        title: t('fe2.dev_notifications.nearby_title'),
        body: t('fe2.dev_notifications.nearby_body'),
      },
    };

    const item = TITLES[type];
    setBannerInfo({
      visible: true,
      title: item.title,
      body: item.body,
      type,
    });

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRecentList((prev) => [
      { id: `n_${Date.now()}`, type, title: item.title, body: item.body, time: nowStr },
      ...prev.slice(0, 5),
    ]);
  }, 600);

  return (
    <View style={styles.container}>
      <InAppNotificationBanner
        visible={!!bannerInfo?.visible}
        title={bannerInfo?.title || ''}
        body={bannerInfo?.body || ''}
        onDismiss={() => setBannerInfo(null)}
        onPress={() => {
          const type = bannerInfo?.type;
          setBannerInfo(null);
          navigateByType(type);
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <Text style={styles.title}>{t('fe2.dev_notifications.screen_title')}</Text>
        <Text style={styles.subtitle}>{t('fe2.dev_notifications.screen_subtitle')}</Text>

        {/* Push Notification Device Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell size={18} color={deviceRegistered ? colors.success : colors.placeholder} />
            <Text style={styles.cardTitle}>
              {t('fe2.dev_notifications.device_status_section')}
            </Text>
          </View>
          <Text
            style={[
              styles.statusText,
              { color: deviceRegistered ? colors.success : colors.subtext },
            ]}
          >
            {deviceRegistered
              ? t('fe2.dev_notifications.device_registered')
              : t('fe2.dev_notifications.device_unregistered')}
          </Text>
          {registrationError && (
            <InlineAlert
              tone="danger"
              title={t(`errors.${registrationError.code}.title` as any)}
              message={t(`errors.${registrationError.code}.description` as any)}
            />
          )}
          <View style={styles.deviceActions}>
            <TouchableOpacity
              style={[
                styles.smallBtn,
                { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={handleRegisterDevice}
            >
              <RefreshCw size={13} color={colors.primary} />
              <Text style={[styles.smallBtnText, { color: colors.primary }]}>
                {deviceRegistered
                  ? t('fe2.dev_notifications.btn_refresh_token')
                  : t('fe2.dev_notifications.btn_register_token')}
              </Text>
            </TouchableOpacity>

            {deviceRegistered && (
              <TouchableOpacity
                style={[
                  styles.smallBtn,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
                onPress={handleUnregisterDevice}
              >
                <BellOff size={13} color={colors.subtext} />
                <Text style={[styles.smallBtnText, { color: colors.subtext }]}>
                  {t('fe2.dev_notifications.btn_unregister_token')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notification Trigger Buttons */}
        <View style={{ gap: 10 }}>
          <TouchableOpacity style={styles.button} onPress={() => handleTest('meetup_invite')}>
            <Text style={styles.buttonText}>{t('fe2.dev_notifications.btn_invite')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.purple }]}
            onPress={() => handleTest('recommendation_ready')}
          >
            <Text style={styles.buttonText}>
              {t('fe2.dev_notifications.btn_recommendations')}
            </Text>
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
            style={[styles.button, { backgroundColor: colors.info }]}
            onPress={() => handleTest('nearby_detected')}
          >
            <Text style={styles.buttonText}>{t('fe2.dev_notifications.btn_nearby')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.danger }]}
            onPress={() => handleTest('meetup_cancelled')}
          >
            <Text style={styles.buttonText}>{t('fe2.dev_notifications.btn_cancelled')}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Notifications List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('fe2.dev_notifications.recent_section')}</Text>
          {recentList.length === 0 ? (
            <Text style={styles.emptyText}>{t('fe2.dev_notifications.recent_empty')}</Text>
          ) : (
            recentList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.recentItem, { borderColor: colors.border }]}
                onPress={() => navigateByType(item.type)}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.recentTitle}>{item.title}</Text>
                    <Text style={styles.recentTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.recentBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.placeholder} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 16, paddingBottom: 36 },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text },
    subtitle: { fontSize: 13, color: c.subtext, lineHeight: 19 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    statusText: { fontSize: 13, fontWeight: '600' },
    deviceActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    smallBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    smallBtnText: { fontSize: 12, fontWeight: '700' },
    button: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    emptyText: { fontSize: 12, color: c.placeholder, fontStyle: 'italic' },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    recentTitle: { fontSize: 13, fontWeight: '700', color: c.text },
    recentTime: { fontSize: 11, color: c.placeholder },
    recentBody: { fontSize: 12, color: c.subtext, lineHeight: 17 },
  });
