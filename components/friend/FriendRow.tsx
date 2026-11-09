import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Card } from '@/components/common';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, spacing } from '@/theme';
import type { FriendUser } from '@/types/friend';

export interface FriendRowProps {
  user: FriendUser;
  subtitle?: string;
  /** Nút/nhãn bên phải (theo quan hệ) */
  actions?: ReactNode;
  testID?: string;
}

/** Một dòng người dùng: avatar + tên (+ dòng phụ) + thao tác. Dùng cho danh sách bạn, lời mời, kết quả tìm kiếm. */
export function FriendRow({ user, subtitle, actions, testID }: FriendRowProps) {
  const { colors } = useTheme();
  return (
    <Card style={styles.row} testID={testID}>
      <Avatar name={user.name} uri={user.avatarUrl} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {user.name}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {actions && <View style={styles.actions}>{actions}</View>}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  subtitle: { fontSize: fontSize.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
