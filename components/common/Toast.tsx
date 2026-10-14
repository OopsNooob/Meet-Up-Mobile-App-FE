/**
 * Toast — thông báo ngắn tự ẩn. ToastProvider đã gắn sẵn ở app/_layout.tsx.
 *
 *   const toast = useToast();
 *   toast.show(t('meetup.saved'), { tone: 'success' });
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, radius, spacing, toneColors } from '@/theme';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

type ToastItem = { id: number; message: string; tone: ToastTone; duration: number };

type ToastApi = { show: (message: string, options?: { tone?: ToastTone; duration?: number }) => void };

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICONS: Record<ToastTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

/** Khoảng cách từ đáy để không đè lên bottom tab bar. */
const BOTTOM_OFFSET = 72;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const nextId = useRef(0);

  const show = useCallback<ToastApi['show']>((message, options) => {
    setCurrent({ id: ++nextId.current, message, tone: options?.tone ?? 'info', duration: options?.duration ?? 2500 });
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {current && <ToastView key={current.id} item={current} onHide={() => setCurrent(null)} />}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải dùng bên trong <ToastProvider>');
  return ctx;
}

function ToastView({ item, onHide }: { item: ToastItem; onHide: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // useState thay vì useRef: React Compiler không cho đọc ref trong lúc render
  const [anim] = useState(() => new Animated.Value(0));
  const { fg, bg } = toneColors(colors, item.tone);
  const Icon = TONE_ICONS[item.tone];

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(item.duration),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onHide());
    return () => animation.stop();
  }, [anim, item.duration, onHide]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          bottom: insets.bottom + BOTTOM_OFFSET,
          backgroundColor: bg,
          borderColor: fg,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [spacing.lg, 0] }) }],
        },
      ]}
    >
      <Icon size={iconSize.md} color={fg} />
      <Text style={[styles.message, { color: colors.text }]}>{item.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  message: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
