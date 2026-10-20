import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { scheduleMockNotification, useFCM } from '@/hooks/useFCM';
import { useSinglePress } from '@/hooks/useSinglePress';
import { InAppNotificationBanner } from '@/components/common/InAppNotificationBanner';
import { routes } from '@/constants/routes';

export default function NotificationsTestScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [bannerInfo, setBannerInfo] = useState<{
    visible: boolean;
    title: string;
    body: string;
  } | null>(null);

  // Khởi chạy FCM listener & xin quyền (bắt buộc trên Android 13+)
  useFCM();

  const handleTest = useSinglePress(
    (type: 'meetup_invite' | 'meetup_finalized' | 'meetup_reminder' | 'meetup_cancelled') => {
      scheduleMockNotification(type, 'test-meetup-id');

      const TITLES: Record<typeof type, { title: string; body: string }> = {
        meetup_invite: {
          title: '📩 Lời mời MeetUp mới',
          body: 'Việt vừa mời bạn tham gia buổi cà phê cuối tuần này!',
        },
        meetup_finalized: {
          title: '📍 Đã chốt địa điểm',
          body: 'Địa điểm "The Coffee House - Nguyễn Huệ" đã được chọn với số phiếu cao nhất.',
        },
        meetup_reminder: {
          title: '⏰ Nhắc nhở lịch hẹn',
          body: 'Buổi hẹn của bạn sẽ bắt đầu trong 30 phút nữa. Hãy chuẩn bị nhé!',
        },
        meetup_cancelled: {
          title: '❌ Meetup bị hủy',
          body: 'Buổi hẹn đã bị trưởng nhóm hủy bỏ.',
        },
      };

      setBannerInfo({
        visible: true,
        title: TITLES[type].title,
        body: TITLES[type].body,
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
          setBannerInfo(null);
          router.push(routes.meetupDetail('test-meetup-id'));
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Test Notifications & Deep Links (FE-13)</Text>
        <Text style={styles.subtitle}>
          Bấm vào các nút dưới đây để kích hoạt thông báo foreground (In-App Banner) và thông báo hệ thống (FCM). 
          Khi bấm vào thông báo, hệ thống sẽ tự động điều hướng (Deep Link) đến màn hình tương ứng.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => handleTest('meetup_invite')}>
          <Text style={styles.buttonText}>📩 Lời mời MeetUp mới</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={() => handleTest('meetup_finalized')}
        >
          <Text style={styles.buttonText}>📍 Đã chốt địa điểm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.warning }]}
          onPress={() => handleTest('meetup_reminder')}
        >
          <Text style={styles.buttonText}>⏰ Nhắc nhở lịch hẹn</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.danger }]}
          onPress={() => handleTest('meetup_cancelled')}
        >
          <Text style={styles.buttonText}>❌ Meetup bị hủy</Text>
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
