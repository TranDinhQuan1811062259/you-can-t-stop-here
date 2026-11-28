import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { getAdminUsers, updateAdminUserRole, updateAdminUserStatus } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { playClickSound } from '../utils/soundEffects';
import { getActiveTheme, toggleTheme } from '../utils/themeUtils';
import '../styles/admin-console.css';

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

const getActionBadge = (action) => {
  switch (action) {
    case 'LOGIN_SUCCESS':
      return { text: 'LOGIN SUCCESS', variant: 'is-success' };
    case 'LOGIN_FAILED':
      return { text: 'LOGIN FAILED', variant: 'is-danger' };
    case 'BLOCKED_AT_USER_PORTAL':
      return { text: 'BLOCKED AT PORTAL', variant: 'is-warn' };
    case 'ROLE_UPDATED':
      return { text: 'ROLE UPDATED', variant: 'is-purple' };
    case 'USER_BANNED':
      return { text: 'USER BANNED', variant: 'is-danger' };
    case 'USER_UNBANNED':
      return { text: 'USER UNBANNED', variant: 'is-success' };
    case 'PORTAL_VISITED':
    default:
      return { text: 'PORTAL VISITED', variant: 'is-accent' };
  }
};

const getRoleBadge = (role) => {
  switch (role) {
    case 'admin':
      return { text: 'ADMIN', variant: 'is-purple' };
    case 'moderator':
      return { text: 'MODERATOR', variant: 'is-accent' };
    case 'user':
    default:
      return { text: 'USER', variant: '' };
  }
};

const getStatusBadge = (status) => {
  if (status === 'banned') {
    return { text: 'BỊ KHÓA', variant: 'is-danger' };
  }
  return { text: 'HOẠT ĐỘNG', variant: 'is-success' };
};

const formatDateVi = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  try {
    return d.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (_) {
    return d.toLocaleDateString('vi-VN');
  }
};

const formatAuditDetail = (log) => {
  const details = log?.details || {};
  if (log?.action === 'ROLE_UPDATED' && details.previousRole && details.newRole) {
    return `${String(details.previousRole).toUpperCase()} → ${String(details.newRole).toUpperCase()}`;
  }
  if ((log?.action === 'USER_BANNED' || log?.action === 'USER_UNBANNED') && details.actorEmail) {
    return `Bởi ${details.actorEmail}`;
  }
  return log?.location || 'Không xác định';
};

