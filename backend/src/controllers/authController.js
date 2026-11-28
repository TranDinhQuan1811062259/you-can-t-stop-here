import crypto from 'crypto';
import User from '../models/User.js';
import OtpVerification from '../models/OtpVerification.js';
import Post from '../models/Post.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { extractTelemetry } from '../utils/telemetryHelper.js';
import { sendAdminSecurityAlertEmail } from '../services/emailService.js';
import { OAuth2Client } from 'google-auth-library';
import { isDbConnected, ensureDbConnected } from '../config/db.js';
import {
  signToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeToken,
} from '../utils/token.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateOtp, sendRegistrationOtp, sendOtpEmail as sendMailerOtp } from '../services/mailer.js';
import { isSmsGatewayConfigured, sendOtpSms, sendLoginAlertSms } from '../services/smsService.js';
import {
  USER_SAFE_PROJECTION,
  normalizeEmail,
  isValidEmail,
  normalizeVietnamPhone,
  parseAuthIdentifier,
  maskEmail,
  maskPhone,
  hashOtpCode,
  verifyOtpHash,
  sanitizeUserForResponse,
} from '../utils/identifier-helper.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const getConfiguredAdminEmail = () =>
  normalizeEmail(process.env.ADMIN_EMAIL || '');

const ensureDatabaseReadyOr503 = async (res) => {
  if (isDbConnected) return true;
  const connected = await ensureDbConnected();
  if (connected || isDbConnected) return true;
  sendError(res, {
    message: 'Cơ sở dữ liệu MongoDB đang khởi động hoặc tạm gián đoạn. Vui lòng thử lại sau giây lát.',
    status: 503,
    code: 'DB_UNAVAILABLE',
  });
  return false;
};

const getCooldownRemainingSeconds = (lastSentAt) => {
  if (!lastSentAt) return 0;
  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  if (elapsed < 0 || elapsed >= OTP_RESEND_COOLDOWN_MS) return 0;
  return Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
};

const clearUserOtpFields = (user) => {
  user.otpHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.otpLastSentAt = undefined;
  user.otpPurpose = undefined;
  user.otpTargetEmail = undefined;
};

const findUserByAuthIdentifier = async (parsed, { withProjection = false } = {}) => {
  if (!parsed?.valid) return null;
  const query =
    parsed.type === 'email'
      ? { email: parsed.value }
      : { phone: parsed.value };
  const q = User.findOne(query);
  if (withProjection) q.select(USER_SAFE_PROJECTION);
  return q;
};

const dispatchOtpForPurpose = async ({ channel, targetEmail, targetPhone, otpCode, purpose }) => {
  if (channel === 'sms' && targetPhone && isSmsGatewayConfigured()) {
    const smsRes = await sendOtpSms({
      phone: targetPhone,
      otpCode,
      purpose,
    });
    if (smsRes?.success) {
      return {
        ok: true,
        channel: 'sms',
        maskedTarget: maskPhone(targetPhone),
      };
    }
    if (!targetEmail) {
      return {
        ok: false,
        reason: smsRes?.message || 'Không thể gửi tin nhắn SMS OTP lúc này.',
      };
    }
  }

  if (targetEmail) {
    try {
      if (purpose === 'register') {
        await sendRegistrationOtp(targetEmail, otpCode);
      } else {
        await sendMailerOtp(targetEmail, otpCode, purpose === 'reset_password' ? 'forgot_password' : purpose);
      }
      return {
        ok: true,
        channel: 'email',
        maskedTarget: maskEmail(targetEmail),
      };
    } catch (err) {
      return {
        ok: false,
        reason: err?.message || 'Không thể gửi Email xác thực OTP lúc này.',
      };
    }
  }

  return {
    ok: false,
    reason: 'Không có kênh nhận OTP khả dụng (chưa cấu hình SMS Gateway và chưa liên kết Email).',
  };
};

const verifyUserStoredOtp = async ({ user, otpCode, expectedPurpose }) => {
  const cleanOtp = String(otpCode || '').replace(/\s+/g, '').trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return {
      ok: false,
      status: 400,
      message: 'Mã OTP phải gồm đúng 6 chữ số.',
    };
  }

  if (!user.otpHash || !user.otpExpires || user.otpPurpose !== expectedPurpose) {
    return {
      ok: false,
      status: 400,
      message: 'Mã OTP không tồn tại hoặc không khớp mục đích xác thực. Vui lòng gửi lại mã mới.',
    };
  }

  if (Date.now() > new Date(user.otpExpires).getTime()) {
    return {
      ok: false,
      status: 400,
      message: 'Mã xác thực OTP đã hết hạn (quá 5 phút). Vui lòng yêu cầu gửi lại mã mới.',
    };
  }

  if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.otpPurpose = undefined;
    await user.save();
    return {
      ok: false,
      status: 400,
      message: 'Mã OTP đã bị vô hiệu hóa do nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.',
    };
  }

  const matched = verifyOtpHash(cleanOtp, String(user._id), expectedPurpose, user.otpHash);
  if (!matched) {
    const nextAttempts = (user.otpAttempts || 0) + 1;
    user.otpAttempts = nextAttempts;

    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      user.otpHash = undefined;
      user.otpExpires = undefined;
      user.otpPurpose = undefined;
      await user.save();
      return {
        ok: false,
        status: 400,
        message: 'Bạn đã nhập sai OTP quá 5 lần. Mã OTP cũ đã bị hủy, vui lòng gửi lại mã mới.',
        errors: { remainingAttempts: 0, invalidated: true },
      };
    }

    await user.save();
    const remainingAttempts = OTP_MAX_ATTEMPTS - nextAttempts;
    return {
      ok: false,
      status: 400,
      message: `Mã xác thực OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.`,
      errors: { remainingAttempts },
    };
  }

  return { ok: true };
};

const issueAuthSessionPayload = async (user) => {
  const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
  const safeUser = sanitizeUserForResponse(user);
  const token = await signAccessToken({
    id: user._id,
    role: safeUser.role,
    name: safeUser.name,
    email: safeUser.email,
    phone: safeUser.phone,
    jobTitle: safeUser.jobTitle,
    tokenVersion,
  });
  const refreshToken = await signRefreshToken({
    id: user._id,
    tokenVersion,
  });
  return {
    ...safeUser,
    token,
    refreshToken,
  };
};

