const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_REGEX = /^0[1-9]\d{8}$/;

export const isValidEmailInput = (raw) => {
  const clean = String(raw || '').trim().toLowerCase();
  return Boolean(clean && clean.length <= 150 && EMAIL_REGEX.test(clean));
};

/**
 * Chuẩn hóa số điện thoại Việt Nam (+84... / 84... -> 0..., đúng 10 chữ số).
 * Trả về chuỗi chuẩn hóa hoặc '' nếu không hợp lệ.
 */
export const normalizeVietnamPhoneInput = (raw) => {
  let clean = String(raw || '').trim().replace(/[\s.\-()]/g, '');
  if (!clean) return '';

  if (clean.startsWith('+84')) {
    clean = `0${clean.slice(3).replace(/^0/, '')}`;
  } else if (clean.startsWith('84') && clean.length >= 11) {
    clean = `0${clean.slice(2).replace(/^0/, '')}`;
  }

  return VN_PHONE_REGEX.test(clean) ? clean : '';
};

/**
 * Phân tích input người dùng nhập (Email hoặc Số điện thoại Việt Nam).
 */
export const detectAuthIdentifier = (raw) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { valid: false, type: 'unknown', normalized: '', looksLikePhone: false };
  }

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    return {
      valid: isValidEmailInput(email),
      type: 'email',
      normalized: email,
      looksLikePhone: false,
    };
  }

  const compact = trimmed.replace(/[\s.\-()]/g, '');
  const looksLikePhone = /^(\+?84|0)\d*$/.test(compact) && !/[a-zA-Z]/.test(compact);
  const normalizedPhone = normalizeVietnamPhoneInput(compact);

  if (normalizedPhone) {
    return {
      valid: true,
      type: 'phone',
      normalized: normalizedPhone,
      looksLikePhone: true,
    };
  }

  return {
    valid: false,
    type: looksLikePhone ? 'phone' : 'unknown',
    normalized: compact,
    looksLikePhone,
  };
};
