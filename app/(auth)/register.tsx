import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthErrorAlert } from '@/components/auth/AuthErrorAlert';
import { Button, Screen, TextField } from '@/components/common';
import { routes } from '@/constants/routes';
import { useTheme } from '@/hooks/useTheme';
import { toApiError, type ApiError } from '@/services/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { fontSize, fontWeight, spacing } from '@/theme';
import {
  DISPLAY_NAME_MAX_LENGTH,
  hasErrors,
  PASSWORD_MIN_LENGTH,
  validateRegister,
  type FieldErrors,
} from '@/utils/validation';

type Field = 'displayName' | 'email' | 'password' | 'confirmPassword';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const register = useAuthStore((s) => s.register);

  const [values, setValues] = useState<Record<Field, string>>({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const updateField = (field: Field) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const errorText = (field: Field) => {
    const key = fieldErrors[field];
    return key ? t(key, { min: PASSWORD_MIN_LENGTH, max: DISPLAY_NAME_MAX_LENGTH }) : undefined;
  };

  const handleSubmit = async () => {
    const errors = validateRegister(values);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setFormError(null);
    setSubmitting(true);
    try {
      // Đăng ký thành công = đăng nhập luôn → Stack.Protected chuyển sang (app)
      await register({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
    } catch (err) {
      const error = toApiError(err);
      if (error.code === 'email_exists') {
        setFieldErrors((prev) => ({ ...prev, email: 'validation.email_taken' }));
      } else {
        setFormError(error);
      }
      setSubmitting(false);
    }
  };

  const goToLogin = () => (router.canGoBack() ? router.back() : router.replace(routes.login));

  return (
    <Screen scroll keyboardAvoiding edges={['top', 'left', 'right', 'bottom']} contentStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.register_title')}</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>{t('auth.register_subtitle')}</Text>
      </View>

      {formError && <AuthErrorAlert error={formError} />}

      <View style={styles.form}>
        <TextField
          label={t('auth.display_name')}
          placeholder={t('auth.display_name_placeholder')}
          value={values.displayName}
          onChangeText={updateField('displayName')}
          error={errorText('displayName')}
          editable={!submitting}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={emailRef}
          label={t('auth.email')}
          placeholder={t('auth.email_placeholder')}
          value={values.email}
          onChangeText={updateField('email')}
          error={errorText('email')}
          editable={!submitting}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={passwordRef}
          label={t('auth.password')}
          placeholder={t('auth.password_placeholder')}
          hint={t('auth.password_hint', { min: PASSWORD_MIN_LENGTH })}
          value={values.password}
          onChangeText={updateField('password')}
          error={errorText('password')}
          editable={!submitting}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={confirmRef}
          label={t('auth.confirm_password')}
          placeholder={t('auth.confirm_password_placeholder')}
          value={values.confirmPassword}
          onChangeText={updateField('confirmPassword')}
          error={errorText('confirmPassword')}
          editable={!submitting}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
        />
        <Button label={t('auth.register')} fullWidth loading={submitting} onPress={handleSubmit} testID="register-submit" />
      </View>

      <Button label={t('auth.back_to_login')} variant="ghost" fullWidth disabled={submitting} onPress={goToLogin} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.md, textAlign: 'center' },
  form: { gap: spacing.md },
});