/**
 * 1. Đăng ký tài khoản mới (Bước 1: Lưu bản ghi chưa kích hoạt & gửi OTP)
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const rawName = String(req.body?.name || '').trim();
    const rawIdentifier = String(
      req.body?.identifier || req.body?.email || req.body?.phone || ''
    ).trim();
    const rawOptionalEmail = String(req.body?.email || '').trim();
    const rawOptionalPhone = String(req.body?.phone || '').trim();
    const rawPassword = String(req.body?.password || '');
    const rawJobTitle = String(req.body?.jobTitle || '').trim();

    if (!rawName || rawName.length < 2) {
      return sendError(res, {
        message: 'Họ và tên hiển thị phải có ít nhất 2 ký tự.',
        status: 400,
      });
    }

    if (!rawIdentifier) {
      return sendError(res, {
        message: 'Vui lòng nhập Email hoặc Số điện thoại để đăng ký.',
        status: 400,
      });
    }

    const parsedPrimary = parseAuthIdentifier(rawIdentifier);
    if (!parsedPrimary.valid) {
      return sendError(res, {
        message: parsedPrimary.type === 'email'
          ? 'Định dạng Email không hợp lệ.'
          : 'Số điện thoại Việt Nam phải gồm 10 chữ số hợp lệ (ví dụ: 0901234567 hoặc +84901234567).',
        status: 400,
      });
    }

    if (!rawPassword || rawPassword.length < 6) {
      return sendError(res, {
        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
        status: 400,
      });
    }

    let finalEmail = parsedPrimary.type === 'email' ? parsedPrimary.value : '';
    let finalPhone = parsedPrimary.type === 'phone' ? parsedPrimary.value : '';

    if (parsedPrimary.type === 'phone' && rawOptionalEmail && !rawOptionalEmail.startsWith('+')) {
      if (!isValidEmail(rawOptionalEmail)) {
        return sendError(res, {
          message: 'Email liên kết nhận OTP không đúng định dạng.',
          status: 400,
        });
      }
      finalEmail = normalizeEmail(rawOptionalEmail);
    }

    if (parsedPrimary.type === 'email' && rawOptionalPhone) {
      const normalizedOptPhone = normalizeVietnamPhone(rawOptionalPhone);
      if (!normalizedOptPhone) {
        return sendError(res, {
          message: 'Số điện thoại liên kết không đúng định dạng 10 chữ số Việt Nam.',
          status: 400,
        });
      }
      finalPhone = normalizedOptPhone;
    }

    const smsReady = isSmsGatewayConfigured();
    if (parsedPrimary.type === 'phone' && !smsReady && !finalEmail) {
      return sendError(res, {
        message: 'Hệ thống SMS Gateway chưa cấu hình. Vui lòng nhập thêm Email để nhận mã OTP kích hoạt tài khoản.',
        status: 400,
        code: 'EMAIL_REQUIRED_FOR_PHONE_OTP',
        errors: { needEmailForPhoneRegister: true },
      });
    }

    const lookupOr = [];
    if (finalEmail) lookupOr.push({ email: finalEmail });
    if (finalPhone) lookupOr.push({ phone: finalPhone });

    const matchedUsers = await User.find({ $or: lookupOr });

    const verifiedConflict = matchedUsers.find((u) => u.isVerified);
    if (verifiedConflict) {
      const isPhoneDup = finalPhone && verifiedConflict.phone === finalPhone;
      const isEmailDup = finalEmail && verifiedConflict.email === finalEmail;
      return sendError(res, {
        message:
          isPhoneDup && isEmailDup
            ? 'Email và Số điện thoại này đã được đăng ký và kích hoạt.'
            : isPhoneDup
            ? 'Số điện thoại này đã được đăng ký và kích hoạt trên hệ thống.'
            : 'Địa chỉ Email này đã được đăng ký và kích hoạt trên hệ thống.',
        status: 409,
      });
    }

    if (matchedUsers.length > 1) {
      return sendError(res, {
        message: 'Email và Số điện thoại này đang gắn với các yêu cầu đăng ký chưa kích hoạt khác nhau.',
        status: 409,
      });
    }

    const existingUnverified = matchedUsers[0] || null;
    if (existingUnverified) {
      if (existingUnverified.status === 'banned') {
        return sendError(res, {
          message: 'Tài khoản này đã bị khóa bởi Quản trị viên.',
          status: 403,
          code: 'ACCOUNT_BANNED',
        });
      }
      const cooldownLeft = getCooldownRemainingSeconds(existingUnverified.otpLastSentAt);
      if (cooldownLeft > 0) {
        return sendError(res, {
          message: `Bạn vừa yêu cầu mã OTP. Vui lòng đợi ${cooldownLeft} giây trước khi gửi lại.`,
          status: 429,
          code: 'OTP_COOLDOWN',
          errors: {
            retryAfterSeconds: cooldownLeft,
            requiresOtp: true,
            purpose: 'register',
            identifier: finalPhone || finalEmail,
            identifierType: parsedPrimary.type,
            deliveryTarget: existingUnverified.otpTargetEmail
              ? maskEmail(existingUnverified.otpTargetEmail)
              : maskEmail(finalEmail),
          },
        });
      }
    }

    const hashedPassword = await hashPassword(rawPassword);
    const adminEmailEnv = getConfiguredAdminEmail();
    const isAdminEnvMatch = Boolean(adminEmailEnv && finalEmail && finalEmail === adminEmailEnv);

    let targetUser = existingUnverified;
    let isNewRecord = false;

    if (!targetUser) {
      isNewRecord = true;
      targetUser = new User({
        name: rawName,
        email: finalEmail || undefined,
        phone: finalPhone || undefined,
        password: hashedPassword,
        role: isAdminEnvMatch ? 'admin' : 'user',
        jobTitle: rawJobTitle || 'Thành viên cộng đồng',
        authProvider: 'local',
        isVerified: false,
        bio: 'Thành viên cộng đồng sẻ chia áp lực & lan tỏa tích cực.',
      });
    } else {
      targetUser.name = rawName;
      targetUser.password = hashedPassword;
      if (finalEmail) targetUser.email = finalEmail;
      if (finalPhone) targetUser.phone = finalPhone;
      if (rawJobTitle) targetUser.jobTitle = rawJobTitle;
      targetUser.isVerified = false;
    }

    const otpCode = generateOtp();
    const preferredChannel = parsedPrimary.type === 'phone' && smsReady ? 'sms' : 'email';

    targetUser.otpHash = hashOtpCode(otpCode, String(targetUser._id), 'register');
    targetUser.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    targetUser.otpAttempts = 0;
    targetUser.otpLastSentAt = new Date();
    targetUser.otpPurpose = 'register';
    targetUser.otpTargetEmail = finalEmail || undefined;

    await targetUser.save();

    const dispatchResult = await dispatchOtpForPurpose({
      channel: preferredChannel,
      targetEmail: finalEmail,
      targetPhone: finalPhone,
      otpCode,
      purpose: 'register',
    });

    if (!dispatchResult.ok) {
      if (isNewRecord) {
        await User.deleteOne({ _id: targetUser._id }).catch(() => {});
      } else {
        clearUserOtpFields(targetUser);
        await targetUser.save().catch(() => {});
      }
      return sendError(res, {
        message: dispatchResult.reason || 'Không thể gửi mã OTP kích hoạt lúc này. Vui lòng thử lại sau.',
        status: 503,
      });
    }

    req.otpDispatched = true;

    return sendSuccess(res, {
      status: isNewRecord ? 201 : 200,
      message: `Mã OTP 6 số kích hoạt tài khoản đã được gửi qua ${dispatchResult.channel === 'sms' ? 'SMS' : 'Email'} đến ${dispatchResult.maskedTarget}.`,
      data: {
        requiresOtp: true,
        purpose: 'register',
        identifier: parsedPrimary.value,
        identifierType: parsedPrimary.type,
        deliveryChannel: dispatchResult.channel,
        deliveryTarget: dispatchResult.maskedTarget,
        expiresInSeconds: 300,
        resendCooldownSeconds: 60,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, {
        message: 'Email hoặc Số điện thoại đã tồn tại trên hệ thống.',
        status: 409,
      });
    }
    return sendError(res, {
      message: error.message || 'Lỗi máy chủ khi đăng ký tài khoản.',
      status: 500,
    });
  }
};

/**
 * 2. Xác thực OTP kích hoạt tài khoản đăng ký mới -> cấp JWT
 * POST /api/auth/verify-register-otp
 */
export const verifyRegisterOtp = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const rawIdentifier = String(
      req.body?.identifier || req.body?.email || req.body?.phone || req.body?.target || ''
    ).trim();
    const rawOtp = String(req.body?.otp || '').trim();

    if (!rawIdentifier || !rawOtp) {
      return sendError(res, {
        message: 'Vui lòng cung cấp tài khoản (Email/SĐT) và mã xác thực OTP 6 số.',
        status: 400,
      });
    }

    const parsed = parseAuthIdentifier(rawIdentifier);
    if (!parsed.valid) {
      return sendError(res, {
        message: 'Email hoặc Số điện thoại không đúng định dạng.',
        status: 400,
      });
    }

    const user = await findUserByAuthIdentifier(parsed);
    if (!user) {
      return sendError(res, {
        message: 'Không tìm thấy yêu cầu đăng ký cho tài khoản này.',
        status: 404,
      });
    }

    if (user.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản này đã bị khóa bởi Quản trị viên.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    if (user.isVerified && user.otpPurpose !== 'register') {
      return sendError(res, {
        message: 'Tài khoản này đã được kích hoạt trước đó. Vui lòng đăng nhập!',
        status: 400,
      });
    }

    const check = await verifyUserStoredOtp({
      user,
      otpCode: rawOtp,
      expectedPurpose: 'register',
    });
    if (!check.ok) {
      return sendError(res, {
        message: check.message,
        status: check.status,
        errors: check.errors || null,
      });
    }

    user.isVerified = true;
    clearUserOtpFields(user);
    await user.save();

    const sessionPayload = await issueAuthSessionPayload(user);
    return sendSuccess(res, {
      message: 'Kích hoạt tài khoản và đăng nhập thành công!',
      data: sessionPayload,
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi xác thực OTP kích hoạt tài khoản.',
      status: 500,
    });
  }
};

/**
 * 3. Gửi lại mã OTP (Cooldown 60 giây trên MongoDB)
 * POST /api/auth/resend-otp
 */
