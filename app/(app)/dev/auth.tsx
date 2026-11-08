import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, Card, Screen, useToast } from '@/components/common';
import { useTheme } from '@/hooks/useTheme';
import { API_BASE_URL, getRefreshCount, toApiError, USE_MOCK_API } from '@/services/apiClient';
import { authService } from '@/services/authService';
import { mockAuthDebug } from '@/services/mock/mockAuthServer';
import { mockFriendDebug, type MockFriendFailure } from '@/services/mock/mockFriendServer';
import { mockProfileDebug, type MockProfileFailure } from '@/services/mock/mockProfileServer';
import { useAuth } from '@/store/useAuthStore';
import { fontSize, spacing } from '@/theme';

const PROFILE_FAILURE_CYCLE: MockProfileFailure[] = ['none', 'offline', 'server'];
const FRIEND_FAILURE_CYCLE: MockFriendFailure[] = ['none', 'offline', 'server'];
const PROFILE_FAILURE_LABELS: Record<MockProfileFailure, string> = {
  none: 'bình thường',
  offline: 'giả lập mất mạng',
  server: 'giả lập lỗi 500',
};

// Màn dev (không i18n): kiểm tra tay vòng đời phiên FE-01. Không hiển thị giá trị token.
export default function DevAuthScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [profileFailure, setProfileFailure] = useState(mockProfileDebug.getFailure);
  const [friendFailure, setFriendFailure] = useState(mockFriendDebug.getFailure);

  const append = (line: string) => setLog((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 20));

  const callMeInParallel = async () => {
    const before = getRefreshCount();
    const results = await Promise.allSettled([authService.getMe(), authService.getMe(), authService.getMe()]);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.find((r) => r.status === 'rejected');
    append(
      `GET /auth/me ×3 → ${ok}/3 OK, refresh gọi ${getRefreshCount() - before} lần` +
        (failed?.status === 'rejected' ? `, lỗi: ${toApiError(failed.reason).code}` : ''),
    );
  };

  const mockAction = (label: string, action: () => void) => () => {
    action();
    append(label);
    toast.show(label, { tone: 'info' });
  };

  return (
    <Screen scroll>
      <Card>
        <Text style={{ color: colors.text }}>Chế độ: {USE_MOCK_API ? 'MOCK (access token sống 60s)' : 'API thật'}</Text>
        <Text style={{ color: colors.subtext }}>API: {API_BASE_URL}</Text>
        <Text style={{ color: colors.subtext }}>
          User: {user?.email} ({user?.role})
        </Text>
      </Card>

      <Button label="Gọi /auth/me ×3 song song" fullWidth onPress={callMeInParallel} />
      <Button
        label="① Làm access token hết hạn ngay"
        variant="secondary"
        fullWidth
        disabled={!USE_MOCK_API}
        onPress={mockAction('Access token đã hết hạn → lần gọi kế tiếp sẽ tự refresh', mockAuthDebug.expireAccessTokens)}
      />
      <Button
        label="② Thu hồi refresh token"
        variant="secondary"
        fullWidth
        disabled={!USE_MOCK_API}
        onPress={mockAction('Refresh token bị thu hồi → làm ① rồi gọi /me để về Đăng nhập', mockAuthDebug.revokeRefreshTokens)}
      />
      <Button
        label="③ Admin khóa tài khoản này"
        variant="danger"
        fullWidth
        disabled={!USE_MOCK_API || !user}
        onPress={mockAction('Đã khóa → gọi /me để bị đăng xuất với thông báo khóa', () =>
          mockAuthDebug.lockAccount(user?.email ?? ''),
        )}
      />

      <Button
        label={`④ API hồ sơ (FE-02): ${PROFILE_FAILURE_LABELS[profileFailure]}`}
        variant="secondary"
        fullWidth
        disabled={!USE_MOCK_API}
        onPress={() => {
          const next = PROFILE_FAILURE_CYCLE[(PROFILE_FAILURE_CYCLE.indexOf(profileFailure) + 1) % PROFILE_FAILURE_CYCLE.length];
          mockProfileDebug.setFailure(next);
          setProfileFailure(next);
          append(`API hồ sơ → ${PROFILE_FAILURE_LABELS[next]}`);
        }}
      />

      <Button
        label={`⑤ API bạn bè (FE-03): ${PROFILE_FAILURE_LABELS[friendFailure]}`}
        variant="secondary"
        fullWidth
        disabled={!USE_MOCK_API}
        onPress={() => {
          const next = FRIEND_FAILURE_CYCLE[(FRIEND_FAILURE_CYCLE.indexOf(friendFailure) + 1) % FRIEND_FAILURE_CYCLE.length];
          mockFriendDebug.setFailure(next);
          setFriendFailure(next);
          append(`API bạn bè → ${PROFILE_FAILURE_LABELS[next]}`);
        }}
      />
      <Button
        label="⑥ Người demo gửi lời mời kết bạn cho mình"
        variant="secondary"
        fullWidth
        disabled={!USE_MOCK_API || !user}
        onPress={() => {
          const sender = user ? mockFriendDebug.simulateIncomingRequest(user.id) : null;
          append(sender ? `${sender} đã gửi lời mời → badge cập nhật khi quay lại tab/tối đa 60s` : 'Hết người demo để gửi');
        }}
      />
      <Button
        label="⑦ Người demo rút lại lời mời đã gửi cho mình"
        variant="secondary"
        fullWidth
        disabled={!USE_MOCK_API || !user}
        onPress={() => {
          const count = user ? mockFriendDebug.cancelIncomingRequests(user.id) : 0;
          append(`Đã rút ${count} lời mời → bấm Chấp nhận trên màn cũ để thấy "Lời mời không còn tồn tại"`);
        }}
      />
      <Button
        label="⑧ Khóa/mở khóa tài khoản demo Nguyễn Đăng Khoa"
        variant="secondary"
        fullWidth
        disabled={!USE_MOCK_API}
        onPress={() => append(`Khoa → ${mockFriendDebug.toggleDemoLock() ? 'bị khóa' : 'mở khóa'}`)}
      />

      {log.map((line) => (
        <Text key={line} style={[styles.log, { color: colors.subtext }]}>
          {line}
        </Text>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  log: { fontSize: fontSize.xs, paddingHorizontal: spacing.xs },
});