const AdminUserIdentityCell = ({ item, isSelf, selfLabel = 'Bạn' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const avatarLetter = String(item?.name || item?.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="admin-user-cell">
      {item?.avatar && !imgFailed ? (
        <img
          src={item.avatar}
          alt={item.name}
          className="admin-user-avatar"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="admin-user-avatar" aria-hidden="true">
          {avatarLetter}
        </div>
      )}
      <div className="admin-user-meta">
        <div className="admin-user-name">
          <span>{item?.name}</span>
          {isSelf && <span className="admin-badge is-accent">{selfLabel}</span>}
        </div>
        <div className="admin-user-email">{item?.email}</div>
      </div>
    </div>
  );
};

export const AdminSecurityConsolePage = () => {
  const navigate = useNavigate();
  const { user, setUser, setToken, logout } = useAuth();

  // Theme sync (Day & Night mode contrast)
  const [activeTheme, setActiveTheme] = useState(() => getActiveTheme());

  // Admin Portal Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Tab navigation inside unlocked console
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'users' | 'rbac'

  // Tab 1: Security Logs states
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState('');

  // Tab 2 & 3: Users & RBAC MongoDB states
  const [usersList, setUsersList] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [usersStats, setUsersStats] = useState({ total: 0, admin: 0, moderator: 0, banned: 0, active: 0 });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');

  // Tab 2 filters
  const [accountSearchInput, setAccountSearchInput] = useState('');
  const [accountSearchApplied, setAccountSearchApplied] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');
  const [accountPage, setAccountPage] = useState(1);

  // Tab 3 filters
  const [rbacScope, setRbacScope] = useState('staff'); // 'staff' | 'all'
  const [rbacSearchInput, setRbacSearchInput] = useState('');
  const [rbacSearchApplied, setRbacSearchApplied] = useState('');
  const [rbacPage, setRbacPage] = useState(1);

  // Confirmation modal & action feedback states
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'status' | 'role', targetUser, nextValue }
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [modalError, setModalError] = useState('');
  const [actionError, setActionError] = useState('');

  // 2FA PIN + Email OTP states
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
  const usersFetchSeqRef = useRef(0);

  const isAdminAuthenticated = Boolean(user && user.role === 'admin');
  const isPinUnlocked = Boolean(isAdminAuthenticated && adminToken);
  const currentUserId = user?._id ? String(user._id) : '';

  const showToast = useCallback((message) => {
    setUnlockToast(message);
    if (unlockToastTimerRef.current) {
      clearTimeout(unlockToastTimerRef.current);
    }
    unlockToastTimerRef.current = setTimeout(() => {
      setUnlockToast('');
      unlockToastTimerRef.current = null;
    }, 4000);
  }, []);

  const resetControlCenterData = useCallback(() => {
    setLogs([]);
    setLogsError('');
    setUsersList([]);
    setUsersError('');
    setActionError('');
    setModalError('');
    setConfirmDialog(null);
  }, []);

  const handlePinSessionExpired = useCallback(
    (err, fallbackMsg) => {
      clearStoredAdminToken();
      setAdminToken('');
      setGateStep('pin');
      setVerifiedPin('');
      setOtpInput('');
      setOtpError('');
      setOtpNotice('');
      resetControlCenterData();
      setPinError(err?.message || fallbackMsg || 'Phiên mở khóa Admin đã hết hạn. Vui lòng xác thực lại Mã PIN Quản Trị!');
    },
    [resetControlCenterData]
  );

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (unlockToastTimerRef.current) {
        clearTimeout(unlockToastTimerRef.current);
      }
    };
  }, []);

  // Listen for Day/Night theme changes across tabs/components
  useEffect(() => {
    const syncTheme = (e) => {
      setActiveTheme(e?.detail || getActiveTheme());
    };
    window.addEventListener('freedom_theme_changed', syncTheme);
    return () => window.removeEventListener('freedom_theme_changed', syncTheme);
  }, []);

  // Close confirmation dialog with Escape key
  useEffect(() => {
    if (!confirmDialog) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmittingAction) {
        setConfirmDialog(null);
        setModalError('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, isSubmittingAction]);

  // Countdown cooldown nút Gửi lại mã OTP (Bước 2)
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
      handlePinSessionExpired(e?.detail, 'Phiên mở khóa Admin đã hết hạn. Vui lòng xác thực lại Mã PIN Quản Trị!');
    };
    window.addEventListener('freedom_admin_pin_required', handlePinRequired);
    return () => window.removeEventListener('freedom_admin_pin_required', handlePinRequired);
  }, [handlePinSessionExpired]);

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
      resetControlCenterData();
    }
  }, [isAdminAuthenticated, resetControlCenterData]);

  // Tải danh sách Audit Logs (Tab 1)
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
        handlePinSessionExpired(err, 'Vui lòng xác thực lại Cổng Quản Trị 2 lớp!');
      } else {
        setLogsError(err.response?.data?.message || err.message || 'Không thể tải nhật ký an ninh do lỗi kết nối mạng.');
      }
    } finally {
      setIsLoadingLogs(false);
    }
  }, [isPinUnlocked, handlePinSessionExpired]);

  // Tải danh sách tài khoản & thống kê trực tiếp từ MongoDB Backend (Tab 2 & Tab 3)
  const fetchUsersFromMongo = useCallback(async () => {
    if (!isPinUnlocked) return;
    const reqId = usersFetchSeqRef.current + 1;
    usersFetchSeqRef.current = reqId;
    setIsLoadingUsers(true);
    setUsersError('');

    const queryParams =
      activeTab === 'rbac'
        ? {
            search: rbacSearchApplied,
            role: rbacScope === 'staff' ? 'staff' : 'all',
            status: 'all',
            page: rbacPage,
            limit: 15,
          }
        : activeTab === 'users'
        ? {
            search: accountSearchApplied,
            role: accountRoleFilter,
            status: accountStatusFilter,
            page: accountPage,
            limit: 15,
          }
        : {
            page: 1,
            limit: 1,
          };

    try {
      const res = await getAdminUsers(queryParams);
      if (reqId !== usersFetchSeqRef.current) return;

      const payload = res?.data || res || {};
      const nextUsers = Array.isArray(payload.users) ? payload.users : [];
      const nextPagination = payload.pagination || { page: 1, limit: 15, total: nextUsers.length, totalPages: 1 };
      const nextStats = payload.stats || { total: 0, admin: 0, moderator: 0, banned: 0, active: 0 };

      setUsersList(nextUsers);
      setUsersPagination(nextPagination);
      setUsersStats(nextStats);
    } catch (err) {
      if (reqId !== usersFetchSeqRef.current) return;
      console.warn('Lỗi truy vấn danh sách tài khoản từ MongoDB:', err);
      if (err?.requireAdminPin) {
        handlePinSessionExpired(err, 'Vui lòng xác thực lại Cổng Quản Trị 2 lớp!');
      } else {
        setUsersError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách tài khoản từ cơ sở dữ liệu.');
      }
    } finally {
      if (reqId === usersFetchSeqRef.current) {
        setIsLoadingUsers(false);
      }
    }
  }, [
    isPinUnlocked,
    activeTab,
    accountSearchApplied,
    accountRoleFilter,
    accountStatusFilter,
    accountPage,
    rbacScope,
    rbacSearchApplied,
    rbacPage,
    handlePinSessionExpired,
  ]);

  useEffect(() => {
    if (isPinUnlocked) {
      fetchSecurityLogs();
    }
  }, [isPinUnlocked, fetchSecurityLogs]);

  useEffect(() => {
    if (isPinUnlocked) {
      fetchUsersFromMongo();
    }
  }, [isPinUnlocked, fetchUsersFromMongo]);

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

      showToast('Mở khóa Quản Trị thành công');
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
    resetControlCenterData();
  };

  // Xử lý đăng nhập cổng Admin
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;
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

  // Xử lý tìm kiếm Tab 2
  const handleAccountSearchSubmit = (e) => {
    e.preventDefault();
    playClickSound();
    setAccountPage(1);
    setAccountSearchApplied(accountSearchInput.trim());
  };

  // Xử lý tìm kiếm Tab 3
  const handleRbacSearchSubmit = (e) => {
    e.preventDefault();
    playClickSound();
    setRbacPage(1);
    setRbacSearchApplied(rbacSearchInput.trim());
  };

  // Mở hộp thoại xác nhận thay đổi trạng thái hoặc vai trò
  const openStatusConfirm = (targetUser) => {
    playClickSound();
    setActionError('');
    setModalError('');
    const nextStatus = targetUser.status === 'banned' ? 'active' : 'banned';
    setConfirmDialog({
      type: 'status',
      targetUser,
      nextValue: nextStatus,
    });
  };

  const openRoleConfirm = (targetUser, nextRole) => {
    if (!nextRole || nextRole === targetUser.role) return;
    playClickSound();
    setActionError('');
    setModalError('');
    setConfirmDialog({
      type: 'role',
      targetUser,
      nextValue: nextRole,
    });
  };

  // Thực thi PATCH lên MongoDB khi admin xác nhận
  const handleConfirmAction = async () => {
    if (!confirmDialog || isSubmittingAction) return;
    const { type, targetUser, nextValue } = confirmDialog;

    setIsSubmittingAction(true);
    setModalError('');
    setActionError('');
    playClickSound();

    try {
      const res =
        type === 'status'
          ? await updateAdminUserStatus(targetUser._id, nextValue)
          : await updateAdminUserRole(targetUser._id, nextValue);

      setConfirmDialog(null);
      showToast(res?.message || 'Đã cập nhật dữ liệu trên MongoDB thành công');

      // Tải lại danh sách tài khoản, thống kê và Nhật Ký An Ninh mới nhất từ MongoDB
      await Promise.all([fetchUsersFromMongo(), fetchSecurityLogs()]);
    } catch (err) {
      if (err?.requireAdminPin) {
        handlePinSessionExpired(err, 'Phiên mở khóa Admin đã hết hạn. Vui lòng xác thực lại Mã PIN Quản Trị!');
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Thao tác thất bại. Vui lòng thử lại.';
        setModalError(msg);
        setActionError(msg);
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleToggleDayNight = () => {
    playClickSound();
    const nextTheme = toggleTheme();
    setActiveTheme(nextTheme);
  };

  return (
    <div className="admin-console-shell">
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
          }}
        >
          <span>✓</span>
          <span>{unlockToast}</span>
        </div>
      )}

      <div className="admin-console-inner">
        {/* Header Console */}
        <header className="admin-console-header">
          <div className="admin-console-title-group">
            <span style={{ fontSize: '1.85rem', flexShrink: 0 }} aria-hidden="true">
              🛡️
            </span>
            <div>
              <h1 className="admin-console-title">ADMIN CONTROL CENTER &bull; SECURITY CONSOLE</h1>
              <p className="admin-console-subtitle">
                Giám sát Telemetry, Quản lý Tài khoản &amp; Phân quyền RBAC 100% đồng bộ MongoDB
              </p>
            </div>
          </div>

          <div className="admin-console-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={handleToggleDayNight}
              title="Chuyển đổi giao diện Ngày / Đêm"
            >
              {activeTheme === 'light' ? '🌙 Chế Độ Đêm' : '☀️ Chế Độ Ngày'}
            </button>

            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                playClickSound();
                navigate('/');
              }}
            >
              &larr; Về Trang Chủ
            </button>

            {isPinUnlocked && (
              <button type="button" className="admin-btn admin-btn-warn" onClick={handleLockAdminPin}>
                🔒 Khóa Cổng
              </button>
            )}

            {isAdminAuthenticated && (
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => {
                  playClickSound();
                  clearStoredAdminToken();
                  logout();
                }}
              >
                Đăng Xuất Admin
              </button>
            )}
          </div>
        </header>

        {/* Chưa đăng nhập Admin: Hiển thị Form Đăng Nhập Security */}
        {!isAdminAuthenticated ? (
          <div className="admin-auth-card">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className="admin-badge is-accent" style={{ marginBottom: '10px' }}>
                ISOLATED GATEWAY
              </span>
              <h2 style={{ margin: '8px 0 0', fontSize: '1.25rem', color: 'var(--ac-text)' }}>Đăng Nhập Quản Trị</h2>
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--ac-text-muted)', lineHeight: 1.5 }}>
                Cổng riêng biệt dành riêng cho Quản trị viên hệ thống. Mọi truy cập đều được ghi log GeoIP.
              </p>
            </div>

            {errorMessage && (
              <div className="admin-alert is-error" role="alert">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="admin-alert is-success" role="status">
                <span>{successMessage}</span>
              </div>
            )}

            <form noValidate onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--ac-text-soft)', marginBottom: '6px', fontWeight: 700 }}>
                  Email Quản Trị
                </label>
                <input
                  className="admin-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--ac-text-soft)', marginBottom: '6px', fontWeight: 700 }}>
                  Mật Khẩu Bảo Mật
                </label>
                <input
                  className="admin-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <button type="submit" className="admin-btn admin-btn-solid" disabled={isLoading} style={{ padding: '12px', fontSize: '0.88rem' }}>
                {isLoading ? 'Đang xác thực...' : 'Truy Cập Console 🛡️'}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--ac-text-muted)' }}>
              Được bảo vệ bởi Rate Limiter (tối đa 5 lần thử / 15 phút).
            </div>
          </div>
        ) : !isPinUnlocked ? (
          /* Đã đăng nhập Admin -> Cổng Mở Khóa 2 Lớp: Bước 1 PIN -> Bước 2 Email OTP */
          <div className="admin-auth-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.4rem' }}>
              <div
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: gateStep === 'pin' ? 'var(--ac-accent-bg)' : 'var(--ac-success-bg)',
                  border: gateStep === 'pin' ? '1px solid var(--ac-border-strong)' : '1px solid var(--ac-success-border)',
                  color: gateStep === 'pin' ? 'var(--ac-accent-text)' : 'var(--ac-success-text)',
                }}
              >
                {gateStep === 'pin' ? '1. Mã PIN Bí Mật' : '✓ 1. Mã PIN'}
              </div>
              <span style={{ color: 'var(--ac-text-muted)', fontSize: '0.8rem' }}>&rarr;</span>
              <div
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: gateStep === 'otp' ? 'var(--ac-accent-bg)' : 'var(--ac-surface-alt)',
                  border: gateStep === 'otp' ? '1px solid var(--ac-border-strong)' : '1px solid var(--ac-border)',
                  color: gateStep === 'otp' ? 'var(--ac-accent-text)' : 'var(--ac-text-muted)',
                }}
              >
                2. Email OTP (6 số)
              </div>
            </div>

            {gateStep === 'pin' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1.35rem' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: 'var(--ac-accent-bg)',
                      border: '1.5px solid var(--ac-border-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      fontSize: '1.5rem',
                    }}
                  >
                    🔐
                  </div>
                  <span className="admin-badge is-accent" style={{ marginBottom: '8px' }}>
                    LỚP 1 / 2 • MÃ PIN BÍ MẬT
                  </span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '1.22rem', color: 'var(--ac-text)' }}>Nhập Mã PIN Quản Trị</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--ac-text-muted)', lineHeight: 1.5 }}>
                    Tài khoản <strong style={{ color: 'var(--ac-text)' }}>{user?.email}</strong> đã xác thực. Nhập Mã PIN để nhận OTP 6 số qua Email.
                  </p>
                </div>

                {pinError && (
                  <div className="admin-alert is-error" role="alert">
                    <span>⚠️ {pinError}</span>
                  </div>
                )}

                <form noValidate onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--ac-text-soft)', marginBottom: '6px', fontWeight: 700 }}>
                      Mã PIN Bảo Mật (Lớp 1)
                    </label>
                    <input
                      className="admin-input"
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
                        fontSize: '1.2rem',
                        letterSpacing: '6px',
                        textAlign: 'center',
                        borderColor: pinError ? '#ef4444' : undefined,
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="admin-btn admin-btn-solid"
                    disabled={isVerifyingPin || !pinInput.trim()}
                    style={{ padding: '12px', fontSize: '0.9rem' }}
                  >
                    {isVerifyingPin ? 'Đang kiểm tra PIN & gửi OTP...' : 'Xác nhận PIN & Gửi OTP Email'}
                  </button>
                </form>

                <div style={{ marginTop: '1.2rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--ac-text-muted)' }}>
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
                      background: 'var(--ac-accent-bg)',
                      border: '1.5px solid var(--ac-border-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      fontSize: '1.5rem',
                    }}
                  >
                    ✉️
                  </div>
                  <span className="admin-badge is-accent" style={{ marginBottom: '8px' }}>
                    LỚP 2 / 2 • XÁC THỰC EMAIL OTP
                  </span>
                  <h2 style={{ margin: '8px 0 0', fontSize: '1.22rem', color: 'var(--ac-text)' }}>Nhập Mã OTP 6 Số</h2>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--ac-text-muted)', lineHeight: 1.55 }}>
                    Mã xác thực có hiệu lực 5 phút đã được gửi tới hòm thư:{' '}
                    <strong style={{ color: 'var(--ac-accent-text)', wordBreak: 'break-all' }}>{otpEmail || user?.email}</strong>
                  </p>
                </div>

                {otpNotice && (
                  <div className="admin-alert is-success" role="status">
                    <span>✓ {otpNotice}</span>
                  </div>
                )}

                {otpError && (
                  <div className="admin-alert is-error" role="alert">
                    <span>⚠️ {otpError}</span>
                  </div>
                )}

                <form noValidate onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--ac-text-soft)', fontWeight: 700 }}>
                        Mã OTP 6 số từ Email
                      </label>
                      <button type="button" className="admin-btn admin-btn-primary" onClick={handlePasteOtp} style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                        📋 Dán mã
                      </button>
                    </div>

                    <input
                      ref={otpInputRef}
                      className="admin-input"
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
                        fontSize: 'clamp(1.1rem, 4.5vw, 1.35rem)',
                        letterSpacing: 'clamp(4px, 1.5vw, 8px)',
                        textAlign: 'center',
                        fontWeight: 800,
                        borderColor: otpError ? '#ef4444' : undefined,
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="admin-btn admin-btn-solid"
                    disabled={isVerifyingOtp || otpInput.length !== 6}
                    style={{ padding: '12px', fontSize: '0.9rem' }}
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
                      color: 'var(--ac-text-muted)',
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
                    className="admin-btn"
                    onClick={handleResendAdminOtp}
                    disabled={isResendingOtp || resendCooldown > 0}
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
          /* Đã đăng nhập Admin & Mở khóa 2 lớp: ADMIN CONTROL CENTER (3 TABS) */
          <main>
            {/* Thanh điều hướng 3 Tab */}
            <nav className="admin-tabs-bar" role="tablist" aria-label="Bảng điều khiển Quản trị">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'logs'}
                className={`admin-tab-btn ${activeTab === 'logs' ? 'is-active' : ''}`}
                onClick={() => {
                  playClickSound();
                  setActiveTab('logs');
                  setActionError('');
                }}
              >
                <span>📜</span>
                <span>Nhật Ký An Ninh</span>
                <span className="admin-tab-count">{logs.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'users'}
                className={`admin-tab-btn ${activeTab === 'users' ? 'is-active' : ''}`}
                onClick={() => {
                  playClickSound();
                  setActiveTab('users');
                  setActionError('');
                }}
              >
                <span>👥</span>
                <span>Quản Lý Tài Khoản</span>
                <span className="admin-tab-count">{usersStats.total}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'rbac'}
                className={`admin-tab-btn ${activeTab === 'rbac' ? 'is-active' : ''}`}
                onClick={() => {
                  playClickSound();
                  setActiveTab('rbac');
                  setActionError('');
                }}
              >
                <span>🔑</span>
                <span>Đội Ngũ &amp; Phân Quyền</span>
                <span className="admin-tab-count">{usersStats.admin + usersStats.moderator}</span>
              </button>
            </nav>

            {actionError && (
              <div className="admin-alert is-error" role="alert">
                <span>⚠️ {actionError}</span>
                <button type="button" className="admin-btn" onClick={() => setActionError('')} style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                  Đóng
                </button>
              </div>
            )}

            {/* TAB 1: NHẬT KÝ AN NINH */}
            {activeTab === 'logs' && (
              <section role="tabpanel" aria-label="Nhật Ký An Ninh">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">
                    <span>📜</span>
                    <span>Nhật Ký An Ninh &bull; 50 Bản Ghi Gần Nhất</span>
                  </h2>

                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      playClickSound();
                      fetchSecurityLogs();
                    }}
                    disabled={isLoadingLogs}
                  >
                    {isLoadingLogs ? 'Đang tải...' : '🔄 Làm Mới'}
                  </button>
                </div>

                <div className="admin-table-card">
                  <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Hành Động</th>
                          <th>Email / Danh Tính</th>
                          <th>Chi Tiết / GeoIP</th>
                          <th>Địa Chỉ IP</th>
                          <th>Thời Gian (VN)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logsError ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ac-danger-text)' }}>
                              <span>⚠️ {logsError}</span>
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary"
                                onClick={() => {
                                  playClickSound();
                                  fetchSecurityLogs();
                                }}
                                style={{ marginLeft: '12px' }}
                              >
                                Thử Lại
                              </button>
                            </td>
                          </tr>
                        ) : logs.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ac-text-muted)' }}>
                              {isLoadingLogs ? 'Đang tải nhật ký an ninh từ MongoDB...' : 'Chưa có bản ghi an ninh nào.'}
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => {
                            const badge = getActionBadge(log.action);
                            return (
                              <tr key={log._id}>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <span className={`admin-badge ${badge.variant}`}>{badge.text}</span>
                                </td>
                                <td style={{ color: 'var(--ac-text)', fontWeight: 700, wordBreak: 'break-word' }}>
                                  {log.email || 'visitor'}
                                </td>
                                <td>{formatAuditDetail(log)}</td>
                                <td style={{ color: 'var(--ac-accent-text)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                  {log.ip || 'N/A'}
                                </td>
                                <td style={{ color: 'var(--ac-text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
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
              </section>
            )}

            {/* TAB 2: QUẢN LÝ TÀI KHOẢN */}
            {activeTab === 'users' && (
              <section role="tabpanel" aria-label="Quản Lý Tài Khoản">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">
                    <span>👥</span>
                    <span>Quản Lý Tài Khoản Người Dùng (MongoDB)</span>
                  </h2>

                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      playClickSound();
                      fetchUsersFromMongo();
                    }}
                    disabled={isLoadingUsers}
                  >
                    {isLoadingUsers ? 'Đang tải...' : '🔄 Làm Mới'}
                  </button>
                </div>

                {/* Bộ lọc & Tìm kiếm */}
                <div className="admin-toolbar">
                  <form noValidate onSubmit={handleAccountSearchSubmit} className="admin-search-form">
                    <input
                      className="admin-input"
                      type="text"
                      value={accountSearchInput}
                      onChange={(e) => setAccountSearchInput(e.target.value)}
                      placeholder="Tìm theo tên hoặc email..."
                      aria-label="Tìm kiếm tài khoản theo tên hoặc email"
                    />
                    <button type="submit" className="admin-btn admin-btn-solid" disabled={isLoadingUsers}>
                      🔍 Tìm
                    </button>
                  </form>

                  <div className="admin-filter-group">
                    <select
                      className="admin-select admin-filter-select"
                      value={accountRoleFilter}
                      onChange={(e) => {
                        setAccountRoleFilter(e.target.value);
                        setAccountPage(1);
                      }}
                      aria-label="Lọc theo vai trò"
                    >
                      <option value="all">Tất cả vai trò</option>
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>

                    <select
                      className="admin-select admin-filter-select"
                      value={accountStatusFilter}
                      onChange={(e) => {
                        setAccountStatusFilter(e.target.value);
                        setAccountPage(1);
                      }}
                      aria-label="Lọc theo trạng thái"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="banned">Đã bị khóa</option>
                    </select>

                    {(accountSearchApplied || accountRoleFilter !== 'all' || accountStatusFilter !== 'all') && (
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => {
                          playClickSound();
                          setAccountSearchInput('');
                          setAccountSearchApplied('');
                          setAccountRoleFilter('all');
                          setAccountStatusFilter('all');
                          setAccountPage(1);
                        }}
                      >
                        ✕ Xóa lọc
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-table-card">
                  <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Thành Viên</th>
                          <th>Vai Trò</th>
                          <th>Trạng Thái</th>
                          <th>Ngày Tham Gia</th>
                          <th style={{ textAlign: 'right' }}>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersError ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ac-danger-text)' }}>
                              <span>⚠️ {usersError}</span>
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary"
                                onClick={() => {
                                  playClickSound();
                                  fetchUsersFromMongo();
                                }}
                                style={{ marginLeft: '12px' }}
                              >
                                Thử Lại
                              </button>
                            </td>
                          </tr>
                        ) : usersList.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ac-text-muted)' }}>
                              {isLoadingUsers ? 'Đang tải danh sách tài khoản từ MongoDB...' : 'Không tìm thấy tài khoản nào khớp bộ lọc.'}
                            </td>
                          </tr>
                        ) : (
                          usersList.map((item) => {
                            const roleBadge = getRoleBadge(item.role);
                            const statusBadge = getStatusBadge(item.status);
                            const currentUserEmail = user?.email ? String(user.email).toLowerCase().trim() : '';
                            const isSelf = Boolean(
                              (currentUserId && String(item._id) === currentUserId) ||
                                (currentUserEmail && String(item.email || '').toLowerCase().trim() === currentUserEmail)
                            );
                            const isBanned = item.status === 'banned';
                            const isLockProtected = !isBanned && (isSelf || item.role === 'admin');

                            return (
                              <tr key={item._id}>
                                <td>
                                  <AdminUserIdentityCell item={item} isSelf={isSelf} selfLabel="Bạn" />
                                </td>
                                <td>
                                  <span className={`admin-badge ${roleBadge.variant}`}>{roleBadge.text}</span>
                                </td>
                                <td>
                                  <span className={`admin-badge ${statusBadge.variant}`}>{statusBadge.text}</span>
                                </td>
                                <td style={{ whiteSpace: 'nowrap', color: 'var(--ac-text-muted)' }}>
                                  {formatDateVi(item.createdAt)}
                                </td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    className={`admin-btn ${isBanned ? 'admin-btn-success' : 'admin-btn-danger'}`}
                                    disabled={isLockProtected || isSubmittingAction}
                                    title={
                                      isSelf
                                        ? 'Không thể tự khóa tài khoản của chính mình'
                                        : item.role === 'admin' && !isBanned
                                        ? 'Không thể khóa tài khoản Quản Trị Viên khác'
                                        : isBanned
                                        ? 'Mở khóa tài khoản này'
                                        : 'Khóa tài khoản này ngay lập tức'
                                    }
                                    onClick={() => openStatusConfirm(item)}
                                  >
                                    {isBanned ? '🔓 Mở Khóa' : '🚫 Khóa Tài Khoản'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Phân trang Tab 2 */}
                  <div className="admin-pagination">
                    <span>
                      Trang <strong>{usersPagination.page}</strong> / {usersPagination.totalPages} &bull; Tổng{' '}
                      <strong>{usersPagination.total}</strong> tài khoản khớp
                    </span>
                    <div className="admin-pagination-controls">
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={accountPage <= 1 || isLoadingUsers}
                        onClick={() => {
                          playClickSound();
                          setAccountPage((prev) => Math.max(1, prev - 1));
                        }}
                      >
                        &larr; Trước
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={accountPage >= (usersPagination.totalPages || 1) || isLoadingUsers}
                        onClick={() => {
                          playClickSound();
                          setAccountPage((prev) => prev + 1);
                        }}
                      >
                        Sau &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 3: ĐỘI NGŨ & PHÂN QUYỀN */}
            {activeTab === 'rbac' && (
              <section role="tabpanel" aria-label="Đội Ngũ & Phân Quyền">
                {/* Thẻ thống kê nhanh từ MongoDB */}
                <div className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <div className="admin-stat-label">Tổng Tài Khoản</div>
                    <div className="admin-stat-value">{usersStats.total}</div>
                  </div>
                  <div className="admin-stat-card is-purple">
                    <div className="admin-stat-label">Admin Hệ Thống</div>
                    <div className="admin-stat-value">{usersStats.admin}</div>
                  </div>
                  <div className="admin-stat-card is-accent">
                    <div className="admin-stat-label">Moderator</div>
                    <div className="admin-stat-value">{usersStats.moderator}</div>
                  </div>
                  <div className="admin-stat-card is-danger">
                    <div className="admin-stat-label">Tài Khoản Bị Khóa</div>
                    <div className="admin-stat-value">{usersStats.banned}</div>
                  </div>
                </div>

                <div className="admin-section-header">
                  <h2 className="admin-section-title">
                    <span>🔑</span>
                    <span>Đội Ngũ Quản Trị &amp; Phân Quyền RBAC</span>
                  </h2>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`admin-btn ${rbacScope === 'staff' ? 'admin-btn-primary' : ''}`}
                      onClick={() => {
                        playClickSound();
                        setRbacScope('staff');
                        setRbacPage(1);
                      }}
                    >
                      🛡️ Đội Ngũ (Admin &amp; Mod)
                    </button>
                    <button
                      type="button"
                      className={`admin-btn ${rbacScope === 'all' ? 'admin-btn-primary' : ''}`}
                      onClick={() => {
                        playClickSound();
                        setRbacScope('all');
                        setRbacPage(1);
                      }}
                    >
                      🌐 Toàn Bộ (Cấp Quyền Mới)
                    </button>
                  </div>
                </div>

                {/* Thanh tìm kiếm Tab 3 */}
                <div className="admin-toolbar">
                  <form noValidate onSubmit={handleRbacSearchSubmit} className="admin-search-form">
                    <input
                      className="admin-input"
                      type="text"
                      value={rbacSearchInput}
                      onChange={(e) => setRbacSearchInput(e.target.value)}
                      placeholder="Tìm thành viên theo tên hoặc email để phân quyền..."
                      aria-label="Tìm thành viên để phân quyền"
                    />
                    <button type="submit" className="admin-btn admin-btn-solid" disabled={isLoadingUsers}>
                      🔍 Tìm
                    </button>
                    {rbacSearchApplied && (
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => {
                          playClickSound();
                          setRbacSearchInput('');
                          setRbacSearchApplied('');
                          setRbacPage(1);
                        }}
                      >
                        ✕ Xóa lọc
                      </button>
                    )}
                  </form>

                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      playClickSound();
                      fetchUsersFromMongo();
                    }}
                    disabled={isLoadingUsers}
                  >
                    {isLoadingUsers ? 'Đang tải...' : '🔄 Đồng Bộ MongoDB'}
                  </button>
                </div>

                <div className="admin-table-card">
                  <div className="admin-table-scroll">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Thành Viên</th>
                          <th>Trạng Thái</th>
                          <th>Vai Trò Hiện Tại</th>
                          <th>Thay Đổi Quyền Hạn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersError ? (
                          <tr>
                            <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ac-danger-text)' }}>
                              <span>⚠️ {usersError}</span>
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary"
                                onClick={() => {
                                  playClickSound();
                                  fetchUsersFromMongo();
                                }}
                                style={{ marginLeft: '12px' }}
                              >
                                Thử Lại
                              </button>
                            </td>
                          </tr>
                        ) : usersList.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ac-text-muted)' }}>
                              {isLoadingUsers
                                ? 'Đang tải danh sách đội ngũ từ MongoDB...'
                                : 'Chưa có thành viên nào khớp điều kiện phân quyền.'}
                            </td>
                          </tr>
                        ) : (
                          usersList.map((item) => {
                            const roleBadge = getRoleBadge(item.role);
                            const statusBadge = getStatusBadge(item.status);
                            const currentUserEmail = user?.email ? String(user.email).toLowerCase().trim() : '';
                            const isSelf = Boolean(
                              (currentUserId && String(item._id) === currentUserId) ||
                                (currentUserEmail && String(item.email || '').toLowerCase().trim() === currentUserEmail)
                            );

                            return (
                              <tr key={item._id}>
                                <td>
                                  <AdminUserIdentityCell item={item} isSelf={isSelf} selfLabel="Đang đăng nhập" />
                                </td>
                                <td>
                                  <span className={`admin-badge ${statusBadge.variant}`}>{statusBadge.text}</span>
                                </td>
                                <td>
                                  <span className={`admin-badge ${roleBadge.variant}`}>{roleBadge.text}</span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <select
                                      className="admin-select admin-select-inline"
                                      value={item.role}
                                      disabled={isSelf || isSubmittingAction}
                                      aria-label={`Chọn vai trò mới cho ${item.email}`}
                                      title={
                                        isSelf
                                          ? 'Bảo vệ Anti-Self-Demote: Không thể tự thay đổi quyền của chính mình'
                                          : 'Chọn vai trò mới (yêu cầu xác nhận)'
                                      }
                                      onChange={(e) => openRoleConfirm(item, e.target.value)}
                                    >
                                      <option value="user">User</option>
                                      <option value="moderator">Moderator</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                    {isSelf && (
                                      <span style={{ fontSize: '0.73rem', color: 'var(--ac-text-muted)' }}>
                                        (Được bảo vệ)
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Phân trang Tab 3 */}
                  <div className="admin-pagination">
                    <span>
                      Trang <strong>{usersPagination.page}</strong> / {usersPagination.totalPages} &bull;{' '}
                      <strong>{usersPagination.total}</strong> tài khoản trong danh sách
                    </span>
                    <div className="admin-pagination-controls">
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={rbacPage <= 1 || isLoadingUsers}
                        onClick={() => {
                          playClickSound();
                          setRbacPage((prev) => Math.max(1, prev - 1));
                        }}
                      >
                        &larr; Trước
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={rbacPage >= (usersPagination.totalPages || 1) || isLoadingUsers}
                        onClick={() => {
                          playClickSound();
                          setRbacPage((prev) => prev + 1);
                        }}
                      >
                        Sau &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </main>
        )}
      </div>

      {/* Hộp thoại Xác Nhận Thay Đổi Quyền / Khóa Tài Khoản */}
      {confirmDialog && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingAction) {
              setConfirmDialog(null);
              setModalError('');
            }
          }}
        >
          <div className="admin-modal-card">
            <h3 id="admin-confirm-title" className="admin-modal-title">
              {confirmDialog.type === 'status'
                ? confirmDialog.nextValue === 'banned'
                  ? '⚠️ Xác Nhận Khóa Tài Khoản'
                  : '🔓 Xác Nhận Mở Khóa Tài Khoản'
                : '🔑 Xác Nhận Cập Nhật Phân Quyền'}
            </h3>

            <p className="admin-modal-desc">
              {confirmDialog.type === 'status' ? (
                confirmDialog.nextValue === 'banned' ? (
                  <>
                    Bạn sắp <strong>KHÓA (BANNED)</strong> tài khoản <strong>{confirmDialog.targetUser.name}</strong> (
                    <code>{confirmDialog.targetUser.email}</code>). Người dùng này sẽ bị chặn đăng nhập ngay lập tức và
                    mọi phiên hiện tại sẽ bị thu hồi.
                  </>
                ) : (
                  <>
                    Bạn sắp <strong>MỞ KHÓA (ACTIVE)</strong> cho tài khoản{' '}
                    <strong>{confirmDialog.targetUser.name}</strong> (<code>{confirmDialog.targetUser.email}</code>) để
                    cho phép đăng nhập trở lại.
                  </>
                )
              ) : (
                <>
                  Bạn sắp thay đổi vai trò của <strong>{confirmDialog.targetUser.name}</strong> (
                  <code>{confirmDialog.targetUser.email}</code>) từ{' '}
                  <strong>{String(confirmDialog.targetUser.role || 'user').toUpperCase()}</strong> sang{' '}
                  <strong>{String(confirmDialog.nextValue).toUpperCase()}</strong>. Thao tác này sẽ ghi vào Nhật Ký An
                  Ninh và làm mới phiên đăng nhập của tài khoản này.
                </>
              )}
            </p>

            {modalError && (
              <div className="admin-alert is-error" role="alert" style={{ marginBottom: '0.75rem' }}>
                <span>⚠️ {modalError}</span>
              </div>
            )}

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn"
                disabled={isSubmittingAction}
                onClick={() => {
                  playClickSound();
                  setConfirmDialog(null);
                  setModalError('');
                }}
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                disabled={isSubmittingAction}
                className={`admin-btn ${
                  confirmDialog.type === 'status' && confirmDialog.nextValue === 'banned'
                    ? 'admin-btn-danger-solid'
                    : confirmDialog.type === 'status'
                    ? 'admin-btn-success-solid'
                    : 'admin-btn-solid'
                }`}
                onClick={handleConfirmAction}
              >
                {isSubmittingAction ? 'Đang cập nhật MongoDB...' : 'Xác Nhận Thực Thi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSecurityConsolePage;
