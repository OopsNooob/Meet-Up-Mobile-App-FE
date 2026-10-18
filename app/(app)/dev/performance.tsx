import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMemo, useState, useEffect } from 'react';

export default function PerformanceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [locationUpdates, setLocationUpdates] = useState(0);
  const [renderCount, setRenderCount] = useState(1);

  // Giả lập nhận location updates liên tục để test hiệu năng
  useEffect(() => {
    const interval = setInterval(() => {
      setLocationUpdates((prev) => prev + 1);
      setRenderCount((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mobile Performance & Demo (FE-20)</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Metrics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Render Cycles:</Text>
          <Text style={styles.value}>{renderCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location Updates/s:</Text>
          <Text style={styles.value}>{locationUpdates}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Socket Latency:</Text>
          <Text style={[styles.value, { color: colors.success }]}>~45ms</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Memory Usage (JS):</Text>
          <Text style={styles.value}>42 MB</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Demo Tools</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Khởi động kịch bản Demo 1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.surfaceAlt, marginTop: 8 }]}>
          <Text style={[styles.buttonText, { color: colors.text }]}>Reset trạng thái</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 16 },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text, marginBottom: 8 },
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, gap: 8, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: c.primary, marginBottom: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    label: { fontSize: 14, color: c.text },
    value: { fontSize: 14, fontWeight: 'bold', color: c.text },
    button: { backgroundColor: c.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold' }
  });
