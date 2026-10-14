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
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  keyboardAvoiding?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

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
