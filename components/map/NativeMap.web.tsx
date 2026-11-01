import { Component, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { MapPinOff } from 'lucide-react-native';
import { EmptyState } from '@/components/common';
import i18n from '@/locales/i18n';

// Bản web của NativeMap.tsx: react-native-maps không hỗ trợ web → hiện thông báo thay cho bản đồ.

export const PROVIDER_GOOGLE = 'google';

export function Marker(_props: { children?: ReactNode }) {
  return null;
}

export default class MapView extends Component<{ style?: StyleProp<ViewStyle>; children?: ReactNode }> {
  animateToRegion() {}
  fitToCoordinates() {}

  render() {
    return (
      <EmptyState
        icon={MapPinOff}
        title={i18n.t('map_web.title')}
        description={i18n.t('map_web.description')}
        style={this.props.style}
      />
    );
  }
}
