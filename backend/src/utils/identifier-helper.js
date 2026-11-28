import crypto from 'crypto';

export const USER_SAFE_PROJECTION =
  '-password -rawPassword -otp -otpCode -otpHash -otpExpires -otpAttempts -otpLastSentAt -otpPurpose -otpTargetEmail -resetPasswordToken';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_REGEX = /^0[1-9]\d{8}$/;

/**
 * Normalizes and validates an email address.
 */
export const normalizeEmail = (raw) => {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
};

export const isValidEmail = (raw) => {
  const clean = normalizeEmail(raw);
  return Boolean(clean && clean.length <= 150 && EMAIL_REGEX.test(clean));
};

/**
 * Normalizes a Vietnamese phone number (+84... / 84... -> 0..., exact 10 digits).
 * Returns normalized 10-digit string or null if invalid.
 */
export const normalizeVietnamPhone = (raw) => {
  if (raw === undefined || raw === null) return null;
  let clean = String(raw).trim().replace(/[\s.\-()]/g, '');
  if (!clean) return null;

  if (clean.startsWith('+84')) {
    clean = `0${clean.slice(3).replace(/^0/, '')}`;
  } else if (clean.startsWith('84') && clean.length >= 11) {
    clean = `0${clean.slice(2).replace(/^0/, '')}`;
  }

  return VN_PHONE_REGEX.test(clean) ? clean : null;
};

/**
 * Detects whether an auth identifier is an email or a Vietnamese phone number.
 */
export const parseAuthIdentifier = (rawIdentifier) => {
  const trimmed = String(rawIdentifier || '').trim();
  if (!trimmed) {
    return { valid: false, type: null, value: '' };
  }

  if (trimmed.includes('@')) {
    const cleanEmail = normalizeEmail(trimmed);
    return {
      valid: isValidEmail(cleanEmail),
      type: 'email',
      value: cleanEmail,
    };
  }

  const normalizedPhone = normalizeVietnamPhone(trimmed);
  return {
    valid: Boolean(normalizedPhone),
    type: 'phone',
    value: normalizedPhone || trimmed.replace(/[\s.\-()]/g, ''),
  };
};

/**
 * Masks an email address for safe UI feedback (e.g. an***@gmail.com).
 */
export const maskEmail = (email) => {
  const clean = normalizeEmail(email);
  const parts = clean.split('@');
  if (parts.length !== 2 || !parts[0]) return clean;
  const local = parts[0];
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${parts[1]}`;
};

/**
 * Masks a phone number for safe UI feedback (e.g. 0901 *** 567).
 */
export const maskPhone = (phone) => {
  const normalized = normalizeVietnamPhone(phone) || String(phone || '').replace(/\D/g, '');
  if (normalized.length >= 10) {
    return `${normalized.slice(0, 4)} *** ${normalized.slice(-3)}`;
  }
  return normalized;
};

/**
 * Computes a keyed/hashed representation of a 6-digit OTP bound to target & purpose.
 */
export const hashOtpCode = (otpCode, target, purpose = 'auth') => {
  const cleanCode = String(otpCode || '').replace(/\s+/g, '').trim();
  const cleanTarget = String(target || '').trim().toLowerCase();
  const cleanPurpose = String(purpose || 'auth').trim().toLowerCase();
  const payload = `${cleanPurpose}:${cleanTarget}:${cleanCode}`;
  const secret = (process.env.OTP_SECRET || process.env.JWT_SECRET || '').trim();

  if (secret) {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Constant-time verification of submitted OTP against stored hash.
 */
export const verifyOtpHash = (otpCode, target, purpose, storedHash) => {
  if (!otpCode || !storedHash || typeof storedHash !== 'string') return false;
  const computed = hashOtpCode(otpCode, target, purpose);
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Projects a Mongoose User document (or plain object) to safe public/session fields only.
 */
export const sanitizeUserForResponse = (userDoc) => {
  if (!userDoc) return null;
  const u = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  const safeAvatar =
    u.avatar && !String(u.avatar).includes('/images/man.jpg') && !String(u.avatar).includes('google_avatar')
      ? u.avatar
      : '';

  return {
    _id: u._id,
    name: u.name || 'Thành viên cộng đồng',
    email: u.email || '',
    phone: u.phone || '',
    role: ['user', 'moderator', 'admin'].includes(u.role) ? u.role : 'user',
    status: u.status === 'banned' ? 'banned' : 'active',
    isVerified: Boolean(u.isVerified),
    jobTitle: u.jobTitle || 'Thành viên cộng đồng',
    avatar: safeAvatar,
    coverImage:
      u.coverImage ||
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    bio: u.bio || '',
    customLayout: u.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
    profileMusic: u.profileMusic || {
      enabled: true,
      title: 'Lofi Chill - Đêm muộn ở văn phòng',
      artist: "You Can't Stop Here Chill Room",
      sourceType: 'preset',
      presetId: 'lofi_night',
      url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    },
    socialLinks: u.socialLinks || {},
    authProvider: u.authProvider || 'local',
    googleId: u.googleId || '',
    streakCount: u.streakCount || 0,
    lastCheckInDate: u.lastCheckInDate || null,
    createdAt: u.createdAt,
  };
};
