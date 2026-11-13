/**
 * FE-14 — FCM, nhắc lịch và deep link
 * Hook quản lý:
 *   - Đăng ký FCM token + gửi lên backend
 *   - Xử lý notification ở foreground và background
 *   - Deep link điều hướng đến đúng màn hình meetup / gợi ý / bạn bè gần đây
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { EventSubscription } from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { routes } from '@/constants/routes';
import i18n from '@/locales/i18n';

// Web và Expo Go Android (SDK 53+) không hỗ trợ expo-notifications — import là lỗi
export const isNotificationsSupported =
  Platform.OS !== 'web' &&
  !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

const Notifications: typeof import('expo-notifications') | null = isNotificationsSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : null;

if (!Notifications) {
  console.warn('[FCM] Notification bị tắt (web / Expo Go Android) — cần development build để test.');
}

// ──── Cấu hình handler notification khi app ở foreground ──────────────────
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ──── Deep link mapping theo notification type ────────────────────────────
export type NotifType =
  | 'meetup_invite'
  | 'meetup_finalized'
  | 'meetup.finalized'
  | 'meetup_reminder'
  | 'meetup_cancelled'
  | 'recommendation_ready'
  | 'nearby_detected';

function navigateFromNotification(data: Record<string, unknown>) {
  const type = data?.type as NotifType | undefined;
  const meetupId = (data?.meetupId as string | undefined) ?? 'meetup-1';
  const placeId = data?.placeId as string | undefined;

  if (!type) return;

  switch (type) {
    case 'meetup_invite':
    case 'meetup_cancelled':
      router.push(routes.meetupDetail(meetupId));
      break;
    case 'meetup_finalized':
    case 'meetup.finalized':
      if (placeId) {
        router.push(routes.placeDetail(placeId));
      } else {
        router.push(routes.meetupDetail(meetupId));
      }
      break;
    case 'meetup_reminder':
      router.push(routes.meetupChat(meetupId));
      break;
    case 'recommendation_ready':
      router.push(routes.meetupRecommendations(meetupId));
      break;
    case 'nearby_detected':
      router.push(routes.settingsNearby);
      break;
    default:
      router.push(routes.tabMeetups);
  }
}

// ──── Hook chính ──────────────────────────────────────────────────────────
export function useFCM() {
  const token = useAuthStore((s) => s.accessToken);
  const notifListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    if (!Notifications) return;

    // 1. Xin quyền + lấy FCM token
    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[FCM] Notification permission denied');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenData.data;
      console.log('[FCM] Expo Push Token:', expoPushToken);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MeetUp Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
    })();

    // 2. Foreground notification
    notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[FCM] Foreground notification received:', notification);
    });

    // 3. Background / killed state
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[FCM] User tapped notification:', response);
      const data = response.notification.request.content.data as Record<string, unknown>;
      navigateFromNotification(data);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [token]);
}

// ──── Lấy notification khi app mở từ killed state ─────────────────────────
export async function handleInitialNotification() {
  if (!Notifications) return;
  const lastResponse = await Notifications.getLastNotificationResponseAsync();
  if (lastResponse) {
    const data = lastResponse.notification.request.content.data as Record<string, unknown>;
    navigateFromNotification(data);
  }
}

// ──── Mock: tạo local notification để test UI ─────────────────────────────
export async function scheduleMockNotification(type: NotifType, meetupId = 'meetup-1') {
  if (!Notifications) {
    return;
  }
  const normalizedType = type === 'meetup.finalized' ? 'meetup_finalized' : type;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t(`fe2.fcm.${normalizedType}_title` as any),
      body: i18n.t(`fe2.fcm.${normalizedType}_body` as any),
      data: { type, meetupId },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}
