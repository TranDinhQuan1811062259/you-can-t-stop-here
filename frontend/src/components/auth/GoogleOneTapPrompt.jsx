import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playClickSound } from '../../utils/soundEffects';

const GOOGLE_ACCOUNTS = [
  {
    name: 'Đơn Thân Mẹ',
    email: 'anthonyq012025@gmail.com',
    avatar: '/images/google_avatar.jpg',
    jobTitle: 'System Admin & Lead Dev',
    role: 'admin',
    bio: 'Tài khoản Google Đơn Thân Mẹ đồng bộ từ Chrome. #Google #JanMammy',
  },
  {
    name: 'Ảnh 2 Hình',
    email: 'hinhanh2081200@gmail.com',
    avatar: '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg',
    jobTitle: 'Dance & Art Creator',
    role: 'member',
    bio: 'Tài khoản Google Ảnh 2 Hình kết nối nhanh từ trình duyệt.',
  },
  {
    name: 'Ảnh 6 Hình',
    email: 'hinhanh6hinh@gmail.com',
    avatar: '/uploads/1793877428223-888947577_122129675793464276_5782383970566541736_n.jpg',
    jobTitle: 'Nhiếp ảnh & Content Creator',
    role: 'member',
    bio: 'Tài khoản Google Ảnh 6 Hình kết nối nhanh từ trình duyệt.',
  },
];

export const GoogleOneTapPrompt = () => {
  const { isAuthenticated, socialLogin, openLoginModal } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  // Tự động gợi ý Google One Tap sau khi người dùng bấm vào trang (khoảng 800ms) nếu chưa đăng nhập
  useEffect(() => {
    if (isAuthenticated) {
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
  }, [isAuthenticated]);

  // Hỗ trợ sự kiện mở One Tap từ bên ngoài (khi bấm nút Google ở bất kỳ đâu)
  useEffect(() => {
    const handleOpen = () => {
      setIsVisible(true);
    };
    window.addEventListener('open_google_onetap', handleOpen);
    return () => window.removeEventListener('open_google_onetap', handleOpen);
  }, []);

  if (!isVisible || isAuthenticated) return null;

  const handleDismiss = () => {
    playClickSound();
    setIsVisible(false);
    try {
      sessionStorage.setItem('google_onetap_dismissed', 'true');
    } catch (e) {}
  };

  const handleSelectAccount = async (account) => {
    playClickSound();
    setLoadingEmail(account.email);
    setToastMsg(`Đang đăng nhập bằng ${account.name}...`);

    try {
      await socialLogin({
        provider: 'google',
        providerId: `google_${account.email}`,
        name: account.name,
        email: account.email,
        avatar: account.avatar,
        jobTitle: account.jobTitle,
        bio: account.bio,
        socialUrl: 'https://google.com',
      });

      setToastMsg(`✓ Đã đăng nhập thành công với tài khoản ${account.name}!`);

      // Bắn chuông thông báo bảo mật Google
      window.dispatchEvent(
        new CustomEvent('freedom_security_bell_alert', {
          detail: {
            platform: 'google',
            platformName: 'Google Security',
            brandColor: '#4285F4',
            userName: account.name,
            accountIdentifier: account.email,
            code: 'SECURED',
            message: `[Google Security] Đăng nhập Google One Tap an toàn: ${account.name} (${account.email}).`,
            time: 'Vừa xong',
          },
        })
      );

      setTimeout(() => {
        setIsVisible(false);
      }, 450);
    } catch (err) {
      console.warn('Google One Tap Sign-in error:', err);
      setToastMsg('Không thể đăng nhập tự động. Vui lòng thử lại!');
      setLoadingEmail(null);
    }
  };

  const handleUseOtherAccount = () => {
    playClickSound();
    setIsVisible(false);
    openLoginModal();
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
              Sign in to <strong>cantstophere.com</strong> with google.com
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

        {/* Danh sách các tài khoản Google phát hiện trên trình duyệt */}
        <div className="google-one-tap-list">
          {GOOGLE_ACCOUNTS.map((acc) => {
            const isLoading = loadingEmail === acc.email;

            return (
              <div
                key={acc.email}
                className={`google-one-tap-item ${isLoading ? 'is-loading' : ''}`}
                onClick={() => !isLoading && handleSelectAccount(acc)}
                title={`Bấm để đăng nhập ngay với tài khoản ${acc.name}`}
              >
                <div className="google-one-tap-avatar-wrap">
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="google-one-tap-avatar"
                    onError={(e) => {
                      e.target.src = '/images/google_avatar.jpg';
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
            <span>Sử dụng một tài khoản khác</span>
          </button>
        </div>

        {/* Dòng điều khoản & quyền riêng tư của Google */}
        <div className="google-one-tap-footer">
          <span>
            Để tiếp tục, Google sẽ chia sẻ tên, địa chỉ email và ảnh hồ sơ của bạn với <strong>You Can't Stop Here</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};

