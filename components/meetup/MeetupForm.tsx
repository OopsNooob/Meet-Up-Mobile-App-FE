import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert, Screen, TextField } from '@/components/common';
import {
  DEFAULT_MEETUP_PLACE_TYPES,
  earliestScheduleTime,
  MEETUP_MIN_LEAD_MINUTES,
  MEETUP_RADIUS_OPTIONS_M,
  MEETUP_TITLE_MAX_LENGTH,
} from '@/constants/meetup';
import { useTheme } from '@/hooks/useTheme';
import { meetupService, toMeetupError } from '@/services/meetupService';
import { fontSize, fontWeight, spacing } from '@/theme';
import type { MeetupFormValues } from '@/types/meetup';
import { formatRadius, getMeetupErrorMessage } from '@/utils/meetup';
import { hasErrors, validateMeetupForm, type FieldErrors, type MeetupFormField } from '@/utils/validation';
import { MeetupDateTimeField } from './MeetupDateTimeField';
import { MemberPicker } from './MemberPicker';
import { OptionChips } from './OptionChips';

export interface MeetupFormProps {
  initialValues: MeetupFormValues;
  submitLabel: string;
  onSubmit: (values: MeetupFormValues) => Promise<void>;
  mode: 'create' | 'edit';
  header?: ReactNode;
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && new Set([...a, ...b]).size === a.length;

function isDirty(a: MeetupFormValues, b: MeetupFormValues) {
  return (
    a.title.trim() !== b.title.trim() ||
    a.scheduledAt.getTime() !== b.scheduledAt.getTime() ||
    a.placeType !== b.placeType ||
    a.searchRadiusM !== b.searchRadiusM ||
    !sameIds(a.inviteeIds, b.inviteeIds)
  );
}

export function MeetupForm({ initialValues, submitLabel, onSubmit, mode, header }: MeetupFormProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [values, setValues] = useState<MeetupFormValues>(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors<MeetupFormField>>({});
  const submittingRef = useRef(false);
  const [placeTypes, setPlaceTypes] = useState<string[]>([...DEFAULT_MEETUP_PLACE_TYPES]);
  const locale = i18n.language;

  useEffect(() => {
    let alive = true;
    meetupService
      .getPlaceTypes()
      .then((types) => alive && types.length > 0 && setPlaceTypes(types))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const placeTypeOptions = useMemo(
    () => (initialValues.placeType && !placeTypes.includes(initialValues.placeType) ? [...placeTypes, initialValues.placeType] : placeTypes),
    [placeTypes, initialValues.placeType],
  );

  const validate = (v: MeetupFormValues) => {
    const errors = validateMeetupForm(v, { minScheduledAt: earliestScheduleTime(), titleMaxLength: MEETUP_TITLE_MAX_LENGTH });
    if (mode === 'edit' && v.scheduledAt.getTime() === initialValues.scheduledAt.getTime()) errors.scheduledAt = undefined;
    return errors;
  };

  const clientErrors = submitted ? validate(values) : {};
  const fieldError = (field: MeetupFormField) => {
    const key = clientErrors[field] ?? serverFieldErrors[field];
    return key ? t(key, { max: MEETUP_TITLE_MAX_LENGTH, minutes: MEETUP_MIN_LEAD_MINUTES }) : undefined;
  };

  const update = <K extends keyof MeetupFormValues>(key: K, value: MeetupFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setServerFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitError(null);
  };

  const dirty = isDirty(values, initialValues);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    setSubmitted(true);
    setSubmitError(null);
    if (hasErrors(validate(values))) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      const error = toMeetupError(err);
      if (error.meetupCode === 'invalid_schedule') {
        setServerFieldErrors({ scheduledAt: 'validation.meetup_time_too_soon' });
      } else {
        setSubmitError(getMeetupErrorMessage(t, error));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Screen
      scroll
      keyboardAvoiding
      footer={
        <Button
          label={submitLabel}
          fullWidth
          loading={submitting}
          disabled={mode === 'edit' && !dirty}
          onPress={handleSubmit}
          testID="meetup-submit"
        />
      }
    >
      {header}

      <TextField
        label={t('meetup.form.title')}
        placeholder={t('meetup.form.title_placeholder')}
        value={values.title}
        onChangeText={(text) => update('title', text)}
        maxLength={MEETUP_TITLE_MAX_LENGTH}
        error={fieldError('title')}
        editable={!submitting}
        returnKeyType="done"
        testID="meetup-title"
      />

      <MeetupDateTimeField
        label={t('meetup.form.scheduled_at')}
        value={values.scheduledAt}
        onChange={(date) => update('scheduledAt', date)}
        minimumDate={new Date()}
        error={fieldError('scheduledAt')}
        hint={t('meetup.form.scheduled_at_hint', { minutes: MEETUP_MIN_LEAD_MINUTES })}
        disabled={submitting}
      />

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.subtext }]}>{t('meetup.form.place_type')}</Text>
        <OptionChips
          options={placeTypeOptions}
          value={values.placeType}
          onChange={(v) => update('placeType', v)}
          getLabel={(code) => t(`meetup.place_types.${code}`, { defaultValue: code })}
          disabled={submitting}
          label={t('meetup.form.place_type')}
        />
        {fieldError('placeType') && <Text style={[styles.error, { color: colors.danger }]}>{fieldError('placeType')}</Text>}
      </View>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.subtext }]}>{t('meetup.form.radius')}</Text>
          <Text style={[styles.value, { color: colors.primary }]}>{formatRadius(values.searchRadiusM, locale)}</Text>
        </View>
        <OptionChips
          options={MEETUP_RADIUS_OPTIONS_M}
          value={values.searchRadiusM as (typeof MEETUP_RADIUS_OPTIONS_M)[number]}
          onChange={(v) => update('searchRadiusM', v)}
          getLabel={(m) => formatRadius(m, locale)}
          disabled={submitting}
          label={t('meetup.form.radius')}
        />
        <Text style={[styles.hint, { color: colors.placeholder }]}>{t('meetup.form.radius_hint')}</Text>
        {fieldError('searchRadiusM') && <Text style={[styles.error, { color: colors.danger }]}>{fieldError('searchRadiusM')}</Text>}
      </View>

      <MemberPicker
        selectedIds={values.inviteeIds}
        onChange={(ids) => update('inviteeIds', ids)}
        error={fieldError('inviteeIds')}
        disabled={submitting}
      />

      {submitted && hasErrors(clientErrors) && (
        <InlineAlert tone="warning" title={t('meetup.form.fix_errors')} />
      )}
      {submitError && <InlineAlert tone="danger" title={t('meetup.form.submit_failed')} message={submitError} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm, alignSelf: 'stretch' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  hint: { fontSize: fontSize.xs },
  error: { fontSize: fontSize.xs },
});
