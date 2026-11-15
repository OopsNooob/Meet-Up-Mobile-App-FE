import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { UserPlus, Users, X } from 'lucide-react-native';
import { Avatar, Button, InlineAlert } from '@/components/common';
import { FriendSelectionModal, type FriendItem } from '@/components/settings/FriendSelectionModal';
import { routes } from '@/constants/routes';
import { useFriends } from '@/hooks/useFriends';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { fontSize, fontWeight, iconSize, spacing } from '@/theme';
import { resolveMemberUser } from '@/utils/meetup';

const PREVIEW_COUNT = 6;

export interface MemberPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function MemberPicker({ selectedIds, onChange, error, disabled }: MemberPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const me = useAuthStore((s) => s.user);
  const { state, friends, refresh } = useFriends();
  const [modalVisible, setModalVisible] = useState(false);

  const friendsById = useMemo(() => new Map(friends.map((f) => [f.user.id, f])), [friends]);
  const friendItems = useMemo<FriendItem[]>(
    () => friends.map((f) => ({ id: f.user.id, displayName: f.user.name, avatarUrl: f.user.avatarUrl })),
    [friends],
  );
  const selectedFriendIds = useMemo(() => selectedIds.filter((id) => friendsById.has(id)), [selectedIds, friendsById]);
  const selectedUsers = useMemo(
    () => selectedIds.map((id) => resolveMemberUser(id, me, friendsById, t('meetup.member_unknown'))),
    [selectedIds, me, friendsById, t],
  );

  const handleSave = (friendIds: string[]) => {
    const kept = selectedIds.filter((id) => !friendsById.has(id));
    onChange([...kept, ...friendIds]);
  };

  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  const friendsLoading = state.status === 'loading';
  const hasNoFriends = state.status === 'empty';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.subtext }]}>{t('meetup.form.members')}</Text>
        <Text style={[styles.count, { color: colors.primary }]} accessibilityLiveRegion="polite">
          {t('meetup.form.members_selected', { count: selectedIds.length })}
        </Text>
      </View>

      {state.status === 'error' && (
        <InlineAlert tone="warning" title={t('meetup.form.friends_load_failed')} message={t(`errors.${state.error.code}.description`)} />
      )}
      {hasNoFriends && selectedIds.length === 0 && (
        <InlineAlert tone="info" title={t('meetup.form.no_friends_title')} message={t('meetup.form.no_friends_message')} />
      )}

      {selectedUsers.slice(0, PREVIEW_COUNT).map((user) => (
        <View key={user.id} style={styles.memberRow}>
          <Avatar name={user.name} uri={user.avatarUrl} size="sm" />
          <Text style={[styles.memberName, { color: user.isKnown ? colors.text : colors.subtext }]} numberOfLines={1}>
            {user.name}
          </Text>
          {!disabled && (
            <Pressable
              onPress={() => remove(user.id)}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              accessibilityLabel={t('meetup.form.remove_member', { name: user.name })}
            >
              <X size={iconSize.md} color={colors.subtext} />
            </Pressable>
          )}
        </View>
      ))}
      {selectedUsers.length > PREVIEW_COUNT && (
        <Text style={[styles.more, { color: colors.subtext }]}>
          {t('meetup.form.members_more', { count: selectedUsers.length - PREVIEW_COUNT })}
        </Text>
      )}

      <View style={styles.actions}>
        {hasNoFriends ? (
          <Button
            label={t('friend.find_friends')}
            icon={UserPlus}
            variant="secondary"
            onPress={() => router.push(routes.friendSearch)}
          />
        ) : state.status === 'error' ? (
          <Button label={t('common.retry')} variant="secondary" onPress={refresh} />
        ) : (
          <Button
            label={t('meetup.form.pick_members')}
            icon={Users}
            variant="secondary"
            loading={friendsLoading}
            disabled={disabled}
            onPress={() => setModalVisible(true)}
            testID="meetup-pick-members"
          />
        )}
      </View>

      {error ? (
        <Text style={[styles.helper, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : (
        <Text style={[styles.helper, { color: colors.placeholder }]}>{t('meetup.form.members_hint')}</Text>
      )}

      <FriendSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        friends={friendItems}
        selectedFriendIds={selectedFriendIds}
        onSave={handleSave}
        title={t('meetup.form.pick_members')}
        saveLabel={t('meetup.form.pick_members_done')}
        maxSelected={null}
        selectedCountLabel={(count) => t('meetup.form.members_selected', { count })}
        emptySelectionNote={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, alignSelf: 'stretch' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  count: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberName: { flex: 1, fontSize: fontSize.md },
  more: { fontSize: fontSize.sm },
  actions: { flexDirection: 'row' },
  helper: { fontSize: fontSize.xs },
});
