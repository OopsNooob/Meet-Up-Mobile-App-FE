import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { scheduleMockNotification, useFCM } from '@/hooks/useFCM';
import { useSinglePress } from '@/hooks/useSinglePress';
import { useMemo } from 'react';

export default function NotificationsTestScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Khởi chạy FCM listener & xin quyền (bắt buộc trên Android 13+)
  useFCM();

  const handleTest = useSinglePress((type: 'meetup_invite' | 'meetup_finalized' | 'meetup_reminder' | 'meetup_cancelled') => {
    scheduleMockNotification(type, 'test-meetup-id');
  }, 1000);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Test Notifications & Deep Links (FE-13)</Text>
      <Text style={styles.subtitle}>
        Bấm vào các nút dưới đây, thoát app (hoặc giữ nguyên) và chờ 2 giây để nhận thông báo. 
        Khi bấm vào thông báo, hệ thống sẽ tự động điều hướng (Deep Link) đến màn hình tương ứng.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => handleTest('meetup_invite')}>
        <Text style={styles.buttonText}>📩 Lời mời MeetUp mới</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.success }]} onPress={() => handleTest('meetup_finalized')}>
        <Text style={styles.buttonText}>📍 Đã chốt địa điểm</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.warning }]} onPress={() => handleTest('meetup_reminder')}>
        <Text style={styles.buttonText}>⏰ Nhắc nhở lịch hẹn</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.danger }]} onPress={() => handleTest('meetup_cancelled')}>
        <Text style={styles.buttonText}>❌ Meetup bị hủy</Text>
      </TouchableOpacity>
    </ScrollView>
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