export const resendOtp = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const rawIdentifier = String(
      req.body?.identifier || req.body?.email || req.body?.phone || req.body?.target || ''
    ).trim();
    const rawPurpose = String(req.body?.purpose || 'register').trim().toLowerCase();
    const allowedPurposes = ['register', 'login', 'reset_password'];
    const purpose = allowedPurposes.includes(rawPurpose) ? rawPurpose : 'register';

    if (!rawIdentifier) {
      return sendError(res, {
        message: 'Vui lòng cung cấp Email hoặc Số điện thoại cần gửi lại mã OTP.',
        status: 400,
      });
    }

    const parsed = parseAuthIdentifier(rawIdentifier);
    if (!parsed.valid) {
      return sendError(res, {
        message: 'Email hoặc Số điện thoại không đúng định dạng.',
        status: 400,
      });
    }

    const user = await findUserByAuthIdentifier(parsed);
    if (!user) {
      return sendError(res, {
        message: 'Không tìm thấy tài khoản tương ứng trên hệ thống.',
        status: 404,
      });
    }

    if (user.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    if (purpose === 'register' && user.isVerified) {
      return sendError(res, {
        message: 'Tài khoản này đã được kích hoạt. Bạn có thể đăng nhập ngay.',
        status: 400,
      });
    }

    if ((purpose === 'login' || purpose === 'reset_password') && !user.isVerified) {
      return sendError(res, {
        message: 'Tài khoản chưa được kích hoạt OTP đăng ký. Vui lòng hoàn tất bước kích hoạt tài khoản trước.',
        status: 403,
        code: 'ACCOUNT_UNVERIFIED',
        errors: {
          requireVerification: true,
          purpose: 'register',
          identifier: user.phone || user.email,
        },
      });
    }

    const cooldownLeft = getCooldownRemainingSeconds(user.otpLastSentAt);
    if (cooldownLeft > 0) {
      return sendError(res, {
        message: `Vui lòng đợi ${cooldownLeft} giây trước khi yêu cầu gửi lại mã OTP.`,
        status: 429,
        code: 'OTP_COOLDOWN',
        errors: { retryAfterSeconds: cooldownLeft },
      });
    }

    const smsReady = isSmsGatewayConfigured();
    const deliveryEmail = user.email || (purpose === 'register' ? user.otpTargetEmail : '');
    const deliveryPhone = user.phone || '';
    const preferredChannel =
      parsed.type === 'phone' && deliveryPhone && smsReady ? 'sms' : 'email';

    if (preferredChannel === 'email' && !deliveryEmail) {
      return sendError(res, {
        message: 'Tài khoản chưa có Email liên kết để nhận mã OTP và cổng SMS chưa được cấu hình.',
        status: 400,
      });
    }

    const otpCode = generateOtp();
    user.otpHash = hashOtpCode(otpCode, String(user._id), purpose);
    user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    user.otpPurpose = purpose;
    if (deliveryEmail) user.otpTargetEmail = deliveryEmail;
    await user.save();

    const dispatchResult = await dispatchOtpForPurpose({
      channel: preferredChannel,
      targetEmail: deliveryEmail,
      targetPhone: deliveryPhone,
      otpCode,
      purpose,
    });

    if (!dispatchResult.ok) {
      user.otpLastSentAt = undefined;
      await user.save().catch(() => {});
      return sendError(res, {
        message: dispatchResult.reason || 'Không thể gửi lại mã OTP lúc này.',
        status: 503,
      });
    }

    req.otpDispatched = true;

    return sendSuccess(res, {
      message: `Đã gửi lại mã OTP 6 số qua ${dispatchResult.channel === 'sms' ? 'SMS' : 'Email'} đến ${dispatchResult.maskedTarget}.`,
      data: {
        requiresOtp: true,
        purpose,
        identifier: parsed.value,
        identifierType: parsed.type,
        deliveryChannel: dispatchResult.channel,
        deliveryTarget: dispatchResult.maskedTarget,
        expiresInSeconds: 300,
        resendCooldownSeconds: 60,
      },
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi gửi lại mã OTP.',
      status: 500,
    });
  }
};

/**
 * 4. Đăng nhập bằng Mật khẩu (Hỗ trợ Email hoặc Số điện thoại 100% từ MongoDB)
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const rawIdentifier = String(
      req.body?.identifier || req.body?.email || req.body?.phone || ''
    ).trim();
    const rawPassword = String(req.body?.password || '');

    if (!rawIdentifier || !rawPassword) {
      return sendError(res, {
        message: 'Vui lòng nhập đầy đủ Email/Số điện thoại và mật khẩu.',
        status: 400,
      });
    }

    const parsed = parseAuthIdentifier(rawIdentifier);
    if (!parsed.valid) {
      return sendError(res, {
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.',
        status: 401,
      });
    }

    const user = await findUserByAuthIdentifier(parsed);
    if (!user || !user.password) {
      return sendError(res, {
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.',
        status: 401,
      });
    }

    const isMatch = await user.comparePassword(rawPassword);
    if (!isMatch) {
      return sendError(res, {
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.',
        status: 401,
      });
    }

    if (user.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    if (user.isVerified === false) {
      const deliveryEmail = user.email || user.otpTargetEmail || '';
      const deliveryPhone = user.phone || '';
      const smsReady = isSmsGatewayConfigured();
      const preferredChannel = parsed.type === 'phone' && deliveryPhone && smsReady ? 'sms' : 'email';
      const maskedTarget = preferredChannel === 'sms' ? maskPhone(deliveryPhone) : maskEmail(deliveryEmail);

      let otpSent = false;
      const cooldownLeft = getCooldownRemainingSeconds(user.otpLastSentAt);
      const isOtpStillFresh =
        user.otpHash &&
        user.otpPurpose === 'register' &&
        user.otpExpires &&
        Date.now() < new Date(user.otpExpires).getTime();

      if (!isOtpStillFresh && cooldownLeft === 0 && (deliveryEmail || (preferredChannel === 'sms' && deliveryPhone))) {
        const otpCode = generateOtp();
        user.otpHash = hashOtpCode(otpCode, String(user._id), 'register');
        user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
        user.otpAttempts = 0;
        user.otpLastSentAt = new Date();
        user.otpPurpose = 'register';
        await user.save();

        const dispatchRes = await dispatchOtpForPurpose({
          channel: preferredChannel,
          targetEmail: deliveryEmail,
          targetPhone: deliveryPhone,
          otpCode,
          purpose: 'register',
        });
        otpSent = dispatchRes.ok;
      }

      return sendError(res, {
        message: otpSent
          ? `Tài khoản chưa kích hoạt. Hệ thống đã gửi mã OTP 6 số đến ${maskedTarget} để hoàn tất xác thực.`
          : 'Tài khoản chưa được kích hoạt OTP. Vui lòng nhập mã OTP 6 số để mở khóa tài khoản.',
        status: 403,
        code: 'ACCOUNT_UNVERIFIED',
        errors: {
          requireVerification: true,
          requiresOtp: true,
          purpose: 'register',
          identifier: user.phone || user.email,
          identifierType: parsed.type,
          deliveryChannel: preferredChannel,
          deliveryTarget: maskedTarget,
          otpSent,
          retryAfterSeconds: getCooldownRemainingSeconds(user.otpLastSentAt),
        },
      });
    }

    const sessionPayload = await issueAuthSessionPayload(user);
    return sendSuccess(res, {
      message: 'Đăng nhập thành công!',
      data: sessionPayload,
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi máy chủ khi đăng nhập.',
      status: 500,
    });
  }
};

/**
 * 5. Gửi OTP Đăng nhập không mật khẩu (Passwordless OTP qua Email hoặc SMS)
 * POST /api/auth/send-login-otp (và alias /api/auth/send-otp)
 */
export const sendLoginOtp = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const rawIdentifier = String(
      req.body?.identifier || req.body?.target || req.body?.email || req.body?.phone || ''
    ).trim();

    if (!rawIdentifier) {
      return sendError(res, {
        message: 'Vui lòng nhập Email hoặc Số điện thoại đã đăng ký.',
        status: 400,
      });
    }

    const parsed = parseAuthIdentifier(rawIdentifier);
    if (!parsed.valid) {
      return sendError(res, {
        message: parsed.type === 'email'
          ? 'Định dạng Email không hợp lệ.'
          : 'Số điện thoại Việt Nam phải gồm 10 chữ số hợp lệ (ví dụ: 0901234567).',
        status: 400,
      });
    }

    const user = await findUserByAuthIdentifier(parsed);
    if (!user) {
      return sendError(res, {
        message: 'Không tìm thấy tài khoản nào khớp với Email hoặc Số điện thoại này.',
        status: 404,
      });
    }

    if (user.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    if (user.isVerified === false) {
      return sendError(res, {
        message: 'Tài khoản chưa được kích hoạt. Vui lòng hoàn tất xác thực OTP kích hoạt tài khoản.',
        status: 403,
        code: 'ACCOUNT_UNVERIFIED',
        errors: {
          requireVerification: true,
          purpose: 'register',
          identifier: user.phone || user.email,
          deliveryTarget: maskEmail(user.email || user.otpTargetEmail || ''),
        },
      });
    }

    const cooldownLeft = getCooldownRemainingSeconds(user.otpLastSentAt);
    if (cooldownLeft > 0) {
      return sendError(res, {
        message: `Bạn vừa yêu cầu mã OTP. Vui lòng đợi ${cooldownLeft} giây trước khi gửi lại.`,
        status: 429,
        code: 'OTP_COOLDOWN',
        errors: { retryAfterSeconds: cooldownLeft },
      });
    }

    const smsReady = isSmsGatewayConfigured();
    const deliveryEmail = user.email || '';
    const deliveryPhone = user.phone || '';
    const preferredChannel =
      parsed.type === 'phone' && deliveryPhone && smsReady ? 'sms' : 'email';

    if (preferredChannel === 'email' && !deliveryEmail) {
      return sendError(res, {
        message: 'Tài khoản số điện thoại này chưa liên kết Email nhận OTP và cổng SMS chưa cấu hình. Vui lòng đăng nhập bằng mật khẩu.',
        status: 400,
      });
    }

    const otpCode = generateOtp();
    user.otpHash = hashOtpCode(otpCode, String(user._id), 'login');
    user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    user.otpPurpose = 'login';
    await user.save();

    const dispatchResult = await dispatchOtpForPurpose({
      channel: preferredChannel,
      targetEmail: deliveryEmail,
      targetPhone: deliveryPhone,
      otpCode,
      purpose: 'login',
    });

    if (!dispatchResult.ok) {
      user.otpLastSentAt = undefined;
      await user.save().catch(() => {});
      return sendError(res, {
        message: dispatchResult.reason || 'Không thể gửi mã OTP đăng nhập lúc này.',
        status: 503,
      });
    }

    req.otpDispatched = true;

    return sendSuccess(res, {
      message:
        parsed.type === 'phone' && dispatchResult.channel === 'email'
          ? `Đã gửi mã OTP đăng nhập đến Email liên kết (${dispatchResult.maskedTarget}) của số điện thoại này.`
          : `Mã OTP 6 số đăng nhập đã được gửi đến ${dispatchResult.maskedTarget}.`,
      data: {
        requiresOtp: true,
        purpose: 'login',
        identifier: parsed.value,
        identifierType: parsed.type,
        deliveryChannel: dispatchResult.channel,
        deliveryTarget: dispatchResult.maskedTarget,
        expiresInSeconds: 300,
        resendCooldownSeconds: 60,
      },
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi gửi mã OTP đăng nhập.',
      status: 500,
    });
  }
};

