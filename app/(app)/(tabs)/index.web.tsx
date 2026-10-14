import { useTranslation } from 'react-i18next';
import { MapPinOff } from 'lucide-react-native';
import { EmptyState, Screen } from '@/components/common';

/**
 * Bản web của tab Bản đồ. react-native-maps chỉ chạy trên Android/iOS,
 * nên trên web hiển thị thông báo thay vì crash. Bản mobile: index.tsx (FE-05).
 */
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