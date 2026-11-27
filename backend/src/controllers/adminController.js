import mongoose from 'mongoose';
import User from '../models/User.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { ensureDbConnected, checkDbReady } from '../config/db.js';
import { extractTelemetry } from '../utils/telemetryHelper.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const VALID_ROLES = ['user', 'moderator', 'admin'];
const VALID_STATUSES = ['active', 'banned'];
const USER_PROJECTION = '_id name email role status createdAt avatar';

/**
 * Escapes special regex metacharacters to prevent ReDoS on MongoDB queries.
 */
const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Normalizes a lean MongoDB user document into a clean projection for admin responses.
 */
const sanitizeAdminUserRow = (u) => ({
  _id: u._id,
  name: u.name || 'Thành viên',
  email: u.email || '',
  role: VALID_ROLES.includes(u.role) ? u.role : 'user',
  status: u.status === 'banned' ? 'banned' : 'active',
  createdAt: u.createdAt,
  avatar: u.avatar || '',
});

/**
 * Checks whether the acting user matches the target account by ID or normalized email.
 */
const isSameAccount = (reqUser, targetUser) => {
  if (!reqUser || !targetUser) return false;
  if (reqUser._id && targetUser._id && String(targetUser._id) === String(reqUser._id)) {
    return true;
  }
  if (reqUser.email && targetUser.email) {
    return String(targetUser.email).toLowerCase().trim() === String(reqUser.email).toLowerCase().trim();
  }
  return false;
};

/**
 * GET /api/admin/users
 * Queries MongoDB directly for paginated accounts with search, role, and status filters.
 */
export const getUsers = async (req, res) => {
  try {
    await ensureDbConnected().catch(() => false);
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu MongoDB chưa sẵn sàng. Không thể truy xuất danh sách tài khoản.',
        status: 503,
      });
    }

    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const rawRole = typeof req.query.role === 'string' ? req.query.role.trim().toLowerCase() : 'all';
    const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : 'all';

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filterConditions = [];

    if (rawSearch) {
      const safeRegex = new RegExp(escapeRegex(rawSearch), 'i');
      filterConditions.push({
        $or: [{ name: safeRegex }, { email: safeRegex }],
      });
    }

    if (rawRole && rawRole !== 'all') {
      if (rawRole === 'staff') {
        filterConditions.push({ role: { $in: ['admin', 'moderator'] } });
      } else if (VALID_ROLES.includes(rawRole)) {
        filterConditions.push({ role: rawRole });
      } else {
        return sendError(res, {
          message: 'Bộ lọc vai trò không hợp lệ.',
          status: 400,
        });
      }
    }

    if (rawStatus && rawStatus !== 'all') {
      if (!VALID_STATUSES.includes(rawStatus)) {
        return sendError(res, {
          message: 'Bộ lọc trạng thái không hợp lệ.',
          status: 400,
        });
      }
      if (rawStatus === 'banned') {
        filterConditions.push({ status: 'banned' });
      } else {
        filterConditions.push({ status: { $ne: 'banned' } });
      }
    }

    const mongoQuery = filterConditions.length > 0 ? { $and: filterConditions } : {};

    const [users, filteredTotal, totalUsers, adminCount, moderatorCount, bannedCount] = await Promise.all([
      User.find(mongoQuery)
        .select(USER_PROJECTION)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(mongoQuery),
      User.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'moderator' }),
      User.countDocuments({ status: 'banned' }),
    ]);

    return sendSuccess(res, {
      message: 'Tải danh sách tài khoản từ MongoDB thành công',
      data: {
        users: users.map(sanitizeAdminUserRow),
        pagination: {
          page,
          limit,
          total: filteredTotal,
          totalPages: Math.max(1, Math.ceil(filteredTotal / limit)),
        },
        stats: {
          total: totalUsers,
          admin: adminCount,
          moderator: moderatorCount,
          banned: bannedCount,
          active: Math.max(0, totalUsers - bannedCount),
        },
      },
    });
  } catch (error) {
    console.error('[Admin Get Users Error]:', error);
    return sendError(res, {
      message: 'Không thể truy xuất danh sách tài khoản từ cơ sở dữ liệu.',
      status: 500,
    });
  }
};

/**
 * PATCH /api/admin/users/:id/role
 * Updates a user's RBAC role directly in MongoDB with anti-self-demote and audit logging.
 */