/**
 * 6. Xác thực OTP Đăng nhập -> xóa OTP sau dùng & cấp JWT
 * POST /api/auth/verify-login-otp
 */
export const verifyLoginOtp = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const rawIdentifier = String(
      req.body?.identifier || req.body?.target || req.body?.email || req.body?.phone || ''
    ).trim();
    const rawOtp = String(req.body?.otp || '').trim();

    if (!rawIdentifier || !rawOtp) {
      return sendError(res, {
        message: 'Vui lòng cung cấp Email/Số điện thoại và mã OTP 6 số.',
        status: 400,
      });
    }

    const parsed = parseAuthIdentifier(rawIdentifier);
    if (!parsed.valid) {
      return sendError(res, {
        message: 'Email hoặc Số điện thoại không đúng định dạng.',
        status: 400,
      });
    }

    const user = await findUserByAuthIdentifier(parsed);
    if (!user) {
      return sendError(res, {
        message: 'Mã xác thực OTP không chính xác hoặc tài khoản không tồn tại.',
        status: 400,
      });
    }

    if (user.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    if (user.isVerified === false) {
      return sendError(res, {
        message: 'Tài khoản chưa được kích hoạt. Vui lòng hoàn tất xác thực đăng ký.',
        status: 403,
        code: 'ACCOUNT_UNVERIFIED',
        errors: {
          requireVerification: true,
          purpose: 'register',
          identifier: user.phone || user.email,
        },
      });
    }

    const check = await verifyUserStoredOtp({
      user,
      otpCode: rawOtp,
      expectedPurpose: 'login',
    });
    if (!check.ok) {
      return sendError(res, {
        message: check.message,
        status: check.status,
        errors: check.errors || null,
      });
    }

    clearUserOtpFields(user);
    await user.save();

    if (user.phone && isSmsGatewayConfigured()) {
      sendLoginAlertSms(user.phone).catch(() => {});
    }

    const sessionPayload = await issueAuthSessionPayload(user);
    return sendSuccess(res, {
      message: 'Xác thực OTP và đăng nhập thành công!',
      data: sessionPayload,
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi xác thực OTP đăng nhập.',
      status: 500,
    });
  }
};

/**
 * Alias tương thích cho route /api/auth/verify-otp cũ
 */
export const verifyOtpAndLogin = async (req, res) => {
  const purpose = String(req.body?.purpose || 'login').trim().toLowerCase();
  if (purpose === 'register') {
    return verifyRegisterOtp(req, res);
  }
  return verifyLoginOtp(req, res);
};

/**
 * 7. Quên mật khẩu: Gửi OTP đặt lại mật khẩu qua Email (hoặc SMS nếu cấu hình)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const rawIdentifier = String(
      req.body?.identifier || req.body?.email || req.body?.phone || ''
    ).trim();

    if (!rawIdentifier) {
      return sendError(res, {
        message: 'Vui lòng nhập Email hoặc Số điện thoại của tài khoản cần khôi phục mật khẩu.',
        status: 400,
      });
    }

    const parsed = parseAuthIdentifier(rawIdentifier);
    if (!parsed.valid) {
      return sendError(res, {
        message: parsed.type === 'email'
          ? 'Định dạng Email không hợp lệ.'
          : 'Số điện thoại Việt Nam không hợp lệ.',
        status: 400,
      });
    }

    const user = await findUserByAuthIdentifier(parsed);
    if (!user) {
      return sendError(res, {
        message: 'Không tìm thấy tài khoản nào ứng với thông tin đã nhập.',
        status: 404,
      });
    }

    if (user.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản này đang bị khóa bởi Quản trị viên.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    if (user.isVerified === false) {
      return sendError(res, {
        message: 'Tài khoản này chưa được kích hoạt OTP khi đăng ký. Vui lòng xác thực tài khoản trước.',
        status: 403,
        code: 'ACCOUNT_UNVERIFIED',
        errors: {
          requireVerification: true,
          purpose: 'register',
          identifier: user.phone || user.email,
        },
      });
    }

    const cooldownLeft = getCooldownRemainingSeconds(user.otpLastSentAt);
    if (cooldownLeft > 0) {
      return sendError(res, {
        message: `Bạn vừa yêu cầu mã OTP. Vui lòng đợi ${cooldownLeft} giây trước khi thử lại.`,
        status: 429,
        code: 'OTP_COOLDOWN',
        errors: { retryAfterSeconds: cooldownLeft },
      });
    }

    const smsReady = isSmsGatewayConfigured();
    const deliveryEmail = user.email || '';
    const deliveryPhone = user.phone || '';
    const preferredChannel =
      parsed.type === 'phone' && deliveryPhone && smsReady ? 'sms' : 'email';

    if (preferredChannel === 'email' && !deliveryEmail) {
      return sendError(res, {
        message: 'Tài khoản chưa liên kết Email nhận OTP và cổng SMS chưa cấu hình. Không thể đặt lại mật khẩu qua OTP.',
        status: 400,
      });
    }

    const otpCode = generateOtp();
    user.otpHash = hashOtpCode(otpCode, String(user._id), 'reset_password');
    user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    user.otpPurpose = 'reset_password';
    await user.save();

    const dispatchResult = await dispatchOtpForPurpose({
      channel: preferredChannel,
      targetEmail: deliveryEmail,
      targetPhone: deliveryPhone,
      otpCode,
      purpose: 'reset_password',
    });

    if (!dispatchResult.ok) {
      user.otpLastSentAt = undefined;
      await user.save().catch(() => {});
      return sendError(res, {
        message: dispatchResult.reason || 'Không thể gửi mã OTP đặt lại mật khẩu lúc này.',
        status: 503,
      });
    }

    req.otpDispatched = true;

    return sendSuccess(res, {
      message: `Mã OTP đặt lại mật khẩu (6 số) đã được gửi đến ${dispatchResult.maskedTarget}.`,
      data: {
        requiresOtp: true,
        purpose: 'reset_password',
        identifier: parsed.value,
        identifierType: parsed.type,
        deliveryChannel: dispatchResult.channel,
        deliveryTarget: dispatchResult.maskedTarget,
        expiresInSeconds: 300,
        resendCooldownSeconds: 60,
      },
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi khi yêu cầu đặt lại mật khẩu.',
      status: 500,
    });
  }
};

/**
 * 8. Đặt lại mật khẩu mới sau khi xác thực OTP -> tăng tokenVersion thu hồi phiên cũ
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const rawIdentifier = String(
      req.body?.identifier || req.body?.email || req.body?.phone || ''
    ).trim();
    const rawOtp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || req.body?.password || '');

    if (!rawIdentifier || !rawOtp || !newPassword) {
      return sendError(res, {
        message: 'Vui lòng nhập đầy đủ Email/SĐT, mã OTP 6 số và mật khẩu mới.',
        status: 400,
      });
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      return sendError(res, {
        message: 'Mật khẩu mới phải từ 6 đến 128 ký tự.',
        status: 400,
      });
    }

    const parsed = parseAuthIdentifier(rawIdentifier);
    if (!parsed.valid) {
      return sendError(res, {
        message: 'Email hoặc Số điện thoại không đúng định dạng.',
        status: 400,
      });
    }

    const user = await findUserByAuthIdentifier(parsed);
    if (!user) {
      return sendError(res, {
        message: 'Không tìm thấy tài khoản tương ứng.',
        status: 404,
      });
    }

    if (user.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản này đang bị khóa bởi Quản trị viên.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    const check = await verifyUserStoredOtp({
      user,
      otpCode: rawOtp,
      expectedPurpose: 'reset_password',
    });
    if (!check.ok) {
      return sendError(res, {
        message: check.message,
        status: check.status,
        errors: check.errors || null,
      });
    }

    user.password = await hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    clearUserOtpFields(user);
    await user.save();

    return sendSuccess(res, {
      message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.',
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi khi đặt lại mật khẩu.',
      status: 500,
    });
  }
};

/**
 * 9. Đăng nhập / Đăng ký qua Mạng Xã Hội (100% MongoDB + Email OTP thực)
 */
