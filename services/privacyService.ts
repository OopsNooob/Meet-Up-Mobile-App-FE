/**
 * Privacy settings HTTP service calling /auth/privacy endpoints via apiClient.
 */
import { apiClient, toApiError } from '@/services/apiClient';
import type {
  PrivacySettingsResponse,
  SavePrivacySettingsRequest,
  UUID,
} from '@/types/api';

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toApiError(err);
  }
}

export const privacyService = {
  /** GET /auth/privacy */
  getSettings(): Promise<PrivacySettingsResponse> {
    return call(async () => {
      const { data } = await apiClient.get<PrivacySettingsResponse>('/auth/privacy');
      return data;
    });
  },

  /** PUT /auth/privacy */
  saveSettings(payload: SavePrivacySettingsRequest): Promise<PrivacySettingsResponse> {
    return call(async () => {
      const { data } = await apiClient.put<PrivacySettingsResponse>('/auth/privacy', payload);
      return data;
    });
  },

  /** DELETE /auth/privacy/selected-friends/:friendId */
  removeSelectedFriend(friendId: UUID): Promise<void> {
    return call(async () => {
      await apiClient.delete(
        `/auth/privacy/selected-friends/${encodeURIComponent(friendId)}`
      );
    });
  },
};
