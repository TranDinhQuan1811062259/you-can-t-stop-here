import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { playClickSound } from '../../utils/soundEffects';
import { detectAuthIdentifier, isValidEmailInput } from '../../utils/auth-identifier';

const HAS_GOOGLE_CLIENT_ID = Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim());
const RESEND_COOLDOWN_SECONDS = 60;

export const AuthModal = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authMode,
    setAuthMode,
    login,
    register,
    verifyRegisterOtp,
    resendOtp,
    sendLoginOtp,
    verifyLoginOtp,
    forgotPassword,
    resetPassword,
    loginWithGoogle,
    applyAuthenticatedSession,
  } = useAuth();

  // Mode: 'login' | 'register'
  // Login method: 'password' | 'otp' | 'qr'
  const [loginMethod, setLoginMethod] = useState('password');

  // Sub-views
  // null | 'register-otp' | 'login-otp-verify' | 'forgot-request' | 'forgot-reset'
  const [subStep, setSubStep] = useState(null);

  // Shared inputs
  const [identifier, setIdentifier] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [needsPhoneEmailField, setNeedsPhoneEmailField] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // OTP / Reset Password state
  const [otpCode, setOtpCode] = useState('');
  const [otpDeliveryTarget, setOtpDeliveryTarget] = useState('');
  const [otpDeliveryChannel, setOtpDeliveryChannel] = useState('email');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status / Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showColdStartHint, setShowColdStartHint] = useState(false);

  // QR Login state
  const [qrStatus, setQrStatus] = useState('idle');
  const [qrPayload, setQrPayload] = useState('');
  const [qrSessionId, setQrSessionId] = useState('');
  const [qrCountdown, setQrCountdown] = useState(120);
  const [qrError, setQrError] = useState('');

  const qrPollRef = useRef(null);
  const qrTimerRef = useRef(null);
  const coldStartTimerRef = useRef(null);
  const submitSuccessTimerRef = useRef(null);

  const stopQrPolling = useCallback(() => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
    if (qrTimerRef.current) {
      clearInterval(qrTimerRef.current);
      qrTimerRef.current = null;
    }
  }, []);

  const clearColdStartTimer = useCallback(() => {
    if (coldStartTimerRef.current) {
      clearTimeout(coldStartTimerRef.current);
      coldStartTimerRef.current = null;
    }
    setShowColdStartHint(false);
  }, []);

  const beginRequestTracking = useCallback(() => {
    clearColdStartTimer();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    coldStartTimerRef.current = setTimeout(() => {
      setShowColdStartHint(true);
    }, 3000);
  }, [clearColdStartTimer]);

  const endRequestTracking = useCallback(() => {
    clearColdStartTimer();
    setIsSubmitting(false);
  }, [clearColdStartTimer]);

  const startQrSession = useCallback(async () => {
    stopQrPolling();
    setQrStatus('loading');
    setQrError('');
    setQrPayload('');

    try {
      const res = await authService.initQrSession();
      const data = res?.data;
      if (!data?.sessionId || !data?.qrPayload) {
        throw new Error('Không nhận được phiên QR hợp lệ.');
      }

      setQrSessionId(data.sessionId);
      setQrPayload(data.qrPayload);
      setQrCountdown(data.expiresInSeconds || 120);
      setQrStatus('pending');

      qrTimerRef.current = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            stopQrPolling();
            setQrStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      qrPollRef.current = setInterval(async () => {
        try {
          const statusRes = await authService.checkQrStatus(data.sessionId);
          const statusData = statusRes?.data;
          if (!statusData) return;

          if (statusData.status === 'expired') {
            stopQrPolling();
            setQrStatus('expired');
          } else if (statusData.status === 'authenticated' && statusData.token) {
            stopQrPolling();
            setQrStatus('authenticated');
            applyAuthenticatedSession({
              token: statusData.token,
              refreshToken: statusData.refreshToken,
              user: statusData.user,
            });
            setSuccessMsg('Đăng nhập bằng mã QR thành công!');
            submitSuccessTimerRef.current = setTimeout(() => {
              setIsAuthModalOpen(false);
            }, 600);
          }
        } catch (_) {}
      }, 2200);
    } catch (err) {
      setQrError(err?.response?.data?.message || err?.message || 'Không thể khởi tạo mã QR.');
      setQrStatus('idle');
    }
  }, [applyAuthenticatedSession, setIsAuthModalOpen, stopQrPolling]);

  // Dọn dẹp timers khi unmount
  useEffect(() => {
    return () => {
      stopQrPolling();
      clearColdStartTimer();
      if (submitSuccessTimerRef.current) {
        clearTimeout(submitSuccessTimerRef.current);
      }
    };
  }, [stopQrPolling, clearColdStartTimer]);

  // Countdown gửi lại OTP 60s
  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Reset nhẹ khi mở/đóng modal
  useEffect(() => {
    if (!isAuthModalOpen) {
      stopQrPolling();
      clearColdStartTimer();
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setSubStep(null);
    setOtpCode('');
  }, [isAuthModalOpen, stopQrPolling, clearColdStartTimer]);

  // Tự khởi tạo QR khi chọn tab Quét QR
  useEffect(() => {
    if (isAuthModalOpen && authMode === 'login' && loginMethod === 'qr' && !subStep) {
      startQrSession();
    } else {
      stopQrPolling();
    }
  }, [isAuthModalOpen, authMode, loginMethod, subStep, startQrSession, stopQrPolling]);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    if (!isAuthModalOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setIsAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isAuthModalOpen, isSubmitting, setIsAuthModalOpen]);

  const switchMainMode = (nextMode) => {
    if (isSubmitting) return;
    if (playClickSound) playClickSound();
    setAuthMode(nextMode);
    setSubStep(null);
    setErrorMsg('');
    setSuccessMsg('');
    setOtpCode('');
    setNeedsPhoneEmailField(false);
  };

  const switchLoginMethod = (nextMethod) => {
    if (isSubmitting) return;
    if (playClickSound) playClickSound();
    setLoginMethod(nextMethod);
    setSubStep(null);
    setErrorMsg('');
    setSuccessMsg('');
    setOtpCode('');
  };

  const parsedRegIdentifier = detectAuthIdentifier(identifier);
  const showRegActivationEmail =
    authMode === 'register' &&
    (parsedRegIdentifier.looksLikePhone || parsedRegIdentifier.type === 'phone' || needsPhoneEmailField);

  // ========================================================
  // 1. ĐĂNG KÝ BƯỚC 1: TẠO BẢN GHI CHƯA KÍCH HOẠT & GỬI OTP
  // ========================================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanName = name.trim();
    const cleanIdentifier = identifier.trim();
    const cleanJobTitle = jobTitle.trim();
    const cleanOptEmail = registerEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      setErrorMsg('Vui lòng nhập họ và tên hiển thị (ít nhất 2 ký tự).');
      return;
    }

    const parsed = detectAuthIdentifier(cleanIdentifier);
    if (!parsed.valid) {
      setErrorMsg(
        parsed.looksLikePhone
          ? 'Số điện thoại Việt Nam phải gồm 10 chữ số hợp lệ (ví dụ: 0901234567 hoặc +84901234567).'
          : 'Vui lòng nhập địa chỉ Email hoặc Số điện thoại Việt Nam hợp lệ.'
      );
      return;
    }

    if (parsed.type === 'phone' && cleanOptEmail && !isValidEmailInput(cleanOptEmail)) {
      setErrorMsg('Email nhận mã OTP liên kết chưa đúng định dạng.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (playClickSound) playClickSound();
    beginRequestTracking();

    try {
      const payload = {
        name: cleanName,
        identifier: parsed.normalized,
        password,
        jobTitle: cleanJobTitle,
        ...(parsed.type === 'phone' && cleanOptEmail ? { email: cleanOptEmail } : {}),
      };

      const res = await register(payload);
      const data = res?.data;

      if (data?.requiresOtp) {
        setIdentifier(data.identifier || parsed.normalized);
        setOtpDeliveryTarget(data.deliveryTarget || cleanOptEmail || parsed.normalized);
        setOtpDeliveryChannel(data.deliveryChannel || 'email');
        setOtpCooldown(data.resendCooldownSeconds || RESEND_COOLDOWN_SECONDS);
        setOtpCode('');
        setSubStep('register-otp');
        setSuccessMsg(
          res?.message || `Mã OTP kích hoạt tài khoản đã được gửi đến ${data.deliveryTarget || 'Email của bạn'}.`
        );
      } else if (data?.token) {
        setSuccessMsg('Đăng ký và đăng nhập thành công!');
      }
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.errors?.needEmailForPhoneRegister) {
        setNeedsPhoneEmailField(true);
      }
      if (err?.response?.status === 429 && errData?.errors?.requiresOtp) {
        setOtpDeliveryTarget(errData.errors.deliveryTarget || cleanOptEmail || parsed.normalized);
        setOtpCooldown(errData.errors.retryAfterSeconds || RESEND_COOLDOWN_SECONDS);
        setSubStep('register-otp');
      }
      setErrorMsg(errData?.message || err?.message || 'Đăng ký thất bại, vui lòng thử lại.');
    } finally {
      endRequestTracking();
    }
  };

  // ========================================================
  // 2. ĐĂNG KÝ BƯỚC 2: XÁC THỰC OTP KÍCH HOẠT TÀI KHOẢN
  // ========================================================
  const handleVerifyRegisterOtp = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanOtp = otpCode.replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 chữ số mã OTP kích hoạt.');
      return;
    }

    if (playClickSound) playClickSound();
    beginRequestTracking();

    try {
      await verifyRegisterOtp({
        identifier: identifier.trim(),
        otp: cleanOtp,
      });
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || err?.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.'
      );
    } finally {
      endRequestTracking();
    }
  };

  // ========================================================
  // 3. ĐĂNG NHẬP BẰNG MẬT KHẨU (EMAIL HOẶC SĐT)
  // ========================================================
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email/Số điện thoại và mật khẩu.');
      return;
    }

    const parsed = detectAuthIdentifier(cleanIdentifier);
    if (!parsed.valid) {
      setErrorMsg('Định dạng Email hoặc Số điện thoại không hợp lệ.');
      return;
    }

    if (playClickSound) playClickSound();
    beginRequestTracking();

    try {
      await login({
        identifier: parsed.normalized,
        password,
      });
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.errors?.requireVerification) {
        const targetId = errData.errors.identifier || parsed.normalized;
        setIdentifier(targetId);
        setAuthMode('register');
        setSubStep('register-otp');
        setOtpDeliveryTarget(errData.errors.deliveryTarget || targetId);
        setOtpDeliveryChannel(errData.errors.deliveryChannel || 'email');
        setOtpCooldown(errData.errors.retryAfterSeconds || 0);
        setOtpCode('');
        setSuccessMsg(errData.message || 'Vui lòng nhập mã OTP 6 số để kích hoạt tài khoản.');
        return;
      }
      setErrorMsg(errData?.message || err?.message || 'Email/Số điện thoại hoặc mật khẩu không chính xác.');
    } finally {
      endRequestTracking();
    }
  };

  // ========================================================
  // 4. ĐĂNG NHẬP BẰNG MÃ OTP (GỬI & XÁC THỰC)
  // ========================================================
  const handleSendLoginOtp = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanIdentifier = identifier.trim();
    const parsed = detectAuthIdentifier(cleanIdentifier);
    if (!parsed.valid) {
      setErrorMsg(
        parsed.looksLikePhone
          ? 'Số điện thoại Việt Nam phải gồm 10 chữ số hợp lệ.'
          : 'Vui lòng nhập Email hoặc Số điện thoại đã đăng ký.'
      );
      return;
    }

    if (playClickSound) playClickSound();
    beginRequestTracking();

    try {
      const res = await sendLoginOtp({ identifier: parsed.normalized });
      const data = res?.data;
      setIdentifier(data?.identifier || parsed.normalized);
      setOtpDeliveryTarget(data?.deliveryTarget || parsed.normalized);
      setOtpDeliveryChannel(data?.deliveryChannel || 'email');
      setOtpCooldown(data?.resendCooldownSeconds || RESEND_COOLDOWN_SECONDS);
      setOtpCode('');
      setSubStep('login-otp-verify');
      setSuccessMsg(res?.message || `Mã OTP đã được gửi đến ${data?.deliveryTarget || parsed.normalized}.`);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.errors?.requireVerification) {
        setIdentifier(errData.errors.identifier || parsed.normalized);
        setAuthMode('register');
        setSubStep('register-otp');
        setOtpDeliveryTarget(errData.errors.deliveryTarget || parsed.normalized);
        setOtpCode('');
      }
      setErrorMsg(errData?.message || err?.message || 'Không thể gửi mã OTP đăng nhập.');
    } finally {
      endRequestTracking();
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanOtp = otpCode.replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
      return;
    }

    if (playClickSound) playClickSound();
    beginRequestTracking();

    try {
      await verifyLoginOtp({
        identifier: identifier.trim(),
        otp: cleanOtp,
      });
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Mã OTP đăng nhập không hợp lệ.');
    } finally {
      endRequestTracking();
    }
  };

  // ========================================================
  // 5. QUÊN MẬT KHẨU & ĐẶT LẠI MẬT KHẨU QUA OTP
  // ========================================================
  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsed = detectAuthIdentifier(identifier.trim());
    if (!parsed.valid) {
      setErrorMsg('Vui lòng nhập Email hoặc Số điện thoại của tài khoản cần đặt lại mật khẩu.');
      return;
    }

    if (playClickSound) playClickSound();
    beginRequestTracking();

    try {
      const res = await forgotPassword({ identifier: parsed.normalized });
      const data = res?.data;
      setIdentifier(data?.identifier || parsed.normalized);
      setOtpDeliveryTarget(data?.deliveryTarget || parsed.normalized);
      setOtpDeliveryChannel(data?.deliveryChannel || 'email');
      setOtpCooldown(data?.resendCooldownSeconds || RESEND_COOLDOWN_SECONDS);
      setOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSubStep('forgot-reset');
      setSuccessMsg(res?.message || `Mã OTP khôi phục đã được gửi đến ${data?.deliveryTarget || parsed.normalized}.`);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể gửi yêu cầu khôi phục mật khẩu.');
    } finally {
      endRequestTracking();
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanOtp = otpCode.replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Xác nhận mật khẩu mới chưa khớp.');
      return;
    }

    if (playClickSound) playClickSound();
    beginRequestTracking();

    try {
      const res = await resetPassword({
        identifier: identifier.trim(),
        otp: cleanOtp,
        newPassword,
      });
      setSubStep(null);
      setAuthMode('login');
      setLoginMethod('password');
      setPassword('');
      setOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMsg(res?.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      endRequestTracking();
    }
  };

  // ========================================================
  // 6. GỬI LẠI OTP CHUNG CHO MỌI LUỒNG (COOLDOWN 60S)
  // ========================================================
  const handleResendOtp = async (purpose) => {
    if (otpCooldown > 0 || isSubmitting) return;
    if (playClickSound) playClickSound();
    beginRequestTracking();

    try {
      const res = await resendOtp({
        identifier: identifier.trim(),
        purpose,
      });
      const data = res?.data;
      setOtpCooldown(data?.resendCooldownSeconds || RESEND_COOLDOWN_SECONDS);
      if (data?.deliveryTarget) setOtpDeliveryTarget(data.deliveryTarget);
      if (data?.deliveryChannel) setOtpDeliveryChannel(data.deliveryChannel);
      setOtpCode('');
      setSuccessMsg(res?.message || 'Đã gửi lại mã OTP 6 số mới.');
    } catch (err) {
      const retrySec = err?.response?.data?.errors?.retryAfterSeconds;
      if (retrySec) setOtpCooldown(retrySec);
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể gửi lại mã OTP.');
    } finally {
      endRequestTracking();
    }
  };

  // ========================================================
  // 7. GOOGLE SIGN-IN
  // ========================================================
  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential || isSubmitting) return;
    beginRequestTracking();
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Đăng nhập bằng Google thất bại.');
    } finally {
      endRequestTracking();
    }
  };

  const handleQrSimulate = async () => {
    if (!qrSessionId || isSubmitting) return;
    beginRequestTracking();
    try {
      await authService.simulateQrScan(qrSessionId);
      setSuccessMsg('Đã gửi lệnh mô phỏng quét QR...');
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Mô phỏng quét QR không khả dụng trên môi trường này.');
    } finally {
      endRequestTracking();
    }
  };

  if (!isAuthModalOpen) return null;

  const isInSubFlow = Boolean(subStep);

  const renderColdStartNotice = () =>
    showColdStartHint &&
    isSubmitting && (
      <div className="auth-cold-start-banner" role="status">
        <span className="auth-cold-start-dot" aria-hidden="true" />
        <span>Máy chủ Render đang khởi động sau thời gian nghỉ, vui lòng đợi thêm giây lát...</span>
      </div>
    );

  const renderOtpStepHeader = (title, description) => (
    <div className="auth-otp-header-card">
      <div className="auth-otp-badge">
        {otpDeliveryChannel === 'sms' ? '📱 SMS OTP' : '📧 Email OTP'}
      </div>
      <h3 className="auth-otp-title">{title}</h3>
      <p className="auth-otp-desc">
        {description}{' '}
        <strong className="auth-otp-target">{otpDeliveryTarget || identifier}</strong>
      </p>
    </div>
  );

  return createPortal(
    <div
      className="modal-backdrop auth-modal-backdrop"
      onClick={() => {
        if (!isSubmitting) setIsAuthModalOpen(false);
      }}
    >
      <div
        className="modal-box auth-modal-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-heading"
      >
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-modal-title-group">
            <h2 id="auth-modal-heading" className="auth-modal-title">
              {subStep === 'forgot-request' || subStep === 'forgot-reset'
                ? 'Khôi phục mật khẩu'
                : subStep === 'register-otp'
                ? 'Kích hoạt tài khoản'
                : subStep === 'login-otp-verify'
                ? 'Xác thực OTP đăng nhập'
                : authMode === 'login'
                ? 'Chào mừng trở lại'
                : 'Tạo tài khoản mới'}
            </h2>
            <p className="auth-modal-subtitle">
              {subStep
                ? 'Xác thực bảo mật 6 chữ số được lưu & kiểm tra trực tiếp trên máy chủ.'
                : authMode === 'login'
                ? 'Đăng nhập bằng Email hoặc Số điện thoại đã kích hoạt của bạn.'
                : 'Đăng ký nhanh bằng Email hoặc Số điện thoại và xác thực OTP để bắt đầu.'}
            </p>
          </div>
          <button
            type="button"
            className="auth-modal-close-btn"
            aria-label="Đóng cửa sổ"
            disabled={isSubmitting}
            onClick={() => {
              if (playClickSound) playClickSound();
              setIsAuthModalOpen(false);
            }}
          >
            ✕
          </button>
        </div>

        {/* Segmented Control chính: Đăng nhập | Đăng ký */}
        {!isInSubFlow && (
          <div className="auth-segmented-control" role="tablist" aria-label="Chế độ tài khoản">
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              className={`auth-segmented-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => switchMainMode('login')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              className={`auth-segmented-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => switchMainMode('register')}
            >
              Đăng ký
            </button>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="alert-message error" role="alert">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert-message success" role="status">
            <span>✓ {successMsg}</span>
          </div>
        )}

        {/* ================= LUỒNG QUÊN MẬT KHẨU BƯỚC 1 ================= */}
        {subStep === 'forgot-request' && (
          <form noValidate onSubmit={handleForgotPasswordRequest} className="auth-form">
            <div className="form-group">
              <label htmlFor="auth-forgot-identifier">Email hoặc Số điện thoại đã đăng ký</label>
              <input
                id="auth-forgot-identifier"
                type="text"
                autoComplete="username"
                placeholder="tenban@gmail.com hoặc 0901234567"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {renderColdStartNotice()}

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi mã OTP...' : 'Gửi mã OTP đặt lại mật khẩu'}
            </button>

            <button
              type="button"
              className="auth-back-btn"
              disabled={isSubmitting}
              onClick={() => {
                setSubStep(null);
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        )}

        {/* ================= LUỒNG QUÊN MẬT KHẨU BƯỚC 2 ================= */}
        {subStep === 'forgot-reset' && (
          <form noValidate onSubmit={handleResetPasswordSubmit} className="auth-form">
            {renderOtpStepHeader(
              'Nhập mã OTP & Mật khẩu mới',
              'Mã khôi phục gồm 6 chữ số có hiệu lực 5 phút đã gửi tới'
            )}

            <div className="form-group">
              <label htmlFor="auth-reset-otp">Mã OTP (6 chữ số)</label>
              <input
                id="auth-reset-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                className="auth-otp-input"
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-new-password">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <div className="auth-password-wrap">
                <input
                  id="auth-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                  onClick={() => setShowNewPassword((v) => !v)}
                >
                  {showNewPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="auth-confirm-new-password">Xác nhận mật khẩu mới</label>
              <input
                id="auth-confirm-new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {renderColdStartNotice()}

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Đang cập nhật mật khẩu...' : 'Xác nhận đặt lại mật khẩu'}
            </button>

            <div className="auth-otp-actions-row">
              <button
                type="button"
                className="auth-link-btn"
                disabled={otpCooldown > 0 || isSubmitting}
                onClick={() => handleResendOtp('reset_password')}
              >
                {otpCooldown > 0 ? `Gửi lại mã sau ${otpCooldown}s` : 'Gửi lại mã OTP'}
              </button>
              <button
                type="button"
                className="auth-link-btn"
                disabled={isSubmitting}
                onClick={() => {
                  setSubStep('forgot-request');
                  setErrorMsg('');
                }}
              >
                Đổi Email / SĐT
              </button>
            </div>
          </form>
        )}

        {/* ================= ĐĂNG KÝ BƯỚC 2: XÁC THỰC OTP KÍCH HOẠT ================= */}
        {subStep === 'register-otp' && (
          <form noValidate onSubmit={handleVerifyRegisterOtp} className="auth-form">
            {renderOtpStepHeader(
              'Nhập mã OTP kích hoạt tài khoản',
              'Mã kích hoạt gồm 6 chữ số (hiệu lực 5 phút) đã gửi tới'
            )}

            <div className="form-group">
              <label htmlFor="auth-register-otp">Mã xác thực OTP (6 chữ số)</label>
              <input
                id="auth-register-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                className="auth-otp-input"
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isSubmitting}
              />
            </div>

            {renderColdStartNotice()}

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Đang kích hoạt tài khoản...' : 'Xác nhận OTP & Kích hoạt'}
            </button>

            <div className="auth-otp-actions-row">
              <button
                type="button"
                className="auth-link-btn"
                disabled={otpCooldown > 0 || isSubmitting}
                onClick={() => handleResendOtp('register')}
              >
                {otpCooldown > 0 ? `Gửi lại mã (${otpCooldown}s)` : 'Gửi lại mã kích hoạt'}
              </button>
              <button
                type="button"
                className="auth-link-btn"
                disabled={isSubmitting}
                onClick={() => {
                  setSubStep(null);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                ← Quay lại sửa thông tin
              </button>
            </div>
          </form>
        )}

        {/* ================= ĐĂNG NHẬP OTP BƯỚC 2: NHẬP MÃ OTP ================= */}
        {subStep === 'login-otp-verify' && (
          <form noValidate onSubmit={handleVerifyLoginOtp} className="auth-form">
            {renderOtpStepHeader(
              'Xác thực OTP đăng nhập',
              'Mã đăng nhập 6 chữ số (hiệu lực 5 phút) đã gửi tới'
            )}

            <div className="form-group">
              <label htmlFor="auth-login-otp">Mã OTP (6 chữ số)</label>
              <input
                id="auth-login-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                className="auth-otp-input"
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isSubmitting}
              />
            </div>

            {renderColdStartNotice()}

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Đang xác thực...' : 'Xác nhận & Đăng nhập'}
            </button>

            <div className="auth-otp-actions-row">
              <button
                type="button"
                className="auth-link-btn"
                disabled={otpCooldown > 0 || isSubmitting}
                onClick={() => handleResendOtp('login')}
              >
                {otpCooldown > 0 ? `Gửi lại mã (${otpCooldown}s)` : 'Gửi lại mã OTP'}
              </button>
              <button
                type="button"
                className="auth-link-btn"
                disabled={isSubmitting}
                onClick={() => {
                  setSubStep(null);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                ← Đổi Email / SĐT
              </button>
            </div>
          </form>
        )}

        {/* ================= MÀN HÌNH CHÍNH: ĐĂNG NHẬP ================= */}
        {!isInSubFlow && authMode === 'login' && (
          <>
            <div className="auth-method-tabs" role="tablist" aria-label="Phương thức đăng nhập">
              <button
                type="button"
                role="tab"
                aria-selected={loginMethod === 'password'}
                className={`auth-method-pill ${loginMethod === 'password' ? 'active' : ''}`}
                onClick={() => switchLoginMethod('password')}
              >
                Mật khẩu
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginMethod === 'otp'}
                className={`auth-method-pill ${loginMethod === 'otp' ? 'active' : ''}`}
                onClick={() => switchLoginMethod('otp')}
              >
                Mã OTP
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginMethod === 'qr'}
                className={`auth-method-pill ${loginMethod === 'qr' ? 'active' : ''}`}
                onClick={() => switchLoginMethod('qr')}
              >
                Quét QR
              </button>
            </div>

            {/* Tab 1: Đăng nhập Mật khẩu */}
            {loginMethod === 'password' && (
              <form noValidate onSubmit={handlePasswordLogin} className="auth-form">
                <div className="form-group">
                  <label htmlFor="auth-login-identifier">Email hoặc Số điện thoại</label>
                  <input
                    id="auth-login-identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="tenban@gmail.com hoặc 0901234567"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <div className="auth-label-row">
                    <label htmlFor="auth-login-password">Mật khẩu</label>
                    <button
                      type="button"
                      className="auth-link-btn"
                      disabled={isSubmitting}
                      onClick={() => {
                        setSubStep('forgot-request');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="auth-password-wrap">
                    <input
                      id="auth-login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu của bạn"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                {renderColdStartNotice()}

                <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            )}

            {/* Tab 2: Đăng nhập Mã OTP */}
            {loginMethod === 'otp' && (
              <form noValidate onSubmit={handleSendLoginOtp} className="auth-form">
                <div className="form-group">
                  <label htmlFor="auth-otp-identifier">Email hoặc Số điện thoại đã đăng ký</label>
                  <input
                    id="auth-otp-identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="tenban@gmail.com hoặc 0901234567"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <small className="auth-field-hint">
                    Nhập SĐT đã liên kết Email để nhận mã OTP 6 số đăng nhập không cần mật khẩu.
                  </small>
                </div>

                {renderColdStartNotice()}

                <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang gửi mã OTP...' : 'Gửi mã OTP đăng nhập'}
                </button>
              </form>
            )}

            {/* Tab 3: Đăng nhập bằng QR */}
            {loginMethod === 'qr' && (
              <div className="auth-qr-panel">
                {qrError ? (
                  <div className="alert-message error">
                    <span>⚠️ {qrError}</span>
                  </div>
                ) : null}

                {qrStatus === 'loading' ? (
                  <p className="auth-qr-status-text">Đang tạo mã QR bảo mật...</p>
                ) : qrStatus === 'expired' ? (
                  <div className="auth-qr-expired">
                    <p>Mã QR đã hết hiệu lực.</p>
                    <button type="button" className="btn-primary auth-submit-btn" onClick={startQrSession}>
                      Tạo mã QR mới
                    </button>
                  </div>
                ) : qrPayload ? (
                  <>
                    <div className="auth-qr-frame">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(qrPayload)}`}
                        alt="Mã QR đăng nhập"
                        width={180}
                        height={180}
                      />
                    </div>
                    <p className="auth-qr-status-text">
                      Dùng thiết bị đã đăng nhập để quét mã ({qrCountdown}s)
                    </p>
                    {import.meta.env.DEV && (
                      <button
                        type="button"
                        className="auth-link-btn"
                        disabled={isSubmitting}
                        onClick={handleQrSimulate}
                      >
                        [Dev] Mô phỏng quét QR
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </>
        )}

        {/* ================= MÀN HÌNH CHÍNH: ĐĂNG KÝ BƯỚC 1 ================= */}
        {!isInSubFlow && authMode === 'register' && (
          <form noValidate onSubmit={handleRegisterSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="auth-reg-name">Họ và tên hiển thị</label>
              <input
                id="auth-reg-name"
                type="text"
                autoComplete="name"
                placeholder="Ví dụ: Minh Anh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-reg-identifier">Email hoặc Số điện thoại (VN)</label>
              <input
                id="auth-reg-identifier"
                type="text"
                autoComplete="username"
                placeholder="tenban@gmail.com hoặc 0901234567"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isSubmitting}
              />
              {parsedRegIdentifier.type === 'phone' && parsedRegIdentifier.valid && (
                <small className="auth-field-hint is-success">
                  ✓ Đã nhận diện SĐT chuẩn hóa: {parsedRegIdentifier.normalized}
                </small>
              )}
            </div>

            {showRegActivationEmail && (
              <div className="form-group">
                <label htmlFor="auth-reg-activation-email">
                  Email nhận OTP kích hoạt & khôi phục
                </label>
                <input
                  id="auth-reg-activation-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tenban@gmail.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                <small className="auth-field-hint">
                  Dùng để nhận mã OTP 6 số kích hoạt ngay nếu cổng SMS viễn thông chưa bật.
                </small>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-reg-job">Nghề nghiệp / Lĩnh vực (tùy chọn)</label>
              <input
                id="auth-reg-job"
                type="text"
                placeholder="Ví dụ: Kỹ sư phần mềm, Thiết kế, Sinh viên..."
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-reg-password">Mật khẩu (tối thiểu 6 ký tự)</label>
              <div className="auth-password-wrap">
                <input
                  id="auth-reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu bảo mật"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            {renderColdStartNotice()}

            <button type="submit" className="btn-primary auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi mã OTP kích hoạt...' : 'Đăng ký & Nhận mã OTP'}
            </button>
          </form>
        )}

        {/* ================= GOOGLE LOGIN FOOTER ================= */}
        {!isInSubFlow && loginMethod !== 'qr' && (
          <div className="auth-google-section">
            <div className="auth-divider">
              <span>Hoặc tiếp tục với</span>
            </div>

            {HAS_GOOGLE_CLIENT_ID ? (
              <div className="auth-google-btn-wrap">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMsg('Không thể kết nối Google lúc này. Vui lòng thử lại.')}
                  useOneTap={false}
                  text={authMode === 'register' ? 'signup_with' : 'signin_with'}
                  shape="pill"
                  width="320"
                />
              </div>
            ) : (
              <a
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/oauth/google`}
                className="auth-google-fallback-btn"
              >
                Tiếp tục bằng Google
              </a>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
