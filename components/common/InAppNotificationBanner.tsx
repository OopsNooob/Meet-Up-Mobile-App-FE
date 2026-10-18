import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Animated,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { radius, spacing } from '@/theme';

export interface InAppNotificationBannerProps {
  visible: boolean;
  title: string;
  body: string;
  onPress?: () => void;
  onDismiss?: () => void;
  autoHideDuration?: number;
}

export function InAppNotificationBanner({
  visible,
  title,
  body,
  onPress,
  onDismiss,
  autoHideDuration = 4000,
}: InAppNotificationBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [translateY] = useState(() => new Animated.Value(-120));

  const handleDismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onDismiss?.();
    });
  }, [translateY, onDismiss]);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, autoHideDuration, translateY, handleDismiss]);

  const handlePress = useSinglePress(() => {
    handleDismiss();
    onPress?.();
  }, 400);

  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 48;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: topInset,
          left: spacing.md,
          right: spacing.md,
          zIndex: 9999,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        iconWrapper: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
        },
        content: {
          flex: 1,
        },
        title: {
          fontSize: 14,
          fontWeight: '700',
          color: colors.text,
        },
        body: {
          fontSize: 12,
          color: colors.subtext,
          marginTop: 2,
        },
        actionHint: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
          gap: 2,
        },
        actionHintText: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.primary,
        },
        closeBtn: {
          padding: 6,
          alignSelf: 'flex-start',
        },
      }),
    [colors, topInset]
  );

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress} style={styles.row}>
        <View style={styles.iconWrapper}>
          <Bell size={18} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title || t('fe2.notifications.in_app_title')}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
          <View style={styles.actionHint}>
            <Text style={styles.actionHintText}>{t('fe2.notifications.tap_to_open')}</Text>
            <ChevronRight size={12} color={colors.primary} />
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
          <X size={16} color={colors.placeholder} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}