export const socialLogin = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const {
      action = 'verify-otp',
      provider,
      email,
      name,
      otpCode,
      jobTitle,
      bio,
      avatar,
      coverImage,
      socialLinks,
      providerId,
    } = req.body;

    if (!provider || !['google', 'facebook', 'x', 'linkedin', 'github'].includes(String(provider).toLowerCase())) {
      return sendError(res, {
        message: 'Nền tảng mạng xã hội không được hỗ trợ.',
        status: 400,
      });
    }

    const cleanProvider = String(provider).toLowerCase();
    const cleanEmail = normalizeEmail(email);

    if (!isValidEmail(cleanEmail)) {
      return sendError(res, {
        message: 'Vui lòng cung cấp địa chỉ Email hợp lệ để xác thực tài khoản.',
        status: 400,
      });
    }

    const existingUserByEmail = await User.findOne({ email: cleanEmail });
    if (existingUserByEmail?.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    if (action === 'send-otp') {
      if (!name || String(name).trim().length < 2) {
        return sendError(res, {
          message: 'Vui lòng nhập Tên hiển thị (tối thiểu 2 ký tự).',
          status: 400,
        });
      }

      if (existingUserByEmail) {
        return sendError(res, {
          message: 'Email này đã có tài khoản trên hệ thống! Vui lòng đăng nhập bằng Email/Mật khẩu hoặc nút Google.',
          status: 409,
        });
      }

      const generatedCode = generateOtp();
      const otpRecord = await OtpVerification.create({
        email: cleanEmail,
        otp: hashOtpCode(generatedCode, cleanEmail, 'social_register'),
        purpose: 'register',
        targetType: 'email',
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        pendingName: String(name).trim(),
        pendingJobTitle: jobTitle || '',
      });

      const dispatch = await dispatchOtpForPurpose({
        channel: 'email',
        targetEmail: cleanEmail,
        targetPhone: '',
        otpCode: generatedCode,
        purpose: 'register',
      });

      if (!dispatch.ok) {
        await OtpVerification.deleteOne({ _id: otpRecord._id }).catch(() => {});
        return sendError(res, {
          message: dispatch.reason || 'Không thể gửi mã OTP đến Email này.',
          status: 503,
        });
      }

      req.otpDispatched = true;
      return sendSuccess(res, {
        message: `Đã gửi mã OTP 6 chữ số đến ${maskEmail(cleanEmail)}.`,
        data: {
          email: cleanEmail,
          deliveryTarget: maskEmail(cleanEmail),
          expiresInSeconds: 300,
        },
      });
    }

    let user = existingUserByEmail;
    if (!user && providerId) {
      user = await User.findOne({ providerId, authProvider: cleanProvider });
    }

    if (!user) {
      if (!otpCode || String(otpCode).trim().length !== 6) {
        return sendError(res, {
          message: 'Vui lòng nhập đầy đủ 6 chữ số mã OTP xác thực từ Email.',
          status: 400,
        });
      }

      const otpRecord = await OtpVerification.findOne({
        email: cleanEmail,
        purpose: 'register',
      }).sort({ createdAt: -1 });

      if (!otpRecord || Date.now() > new Date(otpRecord.expiresAt).getTime()) {
        return sendError(res, {
          message: 'Mã xác thực OTP đã hết hạn hoặc không tồn tại. Vui lòng bấm gửi lại mã.',
          status: 400,
        });
      }

      if (!verifyOtpHash(otpCode, cleanEmail, 'social_register', otpRecord.otp)) {
        const nextAttempts = (otpRecord.attempts || 0) + 1;
        if (nextAttempts >= OTP_MAX_ATTEMPTS) {
          await OtpVerification.deleteOne({ _id: otpRecord._id }).catch(() => {});
          return sendError(res, {
            message: 'Bạn đã nhập sai OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.',
            status: 400,
          });
        }
        otpRecord.attempts = nextAttempts;
        await otpRecord.save();
        return sendError(res, {
          message: `Mã OTP không chính xác. Bạn còn ${OTP_MAX_ATTEMPTS - nextAttempts} lần thử.`,
          status: 400,
          errors: { remainingAttempts: OTP_MAX_ATTEMPTS - nextAttempts },
        });
      }

      await OtpVerification.deleteMany({ email: cleanEmail, purpose: 'register' }).catch(() => {});

      const randomPassword = await hashPassword(
        `${cleanProvider}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
      );
      const adminEmailEnv = getConfiguredAdminEmail();
      const role = adminEmailEnv && cleanEmail === adminEmailEnv ? 'admin' : 'user';

      user = await User.create({
        name: String(name || otpRecord.pendingName || 'Thành viên').trim(),
        email: cleanEmail,
        password: randomPassword,
        role,
        isVerified: true,
        jobTitle: jobTitle || otpRecord.pendingJobTitle || 'Thành viên cộng đồng',
        avatar: avatar || '',
        coverImage:
          coverImage ||
          'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
        bio: bio || `Đã tham gia kết nối cộng đồng qua ${cleanProvider.toUpperCase()}.`,
        authProvider: cleanProvider,
        providerId: providerId || `oauth_${cleanProvider}_${Date.now()}`,
        socialLinks: socialLinks || {},
      });
    } else {
      user.isVerified = true;
      if (name && String(name).trim().length >= 2) {
        user.name = String(name).trim();
      }
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      await user.save();
    }

    const sessionPayload = await issueAuthSessionPayload(user);
    return sendSuccess(res, {
      message: 'Đăng nhập thành công!',
      data: sessionPayload,
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi đăng nhập mạng xã hội.',
      status: 500,
    });
  }
};

/**
 * 10. Lấy thông tin người dùng hiện tại (/api/auth/me)
 */
export const getMe = async (req, res) => {
  if (!req.user) {
    return sendError(res, { message: 'Không tìm thấy thông tin người dùng.', status: 401 });
  }
  return sendSuccess(res, {
    message: 'Lấy thông tin tài khoản thành công',
    data: sanitizeUserForResponse(req.user),
  });
};

/**
 * 11. Cập nhật thông tin hồ sơ & đồng bộ liên kết Email / Số điện thoại trong MongoDB
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const userId = req.user?._id;
    const {
      name,
      email,
      phone,
      jobTitle,
      bio,
      avatar,
      coverImage,
      socialLinks,
      customLayout,
      profileMusic,
    } = req.body;

    if (!userId || !String(userId).match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, { message: 'Phiên đăng nhập không hợp lệ.', status: 401 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, { message: 'Không tìm thấy tài khoản người dùng trong hệ thống.', status: 404 });
    }

    let nextEmail = user.email;
    let nextPhone = user.phone;

    if (email !== undefined) {
      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail) {
        nextEmail = undefined;
      } else {
        if (!isValidEmail(cleanEmail)) {
          return sendError(res, {
            message: 'Định dạng Email không hợp lệ.',
            status: 400,
          });
        }
        const duplicateEmail = await User.findOne({
          email: cleanEmail,
          _id: { $ne: user._id },
        }).select('_id');
        if (duplicateEmail) {
          return sendError(res, {
            message: 'Email này đã được sử dụng bởi một tài khoản khác trên hệ thống.',
            status: 409,
          });
        }
        nextEmail = cleanEmail;
      }
    }

    if (phone !== undefined) {
      const rawPhone = String(phone || '').trim();
      if (!rawPhone) {
        nextPhone = undefined;
      } else {
        const normalizedPhone = normalizeVietnamPhone(rawPhone);
        if (!normalizedPhone) {
          return sendError(res, {
            message: 'Số điện thoại Việt Nam phải gồm đúng 10 chữ số hợp lệ (ví dụ: 0901234567 hoặc +84901234567).',
            status: 400,
          });
        }
        const duplicatePhone = await User.findOne({
          phone: normalizedPhone,
          _id: { $ne: user._id },
        }).select('_id');
        if (duplicatePhone) {
          return sendError(res, {
            message: 'Số điện thoại này đã được liên kết với một tài khoản khác.',
            status: 409,
          });
        }
        nextPhone = normalizedPhone;
      }
    }

    if (!nextEmail && !nextPhone) {
      return sendError(res, {
        message: 'Tài khoản bắt buộc phải giữ lại ít nhất Email hoặc Số điện thoại liên hệ.',
        status: 400,
      });
    }

    const previousName = user.name;
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length < 2) {
        return sendError(res, {
          message: 'Tên hiển thị phải có ít nhất 2 ký tự.',
          status: 400,
        });
      }
      user.name = trimmedName;
    }

    user.email = nextEmail;
    user.phone = nextPhone;
    if (jobTitle !== undefined) user.jobTitle = String(jobTitle || '').trim();
    if (bio !== undefined) user.bio = String(bio || '').trim();

    if (avatar !== undefined) {
      const cleanAvatar = String(avatar || '').trim();
      if (
        !cleanAvatar ||
        cleanAvatar.includes('/images/man.jpg') ||
        cleanAvatar.includes('google_avatar.jpg')
      ) {
        user.avatar = '';
      } else {
        user.avatar = cleanAvatar;
      }
    }

    if (coverImage !== undefined) user.coverImage = coverImage;

    if (socialLinks && typeof socialLinks === 'object') {
      user.socialLinks = {
        facebook: socialLinks.facebook || '',
        instagram: socialLinks.instagram || '',
        tiktok: socialLinks.tiktok || '',
        x: socialLinks.x || '',
        linkedin: socialLinks.linkedin || '',
        github: socialLinks.github || '',
        website: socialLinks.website || '',
      };
    }

    if (customLayout && typeof customLayout === 'object') {
      const allowedThemes = ['default', 'aurora', 'sunset', 'cyberpunk', 'lavender', 'ocean', 'custom'];
      const allowedFrames = ['none', 'gold', 'neon', 'hologram', 'pastel', 'flame'];
      const allowedAmbients = ['none', 'particles', 'glow', 'waves'];
      const safeCustomBgColor =
        typeof customLayout.customBgColor === 'string' &&
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(customLayout.customBgColor.trim())
          ? customLayout.customBgColor.trim()
          : user.customLayout?.customBgColor || '#0f172a';
      const safeWallpaperUrl =
        typeof customLayout.wallpaperUrl === 'string'
          ? customLayout.wallpaperUrl.trim().slice(0, 600)
          : user.customLayout?.wallpaperUrl || '';

      user.customLayout = {
        theme: allowedThemes.includes(customLayout.theme) ? customLayout.theme : 'default',
        frameStyle: allowedFrames.includes(customLayout.frameStyle) ? customLayout.frameStyle : 'none',
        customBgColor: safeCustomBgColor,
        wallpaperUrl: safeWallpaperUrl,
        ambientEffect: allowedAmbients.includes(customLayout.ambientEffect)
          ? customLayout.ambientEffect
          : 'particles',
      };
    }

    if (profileMusic && typeof profileMusic === 'object') {
      const allowedSources = ['preset', 'url', 'youtube', 'spotify', 'tiktok', 'upload'];
      const allowedQualities = ['standard', 'high', 'lossless'];
      const allowedProfiles = ['balanced', 'lofi', 'bass', 'vocal', 'spatial'];

      user.profileMusic = {
        enabled: profileMusic.enabled !== undefined ? Boolean(profileMusic.enabled) : true,
        title: String(profileMusic.title || 'Lofi Chill').trim().slice(0, 100),
        artist: String(profileMusic.artist || 'Freedom Artist').trim().slice(0, 100),
        sourceType: allowedSources.includes(profileMusic.sourceType) ? profileMusic.sourceType : 'preset',
        presetId: String(profileMusic.presetId || 'lofi_night').trim(),
        url: String(profileMusic.url || '').trim().slice(0, 800),
        audioQuality: allowedQualities.includes(profileMusic.audioQuality)
          ? profileMusic.audioQuality
          : user.profileMusic?.audioQuality || 'high',
        audioProfile: allowedProfiles.includes(profileMusic.audioProfile)
          ? profileMusic.audioProfile
          : user.profileMusic?.audioProfile || 'balanced',
      };
    }

    await user.save();

    if (previousName !== user.name) {
      await Post.updateMany({ user: user._id }, { $set: { author: user.name } }).catch((e) =>
        console.warn('Đồng bộ tên tác giả bài viết:', e.message)
      );
    }

    return sendSuccess(res, {
      message: 'Cập nhật hồ sơ và đồng bộ thông tin thành công!',
      data: sanitizeUserForResponse(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, {
        message: 'Email hoặc Số điện thoại này đã tồn tại trên hệ thống.',
        status: 409,
      });
    }
    return sendError(res, {
      message: error.message || 'Lỗi cập nhật thông tin tài khoản.',
      status: 500,
    });
  }
};

/**
 * 12. Lấy thông tin Trang Cá Nhân Công Khai của một User (100% MongoDB)
 */
export const getUserProfile = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const { id } = req.params;
    const requesterId = req.user?._id ? String(req.user._id) : null;
    let targetUser = null;

    if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(id).select(USER_SAFE_PROJECTION).lean();
    } else if (id) {
      const decodedName = decodeURIComponent(id).trim();
      targetUser = await User.findOne({
        $or: [
          { email: decodedName.toLowerCase() },
          { name: new RegExp(`^${decodedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ],
      })
        .select(USER_SAFE_PROJECTION)
        .lean();
    }

    if (!targetUser) {
      return sendError(res, { message: 'Không tìm thấy thông tin thành viên này.', status: 404 });
    }

    const isSelf = Boolean(requesterId && String(targetUser._id) === requesterId);
    const friendList = Array.isArray(targetUser.friends) ? targetUser.friends.map((fid) => String(fid)) : [];
    const isMutualFriend = Boolean(requesterId && friendList.includes(requesterId));

    const dbPosts = await Post.find({
      $or: [{ user: targetUser._id }, { author: targetUser.name }],
      isPublished: true,
    })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .lean();

    const totalCheersReceived = dbPosts.reduce(
      (sum, p) => sum + (p.cheersCount || p.reactionCounts?.total || 0),
      0
    );
    const totalViews = dbPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    const friendsCount = friendList.length;

    const safeTarget = sanitizeUserForResponse(targetUser);
    if (!isSelf && req.user?.role !== 'admin') {
      delete safeTarget.email;
      delete safeTarget.phone;
    }

    return sendSuccess(res, {
      message: 'Lấy thông tin trang cá nhân thành công',
      data: {
        user: {
          ...safeTarget,
          createdAt: targetUser.createdAt || new Date(),
        },
        relationship: {
          isSelf,
          isMutualFriend,
        },
        stats: {
          postsCount: dbPosts.length,
          totalCheersReceived,
          totalViews,
          friendsCount,
        },
        posts: dbPosts,
      },
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi tải trang cá nhân.',
      status: 500,
    });
  }
};

