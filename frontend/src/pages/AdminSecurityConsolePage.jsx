import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { playClickSound } from '../utils/soundEffects';

const readStoredAdminToken = () => {
  try {
    return sessionStorage.getItem('adminToken') || sessionStorage.getItem('freedom_admin_token') || '';
  } catch (_) {
    return '';
  }
};

const writeStoredAdminToken = (token) => {
  try {
    if (token) {
      sessionStorage.setItem('adminToken', token);
      sessionStorage.setItem('freedom_admin_token', token);
    }
  } catch (_) {}
};

const clearStoredAdminToken = () => {
  try {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('freedom_admin_token');
  } catch (_) {}
};

export const AdminSecurityConsolePage = () => {
  const navigate = useNavigate();
  const { user, setUser, setToken, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState('');

  // Trạng thái mở khóa 2 lớp: PIN (Lớp 1) -> Email OTP (Lớp 2) -> adminToken (2h)
  const [adminToken, setAdminToken] = useState(() => readStoredAdminToken());
  const [gateStep, setGateStep] = useState('pin'); // 'pin' | 'otp'
  const [pinInput, setPinInput] = useState('');
  const [verifiedPin, setVerifiedPin] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const [otpInput, setOtpInput] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [unlockToast, setUnlockToast] = useState('');

  const otpInputRef = useRef(null);
  const unlockToastTimerRef = useRef(null);

  const isAdminAuthenticated = Boolean(user && user.role === 'admin');
  const isPinUnlocked = Boolean(isAdminAuthenticated && adminToken);

  useEffect(() => {
    return () => {
      if (unlockToastTimerRef.current) {
        clearTimeout(unlockToastTimerRef.current);
      }
    };
  }, []);

  // Đếm ngược cooldown nút Gửi lại mã OTP (Bước 2)
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus tự động vào ô OTP khi chuyển sang Bước 2
  useEffect(() => {
    if (gateStep === 'otp' && !isPinUnlocked) {
      const raf = requestAnimationFrame(() => {
        otpInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [gateStep, isPinUnlocked]);

  // Ghi nhận âm thầm Telemetry lượt truy cập vào /admin-portal
  useEffect(() => {
    try {
      const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
      const cleanBase = rawBase.replace(/\/+$/, '');
      fetch(`${cleanBase}/admin/auth/telemetry`, { method: 'POST' }).catch(() => {});
    } catch (_) {}
  }, []);

  // Lắng nghe sự kiện Backend yêu cầu mở khóa lại Cổng Admin 2 lớp (403 requireAdminPin)
  useEffect(() => {
    const handlePinRequired = (e) => {
      clearStoredAdminToken();
      setAdminToken('');
      setGateStep('pin');
      setVerifiedPin('');
      setOtpInput('');
      setOtpError('');
      setOtpNotice('');
      setLogs([]);
      setPinError(e?.detail?.message || 'Phiên mở khóa Admin đã hết hạn. Vui lòng xác thực lại Mã PIN Quản Trị!');
    };
    window.addEventListener('freedom_admin_pin_required', handlePinRequired);
    return () => window.removeEventListener('freedom_admin_pin_required', handlePinRequired);
  }, []);

  // Xóa adminToken khỏi state nếu đăng xuất
  useEffect(() => {
    if (!isAdminAuthenticated) {
      setAdminToken('');
      setGateStep('pin');
      setPinInput('');
      setVerifiedPin('');
      setPinError('');
      setOtpInput('');
      setOtpEmail('');
      setOtpError('');
      setOtpNotice('');
      setResendCooldown(0);
    }
  }, [isAdminAuthenticated]);

  // Tải danh sách Audit Logs nếu đã đăng nhập Admin & đã mở khóa 2 lớp (có x-admin-token)
  const fetchSecurityLogs = useCallback(async () => {
    if (!isPinUnlocked) return;
    setIsLoadingLogs(true);
    setLogsError('');
    try {
      const res = await apiClient.get('/admin/security-logs');
      const data = res?.data?.data || res?.data || [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Lỗi lấy Security Logs:', err);
      if (err?.requireAdminPin) {
        clearStoredAdminToken();
        setAdminToken('');
        setGateStep('pin');
        setPinError(err.message || 'Vui lòng xác thực lại Cổng Quản Trị 2 lớp!');
      } else {
        setLogsError(err.response?.data?.message || err.message || 'Không thể tải nhật ký an ninh do lỗi kết nối mạng.');
      }
    } finally {
      setIsLoadingLogs(false);
    }
  }, [isPinUnlocked]);

  useEffect(() => {
    if (isPinUnlocked) {
      fetchSecurityLogs();
    }
  }, [isPinUnlocked, fetchSecurityLogs]);

  // Lớp 1: Xác thực Mã PIN Quản Trị -> gửi Email OTP 6 số
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (isVerifyingPin) return;
    if (!cleanPin) {
      setPinError('Vui lòng nhập mã PIN bảo mật để tiếp tục.');
      return;
    }

    setIsVerifyingPin(true);
    setPinError('');
    setOtpError('');
    setOtpNotice('');
    playClickSound();

    try {
      const res = await apiClient.post('/admin/verify-pin', { pin: cleanPin });
      const targetEmail = res?.email || res?.data?.email || user?.email || '';
      if (res?.requireOtp || res?.data?.requireOtp) {
        setVerifiedPin(cleanPin);
        setOtpEmail(targetEmail);
        setOtpInput('');
        setGateStep('otp');
        setResendCooldown(45);
        setOtpNotice(res?.message || `Đã gửi mã OTP 6 số đến ${targetEmail}`);
        return;
      }

      const directToken = res?.adminToken || res?.data?.adminToken || '';
      if (!directToken) {
        throw new Error(res?.message || 'Không nhận được phản hồi OTP từ máy chủ.');
      }
      writeStoredAdminToken(directToken);
      setAdminToken(directToken);
      setPinInput('');
    } catch (err) {
      setPinError(err?.response?.data?.message || err?.message || 'Mã PIN Quản Trị không chính xác!');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Lớp 2: Xác thực Mã OTP 6 số từ Email -> nhận adminToken (2h)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otpInput.replace(/\s+/g, '').trim();
    if (cleanOtp.length !== 6 || isVerifyingOtp) {
      setOtpError('Vui lòng nhập đầy đủ 6 chữ số OTP.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    setOtpNotice('');
    playClickSound();

    try {
      const res = await apiClient.post('/admin/verify-admin-otp', { otp: cleanOtp });
      const receivedAdminToken = res?.adminToken || res?.data?.adminToken || '';
      if (!receivedAdminToken) {
        throw new Error(res?.message || 'Không nhận được adminToken từ máy chủ.');
      }

      writeStoredAdminToken(receivedAdminToken);
      setAdminToken(receivedAdminToken);
      setPinInput('');
      setVerifiedPin('');
      setOtpInput('');
      setOtpError('');
      setOtpNotice('');
      setGateStep('pin');
      setResendCooldown(0);

      setUnlockToast('Mở khóa Quản Trị thành công');
      if (unlockToastTimerRef.current) clearTimeout(unlockToastTimerRef.current);
      unlockToastTimerRef.current = setTimeout(() => {
        setUnlockToast('');
        unlockToastTimerRef.current = null;
      }, 4000);
    } catch (err) {
      setOtpError(err?.response?.data?.message || err?.message || 'Mã OTP không chính xác hoặc đã hết hạn!');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handlePasteOtp = async () => {
    playClickSound();
    setOtpError('');
    try {
      if (navigator?.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText();
        const digits = String(clipText || '').replace(/\D/g, '').slice(0, 6);
        if (digits) {
          setOtpInput(digits);
          setOtpNotice('Đã dán mã OTP từ khay nhớ tạm.');
          otpInputRef.current?.focus();
          return;
        }
      }
      setOtpNotice('Không tìm thấy mã 6 số trong khay nhớ tạm — vui lòng nhấn Ctrl+V vào ô OTP.');
      otpInputRef.current?.focus();
    } catch (_) {
      setOtpNotice('Trình duyệt chặn đọc clipboard tự động — vui lòng bấm Ctrl+V vào ô OTP.');
      otpInputRef.current?.focus();
    }
  };

  const handleResendAdminOtp = async () => {
    if (isResendingOtp || resendCooldown > 0) return;
    if (!verifiedPin) {
      setGateStep('pin');
      setPinError('Vui lòng nhập lại Mã PIN để gửi mã OTP mới.');
      return;
    }

    setIsResendingOtp(true);
    setOtpError('');
    setOtpNotice('');
    playClickSound();

    try {
      const res = await apiClient.post('/admin/verify-pin', { pin: verifiedPin });
      const targetEmail = res?.email || res?.data?.email || otpEmail || user?.email || '';
      setOtpEmail(targetEmail);
      setOtpInput('');
      setResendCooldown(45);
      setOtpNotice(`Đã gửi lại mã OTP 6 số mới tới ${targetEmail}.`);
      otpInputRef.current?.focus();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể gửi lại mã OTP lúc này.';
      setOtpError(msg);
      if (err?.status === 401 || err?.status === 429) {
        setGateStep('pin');
        setVerifiedPin('');
        setPinError(msg);
      }
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleBackToPinStep = () => {
    playClickSound();
    setGateStep('pin');
    setVerifiedPin('');
    setOtpInput('');
    setOtpError('');
    setOtpNotice('');
    setResendCooldown(0);
  };

  const handleLockAdminPin = () => {
    playClickSound();
    clearStoredAdminToken();
    setAdminToken('');
    setGateStep('pin');
    setPinInput('');
    setVerifiedPin('');
    setOtpInput('');
    setOtpError('');
    setOtpNotice('');
    setUnlockToast('');
    setLogs([]);
  };

  // Xử lý đăng nhập cổng Admin
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu quản trị.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    playClickSound();

    try {
      const res = await apiClient.post('/admin/auth/login', {
        email: email.trim(),
        password,
      });

      const data = res?.data?.data || res?.data;
      const adminObj = data?.user || (data?.role === 'admin' ? data : null);
      if (data?.token && adminObj) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('freedom_token', data.token);
        localStorage.setItem('user', JSON.stringify(adminObj));

        if (typeof setToken === 'function') setToken(data.token);
        if (typeof setUser === 'function') setUser(adminObj);

        setSuccessMessage('✓ Đăng nhập Console thành công! Tiếp tục mở khóa 2 lớp...');
        setTimeout(() => {
          setSuccessMessage('');
        }, 1500);
      } else {
        setErrorMessage('Dữ liệu xác thực không hợp lệ. Vui lòng thử lại!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Xác thực thất bại. Vui lòng kiểm tra lại!';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return { text: 'LOGIN SUCCESS', bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '#22c55e' };
      case 'LOGIN_FAILED':
        return { text: 'LOGIN FAILED', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '#ef4444' };
      case 'BLOCKED_AT_USER_PORTAL':
        return { text: 'BLOCKED AT USER PORTAL', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '#f59e0b' };
      case 'PORTAL_VISITED':
      default:
        return { text: 'PORTAL VISITED', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '#0284c7' };
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
        padding: '2rem 1.5rem',
      }}
    >
      {unlockToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.96), rgba(5, 150, 105, 0.96))',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(110, 231, 183, 0.65)',
            boxShadow: '0 14px 32px rgba(0, 0, 0, 0.45)',
            fontSize: '0.86rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>✓</span>
          <span>{unlockToast}</span>
        </div>
      )}

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header Console */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '1.25rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>🛡️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.5px', color: '#f8fafc' }}>
                SECURITY CONSOLE &bull; ADMIN ISOLATION
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Hệ thống giám sát Telemetry, bẫy bảo mật Brevo &amp; cổng Quản Trị 2 lớp (PIN + Email OTP)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                navigate('/');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              &larr; Về Trang Chủ
            </button>

            {isPinUnlocked && (
              <button
                type="button"
                onClick={handleLockAdminPin}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔒 Khóa Cổng
              </button>
            )}

            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  clearStoredAdminToken();
                  logout();
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đăng Xuất Admin
              </button>
            )}
          </div>
        </div>

        {/* Chưa đăng nhập Admin: Hiển thị Form Đăng Nhập Security */}
        {!isAdminAuthenticated ? (
          <div
            style={{
              maxWidth: '440px',
              margin: '3rem auto',
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.08)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  marginBottom: '10px',
                }}
              >
                ISOLATED GATEWAY
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>Đăng Nhập Quản Trị</h2>
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Cổng riêng biệt dành riêng cho Quản trị viên hệ thống. Mọi truy cập đều được ghi log GeoIP.
              </p>
            </div>

            {errorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                  fontWeight: 600,
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  color: '#4ade80',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                  fontWeight: 600,
                }}
              >
                {successMessage}
              </div>
            )}

            <form noValidate onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Email Quản Trị
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cantstophere.com"
                  required
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Mật Khẩu Bảo Mật
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.65 : 1,
                  marginTop: '6px',
                  boxShadow: '0 4px 15px rgba(2, 132, 199, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isLoading ? 'Đang xác thực...' : 'Truy Cập Console 🛡️'}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
              Được bảo vệ bởi Rate Limiter (tối đa 5 lần thử / 15 phút).
            </div>
          </div>
        ) : !isPinUnlocked ? (
          /* Đã đăng nhập Admin -> Cổng Mở Khóa 2 Lớp: Bước 1 PIN -> Bước 2 Email OTP */
          <div
            style={{
              maxWidth: '450px',
              margin: '2.5rem auto',
              background: '#0f172a',
              border: '1px solid rgba(45, 212, 191, 0.35)',
              borderRadius: '18px',
              padding: '2rem',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 36px rgba(13, 148, 136, 0.14)',
            }}
          >
            {/* Thanh tiến trình 2 bước */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.4rem' }}>
              <div
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: gateStep === 'pin' ? 'rgba(45, 212, 191, 0.16)' : 'rgba(34, 197, 94, 0.14)',
                  border: gateStep === 'pin' ? '1px solid rgba(45, 212, 191, 0.45)' : '1px solid rgba(34, 197, 94, 0.4)',
                  color: gateStep === 'pin' ? '#5eead4' : '#4ade80',
                }}
              >
                {gateStep === 'pin' ? '1. Mã PIN Bí Mật' : '✓ 1. Mã PIN'}
              </div>
              <span style={{ color: '#475569', fontSize: '0.8rem' }}>&rarr;</span>
              <div
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: gateStep === 'otp' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: gateStep === 'otp' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: gateStep === 'otp' ? '#7dd3fc' : '#64748b',
                }}
              >
                2. Email OTP (6 số)
              </div>
            </div>

            {gateStep === 'pin' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: 'rgba(13, 148, 136, 0.16)',
                      border: '1.5px solid rgba(45, 212, 191, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      fontSize: '1.5rem',
                    }}
                  >
                    🔐
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      background: 'rgba(45, 212, 191, 0.12)',
                      color: '#5eead4',
                      border: '1px solid rgba(45, 212, 191, 0.3)',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                      marginBottom: '8px',
                    }}
                  >
                    LỚP 1 / 2 • MÃ PIN BÍ MẬT
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.22rem', color: '#f8fafc' }}>Nhập Mã PIN Quản Trị</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Tài khoản <strong style={{ color: '#e2e8f0' }}>{user?.email}</strong> đã xác thực. Nhập Mã PIN để nhận OTP 6 số qua Email.
                  </p>
                </div>

                {pinError && (
                  <div
                    role="alert"
                    style={{
                      background: 'rgba(239, 68, 68, 0.16)',
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      color: '#fca5a5',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      marginBottom: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ {pinError}
                  </div>
                )}

                <form noValidate onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                      Mã PIN Bảo Mật (Lớp 1)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError('');
                      }}
                      placeholder="••••••"
                      autoFocus
                      required
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: pinError ? '1.5px solid #ef4444' : '1.5px solid rgba(45, 212, 191, 0.4)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        color: '#f8fafc',
                        fontSize: '1.2rem',
                        letterSpacing: '6px',
                        textAlign: 'center',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingPin || !pinInput.trim()}
                    style={{
                      background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: isVerifyingPin || !pinInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: isVerifyingPin || !pinInput.trim() ? 0.65 : 1,
                      boxShadow: '0 6px 18px rgba(13, 148, 136, 0.35)',
                    }}
                  >
                    {isVerifyingPin ? 'Đang kiểm tra PIN & gửi OTP...' : 'Xác nhận PIN & Gửi OTP Email'}
                  </button>
                </form>

                <div style={{ marginTop: '1.2rem', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                  Giới hạn tối đa 5 lần nhập sai PIN / 15 phút. Sau Bước 1 sẽ yêu cầu OTP Email.
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1.35rem' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: 'rgba(14, 165, 233, 0.16)',
                      border: '1.5px solid rgba(56, 189, 248, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      fontSize: '1.5rem',
                    }}
                  >
                    ✉️
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      background: 'rgba(56, 189, 248, 0.14)',
                      color: '#7dd3fc',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                      marginBottom: '8px',
                    }}
                  >
                    LỚP 2 / 2 • XÁC THỰC EMAIL OTP
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.22rem', color: '#f8fafc' }}>Nhập Mã OTP 6 Số</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.55 }}>
                    Mã xác thực có hiệu lực 5 phút đã được gửi tới hòm thư:{' '}
                    <strong style={{ color: '#38bdf8', wordBreak: 'break-all' }}>{otpEmail || user?.email}</strong>
                  </p>
                </div>

                {otpNotice && (
                  <div
                    role="status"
                    style={{
                      background: 'rgba(16, 185, 129, 0.14)',
                      border: '1px solid rgba(52, 211, 153, 0.4)',
                      color: '#6ee7b7',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      marginBottom: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    ✓ {otpNotice}
                  </div>
                )}

                {otpError && (
                  <div
                    role="alert"
                    style={{
                      background: 'rgba(239, 68, 68, 0.16)',
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      color: '#fca5a5',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      marginBottom: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ {otpError}
                  </div>
                )}

                <form noValidate onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                        Mã OTP 6 số từ Email
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteOtp}
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          color: '#7dd3fc',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        📋 Dán mã
                      </button>
                    </div>

                    <input
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtpInput(clean);
                        setOtpError('');
                      }}
                      placeholder="000000"
                      required
                      style={{
                        width: '100%',
                        background: '#1e293b',
                        border: otpError ? '1.5px solid #ef4444' : '1.5px solid rgba(56, 189, 248, 0.45)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        color: '#f8fafc',
                        fontSize: 'clamp(1.1rem, 4.5vw, 1.35rem)',
                        letterSpacing: 'clamp(4px, 1.5vw, 8px)',
                        textAlign: 'center',
                        fontWeight: 800,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpInput.length !== 6}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: isVerifyingOtp || otpInput.length !== 6 ? 'not-allowed' : 'pointer',
                      opacity: isVerifyingOtp || otpInput.length !== 6 ? 0.65 : 1,
                      boxShadow: '0 6px 18px rgba(2, 132, 199, 0.35)',
                    }}
                  >
                    {isVerifyingOtp ? 'Đang xác thực OTP...' : 'Xác thực OTP & Mở khóa 🔓'}
                  </button>
                </form>

                <div
                  style={{
                    marginTop: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleBackToPinStep}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 0',
                    }}
                  >
                    &larr; Nhập lại Mã PIN
                  </button>

                  <button
                    type="button"
                    onClick={handleResendAdminOtp}
                    disabled={isResendingOtp || resendCooldown > 0}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: resendCooldown > 0 ? '#64748b' : '#e2e8f0',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: isResendingOtp || resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isResendingOtp
                      ? 'Đang gửi lại...'
                      : resendCooldown > 0
                      ? `Gửi lại mã (${resendCooldown}s)`
                      : 'Gửi lại mã'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Đã đăng nhập Admin & Mở khóa PIN: Bảng Giám Sát Security Logs */
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span>
                Nhật Ký An Ninh &bull; 50 Bản Ghi Gần Nhất
              </h3>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  fetchSecurityLogs();
                }}
                disabled={isLoadingLogs}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className={`fa-solid fa-arrows-rotate ${isLoadingLogs ? 'fa-spin' : ''}`}></i>
                <span>Làm Mới</span>
              </button>
            </div>

            <div
              style={{
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                overflowX: 'auto',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 700 }}>Hành Động</th>
                    <th style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 700 }}>Email / Danh Tính</th>
                    <th style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 700 }}>Địa Chỉ IP</th>
                    <th style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 700 }}>Vị Trí GeoIP</th>
                    <th style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 700 }}>Thời Gian (VN)</th>
                  </tr>
                </thead>
                <tbody>
                  {logsError ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
                        <span>⚠️ {logsError}</span>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            fetchSecurityLogs();
                          }}
                          style={{
                            marginLeft: '12px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                          }}
                        >
                          Thử Lại
                        </button>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        {isLoadingLogs ? 'Đang tải dữ liệu...' : 'Chưa có bản ghi an ninh nào.'}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const badge = getActionBadge(log.action);
                      return (
                        <tr
                          key={log._id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                              }}
                            >
                              {badge.text}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#f8fafc', fontWeight: 600 }}>
                            {log.email || 'visitor'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#38bdf8', fontFamily: 'monospace' }}>
                            {log.ip}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                            {log.location}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                            {log.timeVn || (log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'N/A')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSecurityConsolePage;
