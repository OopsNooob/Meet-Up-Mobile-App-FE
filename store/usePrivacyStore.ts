import { create } from 'zustand';
import { PrivacySettings, SharingMode, SelectedFriend } from '../types/privacy';

export const MOCK_FRIENDS: SelectedFriend[] = [
  { id: 'u2', displayName: 'Huy Tran', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' },
  { id: 'u3', displayName: 'Bao Linh', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { id: 'u4', displayName: 'Minh Khoa', avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop' },
  { id: 'u5', displayName: 'Thu Ha', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
];

interface PrivacyStoreState {
  settings: PrivacySettings;
  availableFriends: SelectedFriend[];
  // Actions
  setSharingMode: (mode: SharingMode) => void;
  setSharingExpiresAt: (expiresAt: string | null) => void;
  setUseApproximateLocation: (val: boolean) => void;
  setNearbyFeatureEnabled: (val: boolean) => void;
  addSelectedFriend: (friendId: string) => void;
  removeSelectedFriend: (friendId: string) => void;
  setSelectedFriends: (friendIds: string[]) => void;
  isEffectiveSharingActive: () => boolean;
}

export const usePrivacyStore = create<PrivacyStoreState>((set, get) => ({
  settings: {
    sharingMode: 'friends',
    sharingExpiresAt: null,
    isLocationSharingEnabled: true,
    useApproximateLocation: false,
    nearbyFeatureEnabled: true,
    selectedFriendIds: ['u2', 'u3'],
    updatedAt: new Date().toISOString(),
  },
  availableFriends: MOCK_FRIENDS,

  setSharingMode: (mode: SharingMode) => {
    set((state) => {
      const now = new Date();
      let expiresAt = state.settings.sharingExpiresAt;
      let selectedIds = [...state.settings.selectedFriendIds];

      // Theo BE aggregate invariant: 'off' bắt buộc expiry = null và selectedFriendIds = []
      if (mode === 'off') {
        expiresAt = null;
        selectedIds = [];
      } else if (mode === 'selected_friends' && selectedIds.length === 0) {
        // Mặc định chọn 1 bạn bè nếu chuyển sang mode này để tránh invariant violation
        selectedIds = [state.availableFriends[0]?.id || 'u2'];
      }

      const isSharingEnabled =
        mode !== 'off' && (!expiresAt || new Date(expiresAt).getTime() > now.getTime());

      return {
        settings: {
          ...state.settings,
          sharingMode: mode,
          sharingExpiresAt: expiresAt,
          selectedFriendIds: selectedIds,
          isLocationSharingEnabled: isSharingEnabled,
          updatedAt: now.toISOString(),
        },
      };
    });
  },

  setSharingExpiresAt: (expiresAt: string | null) => {
    set((state) => {
      const now = new Date();
      const isSharingEnabled =
        state.settings.sharingMode !== 'off' &&
        (!expiresAt || new Date(expiresAt).getTime() > now.getTime());

      return {
        settings: {
          ...state.settings,
          sharingExpiresAt: expiresAt,
          isLocationSharingEnabled: isSharingEnabled,
          updatedAt: now.toISOString(),
        },
      };
    });
  },

  setUseApproximateLocation: (useApproximateLocation: boolean) => {
    set((state) => ({
      settings: {
        ...state.settings,
        useApproximateLocation,
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  setNearbyFeatureEnabled: (nearbyFeatureEnabled: boolean) => {
    set((state) => ({
      settings: {
        ...state.settings,
        nearbyFeatureEnabled,
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  addSelectedFriend: (friendId: string) => {
    set((state) => {
      if (state.settings.selectedFriendIds.includes(friendId)) return state;
      const updated = [...state.settings.selectedFriendIds, friendId];
      return {
        settings: {
          ...state.settings,
          selectedFriendIds: updated,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  removeSelectedFriend: (friendId: string) => {
    set((state) => {
      const updated = state.settings.selectedFriendIds.filter((id) => id !== friendId);
      let mode = state.settings.sharingMode;

      // Logic BE: aggregate tự động downgrade sang 'friends' nếu bỏ người cuối cùng trong mode selected_friends
      if (mode === 'selected_friends' && updated.length === 0) {
        mode = 'friends';
      }

      return {
        settings: {
          ...state.settings,
          selectedFriendIds: updated,
          sharingMode: mode,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  setSelectedFriends: (friendIds: string[]) => {
    set((state) => {
      let mode = state.settings.sharingMode;
      if (mode === 'selected_friends' && friendIds.length === 0) {
        mode = 'friends';
      }
      return {
        settings: {
          ...state.settings,
          selectedFriendIds: friendIds,
          sharingMode: mode,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  isEffectiveSharingActive: () => {
    const s = get().settings;
    if (s.sharingMode === 'off') return false;
    if (!s.sharingExpiresAt) return true;
    return new Date(s.sharingExpiresAt).getTime() > Date.now();
  },
}));
