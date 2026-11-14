import { create } from 'zustand';
import i18n from '@/locales/i18n';
import type { AppError } from '@/types/async';
import { recommendationService } from '@/services/recommendationService';
import type {
  MeetupDetailResponse,
  RecommendationFeedbackEventType,
  RecommendationResultResponse,
  RecommendationRunResponse,
  ReplayRecommendationRunResponse,
} from '@/types/api';
import { generateUuidV4 } from '@/utils/uuid';
import type {
  FeedbackActionType,
  FeedbackLogEntry,
  OpeningFilterMode,
  RecommendationContextStatus,
  RecommendationExplanationFact,
  RecommendationPlaceItem,
  RecommendationWarningCode,
  RoutingPreference,
  TravelMode,
  ViewerFeature,
  WeatherPolicy,
} from '@/types/recommendation';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapApiResultToPlaceItem(
  result: RecommendationResultResponse,
  meetup: MeetupDetailResponse,
  viewerUserId: string
): RecommendationPlaceItem {
  const warnings = (result.explanation.warnings ?? []) as RecommendationWarningCode[];
  const facts = (result.explanation.facts ?? []) as RecommendationExplanationFact[];
  const placeId = result.recommendationPlaceId ?? result.candidate.providerPlaceId;

  const probFact = facts.find((f) => f.unit === 'PROBABILITY_0_1' && typeof f.value === 'number');
  const openEv = result.openingEvidence ?? {};
  const closeEv = result.closingEvidence ?? {};

  const memberEtas = result.memberEtas.map((m) => ({
    participantId: m.participantId,
    name:
      m.participantId === viewerUserId
        ? i18n.t('fe2.common.you')
        : `#${m.participantId.slice(0, 6)}`,
    etaSeconds: m.etaSeconds,
    staticDurationSeconds: m.etaSeconds,
    distanceMeters: 0,
    travelMode: 'TWO_WHEELER' as TravelMode,
    routeStatus: 'OK' as const,
  }));

  const viewerEta =
    result.viewerFeature && memberEtas.find((m) => m.participantId === result.viewerFeature?.participantId);
  const viewerParticipantId = result.viewerFeature?.participantId ?? viewerUserId;
  const viewerFeature: ViewerFeature = {
    participantId: viewerParticipantId,
    etaSeconds: viewerEta ? viewerEta.etaSeconds : result.avgEtaSeconds,
    staticDurationSeconds: viewerEta ? viewerEta.staticDurationSeconds : result.avgEtaSeconds,
    distanceMeters: 0,
    travelMode: 'TWO_WHEELER',
    matchedTags: [],
    travelUtility: result.viewerFeature?.travelUtility ?? 0,
    preferenceUtility: result.viewerFeature?.preferenceUtility ?? 0,
    placeQualityUtility: result.viewerFeature?.placeQualityUtility ?? 0,
    memberUtility: result.viewerFeature?.memberUtility ?? 0,
  };

  const summaryCode =
    result.explanation.summaryCode === 'MIN_SUM_RANKED' ||
    result.explanation.summaryCode === 'MIN_MAX_RANKED'
      ? result.explanation.summaryCode
      : 'FAIR_PARETO_RANKED';

  return {
    placeId,
    canonicalCandidateKey: result.candidate.canonicalCandidateKey,
    providerPlaceId: result.candidate.providerPlaceId,
    rank: result.rank,
    name: result.candidate.name,
    address: result.candidate.formattedAddress ?? '',
    categories: result.candidate.categories ?? [meetup.placeType || 'cafe'],
    rating: result.candidate.rating0To5 ?? null,
    userRatingCount: result.candidate.userRatingCount ?? null,
    scaleLabel: 'exact',
    lat: result.candidate.latitude ?? 10.7769,
    lng: result.candidate.longitude ?? 106.7009,
    avgEtaSeconds: result.avgEtaSeconds,
    maxEtaSeconds: result.maxEtaSeconds,
    etaRangeSeconds: result.etaRangeSeconds,
    paretoLevel: 1,
    inclusionProbability: typeof probFact?.value === 'number' ? probFact.value : null,
    voteCount: result.voteCount ?? 0,
    opening: {
      openNow: typeof openEv.openNow === 'boolean' ? openEv.openNow : null,
      statusAtScheduled: result.scheduledOpeningStatus ?? 'UNKNOWN',
      source: warnings.includes('OPENING_FROM_REGULAR_HOURS') ? 'REGULAR' : 'CURRENT',
      fallbackToRegularHours: warnings.includes('OPENING_FROM_REGULAR_HOURS'),
      closingStatus: warnings.includes('CLOSING_SOON_AT_MEETUP_TIME')
        ? 'CLOSING_SOON'
        : typeof closeEv.secondsUntilClose === 'number'
          ? 'OK'
          : 'UNKNOWN',
      nextClosingAt: typeof closeEv.nextClosingAt === 'string' ? closeEv.nextClosingAt : null,
      secondsUntilClose:
        typeof closeEv.secondsUntilClose === 'number' ? closeEv.secondsUntilClose : null,
      hoursKeys: [],
    },
    weather: {
      outdoorExposure: 'UNKNOWN',
      dataStatus: warnings.includes('WEATHER_DATA_UNAVAILABLE')
        ? 'UNAVAILABLE'
        : warnings.includes('WEATHER_OUT_OF_RANGE')
          ? 'OUT_OF_RANGE'
          : 'AVAILABLE',
      conditionCode: 'CLEAR',
      temperatureCelsius: null,
      precipitationProbabilityPct: null,
      windSpeedKmh: null,
      hasWeatherWarning: warnings.includes('BAD_WEATHER_OUTDOOR'),
      ...(warnings.includes('BAD_WEATHER_OUTDOOR')
        ? { warningCode: 'BAD_WEATHER_OUTDOOR' as const }
        : {}),
    },
    memberEtas,
    viewerFeaturesByMember: {
      [viewerParticipantId]: viewerFeature,
      u1: viewerFeature,
    },
    explanation: {
      summaryCode,
      facts,
      warnings,
      aiSummaryKey: '',
    },
  };
}

export type SortOption = 'rank' | 'avgEta' | 'maxEta' | 'rating';

export interface MeetupMemberProfile {
  participantId: string;
  name: string;
  lat: number;
  lng: number;
  isOrganizer?: boolean;
}

export const MOCK_MEETUP_MEMBERS: MeetupMemberProfile[] = [
  { participantId: 'u1', name: 'Bạn', lat: 10.7712, lng: 106.6975, isOrganizer: true },
  { participantId: 'u2', name: 'Việt', lat: 10.7801, lng: 106.7062 },
  { participantId: 'u3', name: 'Minh', lat: 10.7758, lng: 106.6921 },
];

export const MISSING_LOCATION_MEMBER = 'Lan';

