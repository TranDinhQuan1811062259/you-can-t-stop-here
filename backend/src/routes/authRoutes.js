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
} from '../controllers/authController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendLoginOtp);
router.post('/verify-otp', verifyOtpAndLogin);
router.post('/social-login', socialLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/user/:id', optionalProtect, getUserProfile);

export default router;
