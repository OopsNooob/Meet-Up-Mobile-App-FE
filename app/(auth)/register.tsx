import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, PlaceholderScreen } from '@/components/common';

// TODO FE-01: form đăng ký tài khoản.
export default function RegisterScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen task="FE-01" title={t('auth.register')} edges={['top', 'left', 'right', 'bottom']}>
      <Button label={t('auth.back_to_login')} variant="secondary" fullWidth onPress={() => router.back()} />
    </PlaceholderScreen>
  );
}