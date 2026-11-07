import User from '../models/User.js';
import { isDbConnected } from '../config/db.js';
import { verifyToken } from '../utils/token.js';
import { sendError } from '../utils/apiResponse.js';
import { findUserInStore } from '../utils/persistentStore.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = await verifyToken(token);

      if (isDbConnected) {
        const query = [];
        if (decoded.id && String(decoded.id).match(/^[0-9a-fA-F]{24}$/)) {
          query.push({ _id: decoded.id });
        }
        if (decoded.email) {
          query.push({ email: decoded.email.toLowerCase().trim() });
        }
        if (query.length > 0) {
          req.user = await User.findOne({ $or: query }).select('-password');
        }
      }

      if (!req.user && decoded) {
        const storedUser = decoded.email ? findUserInStore(decoded.email) : null;
        const isAdm =
          decoded.role === 'admin' ||
          decoded.email === 'anthonyq012025@gmail.com' ||
          String(decoded.id) === '6aec5b46ee112662b33c0e32';

        req.user = storedUser || {
          _id: decoded.id,
          name: decoded.name || (isAdm ? 'Anthony Quân (Trần Đình Quân)' : 'Thành viên cộng đồng'),
          email: decoded.email || (isAdm ? 'anthonyq012025@gmail.com' : ''),
          role: isAdm ? 'admin' : (decoded.role || 'user'),
          jobTitle: decoded.jobTitle || (isAdm ? 'System Admin & Lead Dev' : 'Người đi làm'),
          avatar: isAdm ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg' : '/images/man.jpg',
        };
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
 * Middleware chỉ cho phép Admin
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return sendError(res, {
    message: 'Truy cập bị từ chối! Thao tác này chỉ dành cho Quản Trị Viên (Admin).',
    status: 403,
  });
};

/**
 * Middleware xác thực tùy chọn (Không bắt buộc đăng nhập, nhưng nếu có token sẽ giải mã user)
 */
export const optionalProtect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = await verifyToken(token);

      if (isDbConnected) {
        const query = [];
        if (decoded.id && String(decoded.id).match(/^[0-9a-fA-F]{24}$/)) {
          query.push({ _id: decoded.id });
        }
        if (decoded.email) {
          query.push({ email: decoded.email.toLowerCase().trim() });
        }
        if (query.length > 0) {
          req.user = await User.findOne({ $or: query }).select('-password');
        }
      }

      if (!req.user && decoded) {
        req.user = {
          _id: decoded.id,
          name: decoded.name || 'Thành viên cộng đồng',
          email: decoded.email || '',
          role: decoded.role || 'user',
          jobTitle: decoded.jobTitle || 'Người đi làm',
        };
      }
    } catch (e) {
      // Bỏ qua lỗi token cho route tùy chọn
    }
  }
  return next();
};
