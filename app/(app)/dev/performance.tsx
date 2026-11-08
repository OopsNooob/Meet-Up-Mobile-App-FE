import { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';
import { useRecommendationStore } from '@/store/useRecommendationStore';
import { usePrivacyStore } from '@/store/usePrivacyStore';
import { RecommendationScenarioModal } from '@/components/meetup/RecommendationScenarioModal';
import { routes } from '@/constants/routes';

export default function PerformanceScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [locationUpdates, setLocationUpdates] = useState(12);
  const [renderCount, setRenderCount] = useState(4);
  const [pauseBackgroundGps, setPauseBackgroundGps] = useState(true);
  const [batchUpdates, setBatchUpdates] = useState(true);
  const [resetToast, setResetToast] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scenarioModalVisible, setScenarioModalVisible] = useState(false);

  const {
    resetAllFiltersAndScenarios,
    toggleStaleContextScenario,
    toggleWeatherRelaxedScenario,
    contextStatus,
  } = useRecommendationStore();

  const { setSharingMode, setUseApproximateLocation } = usePrivacyStore();

  useEffect(() => {
    const intervalMs = batchUpdates ? 3000 : 1000;
    const interval = setInterval(() => {
      setLocationUpdates((prev) => prev + 1);
      setRenderCount((prev) => prev + 1);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [batchUpdates]);

  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, 700);

  // Kịch bản 1: Mở gợi ý địa điểm cho buổi hẹn 19:00
  const handleScenario1 = useSinglePress(() => {
    resetAllFiltersAndScenarios();
    router.push(routes.meetupRecommendations('meetup-1'));
  }, 500);

  // Kịch bản 2: Xem thử đổi giờ hẹn & thời tiết mưa tại quán ngoài trời
  const handleScenario2 = useSinglePress(() => {
    resetAllFiltersAndScenarios();
    if (contextStatus !== 'STALE_CONTEXT') {
      toggleStaleContextScenario();
    }
    toggleWeatherRelaxedScenario();
    router.push(routes.meetupRecommendations('meetup-1'));
  }, 500);

  // Kịch bản 3: Mở Bản đồ bạn bè (Chế độ vị trí xấp xỉ ~1.1km)
  const handleScenario3 = useSinglePress(() => {
    setSharingMode('friends');
    setUseApproximateLocation(true);
    router.push(routes.tabMap);
  }, 500);

  // Đặt lại toàn bộ dữ liệu mẫu về mặc định
  const handleResetAll = useSinglePress(() => {
    resetAllFiltersAndScenarios();
    setSharingMode('friends');
    setUseApproximateLocation(false);
    setLocationUpdates(0);
    setRenderCount(1);
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2000);
  }, 500);

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
      {resetToast && (
        <View style={[styles.toast, { backgroundColor: colors.success }]}>
          <CheckCircle2 size={16} color="#fff" />
          <Text style={styles.toastText}>{t('fe2.dev_performance.reset_toast')}</Text>
        </View>
      )}

      <Text style={styles.title}>{t('fe2.dev_performance.screen_title')}</Text>

      {/* Metrics Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('fe2.dev_performance.metrics_title')}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('fe2.dev_performance.render_cycles')}</Text>
          <Text style={styles.value}>{renderCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('fe2.dev_performance.location_updates')}</Text>
          <Text style={styles.value}>{locationUpdates}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('fe2.dev_performance.socket_latency')}</Text>
          <Text style={[styles.value, { color: colors.success }]}>~45ms</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('fe2.dev_performance.memory_usage')}</Text>
          <Text style={styles.value}>42 MB</Text>
        </View>
      </View>

      {/* Battery & Network Optimization Switches */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('fe2.dev_performance.opt_section')}</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { flex: 1, paddingRight: 8 }]}>
            {t('fe2.dev_performance.opt_pause_bg')}
          </Text>
          <Switch
            value={pauseBackgroundGps}
            onValueChange={setPauseBackgroundGps}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { flex: 1, paddingRight: 8 }]}>
            {t('fe2.dev_performance.opt_batch_30s')}
          </Text>
          <Switch
            value={batchUpdates}
            onValueChange={setBatchUpdates}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* Quick Walkthrough Scenarios */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('fe2.dev_performance.tools_title')}</Text>

        <TouchableOpacity style={styles.button} onPress={handleScenario1}>
          <Text style={styles.buttonText}>{t('fe2.dev_performance.start_scenario_1')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.purple }]}
          onPress={handleScenario2}
        >
          <Text style={styles.buttonText}>{t('fe2.dev_performance.start_scenario_2')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.info }]}
          onPress={handleScenario3}
        >
          <Text style={styles.buttonText}>{t('fe2.dev_performance.start_scenario_3')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.purpleLight,
              borderWidth: 1,
              borderColor: colors.purple,
            },
          ]}
          onPress={() => setScenarioModalVisible(true)}
        >
          <Text style={[styles.buttonText, { color: colors.purple }]}>
            {t('fe2.recommendation.qol_modal_title')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surfaceAlt, marginTop: 4 }]}
          onPress={handleResetAll}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {t('fe2.dev_performance.reset_state')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scenario & Viewer Switcher Modal (Centralized in Dev Tools) */}
      <RecommendationScenarioModal
        visible={scenarioModalVisible}
        onClose={() => setScenarioModalVisible(false)}
      />
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 16, paddingBottom: 36 },
    toast: {
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    toastText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      gap: 10,
      elevation: 2,
    },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: c.primary, marginBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    label: { fontSize: 13, color: c.text, lineHeight: 19 },
    value: { fontSize: 14, fontWeight: 'bold', color: c.text },
    button: {
      backgroundColor: c.primary,
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  });