const INITIAL_PLACES: RecommendationPlaceItem[] = [
  {
    placeId: 'p1',
    canonicalCandidateKey: 'google:ChIJ_p1_coffee_house_nguyen_hue',
    providerPlaceId: 'ChIJ_p1_coffee_house_nguyen_hue',
    rank: 1,
    name: 'The Coffee House - Nguyễn Huệ',
    address: '86 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
    categories: ['coffee', 'food'],
    rating: 4.5,
    userRatingCount: 1420,
    scaleLabel: 'exact',
    lat: 10.7745,
    lng: 106.7032,
    avgEtaSeconds: 720, // 12 phút
    maxEtaSeconds: 1080, // 18 phút
    etaRangeSeconds: 600,
    paretoLevel: 1,
    inclusionProbability: 0.94,
    voteCount: 2,
    opening: {
      openNow: true,
      statusAtScheduled: 'OPEN',
      source: 'CURRENT',
      fallbackToRegularHours: false,
      closingStatus: 'OK',
      nextClosingAt: '22:30',
      secondsUntilClose: 12600, // 3h30p sau giờ hẹn 19:00
      hoursKeys: ['fe2.recommendation_data.p1_hours_1', 'fe2.recommendation_data.p1_hours_2'],
    },
    weather: {
      outdoorExposure: 'INDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'LIGHT_RAIN',
      temperatureCelsius: 27,
      precipitationProbabilityPct: 65,
      windSpeedKmh: 14,
      hasWeatherWarning: false,
    },
    memberEtas: [
      {
        participantId: 'u1',
        name: 'Bạn',
        etaSeconds: 600,
        staticDurationSeconds: 480,
        distanceMeters: 2800,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u2',
        name: 'Việt',
        etaSeconds: 1080,
        staticDurationSeconds: 840,
        distanceMeters: 5100,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u3',
        name: 'Minh',
        etaSeconds: 480,
        staticDurationSeconds: 420,
        distanceMeters: 2300,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
    ],
    viewerFeaturesByMember: {
      u1: {
        participantId: 'u1',
        etaSeconds: 600,
        staticDurationSeconds: 480,
        distanceMeters: 2800,
        travelMode: 'TWO_WHEELER',
        matchedTags: [
          { tagCode: 'coffee', level: 'high', weight: 1.0 },
          { tagCode: 'quiet', level: 'normal', weight: 0.6 },
        ],
        travelUtility: 0.89,
        preferenceUtility: 0.95,
        placeQualityUtility: 0.9,
        memberUtility: 0.92,
      },
      u2: {
        participantId: 'u2',
        etaSeconds: 1080,
        staticDurationSeconds: 840,
        distanceMeters: 5100,
        travelMode: 'TWO_WHEELER',
        matchedTags: [
          { tagCode: 'coffee', level: 'normal', weight: 0.6 },
          { tagCode: 'parking', level: 'high', weight: 1.0 },
        ],
        travelUtility: 0.72,
        preferenceUtility: 0.84,
        placeQualityUtility: 0.9,
        memberUtility: 0.8,
      },
      u3: {
        participantId: 'u3',
        etaSeconds: 480,
        staticDurationSeconds: 420,
        distanceMeters: 2300,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'food', level: 'high', weight: 1.0 }],
        travelUtility: 0.93,
        preferenceUtility: 0.82,
        placeQualityUtility: 0.9,
        memberUtility: 0.88,
      },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [
        { key: 'rank', value: 1, unit: 'COUNT', source: 'ENGINE' },
        { key: 'avgEtaSeconds', value: 720, unit: 'SECOND', source: 'ROUTES' },
        { key: 'maxEtaSeconds', value: 1080, unit: 'SECOND', source: 'ROUTES' },
        { key: 'scheduledOpeningStatus', value: 'OPEN', source: 'PLACES' },
        { key: 'paretoLevel', value: 1, unit: 'COUNT', source: 'ENGINE' },
      ],
      warnings: [],
      aiSummaryKey: 'fe2.recommendation_data.p1_summary',
    },
  },
  {
    placeId: 'p2',
    canonicalCandidateKey: 'google:ChIJ_p2_phuc_long_le_loi',
    providerPlaceId: 'ChIJ_p2_phuc_long_le_loi',
    rank: 2,
    name: 'Phúc Long Coffee & Tea - Lê Lợi',
    address: '138 Lê Lợi, P. Bến Thành, Quận 1, TP.HCM',
    categories: ['coffee'],
    rating: 4.3,
    userRatingCount: 980,
    scaleLabel: 'exact',
    lat: 10.7728,
    lng: 106.6994,
    avgEtaSeconds: 900, // 15 phút
    maxEtaSeconds: 1320, // 22 phút
    etaRangeSeconds: 660,
    paretoLevel: 1,
    inclusionProbability: 0.82,
    voteCount: 1,
    opening: {
      openNow: true,
      statusAtScheduled: 'OPEN',
      source: 'CURRENT',
      fallbackToRegularHours: false,
      closingStatus: 'CLOSING_SOON',
      nextClosingAt: '19:45',
      secondsUntilClose: 2700, // Chỉ còn 45 phút sau giờ hẹn 19:00 -> FE-26 CLOSING_SOON!
      hoursKeys: ['fe2.recommendation_data.p2_hours_1'],
    },
    weather: {
      outdoorExposure: 'INDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'LIGHT_RAIN',
      temperatureCelsius: 27,
      precipitationProbabilityPct: 65,
      windSpeedKmh: 14,
      hasWeatherWarning: false,
    },
    memberEtas: [
      {
        participantId: 'u1',
        name: 'Bạn',
        etaSeconds: 720,
        staticDurationSeconds: 540,
        distanceMeters: 3200,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u2',
        name: 'Việt',
        etaSeconds: 1320,
        staticDurationSeconds: 1020,
        distanceMeters: 6200,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u3',
        name: 'Minh',
        etaSeconds: 660,
        staticDurationSeconds: 540,
        distanceMeters: 2900,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
    ],
    viewerFeaturesByMember: {
      u1: {
        participantId: 'u1',
        etaSeconds: 720,
        staticDurationSeconds: 540,
        distanceMeters: 3200,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'coffee', level: 'high', weight: 1.0 }],
        travelUtility: 0.84,
        preferenceUtility: 0.9,
        placeQualityUtility: 0.86,
        memberUtility: 0.86,
      },
      u2: {
        participantId: 'u2',
        etaSeconds: 1320,
        staticDurationSeconds: 1020,
        distanceMeters: 6200,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'coffee', level: 'normal', weight: 0.6 }],
        travelUtility: 0.64,
        preferenceUtility: 0.75,
        placeQualityUtility: 0.86,
        memberUtility: 0.73,
      },
      u3: {
        participantId: 'u3',
        etaSeconds: 660,
        staticDurationSeconds: 540,
        distanceMeters: 2900,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'coffee', level: 'high', weight: 1.0 }],
        travelUtility: 0.86,
        preferenceUtility: 0.88,
        placeQualityUtility: 0.86,
        memberUtility: 0.87,
      },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [
        { key: 'rank', value: 2, unit: 'COUNT', source: 'ENGINE' },
        { key: 'avgEtaSeconds', value: 900, unit: 'SECOND', source: 'ROUTES' },
        { key: 'maxEtaSeconds', value: 1320, unit: 'SECOND', source: 'ROUTES' },
        { key: 'scheduledOpeningStatus', value: 'OPEN', source: 'PLACES' },
        { key: 'secondsUntilClose', value: 2700, unit: 'SECOND', source: 'PLACES' },
      ],
      warnings: ['CLOSING_SOON_AT_MEETUP_TIME'],
      aiSummaryKey: 'fe2.recommendation_data.p2_summary',
    },
  },
  {
    placeId: 'p3',
    canonicalCandidateKey: 'google:ChIJ_p3_rooftop_garden_le_thanh_ton',
    providerPlaceId: 'ChIJ_p3_rooftop_garden_le_thanh_ton',
    rank: 3,
    name: 'Ollin Rooftop & Garden Cafe',
    address: '72 Lê Thánh Tôn, P. Bến Nghé, Quận 1, TP.HCM',
    categories: ['coffee', 'park', 'entertainment'],
    rating: 4.6,
    userRatingCount: 640,
    scaleLabel: 'batch',
    lat: 10.7781,
    lng: 106.7018,
    avgEtaSeconds: 1080, // 18 phút
    maxEtaSeconds: 1680, // 28 phút
    etaRangeSeconds: 1140,
    paretoLevel: 2,
    inclusionProbability: 0.68,
    voteCount: 0,
    opening: {
      openNow: true,
      statusAtScheduled: 'OPEN',
      source: 'REGULAR',
      fallbackToRegularHours: true,
      closingStatus: 'OK',
      nextClosingAt: '23:00',
      secondsUntilClose: 14400,
      hoursKeys: ['fe2.recommendation_data.p3_hours_1'],
    },
    weather: {
      outdoorExposure: 'OUTDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'HEAVY_RAIN',
      temperatureCelsius: 25,
      precipitationProbabilityPct: 80,
      windSpeedKmh: 28,
      hasWeatherWarning: true,
      warningCode: 'BAD_WEATHER_OUTDOOR',
    },
    memberEtas: [
      {
        participantId: 'u1',
        name: 'Bạn',
        etaSeconds: 540,
        staticDurationSeconds: 420,
        distanceMeters: 2400,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u2',
        name: 'Việt',
        etaSeconds: 1680,
        staticDurationSeconds: 1320,
        distanceMeters: 7400,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u3',
        name: 'Minh',
        etaSeconds: 1020,
        staticDurationSeconds: 840,
        distanceMeters: 4600,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
    ],
    viewerFeaturesByMember: {
      u1: {
        participantId: 'u1',
        etaSeconds: 540,
        staticDurationSeconds: 420,
        distanceMeters: 2400,
        travelMode: 'TWO_WHEELER',
        matchedTags: [
          { tagCode: 'coffee', level: 'high', weight: 1.0 },
          { tagCode: 'park', level: 'avoid', weight: -0.8 },
        ],
        travelUtility: 0.91,
        preferenceUtility: 0.62,
        placeQualityUtility: 0.92,
        memberUtility: 0.79,
      },
      u2: {
        participantId: 'u2',
        etaSeconds: 1680,
        staticDurationSeconds: 1320,
        distanceMeters: 7400,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'entertainment', level: 'high', weight: 1.0 }],
        travelUtility: 0.52,
        preferenceUtility: 0.88,
        placeQualityUtility: 0.92,
        memberUtility: 0.72,
      },
      u3: {
        participantId: 'u3',
        etaSeconds: 1020,
        staticDurationSeconds: 840,
        distanceMeters: 4600,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'park', level: 'high', weight: 1.0 }],
        travelUtility: 0.74,
        preferenceUtility: 0.91,
        placeQualityUtility: 0.92,
        memberUtility: 0.84,
      },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [
        { key: 'rank', value: 3, unit: 'COUNT', source: 'ENGINE' },
        { key: 'avgEtaSeconds', value: 1080, unit: 'SECOND', source: 'ROUTES' },
        { key: 'maxEtaSeconds', value: 1680, unit: 'SECOND', source: 'ROUTES' },
        { key: 'scheduledOpeningStatus', value: 'OPEN', source: 'PLACES' },
        { key: 'precipitationProbabilityPct', value: 80, unit: 'COUNT', source: 'WEATHER' },
      ],
      warnings: ['OPENING_FROM_REGULAR_HOURS', 'BAD_WEATHER_OUTDOOR'],
      aiSummaryKey: 'fe2.recommendation_data.p3_summary',
    },
  },
  {
    placeId: 'p4',
    canonicalCandidateKey: 'google:ChIJ_p4_highlands_lam_son',
    providerPlaceId: 'ChIJ_p4_highlands_lam_son',
    rank: 4,
    name: 'Highlands Coffee - Công Trường Lam Sơn',
    address: '2 Công Trường Lam Sơn, P. Bến Nghé, Quận 1, TP.HCM',
    categories: ['coffee'],
    rating: 4.1,
    userRatingCount: 510,
    scaleLabel: 'batch',
    lat: 10.7768,
    lng: 106.7035,
    avgEtaSeconds: 1140, // 19 phút
    maxEtaSeconds: 1740, // 29 phút
    etaRangeSeconds: 900,
    paretoLevel: 2,
    inclusionProbability: 0.54,
    voteCount: 0,
    opening: {
      openNow: null,
      statusAtScheduled: 'UNKNOWN',
      source: 'NONE',
      fallbackToRegularHours: false,
      closingStatus: 'UNKNOWN',
      nextClosingAt: null,
      secondsUntilClose: null,
      hoursKeys: [],
    },
    weather: {
      outdoorExposure: 'INDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'LIGHT_RAIN',
      temperatureCelsius: 27,
      precipitationProbabilityPct: 65,
      windSpeedKmh: 14,
      hasWeatherWarning: false,
    },
    memberEtas: [
      {
        participantId: 'u1',
        name: 'Bạn',
        etaSeconds: 840,
        staticDurationSeconds: 660,
        distanceMeters: 3700,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u2',
        name: 'Việt',
        etaSeconds: 1740,
        staticDurationSeconds: 1380,
        distanceMeters: 7800,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u3',
        name: 'Minh',
        etaSeconds: 840,
        staticDurationSeconds: 720,
        distanceMeters: 3600,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
    ],
    viewerFeaturesByMember: {
      u1: {
        participantId: 'u1',
        etaSeconds: 840,
        staticDurationSeconds: 660,
        distanceMeters: 3700,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'coffee', level: 'high', weight: 1.0 }],
        travelUtility: 0.78,
        preferenceUtility: 0.85,
        placeQualityUtility: 0.78,
        memberUtility: 0.8,
      },
      u2: {
        participantId: 'u2',
        etaSeconds: 1740,
        staticDurationSeconds: 1380,
        distanceMeters: 7800,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'coffee', level: 'normal', weight: 0.6 }],
        travelUtility: 0.49,
        preferenceUtility: 0.74,
        placeQualityUtility: 0.78,
        memberUtility: 0.63,
      },
      u3: {
        participantId: 'u3',
        etaSeconds: 840,
        staticDurationSeconds: 720,
        distanceMeters: 3600,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'coffee', level: 'normal', weight: 0.6 }],
        travelUtility: 0.78,
        preferenceUtility: 0.76,
        placeQualityUtility: 0.78,
        memberUtility: 0.77,
      },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [
        { key: 'rank', value: 4, unit: 'COUNT', source: 'ENGINE' },
        { key: 'avgEtaSeconds', value: 1140, unit: 'SECOND', source: 'ROUTES' },
        { key: 'maxEtaSeconds', value: 1740, unit: 'SECOND', source: 'ROUTES' },
        { key: 'scheduledOpeningStatus', value: 'UNKNOWN', source: 'PLACES' },
      ],
      warnings: ['OPENING_STATUS_UNKNOWN'],
      aiSummaryKey: 'fe2.recommendation_data.p4_summary',
    },
  },
  {
    placeId: 'p5',
    canonicalCandidateKey: 'google:ChIJ_p5_trung_nguyen_nguyen_trai',
    providerPlaceId: 'ChIJ_p5_trung_nguyen_nguyen_trai',
    rank: 5,
    name: 'Trung Nguyên Legend - Sân Vườn Nguyễn Trãi',
    address: '17 Nguyễn Trãi, P. Bến Thành, Quận 1, TP.HCM',
    categories: ['coffee', 'park'],
    rating: 4.0,
    userRatingCount: 390,
    scaleLabel: 'exact',
    lat: 10.7695,
    lng: 106.6922,
    avgEtaSeconds: 1200, // 20 phút
    maxEtaSeconds: 1800, // 30 phút
    etaRangeSeconds: 900,
    paretoLevel: 3,
    inclusionProbability: 0.41,
    voteCount: 0,
    opening: {
      openNow: true,
      statusAtScheduled: 'CLOSED',
      source: 'CURRENT',
      fallbackToRegularHours: false,
      closingStatus: 'OK',
      nextClosingAt: null,
      secondsUntilClose: null,
      hoursKeys: ['fe2.recommendation_data.p5_hours_1'],
    },
    weather: {
      outdoorExposure: 'OUTDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'HEAVY_RAIN',
      temperatureCelsius: 25,
      precipitationProbabilityPct: 80,
      windSpeedKmh: 25,
      hasWeatherWarning: true,
      warningCode: 'BAD_WEATHER_OUTDOOR',
    },
    memberEtas: [
      {
        participantId: 'u1',
        name: 'Bạn',
        etaSeconds: 900,
        staticDurationSeconds: 720,
        distanceMeters: 4100,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u2',
        name: 'Việt',
        etaSeconds: 1800,
        staticDurationSeconds: 1440,
        distanceMeters: 8200,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
      {
        participantId: 'u3',
        name: 'Minh',
        etaSeconds: 900,
        staticDurationSeconds: 780,
        distanceMeters: 3900,
        travelMode: 'TWO_WHEELER',
        routeStatus: 'OK',
      },
    ],
    viewerFeaturesByMember: {
      u1: {
        participantId: 'u1',
        etaSeconds: 900,
        staticDurationSeconds: 720,
        distanceMeters: 4100,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'coffee', level: 'normal', weight: 0.6 }],
        travelUtility: 0.74,
        preferenceUtility: 0.7,
        placeQualityUtility: 0.75,
        memberUtility: 0.73,
      },
      u2: {
        participantId: 'u2',
        etaSeconds: 1800,
        staticDurationSeconds: 1440,
        distanceMeters: 8200,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'coffee', level: 'normal', weight: 0.6 }],
        travelUtility: 0.45,
        preferenceUtility: 0.7,
        placeQualityUtility: 0.75,
        memberUtility: 0.59,
      },
      u3: {
        participantId: 'u3',
        etaSeconds: 900,
        staticDurationSeconds: 780,
        distanceMeters: 3900,
        travelMode: 'TWO_WHEELER',
        matchedTags: [{ tagCode: 'park', level: 'high', weight: 1.0 }],
        travelUtility: 0.74,
        preferenceUtility: 0.85,
        placeQualityUtility: 0.75,
        memberUtility: 0.78,
      },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [
        { key: 'rank', value: 5, unit: 'COUNT', source: 'ENGINE' },
        { key: 'avgEtaSeconds', value: 1200, unit: 'SECOND', source: 'ROUTES' },
        { key: 'maxEtaSeconds', value: 1800, unit: 'SECOND', source: 'ROUTES' },
        { key: 'scheduledOpeningStatus', value: 'CLOSED', source: 'PLACES' },
      ],
      warnings: ['BAD_WEATHER_OUTDOOR'],
      aiSummaryKey: 'fe2.recommendation_data.p5_summary',
    },
  },
  {
    placeId: 'p6',
    canonicalCandidateKey: 'google:ChIJ_p6_katinat_dong_khoi',
    providerPlaceId: 'ChIJ_p6_katinat_dong_khoi',
    rank: 6,
    name: 'Katinat Saigon Kafe - Đồng Khởi',
    address: '91 Đồng Khởi, P. Bến Nghé, Quận 1, TP.HCM',
    categories: ['coffee', 'food'],
    rating: 4.5,
    userRatingCount: 1120,
    scaleLabel: 'exact',
    lat: 10.7752,
    lng: 106.7041,
    avgEtaSeconds: 960,
    maxEtaSeconds: 1440,
    etaRangeSeconds: 720,
    paretoLevel: 2,
    inclusionProbability: 0.76,
    voteCount: 0,
    opening: {
      openNow: true,
      statusAtScheduled: 'OPEN',
      source: 'CURRENT',
      fallbackToRegularHours: false,
      closingStatus: 'OK',
      nextClosingAt: '23:30',
      secondsUntilClose: 16200,
      hoursKeys: ['fe2.recommendation_data.p6_hours_1'],
    },
    weather: {
      outdoorExposure: 'INDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'LIGHT_RAIN',
      temperatureCelsius: 27,
      precipitationProbabilityPct: 60,
      windSpeedKmh: 12,
      hasWeatherWarning: false,
    },
    memberEtas: [
      { participantId: 'u1', name: 'Bạn', etaSeconds: 720, staticDurationSeconds: 540, distanceMeters: 3100, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u2', name: 'Việt', etaSeconds: 1440, staticDurationSeconds: 1140, distanceMeters: 6400, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u3', name: 'Minh', etaSeconds: 720, staticDurationSeconds: 600, distanceMeters: 3200, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
    ],
    viewerFeaturesByMember: {
      u1: { participantId: 'u1', etaSeconds: 720, staticDurationSeconds: 540, distanceMeters: 3100, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'coffee', level: 'high', weight: 1.0 }], travelUtility: 0.85, preferenceUtility: 0.91, placeQualityUtility: 0.9, memberUtility: 0.88 },
      u2: { participantId: 'u2', etaSeconds: 1440, staticDurationSeconds: 1140, distanceMeters: 6400, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'coffee', level: 'normal', weight: 0.6 }], travelUtility: 0.62, preferenceUtility: 0.8, placeQualityUtility: 0.9, memberUtility: 0.74 },
      u3: { participantId: 'u3', etaSeconds: 720, staticDurationSeconds: 600, distanceMeters: 3200, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'food', level: 'high', weight: 1.0 }], travelUtility: 0.85, preferenceUtility: 0.86, placeQualityUtility: 0.9, memberUtility: 0.86 },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [],
      warnings: [],
      aiSummaryKey: 'fe2.recommendation_data.p6_summary',
    },
  },
  {
    placeId: 'p7',
    canonicalCandidateKey: 'google:ChIJ_p7_pizza_4ps_ben_thanh',
    providerPlaceId: 'ChIJ_p7_pizza_4ps_ben_thanh',
    rank: 7,
    name: "Pizza 4P's - Bến Thành",
    address: '8 Thủ Khoa Huân, P. Bến Thành, Quận 1, TP.HCM',
    categories: ['food', 'quiet'],
    rating: 4.8,
    userRatingCount: 2850,
    scaleLabel: 'exact',
    lat: 10.7739,
    lng: 106.6982,
    avgEtaSeconds: 840,
    maxEtaSeconds: 1260,
    etaRangeSeconds: 600,
    paretoLevel: 1,
    inclusionProbability: 0.89,
    voteCount: 0,
    opening: {
      openNow: true,
      statusAtScheduled: 'OPEN',
      source: 'CURRENT',
      fallbackToRegularHours: false,
      closingStatus: 'OK',
      nextClosingAt: '22:00',
      secondsUntilClose: 10800,
      hoursKeys: ['fe2.recommendation_data.p7_hours_1'],
    },
    weather: {
      outdoorExposure: 'INDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'LIGHT_RAIN',
      temperatureCelsius: 27,
      precipitationProbabilityPct: 65,
      windSpeedKmh: 14,
      hasWeatherWarning: false,
    },
    memberEtas: [
      { participantId: 'u1', name: 'Bạn', etaSeconds: 660, staticDurationSeconds: 540, distanceMeters: 2900, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u2', name: 'Việt', etaSeconds: 1260, staticDurationSeconds: 960, distanceMeters: 5600, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u3', name: 'Minh', etaSeconds: 600, staticDurationSeconds: 480, distanceMeters: 2600, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
    ],
    viewerFeaturesByMember: {
      u1: { participantId: 'u1', etaSeconds: 660, staticDurationSeconds: 540, distanceMeters: 2900, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'food', level: 'high', weight: 1.0 }, { tagCode: 'quiet', level: 'normal', weight: 0.6 }], travelUtility: 0.87, preferenceUtility: 0.89, placeQualityUtility: 0.96, memberUtility: 0.9 },
      u2: { participantId: 'u2', etaSeconds: 1260, staticDurationSeconds: 960, distanceMeters: 5600, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'food', level: 'high', weight: 1.0 }], travelUtility: 0.68, preferenceUtility: 0.9, placeQualityUtility: 0.96, memberUtility: 0.81 },
      u3: { participantId: 'u3', etaSeconds: 600, staticDurationSeconds: 480, distanceMeters: 2600, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'food', level: 'high', weight: 1.0 }], travelUtility: 0.89, preferenceUtility: 0.94, placeQualityUtility: 0.96, memberUtility: 0.92 },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [],
      warnings: [],
      aiSummaryKey: 'fe2.recommendation_data.p7_summary',
    },
  },
  {
    placeId: 'p8',
    canonicalCandidateKey: 'google:ChIJ_p8_arabica_diamond_plaza',
    providerPlaceId: 'ChIJ_p8_arabica_diamond_plaza',
    rank: 8,
    name: '% Arabica - Diamond Plaza',
    address: '34 Lê Duẩn, P. Bến Nghé, Quận 1, TP.HCM',
    categories: ['coffee', 'mall', 'parking'],
    rating: 4.4,
    userRatingCount: 720,
    scaleLabel: 'batch',
    lat: 10.7804,
    lng: 106.6989,
    avgEtaSeconds: 1020,
    maxEtaSeconds: 1500,
    etaRangeSeconds: 720,
    paretoLevel: 2,
    inclusionProbability: 0.65,
    voteCount: 0,
    opening: {
      openNow: true,
      statusAtScheduled: 'OPEN',
      source: 'CURRENT',
      fallbackToRegularHours: false,
      closingStatus: 'OK',
      nextClosingAt: '22:00',
      secondsUntilClose: 10800,
      hoursKeys: ['fe2.recommendation_data.p8_hours_1'],
    },
    weather: {
      outdoorExposure: 'INDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'LIGHT_RAIN',
      temperatureCelsius: 27,
      precipitationProbabilityPct: 60,
      windSpeedKmh: 12,
      hasWeatherWarning: false,
    },
    memberEtas: [
      { participantId: 'u1', name: 'Bạn', etaSeconds: 780, staticDurationSeconds: 600, distanceMeters: 3400, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u2', name: 'Việt', etaSeconds: 1500, staticDurationSeconds: 1200, distanceMeters: 6700, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u3', name: 'Minh', etaSeconds: 780, staticDurationSeconds: 660, distanceMeters: 3500, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
    ],
    viewerFeaturesByMember: {
      u1: { participantId: 'u1', etaSeconds: 780, staticDurationSeconds: 600, distanceMeters: 3400, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'coffee', level: 'high', weight: 1.0 }, { tagCode: 'mall', level: 'normal', weight: 0.6 }], travelUtility: 0.82, preferenceUtility: 0.88, placeQualityUtility: 0.88, memberUtility: 0.85 },
      u2: { participantId: 'u2', etaSeconds: 1500, staticDurationSeconds: 1200, distanceMeters: 6700, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'parking', level: 'high', weight: 1.0 }], travelUtility: 0.6, preferenceUtility: 0.85, placeQualityUtility: 0.88, memberUtility: 0.74 },
      u3: { participantId: 'u3', etaSeconds: 780, staticDurationSeconds: 660, distanceMeters: 3500, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'mall', level: 'high', weight: 1.0 }], travelUtility: 0.82, preferenceUtility: 0.84, placeQualityUtility: 0.88, memberUtility: 0.84 },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [],
      warnings: [],
      aiSummaryKey: 'fe2.recommendation_data.p8_summary',
    },
  },
  {
    placeId: 'p9',
    canonicalCandidateKey: 'google:ChIJ_p9_blank_lounge_landmark',
    providerPlaceId: 'ChIJ_p9_blank_lounge_landmark',
    rank: 9,
    name: ' Soares Cafe & Acoustic Lounge',
    address: '42 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
    categories: ['coffee', 'entertainment'],
    rating: 4.4,
    userRatingCount: 530,
    scaleLabel: 'cluster',
    lat: 10.7736,
    lng: 106.7038,
    avgEtaSeconds: 1100,
    maxEtaSeconds: 1620,
    etaRangeSeconds: 780,
    paretoLevel: 2,
    inclusionProbability: 0.58,
    voteCount: 0,
    opening: {
      openNow: true,
      statusAtScheduled: 'OPEN',
      source: 'CURRENT',
      fallbackToRegularHours: false,
      closingStatus: 'OK',
      nextClosingAt: '23:00',
      secondsUntilClose: 14400,
      hoursKeys: ['fe2.recommendation_data.p9_hours_1'],
    },
    weather: {
      outdoorExposure: 'INDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'LIGHT_RAIN',
      temperatureCelsius: 27,
      precipitationProbabilityPct: 65,
      windSpeedKmh: 14,
      hasWeatherWarning: false,
    },
    memberEtas: [
      { participantId: 'u1', name: 'Bạn', etaSeconds: 840, staticDurationSeconds: 660, distanceMeters: 3600, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u2', name: 'Việt', etaSeconds: 1620, staticDurationSeconds: 1260, distanceMeters: 7100, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u3', name: 'Minh', etaSeconds: 840, staticDurationSeconds: 720, distanceMeters: 3700, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
    ],
    viewerFeaturesByMember: {
      u1: { participantId: 'u1', etaSeconds: 840, staticDurationSeconds: 660, distanceMeters: 3600, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'coffee', level: 'high', weight: 1.0 }], travelUtility: 0.79, preferenceUtility: 0.83, placeQualityUtility: 0.85, memberUtility: 0.81 },
      u2: { participantId: 'u2', etaSeconds: 1620, staticDurationSeconds: 1260, distanceMeters: 7100, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'entertainment', level: 'high', weight: 1.0 }], travelUtility: 0.55, preferenceUtility: 0.86, placeQualityUtility: 0.85, memberUtility: 0.72 },
      u3: { participantId: 'u3', etaSeconds: 840, staticDurationSeconds: 720, distanceMeters: 3700, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'entertainment', level: 'normal', weight: 0.6 }], travelUtility: 0.79, preferenceUtility: 0.78, placeQualityUtility: 0.85, memberUtility: 0.8 },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [],
      warnings: [],
      aiSummaryKey: 'fe2.recommendation_data.p9_summary',
    },
  },
  {
    placeId: 'p10',
    canonicalCandidateKey: 'google:ChIJ_p10_cgv_vincom_dong_khoi',
    providerPlaceId: 'ChIJ_p10_cgv_vincom_dong_khoi',
    rank: 10,
    name: 'CGV & Cafe Lounge - Vincom Đồng Khởi',
    address: '72 Lê Thánh Tôn, P. Bến Nghé, Quận 1, TP.HCM',
    categories: ['movie', 'mall', 'entertainment'],
    rating: 4.5,
    userRatingCount: 1940,
    scaleLabel: 'cluster',
    lat: 10.7779,
    lng: 106.7022,
    avgEtaSeconds: 1080,
    maxEtaSeconds: 1620,
    etaRangeSeconds: 840,
    paretoLevel: 3,
    inclusionProbability: 0.52,
    voteCount: 0,
    opening: {
      openNow: true,
      statusAtScheduled: 'OPEN',
      source: 'CURRENT',
      fallbackToRegularHours: false,
      closingStatus: 'OK',
      nextClosingAt: '23:45',
      secondsUntilClose: 17100,
      hoursKeys: ['fe2.recommendation_data.p10_hours_1'],
    },
    weather: {
      outdoorExposure: 'INDOOR',
      dataStatus: 'AVAILABLE',
      conditionCode: 'LIGHT_RAIN',
      temperatureCelsius: 27,
      precipitationProbabilityPct: 60,
      windSpeedKmh: 12,
      hasWeatherWarning: false,
    },
    memberEtas: [
      { participantId: 'u1', name: 'Bạn', etaSeconds: 780, staticDurationSeconds: 600, distanceMeters: 3300, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u2', name: 'Việt', etaSeconds: 1620, staticDurationSeconds: 1260, distanceMeters: 7000, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
      { participantId: 'u3', name: 'Minh', etaSeconds: 840, staticDurationSeconds: 720, distanceMeters: 3600, travelMode: 'TWO_WHEELER', routeStatus: 'OK' },
    ],
    viewerFeaturesByMember: {
      u1: { participantId: 'u1', etaSeconds: 780, staticDurationSeconds: 600, distanceMeters: 3300, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'movie', level: 'normal', weight: 0.6 }, { tagCode: 'mall', level: 'normal', weight: 0.6 }], travelUtility: 0.81, preferenceUtility: 0.78, placeQualityUtility: 0.9, memberUtility: 0.82 },
      u2: { participantId: 'u2', etaSeconds: 1620, staticDurationSeconds: 1260, distanceMeters: 7000, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'movie', level: 'high', weight: 1.0 }], travelUtility: 0.55, preferenceUtility: 0.89, placeQualityUtility: 0.9, memberUtility: 0.74 },
      u3: { participantId: 'u3', etaSeconds: 840, staticDurationSeconds: 720, distanceMeters: 3600, travelMode: 'TWO_WHEELER', matchedTags: [{ tagCode: 'entertainment', level: 'high', weight: 1.0 }], travelUtility: 0.79, preferenceUtility: 0.85, placeQualityUtility: 0.9, memberUtility: 0.83 },
    },
    explanation: {
      summaryCode: 'FAIR_PARETO_RANKED',
      facts: [],
      warnings: [],
      aiSummaryKey: 'fe2.recommendation_data.p10_summary',
    },
  },
];

