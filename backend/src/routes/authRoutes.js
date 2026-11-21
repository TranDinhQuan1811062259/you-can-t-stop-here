import express from 'express';
import {
  register,
  login,
  socialLogin,
  getMe,
  updateProfile,
  getUserProfile,
  sendLoginOtp,
  verifyOtpAndLogin,
  initiateOAuth,
  handleOAuthCallback,
  generateQrSession,
  checkQrSessionStatus,
  verifyQrSession,
  simulateQrSessionScan,
  refreshToken,
  logout,
  logoutAll,
} from '../controllers/authController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';
import {
  authLimiter,
  otpSendLimiter,
  otpTargetCooldownLimiter,
} from '../middlewares/rateLimiter.js';

const router = express.Router();

// OAuth 2.0 chuyển hướng trực tiếp qua nền tảng thực tế (Google, Facebook, GitHub,...)
router.get('/oauth/:provider', initiateOAuth);
router.get('/oauth/:provider/callback', handleOAuthCallback);

// Hệ thống Đăng nhập bằng mã QR tự sinh (QR Code Login)
router.get('/qr/generate', generateQrSession);
router.get('/qr/status/:sessionId', checkQrSessionStatus);
router.post('/qr/verify', protect, verifyQrSession);
// Endpoint mô phỏng quét QR dành riêng cho môi trường development/testing (Áp dụng Fail-Closed)
router.post('/qr/simulate', (req, res, next) => {
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  if (!isDevOrTest) {
    return res.status(403).json({
      success: false,
      message: 'Tính năng mô phỏng quét mã QR (QR Simulate) chỉ được phép hoạt động trên môi trường development hoặc test.',
    });
  }
  next();
}, simulateQrSessionScan);

// Xác thực & Tài khoản (Bảo vệ bởi Rate Limiting & Cooldown chống Brute-force & Spam bom mail)
router.post('/register', otpTargetCooldownLimiter, otpSendLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh-token', authLimiter, refreshToken);
router.post('/logout', optionalProtect, logout);
router.post('/logout-all', protect, logoutAll);
router.post('/send-otp', otpTargetCooldownLimiter, otpSendLimiter, sendLoginOtp);
router.post('/verify-otp', authLimiter, verifyOtpAndLogin);
router.post('/social-login', authLimiter, otpTargetCooldownLimiter, socialLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/user/:id', optionalProtect, getUserProfile);

export default router;
