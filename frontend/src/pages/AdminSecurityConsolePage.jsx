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

  const isAdminAuthenticated = Boolean(user && user.role === 'admin');

  // Ghi nhận âm thầm Telemetry lượt truy cập vào /admin-portal
  useEffect(() => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      fetch(`${baseUrl}/admin/auth/telemetry`, { method: 'POST' }).catch(() => {});
    } catch (_) {}
  }, []);

  // Tải danh sách Audit Logs nếu đã đăng nhập quyền Admin
  const fetchSecurityLogs = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get('/admin/security-logs');
      const data = res?.data?.data || res?.data || [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Lỗi lấy Security Logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchSecurityLogs();
    }
  }, [isAdminAuthenticated, fetchSecurityLogs]);

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
      if (data?.token && data?.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('freedom_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (typeof setToken === 'function') setToken(data.token);
        if (typeof setUser === 'function') setUser(data.user);

        setSuccessMessage('✓ Đăng nhập Console thành công! Đang tải nhật ký...');
        setTimeout(() => {
          setSuccessMessage('');
        }, 1500);
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

            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
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
        ) : (
          /* Đã đăng nhập: Bảng Giám Sát Security Logs */
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
                  {logs.length === 0 ? (
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