export const updateUserRole = async (req, res) => {
  try {
    await ensureDbConnected().catch(() => false);
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu MongoDB chưa sẵn sàng. Không thể cập nhật quyền.',
        status: 503,
      });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, {
        message: 'ID tài khoản không hợp lệ.',
        status: 400,
      });
    }

    const nextRole = typeof req.body?.role === 'string' ? req.body.role.trim().toLowerCase() : '';
    if (!VALID_ROLES.includes(nextRole)) {
      return sendError(res, {
        message: 'Vai trò không hợp lệ. Chỉ chấp nhận: user, moderator, admin.',
        status: 400,
      });
    }

    const targetUser = await User.findById(id).select(USER_PROJECTION);
    if (!targetUser) {
      return sendError(res, {
        message: 'Không tìm thấy tài khoản mục tiêu trong cơ sở dữ liệu.',
        status: 404,
      });
    }

    const previousRole = VALID_ROLES.includes(targetUser.role) ? targetUser.role : 'user';
    const isSelf = isSameAccount(req.user, targetUser);

    // Chống tự hạ quyền chính mình
    if (isSelf && nextRole !== previousRole) {
      return sendError(res, {
        message: 'Không thể tự thay đổi hoặc hạ quyền Quản Trị Viên của chính mình!',
        status: 403,
        code: 'ANTI_SELF_DEMOTE',
      });
    }

    if (previousRole === nextRole) {
      return sendSuccess(res, {
        message: `Tài khoản này đã có vai trò ${nextRole}.`,
        data: { user: sanitizeAdminUserRow(targetUser) },
      });
    }

    // Chống hạ quyền Quản Trị Viên hoạt động cuối cùng trong hệ thống
    if (previousRole === 'admin' && nextRole !== 'admin') {
      const remainingAdmins = await User.countDocuments({
        _id: { $ne: targetUser._id },
        role: 'admin',
        status: { $ne: 'banned' },
      });

      if (remainingAdmins === 0) {
        return sendError(res, {
          message: 'Không thể hạ quyền Quản Trị Viên hoạt động cuối cùng của hệ thống!',
          status: 400,
          code: 'LAST_ADMIN_PROTECTED',
        });
      }
    }

    // Cập nhật vai trò và thu hồi token cũ (tăng tokenVersion) để hiệu lực ngay lập tức
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: { role: nextRole },
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    )
      .select(USER_PROJECTION)
      .lean();

    const telemetry = extractTelemetry(req);
    try {
      await AdminAuditLog.create({
        action: 'ROLE_UPDATED',
        email: updatedUser.email,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: {
          targetUserId: String(updatedUser._id),
          targetName: updatedUser.name,
          previousRole,
          newRole: nextRole,
          actorEmail: req.user?.email || '',
        },
      });
    } catch (auditErr) {
      console.error('[Admin Audit ROLE_UPDATED Error]:', auditErr.message);
    }

    return sendSuccess(res, {
      message: `Đã cập nhật vai trò của ${updatedUser.email} thành ${nextRole.toUpperCase()}`,
      data: { user: sanitizeAdminUserRow(updatedUser) },
    });
  } catch (error) {
    console.error('[Admin Update Role Error]:', error);
    return sendError(res, {
      message: 'Không thể cập nhật vai trò người dùng.',
      status: 500,
    });
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Locks (banned) or unlocks (active) a user account directly in MongoDB with audit logging.
 */
export const updateUserStatus = async (req, res) => {
  try {
    await ensureDbConnected().catch(() => false);
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu MongoDB chưa sẵn sàng. Không thể cập nhật trạng thái tài khoản.',
        status: 503,
      });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, {
        message: 'ID tài khoản không hợp lệ.',
        status: 400,
      });
    }

    const nextStatus = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
    if (!VALID_STATUSES.includes(nextStatus)) {
      return sendError(res, {
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: active hoặc banned.',
        status: 400,
      });
    }

    const targetUser = await User.findById(id).select(USER_PROJECTION);
    if (!targetUser) {
      return sendError(res, {
        message: 'Không tìm thấy tài khoản mục tiêu trong cơ sở dữ liệu.',
        status: 404,
      });
    }

    const isSelf = isSameAccount(req.user, targetUser);
    if (isSelf && nextStatus === 'banned') {
      return sendError(res, {
        message: 'Không thể tự khóa tài khoản của chính mình!',
        status: 403,
        code: 'ANTI_SELF_BAN',
      });
    }

    if (targetUser.role === 'admin' && nextStatus === 'banned') {
      return sendError(res, {
        message: 'Không thể khóa tài khoản Quản Trị Viên khác!',
        status: 403,
        code: 'ADMIN_PROTECTED',
      });
    }

    const previousStatus = targetUser.status === 'banned' ? 'banned' : 'active';
    if (previousStatus === nextStatus) {
      return sendSuccess(res, {
        message:
          nextStatus === 'banned'
            ? 'Tài khoản này hiện đã ở trạng thái bị khóa.'
            : 'Tài khoản này hiện đang hoạt động bình thường.',
        data: { user: sanitizeAdminUserRow(targetUser) },
      });
    }

    const updateOps =
      nextStatus === 'banned'
        ? { $set: { status: 'banned' }, $inc: { tokenVersion: 1 } }
        : { $set: { status: 'active' } };

    const updatedUser = await User.findByIdAndUpdate(id, updateOps, { new: true })
      .select(USER_PROJECTION)
      .lean();

    const auditAction = nextStatus === 'banned' ? 'USER_BANNED' : 'USER_UNBANNED';
    const telemetry = extractTelemetry(req);
    try {
      await AdminAuditLog.create({
        action: auditAction,
        email: updatedUser.email,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: {
          targetUserId: String(updatedUser._id),
          targetName: updatedUser.name,
          targetRole: updatedUser.role,
          previousStatus,
          newStatus: nextStatus,
          actorEmail: req.user?.email || '',
        },
      });
    } catch (auditErr) {
      console.error(`[Admin Audit ${auditAction} Error]:`, auditErr.message);
    }

    return sendSuccess(res, {
      message:
        nextStatus === 'banned'
          ? `Đã khóa tài khoản ${updatedUser.email} thành công.`
          : `Đã mở khóa tài khoản ${updatedUser.email} thành công.`,
      data: { user: sanitizeAdminUserRow(updatedUser) },
    });
  } catch (error) {
    console.error('[Admin Update Status Error]:', error);
    return sendError(res, {
      message: 'Không thể cập nhật trạng thái tài khoản.',
      status: 500,
    });
  }
};
