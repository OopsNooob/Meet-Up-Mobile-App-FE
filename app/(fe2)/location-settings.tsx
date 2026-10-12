import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Users,
  UserCheck,
  Calendar,
  Clock,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Globe2,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { usePrivacyStore } from '../../store/usePrivacyStore';
import { useSinglePress } from '../../hooks/useSinglePress';
import { SharingMode } from '../../types/privacy';

type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

const MOCK_PERMISSION: PermissionStatus = 'granted';

export default function LocationSettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [permission] = useState<PermissionStatus>(MOCK_PERMISSION);
  const [saveToast, setSaveToast] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    settings,
    availableFriends,
    setSharingMode,
    setSharingExpiresAt,
    setUseApproximateLocation,
    addSelectedFriend,
    removeSelectedFriend,
    isEffectiveSharingActive,
  } = usePrivacyStore();

  const [selectedExpiryHours, setSelectedExpiryHours] = useState<number>(() => {
    if (!settings.sharingExpiresAt) return 0;
    const diffHours = Math.round(
      (new Date(settings.sharingExpiresAt).getTime() - Date.now()) / (3600 * 1000)
    );
    return [1, 4, 8, 24].includes(diffHours) ? diffHours : 1;
  });

  useEffect(() => {
    if (!settings.sharingExpiresAt) {
      setSelectedExpiryHours(0);
    } else {
      const diffHours = Math.round(
        (new Date(settings.sharingExpiresAt).getTime() - Date.now()) / (3600 * 1000)
      );
      setSelectedExpiryHours([1, 4, 8, 24].includes(diffHours) ? diffHours : 1);
    }
  }, [settings.sharingExpiresAt]);

  const handleRetry = useSinglePress(() => Alert.alert(t('fe2.location.grant_permission'), ''), 600);
  const handleOpenSettings = useSinglePress(() => Alert.alert(t('fe2.location.open_settings'), ''), 600);

  // Master switch
  const isSharingActive = settings.sharingMode !== 'off';

  const handleMasterToggle = (val: boolean) => {
    if (!val) {
      setSharingMode('off');
      setSelectedExpiryHours(0);
    } else {
      setSharingMode('friends');
    }
    showSavedFeedback();
  };

  const showSavedFeedback = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const SHARING_MODES: { mode: SharingMode; icon: any; titleKey: string; subKey: string }[] = [
    {
      mode: 'friends',
      icon: Users,
      titleKey: 'fe2.location.mode_friends',
      subKey: 'fe2.location.mode_friends_sub',
    },
    {
      mode: 'selected_friends',
      icon: UserCheck,
      titleKey: 'fe2.location.mode_selected_friends',
      subKey: 'fe2.location.mode_selected_friends_sub',
    },
    {
      mode: 'meetup_only',
      icon: Calendar,
      titleKey: 'fe2.location.mode_meetup_only',
      subKey: 'fe2.location.mode_meetup_only_sub',
    },
    {
      mode: 'off',
      icon: Shield,
      titleKey: 'fe2.location.mode_off',
      subKey: 'fe2.location.mode_off_sub',
    },
  ];

  // Expiration presets
  const EXPIRY_OPTIONS = [
    { label: t('fe2.location.expiry_unlimited'), hours: 0 },
    { label: t('fe2.location.expiry_1h'), hours: 1 },
    { label: t('fe2.location.expiry_4h'), hours: 4 },
    { label: t('fe2.location.expiry_8h'), hours: 8 },
    { label: t('fe2.location.expiry_24h'), hours: 24 },
  ];

  const handleSelectExpiry = useSinglePress((hours: number) => {
    setSelectedExpiryHours(hours);
    if (hours === 0) {
      setSharingExpiresAt(null);
    } else {
      const target = new Date(Date.now() + hours * 3600 * 1000);
      setSharingExpiresAt(target.toISOString());
    }
    showSavedFeedback();
  }, 400);

  const handleModeSelect = useSinglePress((mode: SharingMode) => {
    setSharingMode(mode);
    showSavedFeedback();
  }, 400);

  const handleRemoveFriend = useSinglePress((friendId: string) => {
    removeSelectedFriend(friendId);
    showSavedFeedback();
  }, 400);

  const handleAddFriend = useSinglePress((friendId: string) => {
    addSelectedFriend(friendId);
    showSavedFeedback();
  }, 400);

  const handleToggleLanguage = useSinglePress(() => {
    const next = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
  }, 500);

  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showSavedFeedback();
    }, 800);
  }, 800);

  // Selected friends list
  const selectedFriends = useMemo(() => {
    return availableFriends.filter((f) => settings.selectedFriendIds.includes(f.id));
  }, [availableFriends, settings.selectedFriendIds]);

  const unselectedFriends = useMemo(() => {
    return availableFriends.filter((f) => !settings.selectedFriendIds.includes(f.id));
  }, [availableFriends, settings.selectedFriendIds]);

  const effectiveActive = isEffectiveSharingActive();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      {/* Toast thông báo lưu */}
      {saveToast && (
        <View style={styles.toast}>
          <CheckCircle2 size={16} color="#fff" />
          <Text style={styles.toastText}>{t('fe2.location.save_success')}</Text>
        </View>
      )}

      {/* === Banner Trạng thái hiệu lực === */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: effectiveActive ? colors.successLight : colors.surfaceAlt,
            borderColor: effectiveActive ? colors.success : colors.border,
          },
        ]}
      >
        <View style={styles.statusBannerRow}>
          <View
            style={[
              styles.statusDotLarge,
              { backgroundColor: effectiveActive ? colors.success : colors.placeholder },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.statusBannerTitle,
                { color: effectiveActive ? colors.success : colors.subtext },
              ]}
            >
              {effectiveActive
                ? `${t('fe2.location.screen_title')}: ${t(
                    `fe2.location.mode_${settings.sharingMode}` as any
                  )}`
                : t('fe2.location.mode_off')}
            </Text>
            {settings.sharingExpiresAt && effectiveActive && (
              <Text style={styles.expiryDetail}>
                {t('fe2.location.expiry_active_until', {
                  time: new Date(settings.sharingExpiresAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </Text>
            )}
          </View>
          {settings.useApproximateLocation && (
            <View style={styles.approxBadge}>
              <Shield size={12} color={colors.primary} />
              <Text style={[styles.approxBadgeText, { color: colors.primary }]}>~1.1km</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={handleToggleLanguage}
            style={[styles.langPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Globe2 size={12} color={colors.primary} />
            <Text style={[styles.langPillText, { color: colors.text }]}>
              {i18n.language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* === Quyền GPS Hệ điều hành === */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('fe2.location.permission_section')}</Text>
        {permission === 'granted' && (
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.statusText}>{t('fe2.location.granted')}</Text>
          </View>
        )}
        {permission === 'denied' && (
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: colors.danger }]} />
              <Text style={styles.statusText}>{t('fe2.location.denied')}</Text>
            </View>
            <Text style={styles.hint}>{t('fe2.location.denied_hint')}</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleRetry}>
              <Text style={styles.btnTextWhite}>{t('fe2.common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {permission === 'blocked' && (
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
              <Text style={styles.statusText}>{t('fe2.location.blocked')}</Text>
            </View>
            <Text style={styles.hint}>{t('fe2.location.blocked_hint')}</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleOpenSettings}>
              <Text style={styles.btnTextDark}>{t('fe2.location.open_settings')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {permission === 'undetermined' && (
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: colors.placeholder }]} />
              <Text style={styles.statusText}>{t('fe2.location.undetermined')}</Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleRetry}>
              <Text style={styles.btnTextWhite}>{t('fe2.location.grant_permission')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* === Bật / Tắt Chia sẻ Chính === */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('fe2.location.sharing_section')}</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.label}>{t('fe2.location.sharing_toggle_label')}</Text>
            <Text style={styles.sublabel}>{t('fe2.location.sharing_toggle_sub')}</Text>
          </View>
          <Switch
            value={isSharingActive}
            onValueChange={handleMasterToggle}
            disabled={permission !== 'granted'}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* === 4 Chế độ chia sẻ chuẩn Backend === */}
      {isSharingActive && permission === 'granted' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('fe2.location.mode_section')}</Text>
          {SHARING_MODES.map((item) => {
            const IconComponent = item.icon;
            const isSelected = settings.sharingMode === item.mode;
            return (
              <TouchableOpacity
                key={item.mode}
                style={[
                  styles.modeRow,
                  isSelected && {
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: 10,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => handleModeSelect(item.mode)}
              >
                <View
                  style={[
                    styles.radio,
                    isSelected && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
                <View style={styles.modeIconWrapper}>
                  <IconComponent
                    size={18}
                    color={isSelected ? colors.primary : colors.placeholder}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.label, isSelected && { color: colors.primary }]}>
                    {t(item.titleKey as any)}
                  </Text>
                  <Text style={styles.sublabel}>{t(item.subKey as any)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* === Quản lý bạn bè được chọn (chỉ hiện khi mode = selected_friends) === */}
      {isSharingActive && settings.sharingMode === 'selected_friends' && (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>{t('fe2.location.selected_friends_section')}</Text>
            <Text style={styles.badgeCount}>
              {t('fe2.location.selected_count', { count: selectedFriends.length })}
            </Text>
          </View>
          <Text style={styles.sublabel}>{t('fe2.location.selected_friends_desc')}</Text>

          {/* Danh sách bạn bè đã chọn */}
          <View style={styles.friendsList}>
            {selectedFriends.length === 0 ? (
              <Text style={styles.emptyNote}>{t('fe2.location.no_selected_friends')}</Text>
            ) : (
              selectedFriends.map((friend) => (
                <View key={friend.id} style={styles.friendRow}>
                  <Image source={{ uri: friend.avatarUrl }} style={styles.friendAvatar} />
                  <Text style={styles.friendName}>{friend.displayName}</Text>
                  <TouchableOpacity
                    style={styles.removeFriendBtn}
                    onPress={() => handleRemoveFriend(friend.id)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Danh sách bạn bè có thể thêm */}
          {unselectedFriends.length > 0 && (
            <View style={styles.addFriendsSection}>
              <Text style={styles.addSectionTitle}>{t('fe2.location.add_friend')}</Text>
              <View style={styles.unselectedChips}>
                {unselectedFriends.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.addChip}
                    onPress={() => handleAddFriend(f.id)}
                  >
                    <Plus size={14} color={colors.primary} />
                    <Text style={[styles.addChipText, { color: colors.primary }]}>
                      {f.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.autoDowngradeHint}>
            {t('fe2.location.auto_downgrade_note')}
          </Text>
        </View>
      )}

      {/* === Thời hạn chia sẻ (sharingExpiresAt) === */}
      {isSharingActive && settings.sharingMode !== 'off' && (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color={colors.text} />
              <Text style={styles.sectionTitle}>{t('fe2.location.expiry_section')}</Text>
            </View>
          </View>

          <View style={styles.chipsRow}>
            {EXPIRY_OPTIONS.map((opt) => {
              const isSelected = opt.hours === selectedExpiryHours;
              return (
                <TouchableOpacity
                  key={opt.hours}
                  style={[
                    styles.expiryChip,
                    isSelected && {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleSelectExpiry(opt.hours)}
                >
                  <Text
                    style={[
                      styles.expiryChipText,
                      isSelected && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* === Độ chính xác vị trí: Approximate Location === */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Globe2 size={16} color={colors.text} />
              <Text style={styles.sectionTitle}>{t('fe2.location.approx_section')}</Text>
            </View>
            <Text style={[styles.label, { marginTop: 4 }]}>
              {t('fe2.location.approx_label')}
            </Text>
            <Text style={styles.sublabel}>{t('fe2.location.approx_sub')}</Text>
          </View>
          <Switch
            value={settings.useApproximateLocation}
            onValueChange={(val) => {
              setUseApproximateLocation(val);
              showSavedFeedback();
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        {settings.useApproximateLocation && (
          <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight }]}>
            <Shield size={14} color={colors.primary} />
            <Text style={[styles.infoBannerText, { color: colors.primary }]}>
              {t('fe2.location.approx_badge')}
            </Text>
          </View>
        )}
      </View>

      {/* === Cảnh báo độ chính xác GPS thấp === */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.warningLight,
            borderWidth: 1,
            borderColor: colors.warning,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={16} color={colors.warning} />
          <Text style={[styles.sectionTitle, { color: colors.warning }]}>
            {t('fe2.location.accuracy_warn_title')}
          </Text>
        </View>
        <Text style={[styles.hint, { color: colors.warning }]}>
          {t('fe2.location.accuracy_warn_body')}
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (
  c: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors'],
  isDark: boolean
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    toast: {
      position: 'absolute',
      top: 10,
      left: 16,
      right: 16,
      zIndex: 99,
      backgroundColor: c.success,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    toastText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    statusBanner: {
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
    },
    statusBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusDotLarge: { width: 12, height: 12, borderRadius: 6 },
    statusBannerTitle: { fontSize: 14, fontWeight: '700' },
    expiryDetail: { fontSize: 12, color: c.subtext, marginTop: 2 },
    approxBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: c.primaryLight,
    },
    approxBadgeText: { fontSize: 11, fontWeight: '700' },
    langPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      marginLeft: 6,
    },
    langPillText: { fontSize: 11, fontWeight: '700' },
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 16, gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    statusText: { fontSize: 14, color: c.subtext },
    hint: { fontSize: 12, color: c.placeholder, lineHeight: 18 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 14, fontWeight: '600', color: c.text },
    sublabel: { fontSize: 12, color: c.placeholder, marginTop: 2, lineHeight: 17 },
    modeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.divider,
    },
    modeIconWrapper: { marginLeft: 10, marginTop: 2 },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: c.border,
      marginTop: 2,
    },
    badgeCount: { fontSize: 12, fontWeight: '700', color: c.primary },
    friendsList: { gap: 8, marginTop: 4 },
    emptyNote: { fontSize: 12, color: c.placeholder, fontStyle: 'italic', paddingVertical: 4 },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    friendAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.border },
    friendName: { flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '600', color: c.text },
    removeFriendBtn: { padding: 6 },
    addFriendsSection: { marginTop: 6 },
    addSectionTitle: { fontSize: 12, fontWeight: '600', color: c.subtext, marginBottom: 6 },
    unselectedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: c.surfaceAlt,
    },
    addChipText: { fontSize: 12, fontWeight: '600' },
    autoDowngradeHint: { fontSize: 11, color: c.placeholder, marginTop: 4, lineHeight: 16 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    expiryChip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: c.surfaceAlt,
    },
    expiryChipText: { fontSize: 12, color: c.subtext },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 8,
      borderRadius: 8,
      marginTop: 4,
    },
    infoBannerText: { fontSize: 12, fontWeight: '600' },
    btnPrimary: {
      backgroundColor: c.primary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    btnSecondary: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    btnTextWhite: { color: '#fff', fontWeight: '700' },
    btnTextDark: { color: c.text, fontWeight: '700' },
  });
