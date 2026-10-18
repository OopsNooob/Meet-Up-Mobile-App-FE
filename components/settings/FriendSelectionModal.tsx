import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, Check, X, Users, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { radius, spacing } from '@/theme';

export interface FriendItem {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface FriendSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  friends: FriendItem[];
  selectedFriendIds: string[];
  onSave: (newSelectedIds: string[]) => void;
}

export function FriendSelectionModal(props: FriendSelectionModalProps) {
  if (!props.visible) return null;
  return <FriendSelectionContent {...props} />;
}

function FriendSelectionContent({
  visible,
  onClose,
  friends,
  selectedFriendIds,
  onSave,
}: FriendSelectionModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<Set<string>>(() => new Set(selectedFriendIds));

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter((f) => f.displayName.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const isAllSelected = useMemo(() => {
    if (friends.length === 0) return false;
    return friends.every((f) => tempSelected.has(f.id));
  }, [friends, tempSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setTempSelected(new Set());
    } else {
      setTempSelected(new Set(friends.map((f) => f.id)));
    }
  };

  const handleToggleFriend = (id: string) => {
    setTempSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 100) return next;
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = useSinglePress(() => {
    onSave(Array.from(tempSelected));
    onClose();
  }, 400);

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
          maxHeight: '88%',
          minHeight: '60%',
          paddingBottom: spacing.lg,
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
        subHeader: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        selectedCountText: {
          fontSize: 13,
          color: colors.subtext,
          fontWeight: '500',
        },
        toggleAllBtn: {
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderRadius: radius.sm,
          backgroundColor: colors.primaryLight,
        },
        toggleAllText: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.primary,
        },
        searchBox: {
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: spacing.lg,
          marginVertical: spacing.sm,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        },
        searchInput: {
          flex: 1,
          fontSize: 14,
          color: colors.text,
          padding: 0,
        },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xs,
        },
        friendRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          gap: 12,
        },
        checkbox: {
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkboxChecked: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        friendInfo: {
          flex: 1,
        },
        friendName: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.text,
        },
        emptyBox: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 40,
          gap: 8,
        },
        emptyText: {
          fontSize: 14,
          color: colors.subtext,
        },
        warningBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.warningLight,
          marginHorizontal: spacing.lg,
          marginTop: spacing.sm,
          padding: spacing.sm,
          borderRadius: radius.md,
          gap: 8,
        },
        warningText: {
          flex: 1,
          fontSize: 12,
          color: colors.warning,
          lineHeight: 16,
        },
        footer: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          gap: 8,
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
              <Users size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>{t('fe2.location.manage_selected_friends')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* SubHeader: Selected Count & Select All */}
          <View style={styles.subHeader}>
            <Text style={styles.selectedCountText}>
              {t('fe2.location.selected_count', { count: tempSelected.size })}
            </Text>
            <TouchableOpacity onPress={handleToggleSelectAll} style={styles.toggleAllBtn}>
              <Text style={styles.toggleAllText}>
                {isAllSelected ? t('fe2.location.deselect_all') : t('fe2.location.select_all')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Search size={16} color={colors.placeholder} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('fe2.location.search_friends')}
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.placeholder} />
              </TouchableOpacity>
            )}
          </View>

          {/* List of Friends with Checkboxes */}
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isChecked = tempSelected.has(item.id);
              return (
                <Pressable
                  style={styles.friendRow}
                  onPress={() => handleToggleFriend(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Check size={14} color="#fff" strokeWidth={3} />}
                  </View>
                  <Avatar name={item.displayName} uri={item.avatarUrl} size="sm" />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{item.displayName}</Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('fe2.location.empty_search')}</Text>
              </View>
            }
          />

          {/* Auto-downgrade Warning when 0 friends selected */}
          {tempSelected.size === 0 && (
            <View style={styles.warningBanner}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={styles.warningText}>{t('fe2.location.auto_downgrade_note')}</Text>
            </View>
          )}

          {/* Footer Action */}
          <View style={styles.footer}>
            <Button
              label={t('fe2.location.save_selection')}
              variant="primary"
              fullWidth
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
