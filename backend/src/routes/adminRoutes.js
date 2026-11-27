import express from 'express';
import rateLimit from 'express-rate-limit';
import { adminLogin, adminTelemetry, getSecurityLogs, verifyAdminPin, verifyAdminOtp } from '../controllers/adminAuthController.js';
import { getUsers, updateUserRole, updateUserStatus } from '../controllers/adminController.js';
import { authenticateToken, adminOnly, verifyAdminGate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rate limiter chuyên biệt cho cổng Admin Login: tối đa 5 lần thử / 15 phút mỗi IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Đã vượt quá số lần thử đăng nhập cho phép (5 lần). Vui lòng thử lại sau 15 phút để bảo vệ hệ thống!',
  },
});

// 1. Đăng nhập Cổng Quản Trị riêng (Isolated Gateway) & Telemetry
router.post('/auth/login', adminLoginLimiter, adminLogin);
router.post('/auth/telemetry', adminTelemetry);

// 2. Xác thực 2 lớp Admin Gate: Lớp 1 (PIN -> gửi Email OTP) -> Lớp 2 (OTP -> cấp adminToken 2h)
router.post('/verify-pin', authenticateToken, adminOnly, verifyAdminPin);
router.post('/verify-admin-otp', authenticateToken, adminOnly, verifyAdminOtp);

// 3. Khóa cứng toàn bộ các route /api/admin/* phía dưới bằng JWT + Admin Role + verifyAdminGate (x-admin-token)
router.use(authenticateToken, adminOnly, verifyAdminGate);

// 4. Lấy 50 Security Logs mới nhất
router.get('/security-logs', getSecurityLogs);

// 5. Quản Lý Tài Khoản & Phân Quyền RBAC (100% MongoDB Source of Truth)
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', updateUserStatus);

export default router;
