/**
 * Điểm import DUY NHẤT cho react-native-maps ở màn dùng chung native + web.
 * react-native-maps chỉ chạy native; trên web Metro tự chọn NativeMap.web.tsx (khung giữ chỗ)
 * để static render của Expo Router không bị lỗi `codegenNativeComponent is not a function`.
 */
export { default, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
