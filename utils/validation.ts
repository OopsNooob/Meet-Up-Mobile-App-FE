/**
 * Validate form phía client. Trả về i18n key (nhóm `validation.*`) thay vì chuỗi để màn hình tự dịch:
 *   t(errors.email, { min: PASSWORD_MIN_LENGTH })
 */

export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MAX_LENGTH = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const hasErrors = (errors: FieldErrors<string>) => Object.values(errors).some(Boolean);

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'validation.email_required';
  if (!EMAIL_PATTERN.test(value)) return 'validation.email_invalid';
}

export function validateLogin(input: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  return {
    email: validateEmail(input.email),
    // Đăng nhập chỉ kiểm tra trống: không áp quy tắc độ dài để không chặn tài khoản cũ nếu chính sách đổi
    password: input.password ? undefined : 'validation.password_required',
  };
}

type RegisterField = 'displayName' | 'email' | 'password' | 'confirmPassword';

export function validateRegister(input: Record<RegisterField, string>): FieldErrors<RegisterField> {
  const name = input.displayName.trim();
  return {
    displayName: !name
      ? 'validation.display_name_required'
      : name.length > DISPLAY_NAME_MAX_LENGTH
        ? 'validation.display_name_too_long'
        : undefined,
    email: validateEmail(input.email),
    password: !input.password
      ? 'validation.password_required'
      : input.password.length < PASSWORD_MIN_LENGTH
        ? 'validation.password_too_short'
        : undefined,
    confirmPassword: !input.confirmPassword
      ? 'validation.confirm_password_required'
      : input.confirmPassword !== input.password
        ? 'validation.confirm_password_mismatch'
        : undefined,
  };
}