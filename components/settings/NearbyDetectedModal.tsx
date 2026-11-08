import { useMemo, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Radar, X, Coffee, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { FriendRowSkeleton } from '@/components/common/Skeleton';
import { radius, spacing } from '@/theme';

export interface NearbyFriendItem {
  id: string;
  name: string;
  avatarUrl?: string;
  approxDistance: string;
}

interface NearbyDetectedModalProps {
  visible: boolean;
  onClose: () => void;
  friends: NearbyFriendItem[];
  onInviteMeetup: (friendId: string) => void;
}

const INITIAL_NEARBY_PAGE = 3;

export function NearbyDetectedModal({
  visible,
  onClose,
  friends,
  onInviteMeetup,
}: NearbyDetectedModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [visibleCount, setVisibleCount] = useState(INITIAL_NEARBY_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const paginatedFriends = useMemo(
    () => friends.slice(0, visibleCount),
    [friends, visibleCount]
  );

  const hasMore = visibleCount < friends.length;

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || isRefreshing || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 2, friends.length));
      setIsLoadingMore(false);
    }, 500);
  }, [friends.length, hasMore, isLoadingMore, isRefreshing]);

  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setVisibleCount(INITIAL_NEARBY_PAGE);
      setIsRefreshing(false);
    }, 600);
  }, 700);

  const handleInvite = useSinglePress((id: string) => {
    onInviteMeetup(id);
    onClose();
  }, 500);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        },
        container: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: spacing.xl,
          maxHeight: '82%',
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitle: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.text,
        },
        closeBtn: {
          padding: 4,
        },
        subtitle: {
          fontSize: 13,
          color: colors.subtext,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
        },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: 12,
        },
        friendCard: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 12,
        },
        friendDetails: {
          flex: 1,
        },
        friendName: {
          fontSize: 15,
          fontWeight: '700',
          color: colors.text,
        },
        distanceBadge: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.purple,
          marginTop: 2,
        },
        lazyFooter: {
          paddingVertical: 8,
        },
        lazyFooterText: {
          fontSize: 12,
          color: colors.purple,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 4,
        },
        allLoadedText: {
          fontSize: 11,
          color: colors.placeholder,
          textAlign: 'center',
          paddingVertical: 6,
          fontStyle: 'italic',
        },
        privacyBox: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primaryLight,
          marginHorizontal: spacing.lg,
          padding: spacing.sm,
          borderRadius: radius.md,
          gap: 8,
          marginBottom: spacing.md,
        },
        privacyText: {
          flex: 1,
          fontSize: 11,
          color: colors.primary,
          lineHeight: 15,
        },
        footer: {
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
        },
      }),
    [colors]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Radar size={22} color={colors.purple} />
              <Text style={styles.headerTitle}>{t('fe2.nearby.detected_modal_title')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{t('fe2.nearby.detected_subtitle')}</Text>

          {/* List of Detected Friends with Lazy Loading & Pull-to-Refresh */}
          <FlatList
            data={paginatedFriends}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.purple]}
                tintColor={colors.purple}
                progressBackgroundColor={colors.surface}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.friendCard}>
                <Avatar name={item.name} uri={item.avatarUrl} size="md" />
                <View style={styles.friendDetails}>
                  <Text style={styles.friendName}>{item.name}</Text>
                  <Text style={styles.distanceBadge}>
                    {t('fe2.nearby.approx_distance', { dist: item.approxDistance })}
                  </Text>
                </View>
                <Button
                  label={t('fe2.nearby.invite_nearby_meetup')}
                  icon={Coffee}
                  size="sm"
                  variant="primary"
                  onPress={() => handleInvite(item.id)}
                />
              </View>
            )}
            ListFooterComponent={
              friends.length === 0 ? null : isLoadingMore ? (
                <View style={styles.lazyFooter}>
                  <Text style={styles.lazyFooterText}>
                    {t('fe2.nearby.loading_more_nearby')}
                  </Text>
                  <FriendRowSkeleton />
                </View>
              ) : !hasMore ? (
                <Text style={styles.allLoadedText}>{t('fe2.nearby.all_nearby_loaded')}</Text>
              ) : null
            }
          />

          {/* Privacy Note */}
          <View style={styles.privacyBox}>
            <ShieldCheck size={16} color={colors.primary} />
            <Text style={styles.privacyText}>{t('fe2.nearby.privacy_note')}</Text>
          </View>

          {/* Footer Dismiss */}
          <View style={styles.footer}>
            <Button
              label={t('fe2.nearby.dismiss')}
              variant="ghost"
              fullWidth
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
