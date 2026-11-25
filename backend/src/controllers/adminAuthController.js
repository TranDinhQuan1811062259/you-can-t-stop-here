import crypto from 'crypto';
import AdminAuditLog from '../models/AdminAuditLog.js';
import User from '../models/User.js';
import { extractTelemetry } from '../utils/telemetryHelper.js';
import { sendAdminSecurityAlertEmail } from '../services/emailService.js';
import { signAccessToken, signRefreshToken, signAdminToken } from '../utils/token.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { ensureDbConnected, checkDbReady } from '../config/db.js';
import { findUserInStore, defaultStoreUsers } from '../utils/persistentStore.js';
import { comparePassword } from '../utils/hash.js';

// Bộ đếm chống brute-force Mã PIN Quản Trị: tối đa 5 lần sai trong 15 phút theo userId / IP
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
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

const safeComparePin = (inputPin, expectedPin) => {
  const a = Buffer.from(String(inputPin || ''), 'utf8');
  const b = Buffer.from(String(expectedPin || ''), 'utf8');
  if (a.length !== b.length || b.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Xác thực Mã PIN Quản Trị (POST /api/admin/verify-pin)
 * Yêu cầu đã đăng nhập và req.user.role === 'admin'. Cấp adminToken có hiệu lực 2 giờ.
 */
export const verifyAdminPin = async (req, res) => {
  const userId = String(req.user?._id || req.user?.id || '').trim();
  const userEmail = String(req.user?.email || '').toLowerCase().trim();
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
  const expectedPin = String(process.env.ADMIN_SECRET_PIN || '261126').trim();

  if (!submittedPin) {
    return res.status(400).json({
      success: false,
      requireAdminPin: true,
      message: 'Vui lòng nhập Mã PIN Quản Trị.',
    });
  }

  if (!safeComparePin(submittedPin, expectedPin)) {
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
            details: { reason: `Invalid Admin PIN attempt (${nextCount}/${PIN_MAX_ATTEMPTS})` },
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
    return res.status(403).json({
      success: false,
      requireAdminPin: true,
      message: `Mã PIN Quản Trị không chính xác. Bạn còn ${remaining} lần thử!`,
    });
  }

  adminPinAttempts.delete(attemptKey);

  try {
    const adminToken = await signAdminToken({
      id: userId,
      role: req.user?.role || 'admin',
      email: userEmail,
    });

    const telemetry = extractTelemetry(req);
    ensureDbConnected()
      .then(() => {
        if (checkDbReady()) {
          return AdminAuditLog.create({
            action: 'LOGIN_SUCCESS',
            email: userEmail || userId,
            ip: telemetry.ip,
            location: telemetry.location,
            userAgent: telemetry.userAgent,
            timeVn: telemetry.timeVn,
            details: { portal: 'Admin PIN Gate Unlocked (2h)' },
          });
        }
        return null;
      })
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Xác thực Mã PIN Quản Trị thành công!',
      adminToken,
    });
  } catch (err) {
    return sendError(res, {
      message: err?.message || 'Không thể tạo token mở khóa Quản trị.',
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

    // 2. So sánh mật khẩu
    let isMatch = false;
    if (typeof adminUser.comparePassword === 'function') {
      isMatch = await adminUser.comparePassword(password);
    } else if (adminUser.password) {
      isMatch = await comparePassword(password, adminUser.password);
    } else if (adminUser.rawPassword) {
      isMatch = adminUser.rawPassword === password;
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
