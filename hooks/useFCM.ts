/**
 * FE-13 — FCM, nhắc lịch và deep link
 * Hook quản lý:
 *   - Đăng ký FCM token + gửi lên backend
 *   - Xử lý notification ở foreground và background
 *   - Deep link điều hướng đến đúng màn hình meetup
 *
 * Cài đặt: expo-notifications đã có sẵn trong package.json
 */
import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import type { EventSubscription } from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { routes } from '@/constants/routes';

// Web và Expo Go Android (SDK 53+) không hỗ trợ expo-notifications — import là lỗi
export const isNotificationsSupported =
  Platform.OS !== 'web' &&
  !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

const Notifications: typeof import('expo-notifications') | null = isNotificationsSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : null;

if (!Notifications) {
  console.warn('[FCM] Notification bị tắt (web / Expo Go Android) — cần development build để test FE-13.');
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
type NotifType = 'meetup_invite' | 'meetup_finalized' | 'meetup_reminder' | 'meetup_cancelled';

function navigateFromNotification(data: Record<string, unknown>) {
  const type = data?.type as NotifType | undefined;
  const meetupId = data?.meetupId as string | undefined;

  if (!type || !meetupId) return;

  switch (type) {
    case 'meetup_invite':
      // Chi tiết meetup — nơi người được mời chấp nhận/từ chối (FE-08)
      router.push(routes.meetupDetail(meetupId));
      break;
    case 'meetup_finalized':
      // Chi tiết meetup hiển thị địa điểm đã chốt
      router.push(routes.meetupDetail(meetupId));
      break;
    case 'meetup_reminder':
      router.push(routes.meetupDetail(meetupId));
      break;
    case 'meetup_cancelled':
      // Vẫn mở chi tiết để người dùng thấy trạng thái "đã hủy" thay vì mất dấu meetup
      router.push(routes.meetupDetail(meetupId));
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
    let isMounted = true;

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

      // Lấy Expo Push Token (dùng cho FCM qua Expo)
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenData.data;
      console.log('[FCM] Expo Push Token:', expoPushToken);

      // TODO: Gửi token này lên backend để lưu vào device_tokens
      // await api.post('/notifications/register', { token: expoPushToken });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MeetUp Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
    })();

    // 2. Foreground notification — hiển thị alert + điều hướng khi người dùng tap
    notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[FCM] Foreground notification received:', notification);
      // Notification đã tự hiện qua setNotificationHandler
    });

    // 3. Background / killed state — người dùng tap vào notification
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
    console.log('[FCM] App opened from killed state via notification:', data);
    navigateFromNotification(data);
  }
}

// ──── Mock: tạo local notification để test UI ─────────────────────────────
export async function scheduleMockNotification(type: NotifType, meetupId = 'meetup-1') {
  if (!Notifications) {
    console.warn('[FCM] Không thể tạo notification trong Expo Go (Android).');
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: NOTIF_TITLES[type],
      body: NOTIF_BODIES[type],
      data: { type, meetupId },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}

const NOTIF_TITLES: Record<NotifType, string> = {
  meetup_invite: '🎉 Bạn có lời mời meetup mới!',
  meetup_finalized: '📍 Địa điểm đã được chốt',
  meetup_reminder: '⏰ Meetup của bạn sắp bắt đầu',
  meetup_cancelled: '❌ Meetup đã bị hủy',
};
const NOTIF_BODIES: Record<NotifType, string> = {
  meetup_invite: 'Việt đã mời bạn tham gia meetup cuối tuần này',
  meetup_finalized: 'The Coffee House - Nguyễn Huệ đã được chọn. Tap để xem chỉ đường.',
  meetup_reminder: 'Còn 30 phút nữa. Đừng để bạn bè chờ nhé!',
  meetup_cancelled: 'Rất tiếc, meetup đã bị hủy bởi người tạo.',
};
