/**
 * Recommendation, voting, finalization, and favorite place HTTP service.
 */
import { apiClient, toApiError } from '@/services/apiClient';
import { generateUuidV4 } from '@/utils/uuid';
import type {
  CandidateSearchResponse,
  CastMeetupVoteResponse,
  CreateRecommendationRunRequest,
  FavoritePlaceResponse,
  FinalizeMeetupResponse,
  MeetupDetailResponse,
  MeetupListResponse,
  MeetupPageParams,
  RecommendationEventReceiptResponse,
  RecommendationRunResponse,
  RecordRecommendationFeedbackRequest,
  RecordRecommendationImpressionRequest,
  ReplayRecommendationRunResponse,
  UUID,
} from '@/types/api';

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toApiError(err);
  }
}

export const recommendationService = {
  /** GET /meetups */
  listMeetups(params?: MeetupPageParams): Promise<MeetupListResponse> {
    return call(async () => {
      const { data } = await apiClient.get<MeetupListResponse>('/meetups', { params });
      return data;
    });
  },

  /** GET /meetups/:meetupId */
  getMeetupDetail(meetupId: UUID): Promise<MeetupDetailResponse> {
    return call(async () => {
      const { data } = await apiClient.get<MeetupDetailResponse>(
        `/meetups/${encodeURIComponent(meetupId)}`
      );
      return data;
    });
  },

  /** POST /meetups/:meetupId/recommendations/candidates */
  searchCandidates(meetupId: UUID): Promise<CandidateSearchResponse> {
    return call(async () => {
      const { data } = await apiClient.post<CandidateSearchResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/recommendations/candidates`
      );
      return data;
    });
  },

  /** POST /meetups/:meetupId/recommendation-runs */
  createRun(
    meetupId: UUID,
    payload: CreateRecommendationRunRequest,
    idempotencyKey?: UUID
  ): Promise<RecommendationRunResponse> {
    const key = idempotencyKey ?? payload.requestId ?? generateUuidV4();
    return call(async () => {
      const { data } = await apiClient.post<RecommendationRunResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/recommendation-runs`,
        {
          ...payload,
          requestId: payload.requestId ?? key,
        },
        {
          headers: {
            'Idempotency-Key': key,
          },
        }
      );
      return data;
    });
  },

  /** GET /meetups/:meetupId/recommendation-runs/:runId */
  getRun(meetupId: UUID, runId: UUID): Promise<RecommendationRunResponse> {
    return call(async () => {
      const { data } = await apiClient.get<RecommendationRunResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/recommendation-runs/${encodeURIComponent(runId)}`
      );
      return data;
    });
  },

  /** POST /meetups/:meetupId/recommendation-runs/:runId/impressions */
  recordImpression(
    meetupId: UUID,
    runId: UUID,
    payload: RecordRecommendationImpressionRequest
  ): Promise<RecommendationEventReceiptResponse> {
    return call(async () => {
      const { data } = await apiClient.post<RecommendationEventReceiptResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/recommendation-runs/${encodeURIComponent(runId)}/impressions`,
        payload
      );
      return data;
    });
  },

  /** POST /meetups/:meetupId/recommendation-runs/:runId/feedback-events */
  recordFeedback(
    meetupId: UUID,
    runId: UUID,
    payload: RecordRecommendationFeedbackRequest
  ): Promise<RecommendationEventReceiptResponse> {
    return call(async () => {
      const { data } = await apiClient.post<RecommendationEventReceiptResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/recommendation-runs/${encodeURIComponent(runId)}/feedback-events`,
        payload
      );
      return data;
    });
  },

  /** POST /meetups/:meetupId/recommendation-runs/:runId/replay */
  replayRun(meetupId: UUID, runId: UUID): Promise<ReplayRecommendationRunResponse> {
    return call(async () => {
      const { data } = await apiClient.post<ReplayRecommendationRunResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/recommendation-runs/${encodeURIComponent(runId)}/replay`
      );
      return data;
    });
  },

  /** PUT /meetups/:meetupId/recommendation-runs/:runId/vote */
  castVote(
    meetupId: UUID,
    runId: UUID,
    recommendationPlaceId: UUID
  ): Promise<CastMeetupVoteResponse> {
    return call(async () => {
      const { data } = await apiClient.put<CastMeetupVoteResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/recommendation-runs/${encodeURIComponent(runId)}/vote`,
        { recommendationPlaceId }
      );
      return data;
    });
  },

  /** POST /meetups/:meetupId/recommendation-runs/:runId/finalize */
  finalizeMeetup(
    meetupId: UUID,
    runId: UUID,
    recommendationPlaceId?: UUID
  ): Promise<FinalizeMeetupResponse> {
    return call(async () => {
      const { data } = await apiClient.post<FinalizeMeetupResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/recommendation-runs/${encodeURIComponent(runId)}/finalize`,
        recommendationPlaceId ? { recommendationPlaceId } : {}
      );
      return data;
    });
  },

  /** GET /favorites/places */
  listFavorites(): Promise<FavoritePlaceResponse[]> {
    return call(async () => {
      const { data } = await apiClient.get<FavoritePlaceResponse[]>('/favorites/places');
      return data;
    });
  },

  /** POST /favorites/places */
  addFavorite(placeId: string): Promise<FavoritePlaceResponse> {
    return call(async () => {
      const { data } = await apiClient.post<FavoritePlaceResponse>('/favorites/places', {
        placeId,
      });
      return data;
    });
  },

  /** DELETE /favorites/places/:placeId */
  removeFavorite(placeId: string): Promise<void> {
    return call(async () => {
      await apiClient.delete(`/favorites/places/${encodeURIComponent(placeId)}`);
    });
  },
};

