import express from 'express';
import rateLimit from 'express-rate-limit';
import { adminLogin, adminTelemetry, getSecurityLogs } from '../controllers/adminAuthController.js';
import { authenticateToken, adminOnly } from '../middlewares/authMiddleware.js';

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

// 1. Đăng nhập Cổng Quản Trị
router.post('/auth/login', adminLoginLimiter, adminLogin);

// 2. Telemetry ghi nhận âm thầm lượt truy cập trang /admin-portal
router.post('/auth/telemetry', adminTelemetry);

// 3. Lấy 50 Security Logs mới nhất (Bảo vệ bởi JWT + Role Admin)
router.get('/security-logs', authenticateToken, adminOnly, getSecurityLogs);

export default router;
