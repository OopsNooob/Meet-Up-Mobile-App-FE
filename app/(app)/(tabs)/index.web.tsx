import { useTranslation } from 'react-i18next';
import { MapPinOff } from 'lucide-react-native';
import { EmptyState, Screen } from '@/components/common';

export default function MapTabWeb() {
  const { t } = useTranslation();
  return (
    <Screen edges={['left', 'right']}>
      <EmptyState
        icon={MapPinOff}
        title={t('map_web.title')}
        description={t('map_web.description')}
      />
    </Screen>
  );
}