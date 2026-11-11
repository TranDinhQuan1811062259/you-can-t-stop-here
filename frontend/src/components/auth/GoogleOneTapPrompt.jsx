import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playClickSound } from '../../utils/soundEffects';

// Helper lấy danh sách tài khoản Google đã từng lưu trên MÁY NÀY
// Máy mới / trình duyệt mới sẽ là mảng rỗng [] -> Hệ thống hoàn toàn trống trơn không đề xuất!
const getSavedGoogleAccounts = () => {
  try {
    const raw = localStorage.getItem('saved_google_accounts');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // 🛡️ BẢO MẬT: Tuyệt đối không bao giờ hiển thị hoặc đề xuất tài khoản Admin công khai!
    return parsed.filter(
      (acc) =>
        acc &&
        acc.email &&
        acc.email.toLowerCase().trim() !== 'anthonyq012025@gmail.com' &&
        acc.role !== 'admin' &&
        !acc.isAdmin
    );
  } catch (_) {
    return [];
  }
};

export const GoogleOneTapPrompt = () => {
  const { isAuthenticated, openLoginModal } = useAuth();
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedGoogleAccounts());
  const [isVisible, setIsVisible] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  // Cập nhật lại danh sách tài khoản đã lưu khi có thay đổi storage
  useEffect(() => {
    const updateAccounts = () => {
      setSavedAccounts(getSavedGoogleAccounts());
    };
    window.addEventListener('storage', updateAccounts);
    window.addEventListener('saved_accounts_updated', updateAccounts);
    return () => {
      window.removeEventListener('storage', updateAccounts);
      window.removeEventListener('saved_accounts_updated', updateAccounts);
    };
  }, []);

  // Chỉ hiển thị One Tap NẾU trên máy này thực sự có tài khoản Google đã lưu trước đó!
  // Với máy khác / người lạ: savedAccounts.length === 0 -> Hoàn toàn trống trơn, không đề xuất!
  useEffect(() => {
    if (isAuthenticated || savedAccounts.length === 0) {
      setIsVisible(false);
      return;
    }

    const isDismissed = sessionStorage.getItem('google_onetap_dismissed') === 'true';
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, savedAccounts]);

  // Hỗ trợ sự kiện mở One Tap từ bên ngoài (khi bấm nút Google ở bất kỳ đâu)
  useEffect(() => {
    const handleOpen = () => {
      const current = getSavedGoogleAccounts();
      setSavedAccounts(current);
      if (current.length > 0) {
        setIsVisible(true);
      } else {
        // Nếu máy này chưa có tài khoản lưu -> Mở thẳng modal đăng nhập Google OTP
        window.dispatchEvent(new CustomEvent('open_google_otp_flow', { detail: {} }));
      }
    };
    window.addEventListener('open_google_onetap', handleOpen);
    return () => window.removeEventListener('open_google_onetap', handleOpen);
  }, []);

  // Nếu người dùng đã đăng nhập hoặc máy này chưa có tài khoản nào được lưu -> Không hiển thị
  if (!isVisible || isAuthenticated || savedAccounts.length === 0) return null;

  const handleDismiss = () => {
    playClickSound();
    setIsVisible(false);
    try {
      sessionStorage.setItem('google_onetap_dismissed', 'true');
    } catch (e) {}
  };

  /**
   * BẤM VÀO TÀI KHOẢN GOOGLE:
   * 🛡️ Theo yêu cầu bảo mật: KHÔNG ĐƯỢC VÀO TRỰC TIẾP!
   * Bắt buộc gửi mã xác thực 6 số (OTP) tới Gmail và yêu cầu nhập đúng mới cho vào!
   */
  const handleSelectAccount = (account) => {
    playClickSound();
    setLoadingEmail(account.email);
    setToastMsg(`Đang gửi mã xác thực Google tới ${account.email}...`);

    if (openLoginModal) openLoginModal();
    setTimeout(() => {
      setIsVisible(false);
      setLoadingEmail(null);
      setToastMsg('');

      // Kích hoạt luồng xác thực Google OTP trên AuthModal
      window.dispatchEvent(
        new CustomEvent('open_google_otp_flow', {
          detail: {
            email: account.email,
            name: account.name,
            avatar: account.avatar,
          },
        })
      );
    }, 250);
  };

  const handleUseOtherAccount = () => {
    playClickSound();
    setIsVisible(false);
    if (openLoginModal) openLoginModal();
    // Mở luồng đăng nhập Google mới bằng cách nhập email nhận OTP
    window.dispatchEvent(new CustomEvent('open_google_otp_flow', { detail: {} }));
  };

  return (
    <div className="google-one-tap-container" role="dialog" aria-label="Google One Tap Sign-in">
      {/* Khung Hộp Thoại Google One Tap chuẩn giao diện Google Chrome */}
      <div className="google-one-tap-card">
        {/* Header: Logo Google đa sắc + Tiêu đề + Nút Đóng */}
        <div className="google-one-tap-header">
          <div className="google-one-tap-branding">
            <svg className="google-one-tap-logo" width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span className="google-one-tap-title">
              Đăng nhập bằng <strong>Google</strong> (Bảo mật OTP)
            </span>
          </div>

          <button
            type="button"
            className="google-one-tap-close"
            onClick={handleDismiss}
            title="Đóng gợi ý đăng nhập Google"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Thông báo trạng thái nhanh */}
        {toastMsg && (
          <div className="google-one-tap-toast">
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Danh sách các tài khoản Google đã lưu trên máy này */}
        <div className="google-one-tap-list">
          {savedAccounts.map((acc) => {
            const isLoading = loadingEmail === acc.email;

            return (
              <div
                key={acc.email}
                className={`google-one-tap-item ${isLoading ? 'is-loading' : ''}`}
                onClick={() => !isLoading && handleSelectAccount(acc)}
                title={`Bấm để gửi mã xác thực OTP đăng nhập vào hòm thư ${acc.email}`}
              >
                <div className="google-one-tap-avatar-wrap">
                  <img
                    src={acc.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'}
                    alt={acc.name}
                    className="google-one-tap-avatar"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  {isLoading && <span className="google-one-tap-spinner" />}
                </div>

                <div className="google-one-tap-info">
                  <div className="google-one-tap-name">{acc.name}</div>
                  <div className="google-one-tap-email">{acc.email}</div>
                </div>

                <div className="google-one-tap-arrow">
                  {isLoading ? '⏳' : '›'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tùy chọn sử dụng tài khoản khác */}
        <div className="google-one-tap-other">
          <button
            type="button"
            className="google-one-tap-other-btn"
            onClick={handleUseOtherAccount}
          >
            <span className="google-one-tap-other-icon">👤+</span>
            <span>Sử dụng một tài khoản Gmail khác</span>
          </button>
        </div>

        {/* Dòng thông báo bảo mật */}
        <div className="google-one-tap-footer">
          <span>
            🔒 Mã xác nhận bảo mật OTP 6 số sẽ được gửi tới hòm thư Gmail của bạn để xác thực an toàn.
          </span>
        </div>
      </div>
    </div>
  );
};
