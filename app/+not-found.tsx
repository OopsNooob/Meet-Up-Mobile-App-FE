import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState, Screen } from '@/components/common';
import { routes } from '@/constants/routes';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ErrorState
        error={{ code: 'not_found' }}
        retryLabel={t('common.go_home')}
        onRetry={() => router.replace(routes.tabMap)}
      />
    </Screen>
  );
}