/**
 * 13. Khởi tạo chuyển hướng OAuth 2.0
 */
export const initiateOAuth = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const provider = String(req.params.provider || 'google').toLowerCase();

  try {
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/oauth/${provider}/callback`;

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (clientId) {
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=email%20profile&access_type=offline&prompt=select_account`;
        return res.redirect(googleAuthUrl);
      }
      return sendError(res, {
        message: 'Google OAuth chưa được cấu hình GOOGLE_CLIENT_ID trên máy chủ.',
        status: 501,
      });
    }

    if (provider === 'facebook') {
      const appId = process.env.FACEBOOK_APP_ID;
      if (appId) {
        const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=email,public_profile`;
        return res.redirect(fbAuthUrl);
      }
      return sendError(res, {
        message: 'Facebook OAuth chưa được cấu hình FACEBOOK_APP_ID trên máy chủ.',
        status: 501,
      });
    }

    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      if (clientId) {
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email`;
        return res.redirect(githubAuthUrl);
      }
      if (process.env.NODE_ENV === 'production') {
        return sendError(res, { message: 'GitHub OAuth chưa được cấu hình trên máy chủ', status: 501 });
      }
      const demoToken = await signToken({
        id: 'github_demo_user',
        role: 'user',
        name: 'Demo GitHub User',
        email: 'demo_github@social.cantstophere.com',
      });
      return res.redirect(
        `${clientUrl}/?oauth=success&provider=github&token=${demoToken}&name=${encodeURIComponent('Demo GitHub User')}&email=demo_github@social.cantstophere.com`
      );
    }

    return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent('Nhà cung cấp OAuth không được hỗ trợ')}`);
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi khởi tạo OAuth', status: 500 });
  }
};

/**
 * 14. Callback OAuth 2.0 -> lưu đồng bộ MongoDB
 */
export const handleOAuthCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const provider = String(req.params.provider || 'google').toLowerCase();

  try {
    const { code, error, error_description } = req.query;
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/oauth/${provider}/callback`;

    if (error) {
      return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent(error_description || error)}`);
    }

    const profile = {
      id: null,
      name: null,
      email: null,
      avatar: null,
      bio: null,
      socialUrl: null,
    };

    if (provider === 'facebook') {
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (code && appId && appSecret) {
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(callbackUrl)}&code=${code}`;
        const tokenRes = await fetch(tokenUrl, { signal: AbortSignal.timeout(10000) });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const profileUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(500).height(500)&access_token=${tokenData.access_token}`;
          const userRes = await fetch(profileUrl, { signal: AbortSignal.timeout(10000) });
          const fbUser = await userRes.json();
          profile.id = fbUser.id;
          profile.name = fbUser.name || 'Người dùng Facebook';
          profile.email = fbUser.email || `facebook_${fbUser.id}@social.cantstophere.com`;
          profile.avatar = fbUser.picture?.data?.url || null;
          profile.socialUrl = `https://www.facebook.com/${fbUser.id}`;
          profile.bio = 'Tài khoản xác thực từ Facebook OAuth 2.0.';
        }
      }
    } else if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (code && clientId && clientSecret) {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: callbackUrl }),
          signal: AbortSignal.timeout(10000),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const userRes = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'User-Agent': 'Freedom-Web-App',
              Accept: 'application/vnd.github+json',
            },
            signal: AbortSignal.timeout(10000),
          });
          const ghUser = await userRes.json();
          let ghEmail = ghUser.email;
          if (!ghEmail) {
            const emailsRes = await fetch('https://api.github.com/user/emails', {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'User-Agent': 'Freedom-Web-App',
              },
              signal: AbortSignal.timeout(10000),
            });
            const emailsData = await emailsRes.json();
            if (Array.isArray(emailsData)) {
              const primary = emailsData.find((e) => e.primary && e.verified) || emailsData[0];
              if (primary) ghEmail = primary.email;
            }
          }
          profile.id = String(ghUser.id);
          profile.name = ghUser.name || ghUser.login || 'GitHub Developer';
          profile.email = ghEmail || `github_${ghUser.id}@social.cantstophere.com`;
          profile.avatar = ghUser.avatar_url || null;
          profile.socialUrl = ghUser.html_url || `https://github.com/${ghUser.login}`;
          profile.bio = ghUser.bio || 'Kỹ sư công nghệ kết nối qua GitHub OAuth 2.0.';
        }
      }
    } else if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (code && clientId && clientSecret) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: callbackUrl,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
            signal: AbortSignal.timeout(10000),
          });
          const gUser = await userRes.json();
          profile.id = gUser.sub;
          profile.name = gUser.name || 'Người dùng Google';
          profile.email = gUser.email;
          profile.avatar = gUser.picture || null;
          profile.bio = 'Tài khoản xác thực từ Google OAuth 2.0.';
        }
      }
    }

    if (!profile.id || !profile.name) {
      return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent(`Không thể xác thực qua ${provider.toUpperCase()}.`)}`);
    }

    await ensureDbConnected();
    if (!isDbConnected) {
      return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent('Cơ sở dữ liệu chưa sẵn sàng. Vui lòng thử lại sau.')}`);
    }

    const cleanEmail = normalizeEmail(profile.email || `${provider}_${profile.id}@social.cantstophere.com`);
    let targetUser = await User.findOne({
      $or: [{ providerId: profile.id, authProvider: provider }, { email: cleanEmail }],
    });

    const adminEmailEnv = getConfiguredAdminEmail();

    if (targetUser) {
      if (targetUser.status === 'banned') {
        return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent('Tài khoản của bạn đã bị khóa.')}`);
      }
      targetUser.isVerified = true;
      targetUser.providerId = targetUser.providerId || profile.id;
      if (profile.avatar && !targetUser.avatar) targetUser.avatar = profile.avatar;
      await targetUser.save();
    } else {
      const randomPw = await hashPassword(`${provider}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`);
      targetUser = await User.create({
        name: profile.name.trim(),
        email: cleanEmail,
        password: randomPw,
        role: adminEmailEnv && cleanEmail === adminEmailEnv ? 'admin' : 'user',
        isVerified: true,
        jobTitle: provider === 'github' ? 'Senior Software Engineer' : 'Thành viên cộng đồng',
        avatar: profile.avatar || '',
        bio: profile.bio || '',
        authProvider: provider,
        providerId: profile.id,
        socialLinks: profile.socialUrl ? { [provider]: profile.socialUrl } : {},
      });
    }

    const sessionPayload = await issueAuthSessionPayload(targetUser);
    return res.redirect(
      `${clientUrl}/?oauth=success&provider=${provider}&token=${sessionPayload.token}&refreshToken=${sessionPayload.refreshToken}&name=${encodeURIComponent(sessionPayload.name)}&email=${encodeURIComponent(sessionPayload.email)}&avatar=${encodeURIComponent(sessionPayload.avatar || '')}`
    );
  } catch (err) {
    console.error(`[OAuth Callback Error] provider: ${provider}`, err);
    return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent(err.message || 'Lỗi xử lý callback OAuth')}`);
  }
};

