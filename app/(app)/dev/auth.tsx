import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, Card, Screen, useToast } from '@/components/common';
import { useTheme } from '@/hooks/useTheme';
import { API_BASE_URL, getRefreshCount, toApiError, USE_MOCK_API } from '@/services/apiClient';
import { authService } from '@/services/authService';
import { mockAuthDebug } from '@/services/mock/mockAuthServer';
import { useAuth } from '@/store/useAuthStore';
import { fontSize, spacing } from '@/theme';

// Màn dev (không i18n): kiểm tra tay vòng đời phiên FE-01. Không hiển thị giá trị token.
export default function DevAuthScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);

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