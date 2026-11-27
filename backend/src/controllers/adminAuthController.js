import crypto from 'crypto';
import AdminAuditLog from '../models/AdminAuditLog.js';
import OtpVerification from '../models/OtpVerification.js';
import User from '../models/User.js';
import { extractTelemetry } from '../utils/telemetryHelper.js';
import { sendAdminSecurityAlertEmail, sendOtpEmail as sendFallbackOtpEmail } from '../services/emailService.js';
import { sendOtpEmail as sendPrimaryMailerOtp } from '../services/mailer.js';
import { signAccessToken, signRefreshToken, signAdminToken } from '../utils/token.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { ensureDbConnected, checkDbReady } from '../config/db.js';
import { findUserInStore, defaultStoreUsers } from '../utils/persistentStore.js';
import { comparePassword } from '../utils/hash.js';

// Mã PIN Quản Trị đọc từ biến môi trường (tuyệt đối không dùng PIN tĩnh dễ đoán)
let ephemeralDevAdminPin = '';
const resolveExpectedAdminPin = () => {
  const envPin = String(process.env.ADMIN_PIN || process.env.ADMIN_SECRET_PIN || '').trim();
  if (envPin) return envPin;
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  if (!ephemeralDevAdminPin) {
    ephemeralDevAdminPin = String(crypto.randomInt(100000, 1000000));
    console.warn(
      `[SECURITY WARNING] Biến môi trường ADMIN_PIN / ADMIN_SECRET_PIN chưa được cấu hình! Mã PIN ngẫu nhiên cho phiên local dev này là: ${ephemeralDevAdminPin}`
    );
  }
  return ephemeralDevAdminPin;
};

// Bộ đếm chống brute-force Mã PIN Quản Trị: tối đa 5 lần sai trong 15 phút theo userId / IP
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;
const adminPinAttempts = new Map();

const pinAttemptsCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of adminPinAttempts.entries()) {
    if (!entry || (entry.lockedUntil && now > entry.lockedUntil) || now - entry.windowStart > PIN_LOCK_WINDOW_MS) {
      adminPinAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (pinAttemptsCleanup.unref) {
  pinAttemptsCleanup.unref();
}

const safeCompareSecret = (inputVal, expectedVal) => {
  const a = Buffer.from(String(inputVal || ''), 'utf8');
  const b = Buffer.from(String(expectedVal || ''), 'utf8');
  if (a.length !== b.length || b.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
};

const generateNumericOtp6 = () => {
  return String(crypto.randomInt(100000, 1000000));
};

/**
 * Lớp 1: Xác thực Mã PIN Quản Trị (POST /api/admin/verify-pin)
 * Đúng PIN -> Sinh OTP 6 số, lưu OtpVerification (purpose: 'admin_gate') & gửi Email OTP tới chính Admin.
 */
export const verifyAdminPin = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      requireAdminPin: true,
      message: 'Truy cập bị từ chối! Chức năng chỉ dành cho Quản Trị Viên.',
    });
  }

  const userId = String(req.user?._id || req.user?.id || '').trim();
  const userEmail = String(req.user?.email || '').toLowerCase().trim();
  if (!userEmail) {
    return res.status(400).json({
      success: false,
      requireAdminPin: true,
      message: 'Tài khoản Quản Trị chưa có địa chỉ Email hợp lệ để nhận OTP.',
    });
  }

  const attemptKey = userId ? `user:${userId}` : `ip:${req.ip || 'unknown'}`;
  const now = Date.now();

  let record = adminPinAttempts.get(attemptKey);
  if (record) {
    if (record.lockedUntil && now < record.lockedUntil) {
      const waitMinutes = Math.max(1, Math.ceil((record.lockedUntil - now) / 60000));
      return res.status(429).json({
        success: false,
        requireAdminPin: true,
        message: `Bạn đã nhập sai Mã PIN quá ${PIN_MAX_ATTEMPTS} lần. Vui lòng thử lại sau ${waitMinutes} phút!`,
      });
    }
    if (now - record.windowStart > PIN_LOCK_WINDOW_MS) {
      record = { count: 0, windowStart: now, lockedUntil: null };
      adminPinAttempts.set(attemptKey, record);
    }
  }

  const submittedPin = String(req.body?.pin ?? '').trim();
  const expectedPin = resolveExpectedAdminPin();

  if (!expectedPin) {
    return res.status(500).json({
      success: false,
      requireAdminPin: true,
      message: 'Hệ thống chưa cấu hình biến môi trường ADMIN_PIN hoặc ADMIN_SECRET_PIN.',
    });
  }

  if (!submittedPin) {
    return res.status(400).json({
      success: false,
      requireAdminPin: true,
      message: 'Vui lòng nhập Mã PIN Quản Trị.',
    });
  }

  if (!safeCompareSecret(submittedPin, expectedPin)) {
    const nextCount = (record?.count || 0) + 1;
    const lockedUntil = nextCount >= PIN_MAX_ATTEMPTS ? now + PIN_LOCK_WINDOW_MS : null;
    adminPinAttempts.set(attemptKey, {
      count: nextCount,
      windowStart: record?.windowStart || now,
      lockedUntil,
    });

    const telemetry = extractTelemetry(req);
    ensureDbConnected()
      .then(() => {
        if (checkDbReady()) {
          return AdminAuditLog.create({
            action: 'LOGIN_FAILED',
            email: userEmail || userId,
            ip: telemetry.ip,
            location: telemetry.location,
            userAgent: telemetry.userAgent,
            timeVn: telemetry.timeVn,
            details: { reason: `Invalid Admin PIN Layer-1 attempt (${nextCount}/${PIN_MAX_ATTEMPTS})` },
          });
        }
        return null;
      })
      .catch(() => {});

    if (lockedUntil) {
      sendAdminSecurityAlertEmail({
        action: 'LOGIN_FAILED',
        targetEmail: userEmail || userId,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: { reason: 'Admin PIN brute-force lockout triggered (5 failed attempts in 15m)' },
      }).catch(() => {});

      return res.status(429).json({
        success: false,
        requireAdminPin: true,
        message: 'Bạn đã nhập sai Mã PIN quá 5 lần trong 15 phút. Cổng xác thực PIN tạm khóa 15 phút!',
      });
    }

    const remaining = PIN_MAX_ATTEMPTS - nextCount;
    return res.status(401).json({
      success: false,
      requireAdminPin: true,
      message: `Mã PIN Quản Trị không chính xác. Bạn còn ${remaining} lần thử!`,
    });
  }

  adminPinAttempts.delete(attemptKey);

  try {
    await ensureDbConnected();
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu chưa sẵn sàng để lưu mã OTP Quản Trị. Vui lòng thử lại sau giây lát.',
        status: 503,
      });
    }

    const otp = generateNumericOtp6();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await OtpVerification.findOneAndUpdate(
      { email: userEmail },
      {
        $set: {
          email: userEmail,
          otp,
          purpose: 'admin_gate',
          expiresAt,
          attempts: 0,
          targetType: 'email',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendPrimaryMailerOtp(userEmail, otp, 'admin_gate');
    } catch (primaryMailErr) {
      console.warn('[ADMIN 2FA] Lỗi sendPrimaryMailerOtp, thử EmailService dự phòng:', primaryMailErr.message);
      try {
        await sendFallbackOtpEmail(userEmail, otp, 'admin_gate');
      } catch (fallbackMailErr) {
        await OtpVerification.deleteOne({ email: userEmail, purpose: 'admin_gate' }).catch(() => {});
        return sendError(res, {
          message: 'Không thể gửi email OTP xác thực Quản Trị (Lớp 2). Vui lòng kiểm tra cấu hình Mailer và thử lại.',
          status: 500,
        });
      }
    }

    const telemetry = extractTelemetry(req);
    AdminAuditLog.create({
      action: 'LOGIN_SUCCESS',
      email: userEmail,
      ip: telemetry.ip,
      location: telemetry.location,
      userAgent: telemetry.userAgent,
      timeVn: telemetry.timeVn,
      details: { portal: 'Admin PIN Layer 1 Passed -> Email OTP (Layer 2) Sent' },
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      requireOtp: true,
      email: userEmail,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      message: `Mã PIN hợp lệ! Đã gửi mã OTP 6 số (Lớp 2) tới ${userEmail}`,
    });
  } catch (err) {
    return sendError(res, {
      message: err?.message || 'Không thể khởi tạo phiên xác thực Email OTP Quản Trị.',
      status: 500,
    });
  }
};

/**
 * Lớp 2: Xác thực Mã OTP Email Quản Trị (POST /api/admin/verify-admin-otp)
 * Đúng OTP -> Xóa bản ghi OTP & ký adminToken (2h).
 */
