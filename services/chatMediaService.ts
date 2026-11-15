/**
 * Dịch vụ chọn tệp, chọn ảnh từ thư viện / camera, tải tệp về thiết bị và lấy tọa độ GPS thực tế cho Chat
 */
import { Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import type { ChatAttachmentItem, ChatLocationData } from '@/components/meetup/ChatBubble';

export type ChatPickResult =
  | { status: 'picked'; items: ChatAttachmentItem[] }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'error' };

export type ChatLocationResult =
  | { status: 'ok'; location: ChatLocationData }
  | { status: 'denied' }
  | { status: 'error' };

export type ChatDownloadResult =
  | { status: 'saved'; fileName: string }
  | { status: 'cancelled' }
  | { status: 'error' };

export async function pickChatImagesFromLibrary(maxCount: number): Promise<ChatPickResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, maxCount),
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) {
      return { status: 'cancelled' };
    }

    const now = Date.now();
    const items: ChatAttachmentItem[] = result.assets.slice(0, maxCount).map((asset, idx) => ({
      id: `img_${now}_${idx}`,
      uri: asset.uri,
      fileName: asset.fileName || `photo-${now}-${idx + 1}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
      bytes: asset.fileSize || 350 * 1024,
      kind: 'image',
      width: asset.width,
      height: asset.height,
    }));

    return { status: 'picked', items };
  } catch {
    return { status: 'error' };
  }
}

export async function captureChatPhoto(): Promise<ChatPickResult> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { status: 'cancelled' };
    }

    const asset = result.assets[0];
    const now = Date.now();
    return {
      status: 'picked',
      items: [
        {
          id: `cam_${now}`,
          uri: asset.uri,
          fileName: asset.fileName || `camera-${now}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          bytes: asset.fileSize || 420 * 1024,
          kind: 'image',
          width: asset.width,
          height: asset.height,
        },
      ],
    };
  } catch {
    return { status: 'error' };
  }
}

export async function pickChatDocuments(maxCount: number): Promise<ChatPickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) {
      return { status: 'cancelled' };
    }

    const now = Date.now();
    const items: ChatAttachmentItem[] = result.assets.slice(0, maxCount).map((asset, idx) => {
      const mimeType = asset.mimeType || 'application/octet-stream';
      const kind = mimeType.startsWith('image/') ? 'image' : 'file';
      return {
        id: `doc_${now}_${idx}`,
        uri: asset.uri,
        fileName: asset.name,
        mimeType,
        bytes: asset.size || 128 * 1024,
        kind,
      };
    });

    return { status: 'picked', items };
  } catch {
    return { status: 'error' };
  }
}

export async function getCurrentChatLocation(): Promise<ChatLocationResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };

    let pos: Location.LocationObject | null = null;
    try {
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      pos = await Location.getLastKnownPositionAsync();
    }

    if (!pos) {
      return { status: 'error' };
    }

    const { latitude, longitude, accuracy } = pos.coords;
    let address: string | undefined;

    try {
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded.length > 0) {
        const g = geocoded[0];
        const streetPart =
          [g.streetNumber, g.street].filter(Boolean).join(' ') || g.name || undefined;
        const parts = [
          streetPart,
          g.subregion || g.district || undefined,
          g.city || g.region || undefined,
        ].filter((part): part is string => Boolean(part && part.trim().length > 0));
        if (parts.length > 0) {
          address = parts.join(', ');
        } else if (g.formattedAddress) {
          address = g.formattedAddress;
        }
      }
    } catch {
      // Reverse geocoding can fail offline; coordinates are still valid
    }

    return {
      status: 'ok',
      location: {
        latitude,
        longitude,
        address,
        accuracy: accuracy ?? undefined,
      },
    };
  } catch {
    return { status: 'error' };
  }
}

export async function downloadChatAttachmentToDevice(
  att: ChatAttachmentItem
): Promise<ChatDownloadResult> {
  try {
    const safeName =
      att.fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || `attachment-${Date.now()}`;
    const cacheRoot = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const cacheUri = `${cacheRoot}${Date.now()}_${safeName}`;
    let sourceUri = '';

    if (att.uri && (att.uri.startsWith('http://') || att.uri.startsWith('https://'))) {
      const dl = await FileSystem.downloadAsync(att.uri, cacheUri);
      sourceUri = dl.uri;
    } else if (att.uri) {
      try {
        await FileSystem.copyAsync({ from: att.uri, to: cacheUri });
        sourceUri = cacheUri;
      } catch {
        sourceUri = att.uri;
      }
    } else if (att.kind === 'image' || att.mimeType.startsWith('image/')) {
      const resolved = Image.resolveAssetSource(require('@/assets/images/logo-glow.png'))?.uri;
      if (!resolved) return { status: 'error' };
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        const dl = await FileSystem.downloadAsync(resolved, cacheUri);
        sourceUri = dl.uri;
      } else {
        await FileSystem.copyAsync({ from: resolved, to: cacheUri });
        sourceUri = cacheUri;
      }
    } else {
      await FileSystem.writeAsStringAsync(
        cacheUri,
        `MeetUp Attachment\nFile: ${att.fileName}\nMIME: ${att.mimeType}\nSize: ${att.bytes} bytes\n`,
        { encoding: 'utf8' }
      );
      sourceUri = cacheUri;
    }

    if (Platform.OS === 'android') {
      const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm.granted) {
        return { status: 'cancelled' };
      }

      const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: 'base64',
      });
      const dotIdx = att.fileName.lastIndexOf('.');
      const baseName = dotIdx > 0 ? att.fileName.slice(0, dotIdx) : att.fileName;
      const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        baseName,
        att.mimeType || 'application/octet-stream'
      );
      await FileSystem.StorageAccessFramework.writeAsStringAsync(destUri, base64Data, {
        encoding: 'base64',
      });
      return { status: 'saved', fileName: att.fileName };
    }

    const docRoot = FileSystem.documentDirectory || cacheRoot;
    const destUri = `${docRoot}${safeName}`;
    if (sourceUri !== destUri) {
      await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    }
    return { status: 'saved', fileName: att.fileName };
  } catch {
    return { status: 'error' };
  }
}
