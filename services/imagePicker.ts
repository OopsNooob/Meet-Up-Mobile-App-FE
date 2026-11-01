import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { AvatarFile } from '@/services/profileService';

/**
 * Chọn/chụp ảnh avatar (FE-02): xin quyền → mở picker (cắt vuông) → resize + nén JPEG.
 * Không bao giờ ném lỗi — màn hình xử lý theo `status`.
 */

export type ImageSource = 'library' | 'camera';

export type PickImageResult =
  | { status: 'picked'; file: AvatarFile }
  | { status: 'cancelled' }
  /** Người dùng từ chối quyền → màn hình giải thích + mở Cài đặt */
  | { status: 'denied'; source: ImageSource }
  /** Thiết bị không có camera, nén ảnh lỗi... */
  | { status: 'error' };

const AVATAR_MAX_SIZE_PX = 512;
const AVATAR_JPEG_QUALITY = 0.7;

async function requestPermission(source: ImageSource): Promise<boolean> {
  const response =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return response.granted;
}

async function compress(asset: ImagePicker.ImagePickerAsset): Promise<AvatarFile> {
  const context = ImageManipulator.manipulate(asset.uri);
  // Web không có màn cắt ảnh (allowsEditing bị bỏ qua) → tự cắt vuông ở giữa. Native đã cắt vuông nên bỏ qua.
  const side = Math.min(asset.width, asset.height);
  if (side > 0 && asset.width !== asset.height) {
    context.crop({
      originX: Math.floor((asset.width - side) / 2),
      originY: Math.floor((asset.height - side) / 2),
      width: side,
      height: side,
    });
  }
  if (side > AVATAR_MAX_SIZE_PX) {
    context.resize({ width: AVATAR_MAX_SIZE_PX, height: AVATAR_MAX_SIZE_PX });
  }
  const image = await context.renderAsync();
  try {
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: AVATAR_JPEG_QUALITY });
    return { uri: result.uri, mimeType: 'image/jpeg', fileName: `avatar-${Date.now()}.jpg` };
  } finally {
    image.release();
    context.release();
  }
}

export async function pickAvatarImage(source: ImageSource): Promise<PickImageResult> {
  try {
    if (!(await requestPermission(source))) return { status: 'denied', source };

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 1 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };

    return { status: 'picked', file: await compress(result.assets[0]) };
  } catch {
    return { status: 'error' };
  }
}
