import express from 'express';
import rateLimit from 'express-rate-limit';
import { adminLogin, adminTelemetry, getSecurityLogs, verifyAdminPin } from '../controllers/adminAuthController.js';
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

// 2. Xác thực Mã PIN Quản Trị -> Cấp adminToken (2h) — Yêu cầu đã đăng nhập role Admin
router.post('/verify-pin', authenticateToken, adminOnly, verifyAdminPin);

// 3. Khóa cứng toàn bộ các route /api/admin/* phía dưới bằng JWT + Admin Role + verifyAdminGate (x-admin-token)
router.use(authenticateToken, adminOnly, verifyAdminGate);

// 4. Lấy 50 Security Logs mới nhất
router.get('/security-logs', getSecurityLogs);

export default router;
