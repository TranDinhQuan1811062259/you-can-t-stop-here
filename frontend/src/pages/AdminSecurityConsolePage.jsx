import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { playClickSound } from '../utils/soundEffects';

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

  // Trạng thái mở khóa Mã PIN Quản Trị (x-admin-token lưu trong sessionStorage)
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return sessionStorage.getItem('freedom_admin_token') || '';
    } catch (_) {
      return '';
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const isAdminAuthenticated = Boolean(user && user.role === 'admin');
  const isPinUnlocked = Boolean(isAdminAuthenticated && adminToken);

  // Ghi nhận âm thầm Telemetry lượt truy cập vào /admin-portal
  useEffect(() => {
    try {
      const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
      const cleanBase = rawBase.replace(/\/+$/, '');
      fetch(`${cleanBase}/admin/auth/telemetry`, { method: 'POST' }).catch(() => {});
    } catch (_) {}
  }, []);

  // Lắng nghe sự kiện Backend yêu cầu mở khóa lại Mã PIN Quản Trị (403 requireAdminPin)
  useEffect(() => {
    const handlePinRequired = (e) => {
      try {
        sessionStorage.removeItem('freedom_admin_token');
      } catch (_) {}
      setAdminToken('');
      setLogs([]);
      setPinError(e?.detail?.message || 'Phiên mở khóa PIN đã hết hạn. Vui lòng nhập lại Mã PIN Quản Trị!');
    };
    window.addEventListener('freedom_admin_pin_required', handlePinRequired);
    return () => window.removeEventListener('freedom_admin_pin_required', handlePinRequired);
  }, []);

  // Xóa adminToken khỏi state nếu đăng xuất
  useEffect(() => {
    if (!isAdminAuthenticated) {
      setAdminToken('');
      setPinInput('');
      setPinError('');
    }
  }, [isAdminAuthenticated]);

  // Tải danh sách Audit Logs nếu đã đăng nhập Admin & đã mở khóa PIN (có x-admin-token)
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
        try {
          sessionStorage.removeItem('freedom_admin_token');
        } catch (_) {}
        setAdminToken('');
        setPinError(err.message || 'Vui lòng xác thực Mã PIN Quản Trị!');
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

  // Xác thực Mã PIN Quản Trị -> nhận adminToken (2h) lưu vào sessionStorage
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (!cleanPin || isVerifyingPin) return;

    setIsVerifyingPin(true);
    setPinError('');
    playClickSound();

    try {
      const res = await apiClient.post('/admin/verify-pin', { pin: cleanPin });
      const receivedAdminToken = res?.adminToken || res?.data?.adminToken || '';
      if (!receivedAdminToken) {
        throw new Error(res?.message || 'Không nhận được adminToken từ máy chủ.');
      }
      sessionStorage.setItem('freedom_admin_token', receivedAdminToken);
      setAdminToken(receivedAdminToken);
      setPinInput('');
      setPinError('');
    } catch (err) {
      setPinError(err?.response?.data?.message || err?.message || 'Mã PIN Quản Trị không chính xác!');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLockAdminPin = () => {
    playClickSound();
    try {
      sessionStorage.removeItem('freedom_admin_token');
    } catch (_) {}
    setAdminToken('');
    setPinInput('');
    setLogs([]);
  };

  // Xử lý đăng nhập cổng Admin
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

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

        setSuccessMessage('✓ Đăng nhập Console thành công! Đang tải nhật ký...');
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
                Hệ thống giám sát Telemetry, bẫy bảo mật Brevo &amp; cô lập cổng Quản Trị Viên
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                🔒 Khóa PIN
              </button>
            )}

            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  try {
                    sessionStorage.removeItem('freedom_admin_token');
                  } catch (_) {}
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

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  cursor: 'pointer',
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
          /* Đã đăng nhập role Admin -> Yêu cầu xác thực Mã PIN Quản Trị để nhận adminToken (2h) */
          <div
            style={{
              maxWidth: '420px',
              margin: '3rem auto',
              background: '#0f172a',
              border: '1px solid rgba(45, 212, 191, 0.35)',
              borderRadius: '18px',
              padding: '2rem',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 36px rgba(13, 148, 136, 0.14)',
            }}
          >
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
                ADMIN PIN GATE • 2H TOKEN
              </div>
              <h2 style={{ margin: 0, fontSize: '1.22rem', color: '#f8fafc' }}>Nhập Mã PIN Quản Trị</h2>
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Tài khoản <strong style={{ color: '#e2e8f0' }}>{user?.email}</strong> đã xác thực. Vui lòng nhập Mã PIN Quản Trị để mở khóa API quản trị.
              </p>
            </div>

            {pinError && (
              <div
                role="alert"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
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

            <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Mã PIN Bảo Mật
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
                {isVerifyingPin ? 'Đang kiểm tra PIN...' : 'Mở Khóa Trang Quản Trị 🔓'}
              </button>
            </form>

            <div style={{ marginTop: '1.2rem', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
              Giới hạn tối đa 5 lần nhập sai / 15 phút. Token tự hết hạn sau 2 giờ.
            </div>
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
