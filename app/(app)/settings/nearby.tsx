import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { usePrivacyStore } from '@/store/usePrivacyStore';
import { useSinglePress } from '@/hooks/useSinglePress';
import { NearbySkeleton } from '@/components/common/Skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { NearbyDetectedModal, NearbyFriendItem } from '@/components/settings/NearbyDetectedModal';
import { routes } from '@/constants/routes';

type RadiusOption = 500 | 1000 | 2000 | 5000;
type NearbyState = 'idle' | 'cooldown' | 'detected';

const RADIUS_OPTIONS: RadiusOption[] = [500, 1000, 2000, 5000];
const RADIUS_LABELS: Record<RadiusOption, string> = {
  500: '500 m',
  1000: '1 km',
  2000: '2 km',
  5000: '5 km',
};

const MOCK_NEARBY_FRIENDS: NearbyFriendItem[] = [
  {
    id: 'u2',
    name: 'Huy Tran',
    avatarUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    approxDistance: '~450m',
  },
  {
    id: 'u3',
    name: 'Bao Linh',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    approxDistance: '~800m',
  },
  {
    id: 'u4',
    name: 'Minh Khoa',
    avatarUrl:
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
    approxDistance: '~1.2km',
  },
  {
    id: 'u5',
    name: 'Thu Ha',
    avatarUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    approxDistance: '~1.6km',
  },
  {
    id: 'u6',
    name: 'Quoc Anh',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    approxDistance: '~2.1km',
  },
  {
    id: 'u7',
    name: 'Phuong Thao',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    approxDistance: '~2.8km',
  },
];

export default function NearbyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { settings, setNearbyFeatureEnabled } = usePrivacyStore();
  const optIn = settings.nearbyFeatureEnabled;
  const [radius, setRadius] = useState<RadiusOption>(1000);
  const [nearbyState, setNearbyState] = useState<NearbyState>('detected');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [disableDialogVisible, setDisableDialogVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNearbyState((prev) =>
        prev === 'cooldown' ? 'detected' : prev === 'detected' ? 'idle' : 'cooldown'
      );
      setIsRefreshing(false);
    }, 700);
  }, 800);

  const handleSelectRadius = useSinglePress((r: RadiusOption) => {
    setRadius(r);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 400);
  }, 300);

  const handleCreateMeetup = useSinglePress(() => router.push(routes.meetupCreate), 600);
  const handleOpenDetectedModal = useSinglePress(() => setModalVisible(true), 400);

  const handleOptInToggle = (value: boolean) => {
    if (!value) {
      setDisableDialogVisible(true);
    } else {
      setNearbyFeatureEnabled(true);
    }
  };

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
      {isLoading ? (
        <NearbySkeleton />
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('fe2.nearby.intro_title')}</Text>
            <Text style={styles.cardDesc}>{t('fe2.nearby.intro_desc')}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.label}>{t('fe2.nearby.opt_in_label')}</Text>
                <Text style={styles.sublabel}>{t('fe2.nearby.opt_in_sub')}</Text>
              </View>
              <Switch
                value={optIn}
                onValueChange={handleOptInToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </View>

          {optIn && (
            <View style={styles.card}>
              <Text style={styles.label}>{t('fe2.nearby.radius_section')}</Text>
              <View style={styles.radiusOptions}>
                {RADIUS_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.radiusChip,
                      radius === r && {
                        backgroundColor: colors.primaryLight,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => handleSelectRadius(r)}
                  >
                    <Text
                      style={[
                        styles.radiusText,
                        radius === r && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {RADIUS_LABELS[r]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 10 }]}>
                {t('fe2.nearby.state_selector_label')}
              </Text>
              <View style={styles.radiusOptions}>
                {(['idle', 'cooldown', 'detected'] as NearbyState[]).map((st) => {
                  const active = nearbyState === st;
                  const labelKey =
                    st === 'idle'
                      ? 'fe2.nearby.state_chip_idle'
                      : st === 'cooldown'
                        ? 'fe2.nearby.state_chip_cooldown'
                        : 'fe2.nearby.state_chip_detected';
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.radiusChip,
                        active && {
                          backgroundColor: colors.purpleLight,
                          borderColor: colors.purple,
                        },
                      ]}
                      onPress={() => setNearbyState(st)}
                    >
                      <Text
                        style={[
                          styles.radiusText,
                          active && { color: colors.purple, fontWeight: '700' },
                        ]}
                      >
                        {t(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {optIn && nearbyState === 'cooldown' && (
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
              <Text style={[styles.label, { color: colors.warning }]}>
                {t('fe2.nearby.cooldown_title')}
              </Text>
              <Text style={[styles.sublabel, { color: colors.warning }]}>
                {t('fe2.nearby.cooldown_desc', { time: t('fe2.nearby.cooldown_sample') })}
              </Text>
            </View>
          )}

          {optIn && nearbyState === 'detected' && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.successLight,
                  borderWidth: 1,
                  borderColor: colors.success,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.success }]}>
                {t('fe2.nearby.detected_title')}
              </Text>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.success }]}
                onPress={handleOpenDetectedModal}
              >
                <Text style={styles.createBtnText}>{t('fe2.nearby.create_meetup')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {optIn && nearbyState === 'idle' && (
            <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.sublabel, { textAlign: 'center', paddingVertical: 8 }]}>
                {t('fe2.nearby.idle_text', { radius: RADIUS_LABELS[radius] })}
              </Text>
            </View>
          )}

          <Text style={styles.privacyNote}>{t('fe2.nearby.privacy_note')}</Text>
        </>
      )}

      {/* Disable Confirmation Dialog */}
      <ConfirmDialog
        visible={disableDialogVisible}
        title={t('fe2.nearby.disable_title')}
        message={t('fe2.nearby.disable_body')}
        confirmLabel={t('fe2.nearby.disable_confirm')}
        cancelLabel={t('fe2.nearby.cancel')}
        tone="danger"
        onConfirm={() => {
          setDisableDialogVisible(false);
          setNearbyFeatureEnabled(false);
        }}
        onCancel={() => setDisableDialogVisible(false)}
      />

      {/* Nearby Friends Detected Modal (with Lazy Loading & Pull-to-Refresh) */}
      <NearbyDetectedModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        friends={MOCK_NEARBY_FRIENDS}
        onInviteMeetup={() => {
          setModalVisible(false);
          handleCreateMeetup();
        }}
      />
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 12, paddingBottom: 32 },
    card: { backgroundColor: c.surface, borderRadius: 14, padding: 16, gap: 8 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    cardDesc: { fontSize: 13, color: c.subtext, lineHeight: 20 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 14, fontWeight: '600', color: c.text },
    sublabel: { fontSize: 12, color: c.placeholder, marginTop: 2 },
    radiusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    radiusChip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: c.surfaceAlt,
    },
    radiusText: { fontSize: 12, color: c.subtext },
    createBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 6 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    privacyNote: {
      fontSize: 11,
      color: c.placeholder,
      lineHeight: 18,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
  });