function makeUuidLike(prefix: string): string {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now().toString(16).slice(-6)}-${rand}`;
}

interface RecommendationState {
  // Server sync state
  activeMeetupId: string | null;
  activeMeetupDetail: MeetupDetailResponse | null;
  apiError: AppError | null;
  isApiLoading: boolean;
  hasServerData: boolean;
  impressedCandidateKeys: string[];

  // Run & Temporal Context (FE-23)
  runId: string;
  scheduledAtSnapshot: string;
  currentMeetupScheduledAt: string;
  contextStatus: RecommendationContextStatus;
  openingFilter: OpeningFilterMode;
  sortBy: SortOption;

  // Travel Mode & Traffic (FE-24)
  memberTravelModes: Record<string, TravelMode>;
  requestedRoutingPreference: RoutingPreference;
  effectiveRoutingPreference: RoutingPreference;

  // Weather Policy (FE-25)
  weatherPolicy: WeatherPolicy;
  simulateWeatherFilterRelaxed: boolean;

  // Viewer-aware Projection (FE-27)
  currentViewerId: string;
  votedCandidateKey: string | null;
  finalizedCandidateKey: string | null;
  favoriteCandidateKeys: string[];
  lastSyncedRunId: string | null;

  // Impression & Feedback Tracking (FE-22)
  impressedRunIds: string[];
  feedbackLogs: FeedbackLogEntry[];
  simulateSilentFeedbackError: boolean;

  // Base places
  basePlaces: RecommendationPlaceItem[];

  // Actions
  clearApiError: () => void;
  setOpeningFilter: (mode: OpeningFilterMode) => void;
  setSortBy: (sort: SortOption) => void;
  setWeatherPolicy: (policy: WeatherPolicy) => void;
  setMemberTravelMode: (participantId: string, mode: TravelMode) => void;
  setCurrentViewerId: (viewerId: string) => void;

  // Real Backend API Actions
  loadRecommendationsForMeetup: (meetupId: string, runId?: string) => Promise<boolean>;
  refreshRecommendationRun: (meetupId: string) => Promise<boolean>;
  castVoteOnServer: (
    meetupId: string,
    canonicalCandidateKey: string,
    rank?: number
  ) => Promise<boolean>;
  finalizeOnServer: (
    meetupId: string,
    canonicalCandidateKey?: string,
    rank?: number
  ) => Promise<boolean>;
  toggleFavoriteOnServer: (canonicalCandidateKey: string, rank?: number) => Promise<boolean>;
  sendImpressionToServer: (
    meetupId: string,
    canonicalCandidateKey: string,
    rank: number
  ) => Promise<void>;
  sendFeedbackToServer: (
    meetupId: string,
    eventType: RecommendationFeedbackEventType,
    canonicalCandidateKey?: string,
    rank?: number
  ) => Promise<void>;
  replayRunOnServer: (meetupId: string) => Promise<ReplayRecommendationRunResponse | null>;

  // Scenario Toggles (QoL Demo Tools)
  toggleStaleContextScenario: () => void;
  toggleTrafficFallbackScenario: () => void;
  toggleWeatherRelaxedScenario: () => void;
  toggleSilentFeedbackError: () => void;
  rerunForUpdatedContext: () => void;
  resetAllFiltersAndScenarios: () => void;

  // FE-22 & FE-27 Actions
  recordImpressionIfNeeded: (visiblePlaces: RecommendationPlaceItem[]) => void;
  recordFeedbackEvent: (
    actionType: Exclude<FeedbackActionType, 'RecommendationShown'>,
    canonicalCandidateKey: string,
    rank?: number
  ) => void;
  toggleVotePlace: (canonicalCandidateKey: string, rank?: number) => boolean;
  finalizePlace: (canonicalCandidateKey: string, rank?: number) => boolean;
  toggleFavoritePlace: (canonicalCandidateKey: string, rank?: number) => void;
}

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  activeMeetupId: null,
  activeMeetupDetail: null,
  apiError: null,
  isApiLoading: false,
  hasServerData: false,
  impressedCandidateKeys: [],

  runId: 'run-7f9a2c01-b84e-4d12',
  scheduledAtSnapshot: '2026-11-05T19:00:00+07:00',
  currentMeetupScheduledAt: '2026-11-05T19:00:00+07:00',
  contextStatus: 'CURRENT_CONTEXT',
  openingFilter: 'OPEN_AT_SCHEDULED_TIME',
  sortBy: 'rank',

  memberTravelModes: {
    u1: 'TWO_WHEELER',
    u2: 'TWO_WHEELER',
    u3: 'TWO_WHEELER',
  },
  requestedRoutingPreference: 'TRAFFIC_AWARE',
  effectiveRoutingPreference: 'TRAFFIC_AWARE',

  weatherPolicy: 'WARN_ONLY',
  simulateWeatherFilterRelaxed: false,

  currentViewerId: 'u1',
  votedCandidateKey: null,
  finalizedCandidateKey: null,
  favoriteCandidateKeys: [],
  lastSyncedRunId: 'run-7f9a2c01-b84e-4d12',

  impressedRunIds: [],
  feedbackLogs: [],
  simulateSilentFeedbackError: false,

  basePlaces: INITIAL_PLACES,

  clearApiError: () => set({ apiError: null }),

  loadRecommendationsForMeetup: async (meetupId: string, explicitRunId?: string) => {
    const prev = get();
    const isSameMeetup = prev.activeMeetupId === meetupId;
    set({
      isApiLoading: true,
      apiError: null,
      activeMeetupId: meetupId,
      ...(isSameMeetup
        ? {}
        : {
            basePlaces: [],
            hasServerData: false,
            votedCandidateKey: null,
            finalizedCandidateKey: null,
          }),
    });
    try {
      const [meetup, favorites] = await Promise.all([
        recommendationService.getMeetupDetail(meetupId),
        recommendationService.listFavorites().catch(() => []),
      ]);

      const state = get();
      const candidateRunId =
        explicitRunId && UUID_REGEX.test(explicitRunId)
          ? explicitRunId
          : meetup.chosenRunId ??
            (state.activeMeetupId === meetupId && UUID_REGEX.test(state.runId)
              ? state.runId
              : undefined);

      let run: RecommendationRunResponse;
      if (candidateRunId) {
        run = await recommendationService.getRun(meetupId, candidateRunId);
      } else {
        const radiusMeters = Math.min(10000, Math.max(100, meetup.searchRadiusM || 5000));
        const category = /^[a-z][a-z0-9_]{0,99}$/.test(meetup.placeType || '')
          ? meetup.placeType
          : 'cafe';
        run = await recommendationService.createRun(meetupId, {
          topK: 5,
          filters: {
            categories: [category],
            openingFilter: state.openingFilter,
            radiusMeters,
          },
        });
      }

      const viewerParticipantId =
        run.results.find((r) => r.viewerFeature)?.viewerFeature?.participantId ??
        state.currentViewerId;
      const mappedPlaces = run.results.map((r) =>
        mapApiResultToPlaceItem(r, meetup, viewerParticipantId)
      );

      const finalizedPlace = meetup.chosenRecommendationPlaceId
        ? mappedPlaces.find(
            (p) => p.placeId === meetup.chosenRecommendationPlaceId
          )?.canonicalCandidateKey ?? null
        : null;

      set({
        activeMeetupId: meetupId,
        activeMeetupDetail: meetup,
        runId: run.id,
        lastSyncedRunId: run.id,
        scheduledAtSnapshot: run.scheduledAtSnapshot,
        currentMeetupScheduledAt: meetup.scheduledAt,
        contextStatus: run.contextStatus,
        openingFilter: run.openingFilter,
        requestedRoutingPreference: run.routingPreferenceRequested,
        effectiveRoutingPreference: run.routingPreferenceEffective,
        weatherPolicy: run.weatherPolicyEffective,
        currentViewerId: viewerParticipantId,
        basePlaces: mappedPlaces,
        finalizedCandidateKey: finalizedPlace,
        favoriteCandidateKeys: favorites.map((f) => f.canonicalCandidateKey),
        isApiLoading: false,
        hasServerData: true,
        apiError: null,
      });
      return true;
    } catch (err) {
      set({
        isApiLoading: false,
        apiError: err as AppError,
      });
      return false;
    }
  },

  refreshRecommendationRun: async (meetupId: string) => {
    set({ isApiLoading: true, apiError: null, activeMeetupId: meetupId });
    try {
      const meetup = await recommendationService.getMeetupDetail(meetupId);
      const state = get();
      const radiusMeters = Math.min(10000, Math.max(100, meetup.searchRadiusM || 5000));
      const category = /^[a-z][a-z0-9_]{0,99}$/.test(meetup.placeType || '')
        ? meetup.placeType
        : 'cafe';
      const run = await recommendationService.createRun(meetupId, {
        topK: 5,
        filters: {
          categories: [category],
          openingFilter: state.openingFilter,
          radiusMeters,
        },
      });

      const viewerParticipantId =
        run.results.find((r) => r.viewerFeature)?.viewerFeature?.participantId ??
        state.currentViewerId;
      const mappedPlaces = run.results.map((r) =>
        mapApiResultToPlaceItem(r, meetup, viewerParticipantId)
      );

      set({
        activeMeetupId: meetupId,
        activeMeetupDetail: meetup,
        runId: run.id,
        lastSyncedRunId: run.id,
        scheduledAtSnapshot: run.scheduledAtSnapshot,
        currentMeetupScheduledAt: meetup.scheduledAt,
        contextStatus: run.contextStatus,
        openingFilter: run.openingFilter,
        requestedRoutingPreference: run.routingPreferenceRequested,
        effectiveRoutingPreference: run.routingPreferenceEffective,
        weatherPolicy: run.weatherPolicyEffective,
        currentViewerId: viewerParticipantId,
        basePlaces: mappedPlaces,
        votedCandidateKey: null,
        finalizedCandidateKey: null,
        isApiLoading: false,
        hasServerData: true,
        apiError: null,
      });
      return true;
    } catch (err) {
      set({
        isApiLoading: false,
        apiError: err as AppError,
      });
      return false;
    }
  },

  castVoteOnServer: async (meetupId: string, canonicalCandidateKey: string, rank?: number) => {
    const state = get();
    const place = state.basePlaces.find(
      (p) => p.canonicalCandidateKey === canonicalCandidateKey
    );
    if (!place || !UUID_REGEX.test(state.runId)) {
      return false;
    }

    try {
      const res = await recommendationService.castVote(
        meetupId,
        state.runId,
        place.placeId
      );
      const actionType: Exclude<FeedbackActionType, 'RecommendationShown'> =
        state.votedCandidateKey ? 'VoteChanged' : 'PlaceVoted';
      get().recordFeedbackEvent(actionType, canonicalCandidateKey, rank);

      const prevVote = state.votedCandidateKey;
      set({
        votedCandidateKey: res.canonicalCandidateKey,
        lastSyncedRunId: res.runId,
        apiError: null,
        basePlaces: state.basePlaces.map((p) => {
          if (p.canonicalCandidateKey === res.canonicalCandidateKey) {
            return { ...p, voteCount: res.voteCount };
          }
          if (prevVote && prevVote !== res.canonicalCandidateKey && p.canonicalCandidateKey === prevVote) {
            return { ...p, voteCount: Math.max(0, p.voteCount - 1) };
          }
          return p;
        }),
      });
      return true;
    } catch (err) {
      set({ apiError: err as AppError });
      return false;
    }
  },

  finalizeOnServer: async (
    meetupId: string,
    canonicalCandidateKey?: string,
    rank?: number
  ) => {
    const state = get();
    if (!UUID_REGEX.test(state.runId)) {
      return false;
    }
    const targetPlace = canonicalCandidateKey
      ? state.basePlaces.find((p) => p.canonicalCandidateKey === canonicalCandidateKey)
      : undefined;

    try {
      const res = await recommendationService.finalizeMeetup(
        meetupId,
        state.runId,
        targetPlace?.placeId
      );
      get().recordFeedbackEvent('MeetupPlaceSelected', res.canonicalCandidateKey, rank);
      set({
        finalizedCandidateKey: res.canonicalCandidateKey,
        votedCandidateKey: res.canonicalCandidateKey,
        lastSyncedRunId: res.runId,
        apiError: null,
        basePlaces: state.basePlaces.map((p) =>
          p.canonicalCandidateKey === res.canonicalCandidateKey
            ? { ...p, voteCount: res.voteCount }
            : p
        ),
      });
      return true;
    } catch (err) {
      set({ apiError: err as AppError });
      return false;
    }
  },

  toggleFavoriteOnServer: async (canonicalCandidateKey: string, rank?: number) => {
    const state = get();
    const isFav = state.favoriteCandidateKeys.includes(canonicalCandidateKey);
    try {
      if (!isFav) {
        await recommendationService.addFavorite(canonicalCandidateKey);
        get().recordFeedbackEvent('FavoriteAdded', canonicalCandidateKey, rank);
        set({
          favoriteCandidateKeys: [...state.favoriteCandidateKeys, canonicalCandidateKey],
          apiError: null,
        });
      } else {
        await recommendationService.removeFavorite(canonicalCandidateKey);
        set({
          favoriteCandidateKeys: state.favoriteCandidateKeys.filter(
            (k) => k !== canonicalCandidateKey
          ),
          apiError: null,
        });
      }
      return true;
    } catch (err) {
      set({ apiError: err as AppError });
      return false;
    }
  },

  sendImpressionToServer: async (
    meetupId: string,
    canonicalCandidateKey: string,
    rank: number
  ) => {
    const state = get();
    if (!UUID_REGEX.test(state.runId)) return;
    const dedupKey = `${state.runId}:${canonicalCandidateKey}`;
    if (state.impressedCandidateKeys.includes(dedupKey)) return;

    set({
      impressedCandidateKeys: [...state.impressedCandidateKeys, dedupKey],
    });
    try {
      await recommendationService.recordImpression(meetupId, state.runId, {
        eventId: generateUuidV4(),
        canonicalCandidateKey,
        rank,
        shownAt: new Date().toISOString(),
      });
    } catch {
      // Impressions are best-effort telemetry; do not disrupt UX
    }
  },

  sendFeedbackToServer: async (
    meetupId: string,
    eventType: RecommendationFeedbackEventType,
    canonicalCandidateKey?: string,
    rank?: number
  ) => {
    const state = get();
    if (eventType === 'NAVIGATION_OPENED' && canonicalCandidateKey) {
      get().recordFeedbackEvent('NavigationOpened', canonicalCandidateKey, rank);
    }
    if (!UUID_REGEX.test(state.runId)) return;
    try {
      await recommendationService.recordFeedback(meetupId, state.runId, {
        eventId: generateUuidV4(),
        eventType,
        ...(canonicalCandidateKey ? { canonicalCandidateKey } : {}),
        occurredAt: new Date().toISOString(),
      });
    } catch {
      // Post-display feedback errors are non-blocking
    }
  },

  replayRunOnServer: async (meetupId: string) => {
    const state = get();
    if (!UUID_REGEX.test(state.runId)) return null;
    try {
      return await recommendationService.replayRun(meetupId, state.runId);
    } catch (err) {
      set({ apiError: err as AppError });
      return null;
    }
  },

  setOpeningFilter: (openingFilter) => set({ openingFilter }),
  setSortBy: (sortBy) => set({ sortBy }),
  setWeatherPolicy: (weatherPolicy) => set({ weatherPolicy }),

  setMemberTravelMode: (participantId, mode) =>
    set((state) => ({
      memberTravelModes: {
        ...state.memberTravelModes,
        [participantId]: mode,
      },
    })),

  setCurrentViewerId: (currentViewerId) => set({ currentViewerId }),

  toggleStaleContextScenario: () =>
    set((state) => {
      if (state.contextStatus === 'CURRENT_CONTEXT') {
        return {
          contextStatus: 'STALE_CONTEXT',
          currentMeetupScheduledAt: '2026-11-05T21:30:00+07:00',
        };
      }
      return {
        contextStatus: 'CURRENT_CONTEXT',
        currentMeetupScheduledAt: state.scheduledAtSnapshot,
      };
    }),

  toggleTrafficFallbackScenario: () =>
    set((state) => ({
      effectiveRoutingPreference:
        state.effectiveRoutingPreference === 'TRAFFIC_AWARE'
          ? 'TRAFFIC_UNAWARE'
          : 'TRAFFIC_AWARE',
    })),

  toggleWeatherRelaxedScenario: () =>
    set((state) => {
      const next = !state.simulateWeatherFilterRelaxed;
      return {
        simulateWeatherFilterRelaxed: next,
        weatherPolicy: next ? 'FILTER_OUTDOOR' : state.weatherPolicy,
      };
    }),

  toggleSilentFeedbackError: () =>
    set((state) => ({
      simulateSilentFeedbackError: !state.simulateSilentFeedbackError,
    })),

  rerunForUpdatedContext: () =>
    set((state) => {
      const newRunId = makeUuidLike('run');
      return {
        runId: newRunId,
        lastSyncedRunId: newRunId,
        scheduledAtSnapshot: state.currentMeetupScheduledAt,
        contextStatus: 'CURRENT_CONTEXT',
        votedCandidateKey: null,
        finalizedCandidateKey: null,
        basePlaces: INITIAL_PLACES,
      };
    }),

  resetAllFiltersAndScenarios: () =>
    set({
      openingFilter: 'OPEN_AT_SCHEDULED_TIME',
      sortBy: 'rank',
      weatherPolicy: 'WARN_ONLY',
      simulateWeatherFilterRelaxed: false,
      contextStatus: 'CURRENT_CONTEXT',
      currentMeetupScheduledAt: '2026-11-05T19:00:00+07:00',
      scheduledAtSnapshot: '2026-11-05T19:00:00+07:00',
      effectiveRoutingPreference: 'TRAFFIC_AWARE',
      votedCandidateKey: null,
      finalizedCandidateKey: null,
      basePlaces: INITIAL_PLACES,
      memberTravelModes: {
        u1: 'TWO_WHEELER',
        u2: 'TWO_WHEELER',
        u3: 'TWO_WHEELER',
      },
    }),

  recordImpressionIfNeeded: (visiblePlaces) => {
    const state = get();
    if (visiblePlaces.length === 0) return;

    // FE-22 Guardrail: Chống bắn trùng RecommendationShown trên cùng runId
    if (state.impressedRunIds.includes(state.runId)) {
      return;
    }

    const entry: FeedbackLogEntry = {
      eventId: makeUuidLike('evt-shown'),
      runId: state.runId,
      participantId: state.currentViewerId,
      actionType: 'RecommendationShown',
      itemCount: visiblePlaces.length,
      timestamp: new Date().toLocaleTimeString(),
      status: state.simulateSilentFeedbackError ? 'SILENT_RETRY_QUEUED' : 'RECORDED_OK',
    };

    set({
      impressedRunIds: [...state.impressedRunIds, state.runId],
      feedbackLogs: [entry, ...state.feedbackLogs].slice(0, 25),
    });
  },

  recordFeedbackEvent: (actionType, canonicalCandidateKey, rank) => {
    const state = get();
    const entry: FeedbackLogEntry = {
      eventId: makeUuidLike('evt-act'),
      runId: state.runId,
      participantId: state.currentViewerId,
      actionType,
      canonicalCandidateKey,
      rank,
      timestamp: new Date().toLocaleTimeString(),
      status: state.simulateSilentFeedbackError ? 'SILENT_RETRY_QUEUED' : 'RECORDED_OK',
    };

    set({
      feedbackLogs: [entry, ...state.feedbackLogs].slice(0, 25),
    });
  },

  toggleVotePlace: (canonicalCandidateKey, rank) => {
    const state = get();
    // FE-23: Khóa vote nếu run đang ở trạng thái STALE_CONTEXT hoặc đã chốt địa điểm
    if (state.contextStatus === 'STALE_CONTEXT' || state.finalizedCandidateKey !== null) {
      return false;
    }

    const previousVoteKey = state.votedCandidateKey;
    const hadPreviousVote = previousVoteKey !== null;
    const isUnvoting = previousVoteKey === canonicalCandidateKey;
    const nextVote = isUnvoting ? null : canonicalCandidateKey;

    const actionType: Exclude<FeedbackActionType, 'RecommendationShown'> = hadPreviousVote
      ? 'VoteChanged'
      : 'PlaceVoted';

    get().recordFeedbackEvent(actionType, canonicalCandidateKey, rank);

    const updatedBasePlaces = state.basePlaces.map((p) => {
      let nextCount = p.voteCount;
      if (previousVoteKey && p.canonicalCandidateKey === previousVoteKey) {
        nextCount = Math.max(0, nextCount - 1);
      }
      if (nextVote && p.canonicalCandidateKey === nextVote) {
        nextCount = nextCount + 1;
      }
      return nextCount === p.voteCount ? p : { ...p, voteCount: nextCount };
    });

    // FE-27 & BE-10: Đồng bộ lại trên CÙNG runId (mỗi người tối đa 1 vote, đổi vote cập nhật voteCount)
    set({
      votedCandidateKey: nextVote,
      basePlaces: updatedBasePlaces,
      lastSyncedRunId: state.runId,
    });
    return true;
  },

  finalizePlace: (canonicalCandidateKey, rank) => {
    const state = get();
    if (state.contextStatus === 'STALE_CONTEXT') {
      return false;
    }

    get().recordFeedbackEvent('MeetupPlaceSelected', canonicalCandidateKey, rank);

    const previousVoteKey = state.votedCandidateKey;
    const updatedBasePlaces = state.basePlaces.map((p) => {
      let nextCount = p.voteCount;
      if (
        previousVoteKey &&
        previousVoteKey !== canonicalCandidateKey &&
        p.canonicalCandidateKey === previousVoteKey
      ) {
        nextCount = Math.max(0, nextCount - 1);
      }
      if (
        previousVoteKey !== canonicalCandidateKey &&
        p.canonicalCandidateKey === canonicalCandidateKey
      ) {
        nextCount = nextCount + 1;
      }
      return nextCount === p.voteCount ? p : { ...p, voteCount: nextCount };
    });

    // FE-27: Sau khi chốt, đọc lại trên đúng runId đã chốt
    set({
      finalizedCandidateKey: canonicalCandidateKey,
      votedCandidateKey: canonicalCandidateKey,
      basePlaces: updatedBasePlaces,
      lastSyncedRunId: state.runId,
    });
    return true;
  },

  toggleFavoritePlace: (canonicalCandidateKey, rank) => {
    const state = get();
    const isFav = state.favoriteCandidateKeys.includes(canonicalCandidateKey);
    if (!isFav) {
      get().recordFeedbackEvent('FavoriteAdded', canonicalCandidateKey, rank);
      set({
        favoriteCandidateKeys: [...state.favoriteCandidateKeys, canonicalCandidateKey],
      });
    } else {
      set({
        favoriteCandidateKeys: state.favoriteCandidateKeys.filter(
          (k) => k !== canonicalCandidateKey
        ),
      });
    }
  },
}));

/**
 * Helper tính toán danh sách địa điểm hiển thị theo cấu hình Phương tiện (FE-24),
 * Traffic (FE-24), Giờ mở cửa (FE-23), Thời tiết (FE-25) và Người xem hiện tại (FE-27).
 * Tuyệt đối giữ nguyên nguyên tắc:
 * - Không bao giờ tự lọc bỏ hoặc đổi rank vì phạt đóng cửa sớm (CLOSING_SOON — FE-26).
 * - Chỉ trả về viewerFeature của riêng `currentViewerId` (FE-27).
 */
export function selectComputedRecommendations(state: RecommendationState): {
  places: (RecommendationPlaceItem & {
    viewerFeature: ViewerFeature;
  })[];
  runWarnings: RecommendationWarningCode[];
} {
  const {
    basePlaces,
    memberTravelModes,
    effectiveRoutingPreference,
    openingFilter,
    weatherPolicy,
    simulateWeatherFilterRelaxed,
    currentViewerId,
    sortBy,
  } = state;

  const runWarnings: RecommendationWarningCode[] = [];
  if (effectiveRoutingPreference === 'TRAFFIC_UNAWARE') {
    runWarnings.push('TRAFFIC_DATA_UNAVAILABLE');
  }
  if (weatherPolicy === 'FILTER_OUTDOOR' && simulateWeatherFilterRelaxed) {
    runWarnings.push('WEATHER_FILTER_RELAXED');
  }

  // Bước 1: Tính toán lại ETA theo phương tiện (TWO_WHEELER vs DRIVE) và Traffic
  const adjusted = basePlaces.map((place) => {
    const memberEtas = place.memberEtas.map((m) => {
      const mode = memberTravelModes[m.participantId] ?? 'TWO_WHEELER';
      // DRIVE trong nội đô giờ cao điểm thường lâu hơn xe máy ~25%
      const modeMultiplier = mode === 'DRIVE' ? 1.25 : 1.0;
      const baseEta =
        effectiveRoutingPreference === 'TRAFFIC_AWARE'
          ? m.etaSeconds
          : m.staticDurationSeconds;
      const computedEtaSeconds = Math.round((baseEta * modeMultiplier) / 60) * 60;
      const computedStaticSeconds =
        Math.round((m.staticDurationSeconds * modeMultiplier) / 60) * 60;

      return {
        ...m,
        travelMode: mode,
        etaSeconds: computedEtaSeconds,
        staticDurationSeconds: computedStaticSeconds,
      };
    });

    const etas = memberEtas.map((m) => m.etaSeconds);
    const avgEtaSeconds =
      etas.length > 0
        ? Math.round(etas.reduce((a, b) => a + b, 0) / etas.length)
        : place.avgEtaSeconds;
    const maxEtaSeconds = etas.length > 0 ? Math.max(...etas) : place.maxEtaSeconds;
    const minEtaSeconds = etas.length > 0 ? Math.min(...etas) : place.avgEtaSeconds;

    const firstViewerFeature = Object.values(place.viewerFeaturesByMember)[0];
    const fallbackEmptyViewer: ViewerFeature = {
      participantId: currentViewerId,
      etaSeconds: avgEtaSeconds,
      staticDurationSeconds: avgEtaSeconds,
      distanceMeters: 0,
      travelMode: 'TWO_WHEELER',
      matchedTags: [],
      travelUtility: 0,
      preferenceUtility: 0,
      placeQualityUtility: 0,
      memberUtility: 0,
    };
    const rawViewer =
      place.viewerFeaturesByMember[currentViewerId] ??
      place.viewerFeaturesByMember.u1 ??
      firstViewerFeature ??
      fallbackEmptyViewer;
    const viewerEtaItem = memberEtas.find((m) => m.participantId === currentViewerId) ??
      memberEtas[0] ?? {
        etaSeconds: rawViewer.etaSeconds,
        staticDurationSeconds: rawViewer.staticDurationSeconds,
        travelMode: rawViewer.travelMode,
      };

    // Điều chỉnh nhẹ travelUtility của viewer nếu đổi sang ô tô làm tăng ETA
    const travelPenalty =
      viewerEtaItem.travelMode === 'DRIVE' ? -0.05 : 0;
    const adjustedTravelUtility = Math.max(
      0.1,
      Math.min(0.99, Number((rawViewer.travelUtility + travelPenalty).toFixed(2)))
    );
    const adjustedMemberUtility = Math.max(
      0.1,
      Math.min(
        0.99,
        Number(
          (
            adjustedTravelUtility * 0.45 +
            rawViewer.preferenceUtility * 0.35 +
            rawViewer.placeQualityUtility * 0.2
          ).toFixed(2)
        )
      )
    );

    const viewerFeature: ViewerFeature = {
      ...rawViewer,
      participantId: currentViewerId,
      etaSeconds: viewerEtaItem.etaSeconds,
      staticDurationSeconds: viewerEtaItem.staticDurationSeconds,
      travelMode: viewerEtaItem.travelMode,
      travelUtility: adjustedTravelUtility,
      memberUtility: adjustedMemberUtility,
    };

    return {
      ...place,
      avgEtaSeconds,
      maxEtaSeconds,
      etaRangeSeconds: maxEtaSeconds - minEtaSeconds,
      memberEtas,
      viewerFeature,
    };
  });

  // Bước 2: Áp dụng bộ lọc Giờ mở cửa (FE-23)
  let filtered = adjusted.filter((place) => {
    if (openingFilter === 'OPEN_AT_SCHEDULED_TIME') {
      // Giữ các quán OPEN hoặc UNKNOWN (kèm cảnh báo), chỉ loại quán chắc chắn CLOSED tại giờ hẹn
      return place.opening.statusAtScheduled !== 'CLOSED';
    }
    if (openingFilter === 'OPEN_AT_REQUEST_TIME') {
      return place.opening.openNow === true;
    }
    return true; // 'ANY'
  });

  // Bước 3: Áp dụng chính sách Thời tiết (FE-25)
  if (weatherPolicy === 'FILTER_OUTDOOR' && !simulateWeatherFilterRelaxed) {
    const withoutBadOutdoor = filtered.filter(
      (p) => !(p.weather.outdoorExposure === 'OUTDOOR' && p.weather.hasWeatherWarning)
    );
    if (withoutBadOutdoor.length > 0) {
      filtered = withoutBadOutdoor;
    } else if (!runWarnings.includes('WEATHER_FILTER_RELAXED')) {
      runWarnings.push('WEATHER_FILTER_RELAXED');
    }
  }

  // Bước 4: Sắp xếp hiển thị (Mặc định 'rank' giữ nguyên thứ tự chuẩn của Backend; không bao giờ tự đổi rank vì CLOSING_SOON)
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rank') return a.rank - b.rank;
    if (sortBy === 'avgEta') return a.avgEtaSeconds - b.avgEtaSeconds;
    if (sortBy === 'maxEta') return a.maxEtaSeconds - b.maxEtaSeconds;
    if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
    return a.rank - b.rank;
  });

  return { places: sorted, runWarnings };
}

