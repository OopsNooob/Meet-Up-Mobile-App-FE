import { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Shield, Navigation, MessageCircle, CalendarPlus, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { Avatar, StatusLabel, Button } from '@/components/common';
import { routes } from '@/constants/routes';
import { Friend } from './FriendMarker';
import { spacing, radius, fontSize, fontWeight } from '@/theme';

interface Props {
  visible: boolean;
  friend: Friend | null;
  onClose: () => void;
}

export function FriendInfoModal({ visible, friend, onClose }: Props) {
  if (!visible || !friend) return null;
  return <FriendInfoContent visible={visible} friend={friend} onClose={onClose} />;
}

function FriendInfoContent({
  visible,
  friend,
  onClose,
}: {
  visible: boolean;
  friend: Friend;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [now] = useState(() => Date.now());

  const handleClose = useSinglePress(onClose, 300);

  const handleDirections = useSinglePress(() => {
    const isApprox = friend.precision === 'approximate' || friend.accuracy >= 1000;
    if (isApprox) {
      Alert.alert(
        t('fe2.map.precision_approximate'),
        t('fe2.map.approximate_privacy_notice')
      );
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${friend.lat},${friend.lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('fe2.common.error'), t('fe2.common.maps_open_error'));
    });
  }, 1000);

  const handleInvite = useSinglePress(() => {
    onClose();
    router.push(routes.meetupCreate);
  }, 600);

  const handleChat = useSinglePress(() => {
    onClose();
    router.push(routes.meetupChat('meetup-1'));
  }, 600);

  const isApprox = friend.precision === 'approximate' || friend.accuracy >= 1000;
  const diffMin = Math.round((now - friend.updatedAt.getTime()) / 60000);
  const timeLabel = diffMin < 1 ? t('fe2.map.just_updated') : t('fe2.map.minutes_ago', { count: diffMin });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('fe2.map.friend_modal_title')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* User profile row */}
          <View style={styles.profileRow}>
            <Avatar name={friend.name} size="lg" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.name, { color: colors.text }]}>{friend.name}</Text>
              <View style={styles.statusRow}>
                {friend.isStale ? (
                  <StatusLabel kind="stale" />
                ) : isApprox ? (
                  <StatusLabel kind="approximate" />
                ) : (
                  <StatusLabel kind="live" />
                )}
                <Text style={[styles.timeText, { color: colors.placeholder }]}>• {timeLabel}</Text>
              </View>
            </View>
          </View>

          {/* Privacy & Accuracy details */}
          <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}>
            {isApprox ? (
              <View style={styles.infoRow}>
                <Shield size={16} color={colors.purple} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {t('fe2.map.precision_approximate')} (±1.1 km)
                </Text>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {t('fe2.map.accuracy_label')}: ~{Math.round(friend.accuracy)} m
                </Text>
              </View>
            )}
            {isApprox && (
              <Text style={[styles.hintText, { color: colors.placeholder }]}>
                {t('fe2.map.approximate_privacy_notice')}
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionGrid}>
            <Button
              label={t('fe2.map.directions_to_friend')}
              variant="secondary"
              icon={Navigation}
              onPress={handleDirections}
              style={{ flex: 1 }}
            />
            <Button
              label={t('fe2.map.chat_with_friend')}
              variant="secondary"
              icon={MessageCircle}
              onPress={handleChat}
              style={{ flex: 1 }}
            />
          </View>

          <Button
            label={t('fe2.map.invite_to_meetup')}
            variant="primary"
            fullWidth
            icon={CalendarPlus}
            onPress={handleInvite}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.xs,
  },
  infoCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hintText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
