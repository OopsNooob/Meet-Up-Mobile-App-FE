/**
 * Recommendation Contracts & Mock UI Types (FE-22 → FE-27)
 * Đồng bộ cấu trúc dữ liệu với Backend (BE-24, BE-28, BE-29, BE-30, BE-31, BE-32)
 * Chú ý: Chỉ phục vụ Mock UI và Local State, không gắn gọi API thật.
 */

export type OpeningFilterMode = 'ANY' | 'OPEN_AT_REQUEST_TIME' | 'OPEN_AT_SCHEDULED_TIME';

export type ScheduledOpeningStatus = 'OPEN' | 'CLOSED' | 'UNKNOWN';

export type ClosingStatus = 'OK' | 'CLOSING_SOON' | 'UNKNOWN';

export type TravelMode = 'TWO_WHEELER' | 'DRIVE';

export type RoutingPreference = 'TRAFFIC_AWARE' | 'TRAFFIC_UNAWARE';

export type WeatherPolicy = 'OFF' | 'WARN_ONLY' | 'FILTER_OUTDOOR';

export type OutdoorExposure = 'INDOOR' | 'OUTDOOR' | 'UNKNOWN';

export type RecommendationContextStatus = 'CURRENT_CONTEXT' | 'STALE_CONTEXT';

export type ScaleLabel = 'exact' | 'batch' | 'cluster';

export type RecommendationWarningCode =
  | 'OPENING_STATUS_UNKNOWN'
  | 'OPENING_FROM_REGULAR_HOURS'
  | 'CLOSING_SOON_AT_MEETUP_TIME'
  | 'TRAFFIC_DATA_UNAVAILABLE'
  | 'WEATHER_DATA_UNAVAILABLE'
  | 'WEATHER_OUT_OF_RANGE'
  | 'WEATHER_FILTER_RELAXED'
  | 'BAD_WEATHER_OUTDOOR'
  | 'FEWER_CANDIDATES_THAN_REQUESTED';

export interface PlaceOpeningInfo {
  /** Trạng thái mở cửa tại thời điểm truy vấn hiện tại */
  openNow: boolean | null;
  /** Trạng thái mở cửa tại giờ hẹn (scheduledAt) — FE-23 */
  statusAtScheduled: ScheduledOpeningStatus;
  /** Nguồn dữ liệu giờ mở cửa từ Google Places */
  source: 'CURRENT' | 'REGULAR' | 'NONE';
  /** Cờ báo hiệu fallback về giờ mở thường lệ trong tuần */
  fallbackToRegularHours: boolean;
  /** Trạng thái sắp đóng cửa sau giờ hẹn — FE-26 */
  closingStatus: ClosingStatus;
  /** Thời điểm đóng cửa tiếp theo sau giờ hẹn (ISO hoặc HH:mm) */
  nextClosingAt: string | null;
  /** Số giây còn lại từ giờ hẹn đến lúc quán đóng cửa */
  secondsUntilClose: number | null;
  /** Khung giờ mở cửa hiển thị (song ngữ) */
  hoursVi: string[];
  hoursEn: string[];
}

export interface PlaceWeatherSummary {
  /** Phân loại không gian địa điểm — FE-25 */
  outdoorExposure: OutdoorExposure;
  /** Trạng thái dữ liệu thời tiết tại giờ hẹn */
  dataStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'OUT_OF_RANGE';
  conditionCode: 'CLEAR' | 'CLOUDY' | 'LIGHT_RAIN' | 'HEAVY_RAIN' | 'THUNDERSTORM';
  temperatureCelsius: number | null;
  precipitationProbabilityPct: number | null;
  windSpeedKmh: number | null;
  hasWeatherWarning: boolean;
  warningCode?: 'BAD_WEATHER_OUTDOOR';
}

export interface MemberEtaItem {
  participantId: string;
  name: string;
  /** Thời gian di chuyển tính bằng giây (tự động quy đổi ra phút trên UI) */
  etaSeconds: number;
  /** Thời gian di chuyển tĩnh khi không tính kẹt xe (giây) */
  staticDurationSeconds: number;
  distanceMeters: number;
  travelMode: TravelMode;
  routeStatus: 'OK';
}

export interface MatchedTagItem {
  tagCode: 'coffee' | 'food' | 'movie' | 'mall' | 'park' | 'entertainment' | 'quiet' | 'parking';
  level: 'high' | 'normal' | 'avoid';
  weight: number;
}

/**
 * Dữ liệu cá nhân hóa chỉ trả về cho riêng người đang xem (Viewer-aware Projection — FE-27 / BE-32).
 * Tuyệt đối không phơi bày dữ liệu này của thành viên khác.
 */
export interface ViewerFeature {
  participantId: string;
  etaSeconds: number;
  staticDurationSeconds: number;
  distanceMeters: number;
  travelMode: TravelMode;
  matchedTags: MatchedTagItem[];
  travelUtility: number;
  preferenceUtility: number;
  placeQualityUtility: number;
  memberUtility: number;
}

export type RecommendationExplanationUnit =
  | 'SECOND'
  | 'METER'
  | 'UTILITY_0_1'
  | 'PROBABILITY_0_1'
  | 'COUNT';

export type RecommendationExplanationSource = 'ROUTES' | 'PLACES' | 'WEATHER' | 'ENGINE';

export interface RecommendationExplanationFact {
  key: string;
  value: string | number;
  unit?: RecommendationExplanationUnit;
  source: RecommendationExplanationSource;
}

export interface RecommendationExplanation {
  summaryCode: 'FAIR_PARETO_RANKED' | 'MIN_SUM_RANKED' | 'MIN_MAX_RANKED';
  facts: RecommendationExplanationFact[];
  warnings: RecommendationWarningCode[];
  aiSummaryVi: string;
  aiSummaryEn: string;
}

export interface RecommendationPlaceItem {
  placeId: string;
  canonicalCandidateKey: string;
  providerPlaceId: string;
  rank: number;
  name: string;
  address: string;
  categories: string[];
  rating: number | null;
  userRatingCount: number | null;
  scaleLabel: ScaleLabel;
  lat: number;
  lng: number;
  /** Trung bình ETA của nhóm (giây) */
  avgEtaSeconds: number;
  /** ETA lâu nhất trong nhóm (giây) */
  maxEtaSeconds: number;
  etaRangeSeconds: number;
  paretoLevel: number;
  inclusionProbability: number | null;
  opening: PlaceOpeningInfo;
  weather: PlaceWeatherSummary;
  /** Danh sách ETA của từng thành viên (hiển thị công khai cho nhóm) */
  memberEtas: MemberEtaItem[];
  /**
   * Bản đồ ViewerFeature theo từng thành viên trong Mock Store để khi chuyển đổi
   * góc nhìn người xem (Viewer Switcher) thì UI chỉ trích xuất đúng `viewerFeaturesByMember[currentViewerId]`.
   */
  viewerFeaturesByMember: Record<string, ViewerFeature>;
  explanation: RecommendationExplanation;
}

export type FeedbackActionType =
  | 'RecommendationShown'
  | 'PlaceVoted'
  | 'VoteChanged'
  | 'MeetupPlaceSelected'
  | 'NavigationOpened'
  | 'FavoriteAdded';

export interface FeedbackLogEntry {
  eventId: string;
  runId: string;
  participantId: string;
  actionType: FeedbackActionType;
  canonicalCandidateKey?: string;
  rank?: number;
  itemCount?: number;
  timestamp: string;
  status: 'RECORDED_OK' | 'SILENT_RETRY_QUEUED' | 'DEDUP_SKIPPED';
}

