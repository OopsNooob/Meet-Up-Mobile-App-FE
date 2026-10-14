import type { StyleProp, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  CheckCircle2,
  CircleDot,
  Clock,
  Flag,
  Layers,
  LocateOff,
  Mail,
  MapPinOff,
  Navigation,
  Network,
  PencilLine,
  Radio,
  Target,
  Vote,
  WifiOff,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import type { Tone } from '@/theme';
import type { MeetupMemberStatus, MeetupStatus, RouteStrategy } from '@/types/domain';
import { Badge } from './Badge';

export type StatusKind =
  | 'live'
  | 'stale'
  | 'approximate'
  | 'location_missing'
  | 'offline'
  | 'reconnecting'
  | 'gps_denied'
  | 'gps_off'
  | RouteStrategy
  | `meetup_${MeetupStatus}`
  | `member_${Extract<MeetupMemberStatus, 'invited' | 'accepted' | 'declined'>}`;

const STATUS_CONFIG: Record<StatusKind, { tone: Tone; icon: LucideIcon }> = {
  live: { tone: 'success', icon: Radio },
  stale: { tone: 'warning', icon: Clock },
  approximate: { tone: 'info', icon: CircleDot },
  location_missing: { tone: 'warning', icon: MapPinOff },
  offline: { tone: 'danger', icon: WifiOff },
  reconnecting: { tone: 'warning', icon: Network },
  gps_denied: { tone: 'danger', icon: LocateOff },
  gps_off: { tone: 'warning', icon: LocateOff },

  exact: { tone: 'success', icon: Target },
  batch: { tone: 'info', icon: Layers },
  cluster: { tone: 'purple', icon: Layers },

  meetup_draft: { tone: 'neutral', icon: PencilLine },
  meetup_inviting: { tone: 'info', icon: Mail },
  meetup_choosing: { tone: 'warning', icon: Vote },
  meetup_selected: { tone: 'success', icon: Flag },
  meetup_cancelled: { tone: 'danger', icon: Ban },
  meetup_finished: { tone: 'neutral', icon: CheckCircle2 },

  member_invited: { tone: 'info', icon: Mail },
  member_accepted: { tone: 'success', icon: CheckCircle2 },
  member_declined: { tone: 'danger', icon: XCircle },
};

export interface StatusLabelProps {
  kind: StatusKind;
  detail?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatusLabel({ kind, detail, style }: StatusLabelProps) {
  const { t } = useTranslation();
  const { tone, icon } = STATUS_CONFIG[kind] ?? { tone: 'neutral', icon: Navigation };
  const text = t(`status.${kind}`);
  return <Badge label={detail ? `${text} · ${detail}` : text} tone={tone} icon={icon} style={style} />;
}
