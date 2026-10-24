import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';

type ExplainState = 'loading' | 'success' | 'fallback';

export default function AiExplanationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { placeName } = useLocalSearchParams<{ placeId: string; placeName: string }>();

  const [state, setState] = useState<ExplainState>('loading');
  const [explanation, setExplanation] = useState('');

  const fallbackReasons = useMemo(
    () => [
      t('fe2.ai_explanation.fallback_reason_1'),
      t('fe2.ai_explanation.fallback_reason_2'),
      t('fe2.ai_explanation.fallback_reason_3'),
    ],
    [t]
  );

  const handleClose = useSinglePress(() => router.back(), 500);

  useEffect(() => {
    const shouldFail = Math.random() < 0.3;
    const timer = setTimeout(() => {
      if (shouldFail) {
        setState('fallback');
      } else {
        setExplanation(t('fe2.ai_explanation.mock_text'));
        setState('success');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [t]);

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('fe2.ai_explanation.screen_title')}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.placeholder }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.placeName}>{placeName ?? ''}</Text>

        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          {state === 'loading' && (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.purple} />
              <Text style={styles.loadingText}>{t('fe2.ai_explanation.loading')}</Text>
            </View>
          )}
          {state === 'success' && (
            <View style={{ gap: 10 }}>
              <View style={[styles.aiBadge, { backgroundColor: colors.purpleLight }]}>
                <Text style={[styles.aiBadgeText, { color: colors.purple }]}>{t('fe2.ai_explanation.ai_badge')}</Text>
              </View>
              <Text style={styles.explanationText}>{explanation}</Text>
              <Text style={styles.disclaimer}>{t('fe2.ai_explanation.disclaimer')}</Text>
            </View>
          )}
          {state === 'fallback' && (
            <View style={{ gap: 8 }}>
              <View style={[styles.aiBadge, { backgroundColor: colors.warningLight }]}>
                <Text style={[styles.aiBadgeText, { color: colors.warning }]}>{t('fe2.ai_explanation.fallback_badge')}</Text>
              </View>
              {fallbackReasons.map((reason, i) => (
                <View key={i} style={styles.fallbackItem}>
                  <Text style={[styles.bullet, { color: colors.subtext }]}>•</Text>
                  <Text style={styles.fallbackText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={[styles.okBtn, { backgroundColor: colors.primary }]} onPress={handleClose}>
          <Text style={styles.okBtnText}>{t('fe2.common.understood')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    modal: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { fontSize: 18, fontWeight: '800', color: c.text },
    closeBtn: { padding: 4 },
    closeText: { fontSize: 18 },
    placeName: { fontSize: 13, color: c.placeholder, marginBottom: 16 },
    loadingState: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24, justifyContent: 'center' },
    loadingText: { fontSize: 14, color: c.placeholder },
    aiBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    aiBadgeText: { fontSize: 11, fontWeight: '700' },
    explanationText: { fontSize: 14, color: c.subtext, lineHeight: 22 },
    disclaimer: { fontSize: 11, color: c.placeholder, fontStyle: 'italic', marginTop: 4 },
    fallbackItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    bullet: { fontSize: 16, lineHeight: 22 },
    fallbackText: { flex: 1, fontSize: 14, color: c.subtext, lineHeight: 22 },
    okBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
    okBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
