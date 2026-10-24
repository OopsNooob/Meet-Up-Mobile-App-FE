import { Alert, Platform } from 'react-native';
import i18n from '@/locales/i18n';
import { USE_MOCK_API, type ApiError } from '@/services/apiClient';
import { MOCK_GOOGLE_ID_TOKEN } from '@/services/mock/mockAuthServer';

export type GoogleSignInResult = { type: 'success'; idToken: string } | { type: 'cancelled' };

/**
 * Lấy Google ID token để gửi cho backend (POST /auth/google).
 * Người dùng hủy → `{ type: 'cancelled' }` (KHÔNG phải lỗi, UI không hiện thông báo lỗi).
 *
 * TODO FE-01 (khi có Google OAuth Client ID + development build):
 *   Expo khuyên dùng thư viện native `@react-native-google-signin/google-signin`
 *   (https://docs.expo.dev/guides/google-authentication/) — không chạy trên Expo Go.
 *   1. `npx expo install @react-native-google-signin/google-signin`, thêm config plugin vào app.json
 *   2. GoogleSignin.configure({ webClientId }) — webClientId là client mà backend dùng để verify idToken
 *   3. Thay nhánh "chưa cấu hình" bên dưới bằng GoogleSignin.signIn():
 *        - response.type === 'cancelled' → return { type: 'cancelled' }
 *        - success → return { type: 'success', idToken: response.data.idToken }
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (USE_MOCK_API) return mockGoogleSignIn();
  throw { code: 'google_unavailable' } satisfies ApiError;
}

/** Giả lập hộp thoại chọn tài khoản Google: cho phép test cả nhánh thành công lẫn người dùng hủy */
function mockGoogleSignIn(): Promise<GoogleSignInResult> {
  const success: GoogleSignInResult = { type: 'success', idToken: MOCK_GOOGLE_ID_TOKEN };
  const cancelled: GoogleSignInResult = { type: 'cancelled' };
  const title = i18n.t('auth.google_mock_title');
  const message = i18n.t('auth.google_mock_message');

  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n${message}`) ? success : cancelled);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(cancelled) },
        { text: i18n.t('auth.google_mock_continue'), onPress: () => resolve(success) },
      ],
      { cancelable: true, onDismiss: () => resolve(cancelled) },
    );
  });
}