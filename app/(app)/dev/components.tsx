import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Users } from 'lucide-react-native';
import {
  AsyncView,
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Screen,
  StatusLabel,
  TextField,
  useToast,
  type StatusKind,
} from '@/components/common';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, spacing } from '@/theme';
import { asyncError, asyncLoading, type AsyncState } from '@/types/async';

const ALL_STATUSES: StatusKind[] = [
  'live', 'stale', 'approximate', 'location_missing', 'offline', 'reconnecting', 'gps_denied', 'gps_off',
  'exact', 'batch', 'cluster',
  'meetup_draft', 'meetup_inviting', 'meetup_choosing', 'meetup_selected', 'meetup_cancelled', 'meetup_finished',
  'member_invited', 'member_accepted', 'member_declined',
];

const DEMO_STATES: Record<string, AsyncState<string[]>> = {
  loading: asyncLoading(),
  empty: { status: 'empty' },
  offline: asyncError('offline'),
  gps_denied: asyncError('gps_denied'),
  success: { status: 'success', data: ['Huy', 'Linh', 'Khoa'] },
  stale: { status: 'success', data: ['Huy', 'Linh'], isStale: true, updatedAt: new Date(Date.now() - 7 * 60_000).toISOString() },
};

/** Gallery các component dùng chung — chỉ để xem/kiểm tra, không phải màn hình sản phẩm. */
export default function ComponentsGalleryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const [demoKey, setDemoKey] = useState<keyof typeof DEMO_STATES>('loading');
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState('');

  const sectionTitle = (text: string) => <Text style={[styles.section, { color: colors.text }]}>{text}</Text>;

  return (
    <Screen scroll keyboardAvoiding>
      {sectionTitle('Button')}
      <View style={styles.wrap}>
        <Button label="Primary" icon={Plus} />
        <Button label="Secondary" variant="secondary" />
        <Button label="Danger" variant="danger" />
        <Button label="Ghost" variant="ghost" />
        <Button label="Loading" loading />
        <Button label="Disabled" disabled />
        <Button label="Small" size="sm" />
      </View>

      {sectionTitle('TextField')}
      <TextField
        label="Tên meetup"
        placeholder="Cà phê cuối tuần"
        value={name}
        onChangeText={setName}
        error={name.length > 0 && name.length < 3 ? 'Tối thiểu 3 ký tự' : null}
        hint="Nhập ít hơn 3 ký tự để xem lỗi"
      />

      {sectionTitle('Card + Avatar')}
      <Card onPress={() => toast.show('Card pressed')} style={styles.cardRow}>
        <Avatar name="Huy Tran" uri="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" />
        <Avatar name="Bảo Linh" />
        <Avatar name="Minh Khoa" size="sm" />
        <Avatar name="Thu Hà" uri="https://invalid.example/broken.png" />
      </Card>

      {sectionTitle('StatusLabel')}
      <View style={styles.wrap}>
        {ALL_STATUSES.map((kind) => (
          <StatusLabel key={kind} kind={kind} />
        ))}
        <StatusLabel kind="stale" detail="7 phút trước" />
      </View>

      {sectionTitle('AsyncView (loading / empty / error / success)')}
      <View style={styles.wrap}>
        {Object.keys(DEMO_STATES).map((key) => (
          <Button
            key={key}
            label={key}
            size="sm"
            variant={key === demoKey ? 'primary' : 'secondary'}
            onPress={() => setDemoKey(key)}
          />
        ))}
      </View>
      <Card style={styles.asyncBox}>
        <AsyncView
          state={DEMO_STATES[demoKey]}
          onRetry={() => toast.show(t('common.retry'))}
          empty={{ title: 'Chưa có bạn bè', description: 'Tìm bạn để bắt đầu.', icon: Users, actionLabel: 'Tìm bạn', onAction: () => {} }}
        >
          {(friends) => friends.map((f) => <Text key={f} style={{ color: colors.text }}>{f}</Text>)}
        </AsyncView>
      </Card>

      {sectionTitle('ConfirmDialog + Toast')}
      <View style={styles.wrap}>
        <Button label="Hủy meetup" variant="danger" onPress={() => setDialog(true)} />
        <Button label="Toast success" variant="secondary" onPress={() => toast.show('Đã lưu', { tone: 'success' })} />
        <Button label="Toast error" variant="secondary" onPress={() => toast.show('Mất kết nối', { tone: 'danger' })} />
      </View>
      <ConfirmDialog
        visible={dialog}
        title="Hủy meetup?"
        message="Mọi thành viên sẽ nhận thông báo. Không thể hoàn tác."
        confirmLabel="Hủy meetup"
        tone="danger"
        onCancel={() => setDialog(false)}
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 800));
          setDialog(false);
          toast.show('Đã hủy meetup', { tone: 'success' });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cardRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  asyncBox: { minHeight: 220 },
});
