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
} from '../controllers/authController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// OAuth 2.0 chuyển hướng trực tiếp qua nền tảng thực tế (Google, Facebook, GitHub,...)
router.get('/oauth/:provider', initiateOAuth);
router.get('/oauth/:provider/callback', handleOAuthCallback);

// Hệ thống Đăng nhập bằng mã QR tự sinh (QR Code Login)
router.get('/qr/generate', generateQrSession);
router.get('/qr/status/:sessionId', checkQrSessionStatus);
router.post('/qr/verify', protect, verifyQrSession);
router.post('/qr/simulate', simulateQrSessionScan);

// Xác thực & Tài khoản
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendLoginOtp);
router.post('/verify-otp', verifyOtpAndLogin);
router.post('/social-login', socialLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/user/:id', optionalProtect, getUserProfile);

export default router;
