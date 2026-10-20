import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthErrorAlert } from '@/components/auth/AuthErrorAlert';
import { Button, InlineAlert, Screen, TextField } from '@/components/common';
import { routes } from '@/constants/routes';
import { useTheme } from '@/hooks/useTheme';
import { toApiError, USE_MOCK_API, type ApiError } from '@/services/apiClient';
import { MOCK_ACCOUNTS_HINT } from '@/services/mock/mockAuthServer';
import { useAuthStore } from '@/store/useAuthStore';
import { fontSize, fontWeight, spacing } from '@/theme';
import { hasErrors, validateLogin, type FieldErrors } from '@/utils/validation';

type Field = 'email' | 'password';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const lastLogoutReason = useAuthStore((s) => s.lastLogoutReason);
  const lockedReason = useAuthStore((s) => s.lockedReason);
  const clearLogoutReason = useAuthStore((s) => s.clearLogoutReason);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState<'email' | 'google' | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const busy = pending !== null;

  const updateField = (field: Field, value: string) => {
    (field === 'email' ? setEmail : setPassword)(value);
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const run = async (kind: 'email' | 'google', action: () => Promise<unknown>) => {
    setFormError(null);
    clearLogoutReason();
    setPending(kind);
    try {
      // Thành công → Stack.Protected tự chuyển sang (app); giữ trạng thái loading tới khi màn unmount
      if ((await action()) === 'cancelled') setPending(null);
    } catch (err) {
      setFormError(toApiError(err));
      setPending(null);
    }
  };

  const handleLogin = () => {
    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    return run('email', () => loginWithEmail(email.trim(), password));
  };

  const handleGoogle = () => run('google', loginWithGoogle);

  const sessionNotice = formError ? (
    <AuthErrorAlert error={formError} />
  ) : lastLogoutReason === 'locked' ? (
    <AuthErrorAlert error={{ code: 'account_locked', lockedReason: lockedReason ?? undefined }} />
  ) : lastLogoutReason === 'expired' ? (
    <InlineAlert tone="warning" title={t('errors.unauthorized.title')} message={t('errors.unauthorized.description')} />
  ) : null;

  return (
    <Screen scroll keyboardAvoiding edges={['top', 'left', 'right', 'bottom']} contentStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: colors.text }]}>MeetUp</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>{t('auth.login_subtitle')}</Text>
      </View>

      {sessionNotice}

      <View style={styles.form}>
        <TextField
          label={t('auth.email')}
          placeholder={t('auth.email_placeholder')}
          value={email}
          onChangeText={(v) => updateField('email', v)}
          error={fieldErrors.email && t(fieldErrors.email)}
          editable={!busy}
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
          value={password}
          onChangeText={(v) => updateField('password', v)}
          error={fieldErrors.password && t(fieldErrors.password)}
          editable={!busy}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void handleLogin()}
        />
        <Button
          label={t('auth.login')}
          fullWidth
          loading={pending === 'email'}
          disabled={busy}
          onPress={handleLogin}
          testID="login-submit"
        />
      </View>

      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={{ color: colors.placeholder }}>{t('auth.or')}</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      <Button
        label={t('auth.login_google')}
        variant="secondary"
        fullWidth
        loading={pending === 'google'}
        disabled={busy}
        onPress={handleGoogle}
      />
      <Button
        label={t('auth.go_register')}
        variant="ghost"
        fullWidth
        disabled={busy}
        onPress={() => router.push(routes.register)}
      />

      {__DEV__ && USE_MOCK_API && (
        <Text style={[styles.mockHint, { color: colors.placeholder }]}>{`Mock API (FE-01)\n${MOCK_ACCOUNTS_HINT}`}</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  title: { fontSize: fontSize.display, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.md, textAlign: 'center' },
  form: { gap: spacing.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  mockHint: { fontSize: fontSize.xs, textAlign: 'center', lineHeight: fontSize.xs * 1.6 },
});