import AdminAuditLog from '../models/AdminAuditLog.js';
import User from '../models/User.js';
import { extractTelemetry } from '../utils/telemetryHelper.js';
import { sendAdminSecurityAlertEmail } from '../services/emailService.js';
import { signAccessToken, signRefreshToken } from '../utils/token.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { isDbConnected } from '../config/db.js';
import { findUserInStore, defaultStoreUsers } from '../utils/persistentStore.js';
import { comparePassword } from '../utils/hash.js';

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

    if (isDbConnected) {
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
