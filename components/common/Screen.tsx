import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Bọc nội dung trong ScrollView. Không dùng khi bên trong đã có FlatList/Map. */
  scroll?: boolean;
  /** Padding chuẩn spacing.lg quanh nội dung (mặc định true). */
  padded?: boolean;
  /**
   * Cạnh cần né safe area. Mặc định ['left', 'right', 'bottom'] — phù hợp màn Stack có header.
   * - Màn trong bottom tab: edges={['left', 'right']} (tab bar đã xử lý cạnh dưới)
   * - Màn không có header (login...): edges={['top', 'left', 'right', 'bottom']}
   */
  edges?: Edge[];
  /** Bật nếu màn có ô nhập liệu để bàn phím không che. */
  keyboardAvoiding?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Nội dung cố định ở đáy (nút submit...), không cuộn theo. */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Khung chuẩn cho mọi màn hình: nền theo theme, safe area, padding, scroll tùy chọn. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['left', 'right', 'bottom'],
  keyboardAvoiding = false,
  refreshControl,
  footer,
  contentStyle,
  testID,
}: ScreenProps) {
  const { colors } = useTheme();
  const padding = padded ? styles.padded : undefined;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView testID={testID} edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
          {footer && <View style={[styles.footer, { borderTopColor: colors.divider }]}>{footer}</View>}
        </KeyboardAvoidingView>
      ) : (
        <>
          {body}
          {footer && <View style={[styles.footer, { borderTopColor: colors.divider }]}>{footer}</View>}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: spacing.lg },
  scrollContent: { flexGrow: 1, gap: spacing.md },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