export const verifyAdminOtp = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      requireAdminPin: true,
      message: 'Truy cập bị từ chối! Chức năng chỉ dành cho Quản Trị Viên.',
    });
  }

  const userId = String(req.user?._id || req.user?.id || '').trim();
  const userEmail = String(req.user?.email || '').toLowerCase().trim();
  const cleanOtp = String(req.body?.otp || '').replace(/\s+/g, '').trim();

  if (!cleanOtp || !/^\d{6}$/.test(cleanOtp)) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.',
    });
  }

  try {
    await ensureDbConnected();
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu chưa sẵn sàng. Vui lòng thử lại sau giây lát.',
        status: 503,
      });
    }

    const otpDoc = await OtpVerification.findOne({ email: userEmail, purpose: 'admin_gate' });
    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: 'Phiên xác thực OTP Quản Trị không tồn tại hoặc đã bị hủy. Vui lòng xác thực lại Mã PIN hoặc bấm Gửi lại mã!',
      });
    }

    if (otpDoc.expiresAt && new Date(otpDoc.expiresAt).getTime() < Date.now()) {
      await OtpVerification.deleteOne({ _id: otpDoc._id }).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn (quá 5 phút). Vui lòng bấm Gửi lại mã!',
      });
    }

    if (!safeCompareSecret(cleanOtp, String(otpDoc.otp || '').trim())) {
      const nextAttempts = (otpDoc.attempts || 0) + 1;
      const telemetry = extractTelemetry(req);

      AdminAuditLog.create({
        action: 'LOGIN_FAILED',
        email: userEmail,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: { reason: `Invalid Admin OTP Layer-2 attempt (${nextAttempts}/${OTP_MAX_ATTEMPTS})` },
      }).catch(() => {});

      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        await OtpVerification.deleteOne({ _id: otpDoc._id }).catch(() => {});
        return res.status(429).json({
          success: false,
          message: 'Bạn đã nhập sai mã OTP quá 5 lần. Mã OTP hiện tại đã bị hủy, vui lòng bấm Gửi lại mã!',
        });
      }

      await OtpVerification.updateOne({ _id: otpDoc._id }, { $set: { attempts: nextAttempts } });
      return res.status(401).json({
        success: false,
        message: `Mã OTP không chính xác. Bạn còn ${OTP_MAX_ATTEMPTS - nextAttempts} lần thử!`,
      });
    }

    // Xóa bản ghi OTP ngay sau khi khớp thành công (Single-Use)
    await OtpVerification.deleteOne({ _id: otpDoc._id });

    const adminToken = await signAdminToken({
      id: userId,
      role: req.user?.role || 'admin',
      email: userEmail,
    });

    const telemetry = extractTelemetry(req);
    AdminAuditLog.create({
      action: 'LOGIN_SUCCESS',
      email: userEmail,
      ip: telemetry.ip,
      location: telemetry.location,
      userAgent: telemetry.userAgent,
      timeVn: telemetry.timeVn,
      details: { portal: 'Admin 2FA Gate Unlocked (PIN + Email OTP, 2h)' },
    }).catch(() => {});

    sendAdminSecurityAlertEmail({
      action: 'LOGIN_SUCCESS',
      targetEmail: userEmail,
      ip: telemetry.ip,
      location: telemetry.location,
      userAgent: telemetry.userAgent,
      timeVn: telemetry.timeVn,
      details: { portal: 'Admin Security Console 2FA Unlocked (PIN + Email OTP)' },
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Mở khóa Quản Trị thành công!',
      adminToken,
    });
  } catch (err) {
    console.error('[Verify Admin OTP Error]:', err);
    return sendError(res, {
      message: err?.message || 'Lỗi máy chủ khi xác thực OTP Quản Trị.',
      status: 500,
    });
  }
};

/**
 * Đăng nhập Cổng Bảo Mật Admin Riêng Biệt (POST /api/admin/auth/login)
 * Kèm Rate-limit 5 lần / 15 phút và Ghi nhận Telemetry + Cảnh báo Brevo
 */
