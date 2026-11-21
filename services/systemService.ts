/**
 * System health & readiness HTTP service (/health, /health/ready).
 */
import { isAxiosError } from 'axios';
import { apiClient, toApiError } from '@/services/apiClient';
import type { HealthResponse, NotReadyResponse, ReadyResponse } from '@/types/api';

const HEALTH_TIMEOUT_MS = 6_000;

export const systemService = {
  /** GET /health */
  async getHealth(): Promise<HealthResponse> {
    try {
      const { data } = await apiClient.get<HealthResponse>('/health', {
        skipAuth: true,
        timeout: HEALTH_TIMEOUT_MS,
      });
      return data;
    } catch (err) {
      throw toApiError(err);
    }
  },

  /** GET /health/ready */
  async getReadiness(): Promise<ReadyResponse | NotReadyResponse> {
    try {
      const { data } = await apiClient.get<ReadyResponse | NotReadyResponse>('/health/ready', {
        skipAuth: true,
        timeout: HEALTH_TIMEOUT_MS,
      });
      return data;
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 503) {
        const body = err.response.data as { status?: unknown } | undefined;
        if (body?.status === 'not_ready') {
          return { status: 'not_ready' };
        }
      }
      throw toApiError(err);
    }
  },
};

