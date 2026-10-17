import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/common';
import { routes } from '@/constants/routes';

// TODO FE-14: địa điểm yêu thích (không trùng) + dẫn đường.
export default function FavoritesScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      task="FE-14"
      title={t('screens.favorites')}
      links={[{ label: `${t('fe2.place_detail.screen_title')} (p1)`, href: routes.placeDetail('p1') }]}
    />
  );
}