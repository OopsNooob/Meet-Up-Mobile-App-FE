import { PrivacySettings, SavePrivacySettingsPayload, LocationPermissionCheckResult } from '../types/privacy';

/**
 * Service API cho Location Privacy (BE-01 S2)
 * Swagger group: Location privacy
 * Base URLs: /api/v1/auth/privacy và /api/v1/locations/permissions/:ownerId
 */

const API_BASE_URL = 'http://10.0.2.2:3000/api/v1';

export const privacyService = {
  /**
   * GET /api/v1/auth/privacy
   * Đọc cài đặt quyền riêng tư vị trí của actor hiện tại
   */
  async getSettings(token?: string): Promise<PrivacySettings> {
    if (!token) {
      // Mock fallback
      return {
        sharingMode: 'friends',
        sharingExpiresAt: null,
        isLocationSharingEnabled: true,
        useApproximateLocation: false,
        nearbyFeatureEnabled: true,
        selectedFriendIds: ['u2', 'u3'],
        updatedAt: new Date().toISOString(),
      };
    }

    const res = await fetch(`${API_BASE_URL}/auth/privacy`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-store',
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch privacy settings: ${res.status}`);
    return res.json();
  },

  /**
   * PUT /api/v1/auth/privacy
   * Thay thế toàn bộ cài đặt của actor
   */
  async saveSettings(payload: SavePrivacySettingsPayload, token?: string): Promise<PrivacySettings> {
    if (!token) {
      return {
        ...payload,
        isLocationSharingEnabled:
          payload.sharingMode !== 'off' &&
          (!payload.sharingExpiresAt || new Date(payload.sharingExpiresAt).getTime() > Date.now()),
        updatedAt: new Date().toISOString(),
      };
    }

    const res = await fetch(`${API_BASE_URL}/auth/privacy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to save privacy settings: ${res.status}`);
    return res.json();
  },

  /**
   * DELETE /api/v1/auth/privacy/selected-friends/:friendId
   * Bỏ một người khỏi danh sách selectedFriendIds (idempotent)
   */
  async removeSelectedFriend(friendId: string, token?: string): Promise<void> {
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/auth/privacy/selected-friends/${friendId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-store',
      },
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to delete selected friend: ${res.status}`);
    }
  },

  /**
   * GET /api/v1/locations/permissions/:ownerId
   * Kiểm tra xem actor có quyền xem vị trí của owner không
   */
  async checkPermission(
    ownerId: string,
    scope: 'friends' | 'meetup' = 'friends',
    meetupId?: string,
    token?: string
  ): Promise<LocationPermissionCheckResult> {
    if (!token) {
      return { allowed: true, precision: 'precise', expiresAt: null };
    }

    const query = new URLSearchParams({ scope });
    if (meetupId) query.append('meetupId', meetupId);

    const res = await fetch(`${API_BASE_URL}/locations/permissions/${ownerId}?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-store',
      },
    });
    if (!res.ok) {
      return { allowed: false, precision: null, expiresAt: null };
    }
    return res.json();
  },
};
