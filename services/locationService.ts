/**
 * Location HTTP service calling real Backend endpoints (/locations/*).
 */
import { apiClient, toApiError } from '@/services/apiClient';
import type {
  LocationPermissionParams,
  LocationPermissionResponse,
  ProjectedLocationResponse,
  PublishLocationRequest,
  PublishLocationResponse,
} from '@/types/api';

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toApiError(err);
  }
}

export const locationService = {
  /** POST /locations */
  publishLocation(payload: PublishLocationRequest): Promise<PublishLocationResponse> {
    return call(async () => {
      const { data } = await apiClient.post<PublishLocationResponse>('/locations', payload);
      return data;
    });
  },

  /** GET /locations/:ownerId */
  getProjectedLocation(params: LocationPermissionParams): Promise<ProjectedLocationResponse | null> {
    return call(async () => {
      const { ownerId, scope, meetupId } = params;
      const { data } = await apiClient.get<ProjectedLocationResponse | null>(
        `/locations/${encodeURIComponent(ownerId)}`,
        {
          params: {
            ...(scope ? { scope } : {}),
            ...(meetupId ? { meetupId } : {}),
          },
        }
      );
      return data;
    });
  },

  /** GET /locations/permissions/:ownerId */
  checkPermission(params: LocationPermissionParams): Promise<LocationPermissionResponse> {
    return call(async () => {
      const { ownerId, scope, meetupId } = params;
      const { data } = await apiClient.get<LocationPermissionResponse>(
        `/locations/permissions/${encodeURIComponent(ownerId)}`,
        {
          params: {
            ...(scope ? { scope } : {}),
            ...(meetupId ? { meetupId } : {}),
          },
        }
      );
      return data;
    });
  },
};

