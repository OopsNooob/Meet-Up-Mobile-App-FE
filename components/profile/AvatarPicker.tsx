import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react-native';
import { Avatar } from '@/components/common';
import { useTheme } from '@/hooks/useTheme';
import { avatarSize, fontSize, fontWeight, iconSize, radius, spacing } from '@/theme';

export type AvatarUploadStatus = 'idle' | 'uploading' | 'error';

export interface AvatarPickerProps {
  name: string;
  /** Ảnh đang hiển thị: ảnh mới chọn (chưa lưu) hoặc avatar hiện tại */
  uri?: string | null;
  status: AvatarUploadStatus;
  /** Có ảnh mới chưa lưu */
  pending: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function AvatarPicker({ name, uri, status, pending, onPress, disabled }: AvatarPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const uploading = status === 'uploading';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        disabled={disabled || uploading}
        accessibilityRole="button"
        accessibilityLabel={t('profile.change_avatar')}
        accessibilityState={{ disabled: disabled || uploading, busy: uploading }}
      >
        <Avatar name={name || '?'} uri={uri} size="xl" />
        {uploading && (
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
            <ActivityIndicator color={colors.onPrimary} />
          </View>
        )}
        <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
          <Camera size={iconSize.sm} color={colors.onPrimary} />
        </View>
      </Pressable>

      <Text
        style={[styles.status, { color: status === 'error' ? colors.danger : colors.subtext }]}
        accessibilityLiveRegion="polite"
      >
        {uploading
          ? t('profile.avatar_uploading')
          : status === 'error'
            ? t('profile.avatar_upload_failed')
            : pending
              ? t('profile.avatar_pending')
              : t('profile.change_avatar')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm },
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: avatarSize.xl / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    padding: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  status: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, textAlign: 'center' },
});
