/**
 * Push notification device token registration HTTP service (/notifications/devices).
 */
import { apiClient, toApiError } from '@/services/apiClient';
import type {
  DeviceTokenMutationResponse,
  RegisterDeviceTokenRequest,
  UpdateDeviceTokenRequest,
  UUID,
} from '@/types/api';

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toApiError(err);
  }
}

export const notificationService = {
  /** POST /notifications/devices */
  registerDeviceToken(payload: RegisterDeviceTokenRequest): Promise<DeviceTokenMutationResponse> {
    return call(async () => {
      const { data } = await apiClient.post<DeviceTokenMutationResponse>(
        '/notifications/devices',
        payload
      );
      return data;
    });
  },

  /** PUT /notifications/devices/:deviceTokenId */
  updateDeviceToken(
    deviceTokenId: UUID,
    payload: UpdateDeviceTokenRequest
  ): Promise<DeviceTokenMutationResponse> {
    return call(async () => {
      const { data } = await apiClient.put<DeviceTokenMutationResponse>(
        `/notifications/devices/${encodeURIComponent(deviceTokenId)}`,
        payload
      );
      return data;
    });
  },

  /** DELETE /notifications/devices/:deviceTokenId */
  revokeDeviceToken(deviceTokenId: UUID): Promise<void> {
    return call(async () => {
      await apiClient.delete(`/notifications/devices/${encodeURIComponent(deviceTokenId)}`);
    });
  },
};