export const adminLogin = async (req, res) => {
  const telemetry = extractTelemetry(req);
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, {
      message: 'Vui lòng cung cấp đầy đủ Email và Mật khẩu Quản trị',
      status: 400,
    });
  }

  const cleanEmail = String(email).toLowerCase().trim();

  try {
    let adminUser = null;

    await ensureDbConnected().catch(() => false);
    if (checkDbReady()) {
      adminUser = await User.findOne({ email: cleanEmail });
    }

    if (!adminUser) {
      const storeFound =
        findUserInStore(cleanEmail) ||
        defaultStoreUsers.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
      if (storeFound) {
        adminUser = storeFound;
      }
    }

    // 1. Kiểm tra tài khoản tồn tại và có Role Admin hay không
    if (!adminUser || adminUser.role !== 'admin') {
      // Ghi nhận nỗ lực xâm nhập thất bại
      try {
        await AdminAuditLog.create({
          action: 'LOGIN_FAILED',
          email: cleanEmail,
          ip: telemetry.ip,
          location: telemetry.location,
          userAgent: telemetry.userAgent,
          timeVn: telemetry.timeVn,
          details: { reason: 'Account does not exist or is not an admin' },
        });
      } catch (_) {}

      // Bắn email cảnh báo khẩn cấp tới Admin chính
      sendAdminSecurityAlertEmail({
        action: 'LOGIN_FAILED',
        targetEmail: cleanEmail,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: { reason: 'Unauthorized admin login attempt' },
      }).catch(() => {});

      return sendError(res, {
        message: 'Email hoặc mật khẩu quản trị không chính xác',
        status: 401,
      });
    }

    // 2. So sánh mật khẩu (chỉ chấp nhận hash an toàn)
    let isMatch = false;
    if (typeof adminUser.comparePassword === 'function') {
      isMatch = await adminUser.comparePassword(password);
    } else if (adminUser.password) {
      isMatch = await comparePassword(password, adminUser.password);
    }

    if (!isMatch) {
      // Ghi nhận sai mật khẩu
      try {
        await AdminAuditLog.create({
          action: 'LOGIN_FAILED',
          email: cleanEmail,
          ip: telemetry.ip,
          location: telemetry.location,
          userAgent: telemetry.userAgent,
          timeVn: telemetry.timeVn,
          details: { reason: 'Wrong password entered' },
        });
      } catch (_) {}

      sendAdminSecurityAlertEmail({
        action: 'LOGIN_FAILED',
        targetEmail: cleanEmail,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: { reason: 'Wrong password entered for admin account' },
      }).catch(() => {});

      return sendError(res, {
        message: 'Email hoặc mật khẩu quản trị không chính xác',
        status: 401,
      });
    }

    if (adminUser.status === 'banned') {
      try {
        await AdminAuditLog.create({
          action: 'LOGIN_FAILED',
          email: cleanEmail,
          ip: telemetry.ip,
          location: telemetry.location,
          userAgent: telemetry.userAgent,
          timeVn: telemetry.timeVn,
          details: { reason: 'Banned admin account login attempt' },
        });
      } catch (_) {}

      return sendError(res, {
        message: 'Tài khoản quản trị này đã bị khóa bởi Quản trị viên hệ thống.',
        status: 403,
        code: 'ACCOUNT_BANNED',
      });
    }

    // 3. ĐĂNG NHẬP THÀNH CÔNG: Cấp token và ghi log an ninh
    const tokenVersion = adminUser.tokenVersion !== undefined ? adminUser.tokenVersion : 0;
    const token = await signAccessToken({
      id: adminUser._id,
      role: 'admin',
      name: adminUser.name,
      email: adminUser.email,
      tokenVersion,
    });
    const refreshToken = await signRefreshToken({
      id: adminUser._id,
      tokenVersion,
    });

    try {
      await AdminAuditLog.create({
        action: 'LOGIN_SUCCESS',
        email: cleanEmail,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: { portal: 'Security Console' },
      });
    } catch (_) {}

    // Gửi email cảnh báo tới các Admin còn lại
    sendAdminSecurityAlertEmail({
      action: 'LOGIN_SUCCESS',
      targetEmail: cleanEmail,
      ip: telemetry.ip,
      location: telemetry.location,
      userAgent: telemetry.userAgent,
      timeVn: telemetry.timeVn,
    }).catch(() => {});

    const adminUserData = {
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: 'admin',
      jobTitle: adminUser.jobTitle || 'Quản Trị Viên Hệ Thống',
      avatar: adminUser.avatar || '',
    };

    return sendSuccess(res, {
      message: 'Đăng nhập Cổng Quản Trị thành công',
      data: {
        ...adminUserData,
        user: adminUserData,
        token,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('[Admin Login Error]:', err);
    return sendError(res, {
      message: 'Lỗi máy chủ trong quá trình xác thực Quản trị',
      status: 500,
    });
  }
};

/**
 * Ghi nhận Telemetry khi có người truy cập trang /admin-portal (POST /api/admin/auth/telemetry)
 * KHÔNG gửi email để tránh crawler gây spam
 */
export const adminTelemetry = async (req, res) => {
  try {
    const telemetry = extractTelemetry(req);
    await AdminAuditLog.create({
      action: 'PORTAL_VISITED',
      email: 'visitor',
      ip: telemetry.ip,
      location: telemetry.location,
      userAgent: telemetry.userAgent,
      timeVn: telemetry.timeVn,
      details: { url: req.originalUrl },
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.json({ ok: false });
  }
};

/**
 * Lấy danh sách 50 bản ghi Audit Log mới nhất (GET /api/admin/security-logs)
 * Yêu cầu quyền Admin
 */
export const getSecurityLogs = async (req, res) => {
  try {
    await ensureDbConnected().catch(() => false);
    if (!checkDbReady()) {
      return sendSuccess(res, {
        message: 'Cơ sở dữ liệu chưa sẵn sàng, tạm hiển thị nhật ký trống.',
        data: [],
      });
    }
    const logs = await AdminAuditLog.find()
      .select('action email ip location userAgent timeVn details createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return sendSuccess(res, {
      message: 'Lấy nhật ký an ninh thành công',
      data: logs,
    });
  } catch (err) {
    console.error('[Get Security Logs Error]:', err);
    return sendError(res, {
      message: 'Không thể truy xuất nhật ký an ninh',
      status: 500,
    });
  }
};
