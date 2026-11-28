import User from '../models/User.js';
import { ensureDbConnected, checkDbReady } from '../config/db.js';
import { verifyToken, verifyAdminToken } from '../utils/token.js';
import { USER_SAFE_PROJECTION, normalizeVietnamPhone } from '../utils/identifier-helper.js';
import { sendError } from '../utils/apiResponse.js';

const buildUserQueryFromDecoded = (decoded) => {
  const query = [];
  if (decoded?.id && String(decoded.id).match(/^[0-9a-fA-F]{24}$/)) {
    query.push({ _id: decoded.id });
  }
  if (decoded?.email && typeof decoded.email === 'string' && decoded.email.trim()) {
    query.push({ email: decoded.email.toLowerCase().trim() });
  }
  if (decoded?.phone && typeof decoded.phone === 'string' && decoded.phone.trim()) {
    const cleanPhone = normalizeVietnamPhone(decoded.phone) || decoded.phone.trim();
    query.push({ phone: cleanPhone });
  }
  return query;
};

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = await verifyToken(token);

      await ensureDbConnected().catch(() => false);
      if (!checkDbReady()) {
        return sendError(res, {
          message: 'Cơ sở dữ liệu MongoDB đang khởi động hoặc chưa sẵn sàng. Vui lòng thử lại sau giây lát!',
          status: 503,
        });
      }

      const query = buildUserQueryFromDecoded(decoded);
      if (query.length > 0) {
        req.user = await User.findOne({ $or: query }).select(USER_SAFE_PROJECTION);
      }

      if (!req.user) {
        return sendError(res, {
          message: 'Không tìm thấy thông tin tài khoản hợp lệ. Vui lòng đăng nhập lại!',
          status: 401,
        });
      }

      if (req.user.status === 'banned') {
        return sendError(res, {
          message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Quyền truy cập bị từ chối.',
          status: 403,
          code: 'ACCOUNT_BANNED',
        });
      }

      if (decoded.tokenVersion !== undefined) {
        const currentVersion = req.user.tokenVersion !== undefined ? req.user.tokenVersion : 0;
        if (decoded.tokenVersion !== currentVersion) {
          return sendError(res, {
            message: 'Phiên đăng nhập đã bị thu hồi hoặc đổi mật khẩu. Vui lòng đăng nhập lại!',
            status: 401,
          });
        }
      }

      return next();
    } catch (error) {
      return sendError(res, {
        message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ, vui lòng đăng nhập lại',
        status: 401,
      });
    }
  }

  if (!token) {
    return sendError(res, {
      message: 'Vui lòng đăng nhập để thực hiện chức năng này',
      status: 401,
    });
  }
};

/**
 * Middleware phân quyền dành riêng cho Quản trị viên (Admin Role Isolation)
 */
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, {
      message: 'Truy cập bị từ chối. Quyền hạn Quản trị viên (Admin) được yêu cầu!',
      status: 403,
    });
  }
  return next();
};

/**
 * Middleware xác thực Cổng Admin 2 lớp thông qua header x-admin-token
 */
export const verifyAdminGate = async (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || typeof adminToken !== 'string') {
    return res.status(403).json({
      success: false,
      requireAdminPin: true,
      message: 'Vui lòng xác thực mã PIN quản trị',
    });
  }

  try {
    const decoded = await verifyAdminToken(adminToken);
    if (!decoded || !decoded.isAdminPinVerified) {
      return res.status(403).json({
        success: false,
        requireAdminPin: true,
        message: 'Vui lòng xác thực mã PIN quản trị',
      });
    }
    if (decoded.adminId && req.user?._id && String(decoded.adminId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        requireAdminPin: true,
        message: 'Phiên mở khóa PIN không khớp với tài khoản Admin hiện tại',
      });
    }
    req.adminPinPayload = decoded;
    return next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      requireAdminPin: true,
      message: 'Vui lòng xác thực mã PIN quản trị',
    });
  }
};

/**
 * Middleware xác thực tùy chọn (Không bắt buộc đăng nhập, nhưng nếu có token hợp lệ từ MongoDB sẽ gắn user)
 */
export const optionalProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = await verifyToken(token);

      await ensureDbConnected().catch(() => false);
      if (!checkDbReady()) {
        req.user = null;
        return next();
      }

      const query = buildUserQueryFromDecoded(decoded);
      if (query.length > 0) {
        req.user = await User.findOne({ $or: query }).select(USER_SAFE_PROJECTION);
      }

      if (req.user && req.user.status === 'banned') {
        req.user = null;
      }

      if (req.user && decoded.tokenVersion !== undefined) {
        const currentVersion = req.user.tokenVersion !== undefined ? req.user.tokenVersion : 0;
        if (decoded.tokenVersion !== currentVersion) {
          req.user = null;
        }
      }
    } catch (e) {
      req.user = null;
    }
  }
  return next();
};

export const authenticateToken = protect;
export const requireAdmin = adminOnly;
