import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { usePrivacyStore } from '../../store/usePrivacyStore';
import { useSinglePress } from '../../hooks/useSinglePress';
import { NearbySkeleton } from '../../components/common/Skeleton';

type RadiusOption = 500 | 1000 | 2000 | 5000;
type NearbyState = 'idle' | 'cooldown' | 'detected';

const RADIUS_OPTIONS: RadiusOption[] = [500, 1000, 2000, 5000];
const RADIUS_LABELS: Record<RadiusOption, string> = { 500: '500 m', 1000: '1 km', 2000: '2 km', 5000: '5 km' };
const MOCK_STATE: NearbyState = 'cooldown';
const MOCK_COOLDOWN = '1 giờ 23 phút';

export default function NearbyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { settings, setNearbyFeatureEnabled } = usePrivacyStore();
  const optIn = settings.nearbyFeatureEnabled;
  const [radius, setRadius] = useState<RadiusOption>(1000);
  const [nearbyState, setNearbyState] = useState<NearbyState>(MOCK_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNearbyState((prev) => (prev === 'cooldown' ? 'detected' : 'idle'));
      setIsRefreshing(false);
    }, 1000);
  }, 1000);

  const handleSelectRadius = useSinglePress((r: RadiusOption) => setRadius(r), 300);
  const handleCreateMeetup = useSinglePress(() => router.push('/(tabs)/meetups' as any), 600);

  const handleOptInToggle = (value: boolean) => {
    if (!value) {
      Alert.alert(
        t('fe2.nearby.disable_title'),
        t('fe2.nearby.disable_body'),
        [
          { text: t('fe2.nearby.cancel'), style: 'cancel' },
          {
            text: t('fe2.nearby.disable_confirm'),
            style: 'destructive',
            onPress: () => setNearbyFeatureEnabled(false),
          },
        ]
      );
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
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('fe2.nearby.opt_in_label')}</Text>
            <Text style={styles.sublabel}>{t('fe2.nearby.opt_in_sub')}</Text>
          </View>
          <Switch value={optIn} onValueChange={handleOptInToggle} />
        </View>
      </View>

      {optIn && (
        <View style={styles.card}>
          <Text style={styles.label}>{t('fe2.nearby.radius_section')}</Text>
          <View style={styles.radiusOptions}>
            {RADIUS_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, radius === r && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => handleSelectRadius(r)}
              >
                <Text style={[styles.radiusText, radius === r && { color: colors.primary, fontWeight: '700' }]}>
                  {RADIUS_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {optIn && nearbyState === 'cooldown' && (
        <View style={[styles.card, { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning }]}>
          <Text style={[styles.label, { color: colors.warning }]}>{t('fe2.nearby.cooldown_title')}</Text>
          <Text style={[styles.sublabel, { color: colors.warning }]}>
            {t('fe2.nearby.cooldown_desc', { time: MOCK_COOLDOWN })}
          </Text>
        </View>
      )}

      {optIn && nearbyState === 'detected' && (
        <View style={[styles.card, { backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.success }]}>
          <Text style={[styles.label, { color: colors.success }]}>{t('fe2.nearby.detected_title')}</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.success }]}
            onPress={handleCreateMeetup}
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
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors']) =>
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
    radiusChip: { borderWidth: 1, borderColor: c.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    radiusText: { fontSize: 13, color: c.subtext },
    createBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    privacyNote: { fontSize: 11, color: c.placeholder, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
  });
