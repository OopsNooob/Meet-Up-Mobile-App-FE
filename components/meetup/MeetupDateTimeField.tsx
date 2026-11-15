import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock } from 'lucide-react-native';
import { Button } from '@/components/common';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, spacing } from '@/theme';
import { formatMeetupDate, formatMeetupTime } from '@/utils/meetup';

export interface MeetupDateTimeFieldProps {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  minimumDate: Date;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

function combine(datePart: Date, timePart: Date): Date {
  const d = new Date(datePart);
  d.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return d;
}

export function MeetupDateTimeField({ label, value, onChange, minimumDate, error, hint, disabled }: MeetupDateTimeFieldProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [openPicker, setOpenPicker] = useState<'date' | 'time' | null>(null);
  const locale = i18n.language;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>

      {Platform.OS === 'ios' ? (
        <View style={styles.row}>
          <DateTimePicker
            value={value}
            mode="datetime"
            display="compact"
            minimumDate={minimumDate}
            disabled={disabled}
            locale={locale === 'vi' ? 'vi_VN' : 'en_US'}
            accentColor={colors.primary}
            onValueChange={(_event, date) => onChange(date)}
          />
        </View>
      ) : (
        <View style={styles.row}>
          <Button
            label={formatMeetupDate(value, locale)}
            icon={CalendarDays}
            variant="secondary"
            disabled={disabled}
            onPress={() => setOpenPicker('date')}
            style={styles.flex}
            testID="meetup-date-button"
          />
          <Button
            label={formatMeetupTime(value, locale)}
            icon={Clock}
            variant="secondary"
            disabled={disabled}
            onPress={() => setOpenPicker('time')}
            testID="meetup-time-button"
          />
        </View>
      )}

      {Platform.OS === 'android' && openPicker && (
        <DateTimePicker
          key={openPicker}
          value={value}
          mode={openPicker}
          presentation="dialog"
          is24Hour
          minimumDate={openPicker === 'date' ? minimumDate : undefined}
          accentColor={colors.primary}
          positiveButton={{ label: t('common.confirm') }}
          negativeButton={{ label: t('common.cancel') }}
          onValueChange={(_event, date) => {
            setOpenPicker(null);
            onChange(openPicker === 'date' ? combine(date, value) : combine(value, date));
          }}
          onDismiss={() => setOpenPicker(null)}
        />
      )}

      {error ? (
        <Text style={[styles.helper, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: colors.placeholder }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, alignSelf: 'stretch' },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  helper: { fontSize: fontSize.xs },
});