// ========================================================
// HỆ THỐNG ĐĂNG NHẬP BẰNG MÃ QR (QR CODE AUTH)
// ========================================================
const qrSessionStore = new Map();

const qrCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, session] of qrSessionStore.entries()) {
    if (session.expiresAt && now > session.expiresAt + 60000) {
      qrSessionStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (qrCleanupTimer.unref) {
  qrCleanupTimer.unref();
}

export const generateQrSession = async (req, res) => {
  try {
    const sessionId = `qr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const expiresInSeconds = 120;
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    const qrData = {
      app: 'freedom-web',
      action: 'login',
      sessionId,
      expiresAt,
      timestamp: Date.now(),
    };

    qrSessionStore.set(sessionId, {
      sessionId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt,
      token: null,
      refreshToken: null,
      user: null,
    });

    return sendSuccess(res, {
      message: 'Đã sinh mã QR đăng nhập thành công',
      data: {
        sessionId,
        expiresInSeconds,
        expiresAt,
        qrPayload: JSON.stringify(qrData),
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi tạo phiên QR', status: 500 });
  }
};

export const checkQrSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || !qrSessionStore.has(sessionId)) {
      return sendSuccess(res, {
        message: 'Phiên QR không tồn tại hoặc đã hết hạn',
        data: { status: 'expired' },
      });
    }

    const session = qrSessionStore.get(sessionId);
    if (Date.now() > session.expiresAt && session.status !== 'authenticated') {
      session.status = 'expired';
      return sendSuccess(res, {
        message: 'Mã QR đã hết hạn',
        data: { status: 'expired' },
      });
    }

    if (session.status === 'authenticated') {
      const payload = {
        status: 'authenticated',
        token: session.token,
        refreshToken: session.refreshToken,
        user: session.user,
      };
      qrSessionStore.delete(sessionId);
      return sendSuccess(res, {
        message: 'Xác thực mã QR thành công!',
        data: payload,
      });
    }

    return sendSuccess(res, {
      message: 'Đang chờ quét mã QR',
      data: { status: session.status },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const verifyQrSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const user = req.user;

    if (!sessionId || !qrSessionStore.has(sessionId)) {
      return sendError(res, { message: 'Phiên mã QR không hợp lệ hoặc đã hết hạn', status: 400 });
    }

    const session = qrSessionStore.get(sessionId);
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      return sendError(res, { message: 'Mã QR này đã hết hạn. Vui lòng làm mới trên máy tính!', status: 400 });
    }

    if (!user) {
      return sendError(res, { message: 'Bạn cần đăng nhập tài khoản trên thiết bị này trước khi xác nhận', status: 401 });
    }

    if (user.role === 'admin') {
      return sendError(res, {
        message: 'Tài khoản Quản trị viên không được phép đăng nhập qua mã QR thông thường. Vui lòng truy cập Cổng Quản Trị Bảo Mật!',
        status: 403,
      });
    }

    if (user.status === 'banned') {
      return sendError(res, {
        message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Không thể xác thực mã QR.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    const sessionPayload = await issueAuthSessionPayload(user);
    const { token, refreshToken, ...safeUser } = sessionPayload;
    session.status = 'authenticated';
    session.token = token;
    session.refreshToken = refreshToken;
    session.user = safeUser;

    return sendSuccess(res, {
      message: '✓ Đã xác nhận đăng nhập cho máy tính thành công!',
      data: { status: 'authenticated' },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const simulateQrSessionScan = async (req, res) => {
  try {
    const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (!isDevOrTest) {
      return sendError(res, {
        message: 'Tính năng mô phỏng quét mã QR (QR Simulate) chỉ được phép hoạt động trên môi trường development hoặc test.',
        status: 403,
      });
    }

    if (!(await ensureDatabaseReadyOr503(res))) return;

    const { sessionId, email } = req.body;
    if (!sessionId || !qrSessionStore.has(sessionId)) {
      return sendError(res, { message: 'Mã QR không tồn tại hoặc đã hết hạn', status: 400 });
    }

    const session = qrSessionStore.get(sessionId);
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      return sendError(res, { message: 'Mã QR đã hết hạn', status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const targetUser = cleanEmail
      ? await User.findOne({ email: cleanEmail, status: { $ne: 'banned' }, isVerified: true }).select(USER_SAFE_PROJECTION)
      : await User.findOne({ role: 'user', status: { $ne: 'banned' }, isVerified: true }).select(USER_SAFE_PROJECTION);

    if (!targetUser) {
      return sendError(res, { message: 'Không tìm thấy tài khoản hợp lệ trong MongoDB để mô phỏng QR.', status: 404 });
    }

    const sessionPayload = await issueAuthSessionPayload(targetUser);
    const { token, refreshToken, ...safeUser } = sessionPayload;
    session.status = 'authenticated';
    session.token = token;
    session.refreshToken = refreshToken;
    session.user = safeUser;

    return sendSuccess(res, {
      message: `Đã mô phỏng quét mã thành công với tài khoản: ${safeUser.name}`,
      data: { status: 'authenticated' },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * 15. Làm mới Access Token bằng Refresh Token (MongoDB Source of Truth)
 */
export const refreshToken = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const { refreshToken: tokenInput } = req.body;
    if (!tokenInput || typeof tokenInput !== 'string' || tokenInput.length > 2048) {
      return sendError(res, {
        message: 'Refresh token không hợp lệ hoặc vượt quá độ dài cho phép',
        status: 400,
      });
    }

    let decoded;
    try {
      decoded = await verifyRefreshToken(tokenInput);
    } catch (err) {
      return sendError(res, {
        message: err.message || 'Refresh token không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại',
        status: 401,
      });
    }

    if (!decoded?.id || !String(decoded.id).match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, {
        message: 'Không tìm thấy thông tin tài khoản tương ứng với phiên làm việc.',
        status: 401,
      });
    }

    const user = await User.findById(decoded.id).select(USER_SAFE_PROJECTION);
    if (!user) {
      return sendError(res, {
        message: 'Không tìm thấy thông tin tài khoản tương ứng với phiên làm việc',
        status: 401,
      });
    }

    if (user.status === 'banned') {
      revokeToken(tokenInput);
      return sendError(res, {
        message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    const currentVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== currentVersion) {
      return sendError(res, {
        message: 'Phiên đăng nhập đã bị thu hồi hoặc đổi mật khẩu. Vui lòng đăng nhập lại!',
        status: 401,
      });
    }

    revokeToken(tokenInput);

    const sessionPayload = await issueAuthSessionPayload(user);
    const { token: newAccessToken, refreshToken: newRefreshToken, ...safeUser } = sessionPayload;

    return sendSuccess(res, {
      message: 'Làm mới token xác thực thành công',
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        user: safeUser,
      },
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi xử lý làm mới phiên đăng nhập',
      status: 500,
    });
  }
};

/**
 * 16. Đăng xuất hiện tại & Thu hồi Refresh Token
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken: tokenInput } = req.body;
    if (tokenInput && typeof tokenInput === 'string' && tokenInput.length <= 2048) {
      revokeToken(tokenInput);
    }
    return sendSuccess(res, {
      message: 'Đăng xuất tài khoản thành công',
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi khi đăng xuất tài khoản',
      status: 500,
    });
  }
};

/**
 * 17. Đăng xuất toàn bộ thiết bị (tăng tokenVersion trong MongoDB)
 */
export const logoutAll = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const userId = req.user?._id;
    if (userId && String(userId).match(/^[0-9a-fA-F]{24}$/)) {
      await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
    }

    return sendSuccess(res, {
      message: 'Đã thu hồi phiên đăng nhập trên toàn bộ thiết bị thành công. Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi khi thu hồi phiên trên toàn bộ thiết bị',
      status: 500,
    });
  }
};

/**
 * 18. Đăng nhập Google Identity Services (100% MongoDB)
 * POST /api/auth/google
 */
export const googleLogin = async (req, res) => {
  try {
    if (!(await ensureDatabaseReadyOr503(res))) return;

    const tokenInput = String(
      req.body?.credential || req.body?.idToken || req.body?.access_token || req.body?.token || ''
    ).trim();

    if (!tokenInput) {
      return sendError(res, {
        message: 'Thiếu Google credential ID token.',
        status: 400,
      });
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
    let payload = null;

    if (tokenInput.split('.').length === 3) {
      if (!clientId) {
        return sendError(res, {
          message: 'Máy chủ chưa được cấu hình biến môi trường GOOGLE_CLIENT_ID.',
          status: 500,
        });
      }

      try {
        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
          idToken: tokenInput,
          audience: clientId,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        return sendError(res, {
          message: 'Token Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
          status: 401,
          code: 'GOOGLE_TOKEN_INVALID',
        });
      }
    } else {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenInput}` },
          signal: AbortSignal.timeout(10000),
        });
        if (!userInfoRes.ok) {
          throw new Error(`HTTP ${userInfoRes.status}`);
        }
        const userInfo = await userInfoRes.json();
        payload = {
          sub: userInfo.sub,
          email: userInfo.email,
          email_verified: userInfo.email_verified !== false,
          name: userInfo.name,
          picture: userInfo.picture,
        };
      } catch (_) {
        return sendError(res, {
          message: 'Phiên xác thực Google OAuth đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.',
          status: 401,
          code: 'GOOGLE_TOKEN_INVALID',
        });
      }
    }

    if (!payload?.email) {
      return sendError(res, {
        message: 'Tài khoản Google chưa cấp quyền truy cập địa chỉ Email.',
        status: 400,
      });
    }

    const cleanEmail = normalizeEmail(payload.email);
    const googleSub = String(payload.sub || '').trim();
    const googleName = String(payload.name || cleanEmail.split('@')[0] || 'Thành viên Google').trim();
    const googlePicture = String(payload.picture || '').trim();
    const adminEmailEnv = getConfiguredAdminEmail();

    let user = await User.findOne({
      $or: [
        googleSub ? { googleId: googleSub } : null,
        { email: cleanEmail },
      ].filter(Boolean),
    });

    if (user) {
      if (user.status === 'banned') {
        return sendError(res, {
          message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Không thể đăng nhập bằng Google.',
          status: 403,
          code: 'ACCOUNT_BANNED',
        });
      }

      let hasUpdates = false;
      if (googleSub && !user.googleId) {
        user.googleId = googleSub;
        hasUpdates = true;
      }
      if (!user.providerId && googleSub) {
        user.providerId = googleSub;
        hasUpdates = true;
      }
      if (payload.email_verified !== false && !user.isVerified) {
        user.isVerified = true;
        hasUpdates = true;
      }
      if (googlePicture && (!user.avatar || user.avatar.includes('/images/man.jpg'))) {
        user.avatar = googlePicture;
        hasUpdates = true;
      }
      if (user.role === 'admin' && googleSub) {
        const telemetry = extractTelemetry(req);
        try {
          await AdminAuditLog.create({
            adminId: user._id,
            adminEmail: user.email,
            adminName: user.name,
            action: 'ADMIN_GOOGLE_OAUTH_LOGIN',
            ipAddress: telemetry.ipAddress,
            country: telemetry.country,
            city: telemetry.city,
            isp: telemetry.isp,
            userAgent: telemetry.userAgent,
            status: 'SUCCESS',
            details: `Quản trị viên ${user.name} đăng nhập bằng Google OAuth.`,
          });
        } catch (auditErr) {
          console.warn('[Admin Google Login] Ghi Audit Log thất bại:', auditErr.message);
        }

        if (telemetry.ipAddress && telemetry.ipAddress !== '127.0.0.1') {
          sendAdminSecurityAlertEmail({
            toEmail: user.email,
            adminName: user.name,
            telemetry,
            isPinVerified: true,
          }).catch(() => {});
        }
      }
      if (hasUpdates) {
        await user.save();
      }
    } else {
      const randomPassword = await hashPassword(
        `google_oauth_${googleSub}_${crypto.randomBytes(12).toString('hex')}`
      );
      const assignedRole = adminEmailEnv && cleanEmail === adminEmailEnv ? 'admin' : 'user';

      user = await User.create({
        name: googleName,
        email: cleanEmail,
        password: randomPassword,
        role: assignedRole,
        isVerified: payload.email_verified !== false,
        jobTitle: assignedRole === 'admin' ? 'Quản trị viên Hệ thống' : 'Thành viên cộng đồng',
        avatar: googlePicture,
        coverImage:
          'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
        bio: 'Tham gia cộng đồng You Can’t Stop Here qua Google.',
        authProvider: 'google',
        providerId: googleSub || `google_${Date.now()}`,
        googleId: googleSub,
      });
    }

    const sessionPayload = await issueAuthSessionPayload(user);
    return sendSuccess(res, {
      message: 'Đăng nhập bằng Google thành công!',
      data: sessionPayload,
    });
  } catch (error) {
    console.error('[Google Login Error]:', error);
    return sendError(res, {
      message: error.message || 'Lỗi xác thực Google OAuth.',
      status: 500,
    });
  }
};
