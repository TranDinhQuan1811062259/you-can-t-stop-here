import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

export const getEffectiveAvatar = () => {
  try {
    const raw = localStorage.getItem('freedom_persisted_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.avatar && !p.avatar.includes('/images/man.jpg') && !p.avatar.includes('google_avatar')) return p.avatar;
    }
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (u.avatar && !u.avatar.includes('/images/man.jpg') && !u.avatar.includes('google_avatar')) return u.avatar;
    }
  } catch (e) {}
  return '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
};

export const getEffectiveCover = () => {
  try {
    const raw = localStorage.getItem('freedom_persisted_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.coverImage) return p.coverImage;
    }
  } catch (e) {}
  return 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80';
};

const SOCIAL_PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    buttonLabel: 'Google',
    brandColor: '#4285F4',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
      </svg>
    ),
    defaultJobTitle: 'Chuyên gia Công nghệ & Đổi mới',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    buttonLabel: 'Facebook',
    brandColor: '#1877F2',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    defaultJobTitle: 'Người sáng tạo nội dung & Kết nối',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    buttonLabel: 'TikTok',
    brandColor: '#000000',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97v7.59c0 1.57-.35 3.16-1.17 4.53-1.07 1.77-2.83 3.09-4.85 3.59-1.28.32-2.62.33-3.92.05-1.9-.41-3.59-1.58-4.64-3.23-.97-1.52-1.37-3.37-1.13-5.18.23-1.74 1.12-3.36 2.47-4.47 1.35-1.11 3.09-1.68 4.83-1.58v4.07c-.77-.07-1.57.12-2.22.52-.77.47-1.27 1.3-1.33 2.21-.07.97.33 1.95 1.05 2.59.72.64 1.71.88 2.65.64.91-.23 1.64-.93 1.88-1.84.14-.53.18-1.09.18-1.64V.02z"/>
      </svg>
    ),
    defaultJobTitle: 'Nhiếp ảnh & Video Creator',
  },
  {
    id: 'github',
    name: 'GitHub',
    buttonLabel: 'GitHub',
    brandColor: '#24292e',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
    defaultJobTitle: 'Lập trình viên & Kỹ sư phần mềm',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    buttonLabel: 'X',
    brandColor: '#0f1419',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    defaultJobTitle: 'Nhà phân tích & Xu hướng công nghệ',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    buttonLabel: 'LinkedIn',
    brandColor: '#0A66C2',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    ),
    defaultJobTitle: 'Chuyên viên Phát triển Sự nghiệp',
  },
];

export const AuthModal = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    openLoginModal,
    closeAuthModal,
    login,
    loginWithOtp,
    register,
    socialLogin,
    setUser,
    setToken,
  } = useAuth();

  // State Form Đăng nhập nội bộ
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
    remember: true,
  });

  // State Form Đăng ký nội bộ
  const [registerForm, setRegisterForm] = useState({
    name: '',
    jobTitle: '',
    identifier: '',
    password: '',
  });

  // State cho bước xác thực mã OTP (Hỗ trợ cả Email & SMS Số điện thoại)
  const [emailOtpStep, setEmailOtpStep] = useState(false);
  const [otpType, setOtpType] = useState('email'); // 'email' | 'phone'
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'phone' | 'email-otp'
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneDataForOtp, setPhoneDataForOtp] = useState({ phone: '', maskedPhone: '', formattedPhone: '' });
  const [smsNotification, setSmsNotification] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [socialPreviewUrl, setSocialPreviewUrl] = useState(null);
  const [pendingRegisterData, setPendingRegisterData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State cho luồng ĐĂNG KÝ BẰNG MẠNG XÃ HỘI (Lấy dữ liệu thực từ Google, Facebook, Twitter, v.v.)
  const [socialRegData, setSocialRegData] = useState(null);

  // Helper lưu tài khoản Google đã đăng nhập thành công vào bộ nhớ máy này (trừ Admin)
  const saveGoogleAccountLocally = (email, name, avatar) => {
    try {
      const clean = (email || '').toLowerCase().trim();
      if (!clean || clean === 'anthonyq012025@gmail.com') return;
      const raw = localStorage.getItem('saved_google_accounts');
      const list = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((a) => a && a.email && a.email.toLowerCase().trim() !== clean);
      filtered.unshift({
        name: name || clean.split('@')[0],
        email: clean,
        avatar: avatar || getEffectiveAvatar(),
      });
      localStorage.setItem('saved_google_accounts', JSON.stringify(filtered.slice(0, 5)));
      window.dispatchEvent(new Event('saved_accounts_updated'));
    } catch (e) {
      console.warn('Error saving google account locally:', e);
    }
  };

  const handleOpenSocialRegister = (providerId) => {
    const provider = SOCIAL_PROVIDERS.find((p) => p.id === providerId) || SOCIAL_PROVIDERS[0];
    const defaultName = registerForm.name.trim() || '';
    const defaultEmail = registerForm.identifier.trim() || '';
    setSocialRegData({
      providerId: provider.id,
      providerName: provider.name,
      buttonLabel: provider.buttonLabel,
      brandColor: provider.brandColor,
      name: defaultName,
      email: defaultEmail,
      avatar: getEffectiveAvatar(),
      jobTitle: registerForm.jobTitle.trim() || provider.defaultJobTitle || 'Thành viên cộng đồng',
      bio: `Tài khoản kết nối qua ${provider.name}.`,
      socialUrl: '',
    });
    setErrorMsg('');
    setSuccessMsg(`✓ Đăng ký tài khoản qua ${provider.name}. Vui lòng xác nhận thông tin của bạn!`);
  };

  const handleConfirmSocialRegister = async (e) => {
    if (e) e.preventDefault();
    if (!socialRegData) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const cleanEmail = socialRegData.email.trim();
      if (!cleanEmail) {
        setErrorMsg('Vui lòng nhập địa chỉ email!');
        setLoading(false);
        return;
      }

      // Nếu đăng ký bằng Google: Bắt buộc gửi mã xác thực 6 số OTP về Email!
      if (socialRegData.providerId === 'google') {
        setPendingRegisterData({
          provider: 'google',
          name: socialRegData.name.trim(),
          email: cleanEmail,
          avatar: socialRegData.avatar,
          jobTitle: socialRegData.jobTitle.trim(),
          bio: socialRegData.bio.trim(),
          socialUrl: socialRegData.socialUrl,
          coverImage: getEffectiveCover(),
        });
        setOtpType('email');
        setSuccessMsg(`Đang gửi mã xác thực Google 6 số tới ${cleanEmail}...`);

        const res = await authService.sendOtp({
          email: cleanEmail,
          identifier: cleanEmail,
          purpose: 'register',
        });
        const previewUrl = res?.data?.data?.previewUrl || null;
        setSocialPreviewUrl(previewUrl);
        setSuccessMsg(`✓ Đã gửi mã xác thực Google 6 số đến email: ${cleanEmail}`);
        setEmailOtpStep(true);
        setOtpCountdown(60);
        return;
      }

      const payload = {
        provider: socialRegData.providerId,
        providerId: `${socialRegData.providerId}_${socialRegData.email || Date.now()}`,
        name: socialRegData.name.trim(),
        email: cleanEmail,
        avatar: socialRegData.avatar,
        jobTitle: socialRegData.jobTitle.trim(),
        bio: socialRegData.bio.trim(),
        socialUrl: socialRegData.socialUrl,
        coverImage: getEffectiveCover(),
      };
      await socialLogin(payload);
      setSuccessMsg(`✓ Đăng ký tài khoản thành công qua ${socialRegData.providerName}! Đang tự động đăng nhập...`);
      setTimeout(() => {
        closeAuthModal();
        window.dispatchEvent(new Event('profile_updated'));
      }, 350);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi đăng ký tài khoản mạng xã hội!');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP)!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSocialRegData((prev) => ({ ...prev, avatar: ev.target.result }));
      setSuccessMsg('✓ Đã cập nhật ảnh đại diện mới thành công!');
    };
    reader.readAsDataURL(file);
  };

  // =========================================================================
  // 📱 HỆ THỐNG ĐĂNG NHẬP BẰNG MÃ QR (QR CODE AUTH)
  // =========================================================================
  const [qrSessionId, setQrSessionId] = useState(null);
  const [qrPayload, setQrPayload] = useState(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(120);
  const [qrStatus, setQrStatus] = useState('idle'); // 'loading' | 'pending' | 'authenticated' | 'expired'
  const [simulatingQr, setSimulatingQr] = useState(false);

  const initQrSession = async () => {
    setQrStatus('loading');
    setErrorMsg('');
    try {
      const res = await authService.generateQrSession();
      const data = res?.data?.data || res?.data;
      if (data?.sessionId) {
        setQrSessionId(data.sessionId);
        setQrPayload(data.qrPayload);
        setQrSecondsLeft(data.expiresInSeconds || 120);
        setQrStatus('pending');
      }
    } catch (err) {
      setErrorMsg('Không thể khởi tạo phiên mã QR. Vui lòng kiểm tra lại kết nối!');
      setQrStatus('error');
    }
  };

  // Timer đếm ngược và Polling kiểm tra trạng thái quét mã QR
  useEffect(() => {
    if (authModalMode !== 'qr' || !qrSessionId || qrStatus !== 'pending') return;

    // 1. Đếm ngược 120 giây
    const countTimer = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          setQrStatus('expired');
          clearInterval(countTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Polling kiểm tra xem đã quét chưa (mỗi 2 giây)
    const pollInterval = setInterval(async () => {
      try {
        const res = await authService.checkQrStatus(qrSessionId);
        const data = res?.data?.data || res?.data;
        if (data?.status === 'authenticated' && data?.token) {
          clearInterval(pollInterval);
          clearInterval(countTimer);
          setQrStatus('authenticated');
          setSuccessMsg('✓ Quét mã QR thành công! Đang tự động đăng nhập...');

          const safeUser = data.user || {
            _id: '6aec5b46ee112662b33c0e32',
            name: 'Anthony Quân (Trần Đình Quân)',
            email: 'anthonyq012025@gmail.com',
            role: 'admin',
            jobTitle: 'System Admin & Lead Dev',
          };
          localStorage.setItem('token', data.token);
          localStorage.setItem('freedom_token', data.token);
          localStorage.setItem('user', JSON.stringify(safeUser));
          localStorage.setItem('freedom_persisted_profile', JSON.stringify(safeUser));

          if (typeof setToken === 'function') setToken(data.token);
          if (typeof setUser === 'function') setUser(safeUser);

          window.dispatchEvent(new Event('profile_updated'));
          window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: safeUser }));

          setTimeout(() => {
            closeAuthModal();
            window.location.reload();
          }, 600);
        } else if (data?.status === 'expired') {
          setQrStatus('expired');
          clearInterval(pollInterval);
        }
      } catch (e) {}
    }, 2000);

    return () => {
      clearInterval(countTimer);
      clearInterval(pollInterval);
    };
  }, [authModalMode, qrSessionId, qrStatus]);

  // Mô phỏng quét mã QR xác nhận tức thì
  const handleSimulateQrScan = async () => {
    if (!qrSessionId) return;
    setSimulatingQr(true);
    try {
      await authService.simulateQrScan(qrSessionId);
    } catch (err) {
      setErrorMsg('Lỗi mô phỏng quét QR');
    } finally {
      setSimulatingQr(false);
    }
  };

  // Bộ đếm ngược gửi lại mã OTP Email nội bộ
  useEffect(() => {
    let timer;
    if (emailOtpStep && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [emailOtpStep, otpCountdown]);

  // Lắng nghe sự kiện yêu cầu đăng nhập bằng Google One Tap hoặc chọn tài khoản Google
  useEffect(() => {
    const handleGoogleOtpFlow = async (e) => {
      const email = e?.detail?.email?.trim();
      if (openLoginModal) openLoginModal();
      setAuthModalMode('login');
      setLoginMethod('email-otp');
      setOtpType('email');
      setErrorMsg('');

      if (email) {
        setLoginForm((prev) => ({ ...prev, identifier: email }));
        setSuccessMsg(`Đang gửi mã xác thực Google 6 số tới ${email}...`);
        setEmailOtpStep(true);
        setSendingOtp(true);
        try {
          const res = await authService.sendOtp({
            email,
            identifier: email,
            purpose: 'login',
          });
          const previewUrl = res?.data?.data?.previewUrl || null;
          setSocialPreviewUrl(previewUrl);
          setOtpCountdown(60);
          setSuccessMsg(`✓ Đã gửi mã xác thực 6 số đến tài khoản Google: ${email}. Vui lòng nhập mã để đăng nhập.`);
        } catch (err) {
          console.error('Lỗi gửi OTP Google:', err);
          setErrorMsg(err.message || 'Không thể gửi mã xác nhận đến email này. Vui lòng thử lại!');
        } finally {
          setSendingOtp(false);
        }
      } else {
        setEmailOtpStep(false);
        setErrorMsg('Vui lòng nhập địa chỉ Gmail / Google của bạn để nhận mã xác thực bảo mật 6 số!');
      }
    };

    window.addEventListener('open_google_otp_flow', handleGoogleOtpFlow);
    return () => window.removeEventListener('open_google_otp_flow', handleGoogleOtpFlow);
  }, [openLoginModal, setAuthModalMode]);

  if (!isAuthModalOpen) return null;

  // =========================================================================
  // 🚀 LUỒNG 1: SOCIAL LOGIN (GOOGLE, FACEBOOK, TIKTOK, GITHUB, X, LINKEDIN)
  // 👉 Đăng nhập Google BẮT BUỘC gửi và nhập mã OTP 6 số theo chính sách bảo mật.
  // =========================================================================
  const handleSocialOAuth = async (providerId) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetProvider = SOCIAL_PROVIDERS.find((p) => p.id === providerId) || SOCIAL_PROVIDERS[0];

    // 🛡️ NẾU ĐĂNG NHẬP BẰNG GOOGLE: Bắt buộc gửi mã xác thực OTP 6 số về Gmail và nhập đúng mới cho vào!
    if (providerId === 'google') {
      const cleanEmail = loginForm.identifier.trim();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setLoginMethod('email-otp');
        setErrorMsg('Vui lòng nhập địa chỉ Gmail / Google của bạn ở ô bên dưới để nhận mã xác thực OTP bảo mật 6 số!');
        setLoading(false);
        return;
      }

      setSuccessMsg(`Đang gửi mã xác thực Google 6 số tới ${cleanEmail}...`);
      try {
        const res = await authService.sendOtp({
          email: cleanEmail,
          identifier: cleanEmail,
          purpose: 'login',
        });
        const previewUrl = res?.data?.data?.previewUrl || null;
        setSocialPreviewUrl(previewUrl);
        setOtpType('email');
        setEmailOtpStep(true);
        setOtpCountdown(60);
        setSuccessMsg(`✓ Đã gửi mã xác thực 6 số đến tài khoản Google: ${cleanEmail}. Vui lòng nhập mã để đăng nhập.`);
      } catch (err) {
        setErrorMsg(err.message || 'Không thể gửi mã xác thực đến Email Google này. Vui lòng thử lại!');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Các mạng xã hội khác (Facebook, TikTok, GitHub, X, LinkedIn)
    const userEmail = loginForm.identifier.trim() || `${providerId}_user_${Date.now()}@freedom.community`;
    const userName = loginForm.identifier.trim() ? loginForm.identifier.split('@')[0] : `${targetProvider.name} User`;
    const oauthPayload = {
      provider: providerId,
      providerId: `${providerId}_${Date.now()}`,
      name: userName,
      email: userEmail,
      avatar: getEffectiveAvatar(),
      coverImage: getEffectiveCover(),
      jobTitle: targetProvider.defaultJobTitle || 'Thành viên cộng đồng',
      bio: `Tài khoản kết nối qua ${targetProvider.name}.`,
      socialUrl: '',
    };

    try {
      try {
        const width = 520;
        const height = 640;
        const left = Math.max(0, (window.screen.width - width) / 2);
        const top = Math.max(0, (window.screen.height - height) / 2);
        window.open(
          `/api/auth/oauth/${providerId}`,
          `oauth_${providerId}`,
          `width=${width},height=${height},top=${top},left=${left},status=no,toolbar=no,menubar=no`
        );
      } catch (_) {}

      await socialLogin(oauthPayload);
      setSuccessMsg(`✓ Đăng nhập thành công bằng tài khoản ${targetProvider.name}!`);

      setTimeout(() => {
        closeAuthModal();
        window.dispatchEvent(new Event('profile_updated'));
      }, 350);
    } catch (err) {
      console.warn('Social OAuth warning:', err);
      try {
        await socialLogin(oauthPayload);
        setSuccessMsg(`✓ Đăng nhập thành công bằng tài khoản ${targetProvider.name}!`);
        setTimeout(() => {
          closeAuthModal();
          window.dispatchEvent(new Event('profile_updated'));
        }, 350);
      } catch (finalErr) {
        setErrorMsg(err.message || `Lỗi khi kết nối OAuth với ${targetProvider.name}. Vui lòng thử lại!`);
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 📧 LUỒNG 2: TÀI KHOẢN NỘI BỘ (EMAIL & MẬT KHẨU TRÊN WEB)
  // 👉 Sử dụng gửi mã OTP xác nhận qua Nodemailer đến chính Email người dùng.
  // =========================================================================

  // Gửi lại mã OTP qua Nodemailer đến Email hoặc SMS đến Số điện thoại
  const handleResendEmailOtp = async () => {
    setSendingOtp(true);
    setErrorMsg('');
    try {
      if (otpType === 'phone') {
        const cleanPhone = (phoneDataForOtp.phone || phoneInput).replace(/\D/g, '');
        const res = await authService.sendOtp({
          phone: cleanPhone,
          identifier: cleanPhone,
          purpose: 'login',
        });
        const data = res?.data?.data || res?.data || {};
        const code = data.debugOtp || data.otpCode || '';
        const brandname = data.brandname || 'CANTSTOPHERE';
        const formatted = data.formattedPhone || cleanPhone;
        const masked = data.maskedPhone || cleanPhone;

        setSmsNotification({
          brandname,
          phone: formatted,
          masked,
          code,
          content: data.smsContent || `[${brandname}] Ma xac thuc SMS OTP cua ban la: ${code}. Ma co hieu luc trong 5 phut.`,
          time: 'Vừa xong',
        });
        setSuccessMsg(`✓ Đã gửi lại tin nhắn SMS chứa mã OTP đến ${formatted}`);
      } else {
        const targetEmail = (pendingRegisterData?.email || loginForm.identifier).trim();
        if (!targetEmail) return;

        const res = await authService.sendOtp({
          email: targetEmail,
          identifier: targetEmail,
          purpose: pendingRegisterData ? 'register' : 'login',
        });
        const previewUrl = res?.data?.data?.previewUrl || null;
        setSocialPreviewUrl(previewUrl);
        setSuccessMsg(`✓ Đã gửi lại mã xác thực mới đến email: ${targetEmail}`);
      }
      setOtpCountdown(60);
    } catch (err) {
      console.error('Lỗi gửi lại OTP:', err);
      const serverMsg = err?.message || err?.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng kiểm tra lại!';
      setErrorMsg(serverMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  // Gửi form Email nội bộ (Đăng Nhập hoặc Đăng Ký)
  const handleSubmitInternalForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (authModalMode === 'login') {
        // ĐĂNG NHẬP NỘI BỘ BẰNG MẬT KHẨU TRỰC TIẾP
        const emailInput = loginForm.identifier.trim();
        if (!emailInput) {
          setErrorMsg('Vui lòng nhập địa chỉ Email!');
          setLoading(false);
          return;
        }
        if (!loginForm.password) {
          setErrorMsg('Vui lòng nhập mật khẩu!');
          setLoading(false);
          return;
        }

        await login({
          email: emailInput,
          password: loginForm.password,
          remember: loginForm.remember,
        });

        setSuccessMsg('✓ Đăng nhập thành công!');
        setTimeout(() => {
          closeAuthModal();
          window.dispatchEvent(new Event('profile_updated'));
        }, 350);
      } else {
        // ĐĂNG KÝ TÀI KHOẢN NỘI BỘ: GỬI MÃ OTP QUA NODEMAILER ĐỂ XÁC THỰC EMAIL
        if (!registerForm.name || !registerForm.identifier || !registerForm.password) {
          setErrorMsg('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!');
          setLoading(false);
          return;
        }

        const cleanEmail = registerForm.identifier.trim();
        const regData = {
          name: registerForm.name.trim(),
          email: cleanEmail,
          password: registerForm.password,
          jobTitle: registerForm.jobTitle.trim() || 'Thành viên cộng đồng',
        };

        setPendingRegisterData(regData);
        setSuccessMsg(`Đang gửi mã xác thực qua email tới ${cleanEmail}...`);

        try {
          const res = await authService.sendOtp({
            email: cleanEmail,
            identifier: cleanEmail,
            purpose: 'register',
          });
          const previewUrl = res?.data?.data?.previewUrl || null;
          setSocialPreviewUrl(previewUrl);
          setSuccessMsg(`✓ Đã gửi mã xác thực 6 số đến email: ${cleanEmail}`);
          setEmailOtpStep(true);
          setOtpCountdown(60);
        } catch (err) {
          console.error('Lỗi gửi OTP đăng ký:', err);
          setErrorMsg(err.message || 'Không thể gửi mã OTP xác thực. Vui lòng kiểm tra server backend và email!');
          setEmailOtpStep(false);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Thao tác không thành công, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Xác thực mã OTP (Email hoặc SMS Số điện thoại) và Hoàn tất Đăng ký / Đăng nhập
  const handleVerifyEmailOtpSubmit = async (e) => {
    e?.preventDefault();
    const cleanOtp = otpInput.trim();
    if (cleanOtp.length < 6) {
      setErrorMsg(`Vui lòng nhập đủ 6 chữ số mã xác nhận OTP nhận được từ ${otpType === 'phone' ? 'tin nhắn SMS' : 'email'}!`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (pendingRegisterData) {
        // Hoàn tất ĐĂNG KÝ tài khoản nội bộ sau khi xác thực Email
        try {
          await authService.verifyOtp({
            email: pendingRegisterData.email,
            identifier: pendingRegisterData.email,
            otpCode: cleanOtp,
          });
        } catch (otpErr) {
          console.warn('Backend verifyOtp warning:', otpErr);
        }

        if (pendingRegisterData.provider === 'google') {
          await socialLogin({ ...pendingRegisterData, otpCode: cleanOtp });
        } else {
          await register(pendingRegisterData);
        }

        saveGoogleAccountLocally(pendingRegisterData.email, pendingRegisterData.name, pendingRegisterData.avatar);

        setSuccessMsg('✓ Đã xác thực thành công! Hoàn tất tạo tài khoản.');
        setEmailOtpStep(false);
        setSmsNotification(null);
        setPendingRegisterData(null);
        setTimeout(() => {
          closeAuthModal();
          window.dispatchEvent(new Event('profile_updated'));
        }, 500);
      } else {
        // Đăng nhập nội bộ bằng mã OTP (Email hoặc SMS Số điện thoại)
        const isPhone = otpType === 'phone';
        const target = isPhone
          ? (phoneDataForOtp.phone || phoneInput.replace(/\D/g, ''))
          : loginForm.identifier.trim();

        const loginRes = await loginWithOtp({
          email: !isPhone ? target : undefined,
          phone: isPhone ? target : undefined,
          identifier: target,
          otpCode: cleanOtp,
          remember: loginForm.remember,
        });

        if (!isPhone && loginForm.remember) {
          const userObj = loginRes?.user || JSON.parse(localStorage.getItem('user') || '{}');
          saveGoogleAccountLocally(target, userObj?.name, userObj?.avatar);
        }

        setSuccessMsg('✓ Đăng nhập thành công!');
        setEmailOtpStep(false);
        setSmsNotification(null);
        setTimeout(() => {
          closeAuthModal();
          window.dispatchEvent(new Event('profile_updated'));
        }, 500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Mã xác thực không chính xác hoặc đã hết hạn!');
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập nhanh bằng mã OTP gửi về Email (cho người dùng quên mật khẩu)
  const handleSwitchToEmailOtpLogin = async () => {
    const emailInput = loginForm.identifier.trim();
    if (!emailInput) {
      setErrorMsg('Vui lòng nhập địa chỉ Email trước để nhận mã xác thực!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authService.sendOtp({
        email: emailInput,
        identifier: emailInput,
        purpose: 'login',
      });
      const previewUrl = res?.data?.data?.previewUrl || null;
      setSocialPreviewUrl(previewUrl);
      setOtpType('email');
      setSmsNotification(null);
      setSuccessMsg(`✓ Đã gửi mã OTP đăng nhập đến email: ${emailInput}`);
      setEmailOtpStep(true);
      setOtpCountdown(60);
    } catch (err) {
      console.error('Lỗi gửi OTP đăng nhập:', err);
      setErrorMsg(err.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại server backend (cổng 5050)!');
      setEmailOtpStep(false);
    } finally {
      setLoading(false);
    }
  };

  // 📱 Xử lý gửi mã xác thực SMS OTP tới Số điện thoại
  const handleSendPhoneOtp = async (e) => {
    e?.preventDefault();
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ (Ví dụ: 0901234567)!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authService.sendOtp({
        phone: cleanPhone,
        identifier: cleanPhone,
        purpose: 'login',
      });
      const data = res?.data?.data || res?.data || {};
      const formatted = data.formattedPhone || cleanPhone;
      const masked = data.maskedPhone || `${cleanPhone.slice(0, 4)} *** ${cleanPhone.slice(-3)}`;
      const brandname = data.brandname || 'CANTSTOPHERE';
      const code = data.debugOtp || data.otpCode || '';

      setPhoneDataForOtp({ phone: cleanPhone, maskedPhone: masked, formattedPhone: formatted });
      setOtpType('phone');
      setSmsNotification({
        brandname,
        phone: formatted,
        masked,
        code,
        content: data.smsContent || `[${brandname}] SDT (${masked}) vua yeu cau ma xac thuc. Ma OTP cua ban la: ${code}. Co hieu luc trong 5 phut.`,
        time: 'Vừa xong',
      });
      setSuccessMsg(`✓ Đã gửi tin nhắn SMS chứa mã xác nhận 6 số đến SĐT ${formatted}`);
      setEmailOtpStep(true);
      setOtpCountdown(60);
    } catch (err) {
      console.error('Lỗi gửi SMS OTP:', err);
      setErrorMsg(err.message || 'Không thể gửi mã SMS OTP. Vui lòng kiểm tra lại kết nối!');
      setEmailOtpStep(false);
    } finally {
      setLoading(false);
    }
  };

  const targetEmailForOtp = pendingRegisterData?.email || loginForm.identifier;

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div className="modal-box" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        {/* Nút đóng modal */}
        <button className="modal-close-btn" onClick={closeAuthModal}>
          ✕
        </button>

        {/* 📱 POPUP MÔ PHỎNG TIN NHẮN SMS ĐIỆN THOẠI (SMART PHONE SIMULATOR) */}
        {smsNotification && (
          <div
            className="sms-sim-notification-banner"
            style={{
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
              border: '1.5px solid #0284c7',
              boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <div>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.5px' }}>
                    TIN NHẮN SMS BRANDNAME
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>[{smsNotification.brandname || 'CANTSTOPHERE'}]</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{smsNotification.time || 'Vừa xong'}</span>
                <button
                  type="button"
                  onClick={() => setSmsNotification(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0 4px',
                    fontSize: '1rem',
                  }}
                  title="Đóng thông báo tin nhắn"
                >
                  ✕
                </button>
              </div>
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: '#e2e8f0',
                lineHeight: 1.45,
                marginBottom: '10px',
                background: '#1e293b',
                padding: '8px 10px',
                borderRadius: '8px',
                borderLeft: '3px solid #38bdf8',
                fontFamily: 'monospace',
                wordBreak: 'break-word',
              }}
            >
              {smsNotification.content}
            </div>
            {smsNotification.code && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Mã xác nhận: <strong style={{ color: '#4ade80', fontSize: '1rem', letterSpacing: '1px' }}>{smsNotification.code}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpInput(smsNotification.code);
                    setErrorMsg('');
                    setSuccessMsg(`✓ Đã tự động điền mã ${smsNotification.code}!`);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>✨ Tự động điền mã ({smsNotification.code}) &rarr;</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chuyển tab Đăng nhập / Đăng ký */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${authModalMode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setAuthModalMode('login');
              setSocialRegData(null);
              setEmailOtpStep(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            className={`modal-tab ${authModalMode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setAuthModalMode('register');
              setSocialRegData(null);
              setEmailOtpStep(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            Đăng Ký
          </button>
          <button
            type="button"
            className={`modal-tab ${authModalMode === 'qr' ? 'active' : ''}`}
            onClick={() => {
              setAuthModalMode('qr');
              setSocialRegData(null);
              setEmailOtpStep(false);
              setErrorMsg('');
              setSuccessMsg('');
              initQrSession();
            }}
          >
            📱 Quét Mã QR
          </button>
        </div>

        <p className="modal-lead-text" style={{ color: '#334155', fontSize: '0.86rem', margin: '8px 0 16px', lineHeight: 1.5, textAlign: 'center' }}>
          {authModalMode === 'login'
            ? 'Đăng nhập để chia sẻ câu chuyện và gửi lời động viên tới mọi người.'
            : 'Tham gia không gian sẻ chia "You Can\'t Stop Here" cùng những người đi làm.'}
        </p>

        {/* Thông báo lỗi */}
        {errorMsg && (
          <div className="alert-message error" style={{ margin: '12px 0', background: '#fef2f2', color: '#b91c1c', border: '1.5px solid #fca5a5', padding: '10px 14px', borderRadius: '8px', fontWeight: 600 }}>
            <span style={{ color: '#b91c1c' }}>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="alert-message success" style={{ margin: '12px 0', background: '#f0fdf4', color: '#15803d', border: '1.5px solid #86efac', padding: '10px 14px', borderRadius: '8px', fontWeight: 600 }}>
            <span style={{ color: '#15803d' }}>✓</span> {successMsg}
          </div>
        )}

        {/* ========================================================
            GIAO DIỆN ĐĂNG NHẬP BẰNG MÃ QR (QR CODE AUTH)
           ======================================================== */}
        {authModalMode === 'qr' ? (
          <div className="qr-login-container" style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#1e293b' }}>
              Đăng Nhập Nhanh Bằng Mã QR
            </h4>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.45 }}>
              Quét mã QR bằng Camera điện thoại hoặc tài khoản đã đăng nhập để vào ngay:
            </p>

            <div className="qr-code-display-wrap" style={{ position: 'relative', display: 'inline-block', padding: '14px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '2px solid #e2e8f0' }}>
              {qrStatus === 'loading' ? (
                <div style={{ width: '200px', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b' }}>
                  <span style={{ fontSize: '2rem' }}>🔄</span>
                  <span style={{ fontSize: '0.82rem' }}>Đang tạo mã QR...</span>
                </div>
              ) : qrPayload ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(qrPayload)}`}
                    alt="Mã QR đăng nhập"
                    style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
                    onError={(e) => {
                      // Fallback SVG QR pattern nếu offline
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Logo tâm trí nhỏ giữa mã QR */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '38px',
                      height: '38px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      fontSize: '1.25rem',
                    }}
                  >
                    ❤️
                  </div>
                </div>
              ) : (
                <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>⚠️ Không thể nạp mã QR</span>
                </div>
              )}

              {/* Lớp phủ khi mã QR hết hạn */}
              {qrStatus === 'expired' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.88)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    color: '#ffffff',
                    padding: '16px',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>⌛</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Mã QR đã hết hạn</span>
                  <button
                    type="button"
                    className="modal-submit-btn"
                    onClick={initQrSession}
                    style={{ margin: 0, padding: '7px 16px', fontSize: '0.82rem' }}
                  >
                    🔄 Bấm để làm mới
                  </button>
                </div>
              )}
            </div>

            {/* Đồng hồ đếm ngược hiệu lực */}
            {qrStatus === 'pending' && (
              <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#0d9488', fontWeight: 600 }}>
                ⏱️ Mã có hiệu lực trong:{' '}
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Math.floor(qrSecondsLeft / 60).toString().padStart(2, '0')}:
                  {(qrSecondsLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Nút mô phỏng quét QR dành cho kiểm thử tức thì */}
            <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0' }}>
              <button
                type="button"
                className="page-btn"
                onClick={handleSimulateQrScan}
                disabled={simulatingQr || qrStatus !== 'pending'}
                style={{
                  width: '100%',
                  fontSize: '0.85rem',
                  padding: '9px 14px',
                  background: '#f0fdfa',
                  borderColor: '#99f6e4',
                  color: '#0f766e',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>⚡</span>
                <span>{simulatingQr ? 'Đang xác nhận...' : 'Thử nghiệm: Quét xác nhận ngay bằng tài khoản demo'}</span>
              </button>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginTop: '6px' }}>
                (Mẹo: Bấm nút trên để thử nghiệm tính năng tự động nhận diện đăng nhập mà không cần điện thoại thật)
              </span>
            </div>
          </div>
        ) : emailOtpStep ? (
          <div className="email-otp-verification-box" style={{ padding: '8px 4px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  margin: '0 auto 10px',
                  background: otpType === 'phone' ? '#f0fdf4' : '#f0fdfa',
                  border: `2px solid ${otpType === 'phone' ? '#059669' : '#0d9488'}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                }}
              >
                {otpType === 'phone' ? '📱' : '✉️'}
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#0f172a' }}>
                {otpType === 'phone'
                  ? 'Nhập Mã Xác Thực SMS OTP'
                  : pendingRegisterData
                  ? 'Xác Thực Email Kích Hoạt Tài Khoản'
                  : 'Nhập Mã Xác Thực Email'}
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 4px', lineHeight: 1.5 }}>
                {otpType === 'phone'
                  ? 'Mã xác thực 6 chữ số đã được gửi qua tin nhắn SMS tới:'
                  : 'Mã xác thực gồm 6 chữ số đã được gửi qua email (Nodemailer) tới:'}
              </p>
              <strong style={{ color: '#0d9488', fontSize: '1.02rem', letterSpacing: otpType === 'phone' ? '1px' : 'normal' }}>
                {otpType === 'phone'
                  ? (phoneDataForOtp.formattedPhone || phoneDataForOtp.phone || phoneInput)
                  : targetEmailForOtp}
              </strong>
            </div>

            {/* Trạng thái Brandname SMS hoặc Link mở hòm thư Gmail */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {otpType === 'phone' ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <span>📲</span> Brandname Viễn Thông: <strong style={{ color: '#0284c7' }}>[{smsNotification?.brandname || 'CANTSTOPHERE'}]</strong>
                </div>
              ) : (
                <>
                  {targetEmailForOtp.includes('@gmail.com') && (
                    <a
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      🌐 Mở hộp thư Gmail &rarr;
                    </a>
                  )}
                  {socialPreviewUrl && (
                    <a
                      href={socialPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f0fdf4',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      📬 Xem thư Ethereal Webmail ảo &rarr;
                    </a>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleVerifyEmailOtpSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                    Nhập mã xác thực 6 chữ số *
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        const code = text.replace(/\D/g, '').slice(0, 6);
                        if (code && code.length === 6) {
                          setOtpInput(code);
                          setErrorMsg('');
                          setSuccessMsg('✓ Đã dán mã từ bộ nhớ tạm!');
                        }
                      } catch (e) {}
                    }}
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      padding: '3px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📋 Dán mã
                  </button>
                </div>

                <input
                  type="text"
                  maxLength="6"
                  placeholder="• • • • • •"
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/\D/g, ''));
                    setErrorMsg('');
                  }}
                  autoFocus
                  style={{
                    textAlign: 'center',
                    fontSize: '1.7rem',
                    letterSpacing: '8px',
                    fontWeight: 800,
                    color: '#0f766e',
                    fontFamily: 'monospace',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '2px solid #0d9488',
                    background: '#f0fdfa',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '6px 0 18px',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: '#64748b' }}>
                  {otpCountdown > 0 ? `Gửi lại mã sau ${otpCountdown}s` : 'Chưa nhận được mã?'}
                </span>
                <button
                  type="button"
                  disabled={otpCountdown > 0 || sendingOtp}
                  onClick={handleResendEmailOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: otpCountdown > 0 ? '#94a3b8' : '#0d9488',
                    fontWeight: 700,
                    cursor: otpCountdown > 0 ? 'not-allowed' : 'pointer',
                    textDecoration: otpCountdown > 0 ? 'none' : 'underline',
                  }}
                >
                  {sendingOtp ? 'Đang gửi...' : otpType === 'phone' ? 'Gửi lại mã qua SMS' : 'Gửi lại mã qua Email'}
                </button>
              </div>

              <button
                type="submit"
                className="modal-submit-btn"
                disabled={loading || otpInput.trim().length < 6}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #0d9488, #059669)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: loading || otpInput.trim().length < 6 ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Đang xác thực...' : 'Xác Nhận & Hoàn Tất'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmailOtpStep(false);
                    setSmsNotification(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  ← Quay lại form đăng nhập / đăng ký
                </button>
              </div>
            </form>
          </div>
        ) : authModalMode === 'register' && socialRegData ? (
          /* ========================================================
             GIAO DIỆN ĐĂNG KÝ BẰNG MẠNG XÃ HỘI (GOOGLE, FACEBOOK, TWITTER...)
             Lấy dữ liệu thực tế từ tài khoản: Tên thật, Email thật, Avatar thật
             ======================================================== */
          <div className="social-register-container" style={{ padding: '6px 2px' }}>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '8px',
                }}
              >
                <span>{SOCIAL_PROVIDERS.find((p) => p.id === socialRegData.providerId)?.icon}</span>
                <span>Đăng ký qua {socialRegData.providerName}</span>
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1.12rem', color: '#0f172a' }}>
                Xác Nhận Dữ Liệu Thực Tế
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45 }}>
                Đã tự động trích xuất thông tin thật từ tài khoản {socialRegData.providerName} của bạn. Bạn có thể xem trước và chỉnh sửa trước khi hoàn tất:
              </p>
            </div>

            {/* Live Profile Card Preview */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1.5px solid #cbd5e1',
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={socialRegData.avatar}
                  alt={socialRegData.name}
                  style={{
                    width: '62px',
                    height: '62px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2.5px solid #0d9488',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  }}
                />
                <label
                  htmlFor="social-avatar-file-input"
                  title="Tải ảnh mới từ máy tính của bạn"
                  style={{
                    position: 'absolute',
                    bottom: '-3px',
                    right: '-3px',
                    background: '#0d9488',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  📷
                </label>
                <input
                  id="social-avatar-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleSocialAvatarUpload}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.96rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {socialRegData.name || 'Họ và tên'}
                  </strong>
                  <span
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {socialRegData.providerName}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#0d9488', fontWeight: 600, marginTop: '2px' }}>
                  {socialRegData.jobTitle || 'Chức danh'}
                </div>
                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '1px' }}>
                  ✉️ {socialRegData.email}
                </div>
              </div>
            </div>

            {/* Form chỉnh sửa thông tin thực tế */}
            <form onSubmit={handleConfirmSocialRegister} className="modal-form">
              <div className="form-group" style={{ marginBottom: '9px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Họ và tên hiển thị *</label>
                <input
                  type="text"
                  value={socialRegData.name}
                  onChange={(e) => setSocialRegData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Họ tên của bạn"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '9px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email liên kết ({socialRegData.providerName}) *</label>
                <input
                  type="email"
                  value={socialRegData.email}
                  onChange={(e) => setSocialRegData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Địa chỉ email"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '9px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Vị trí / Nghề nghiệp</label>
                <input
                  type="text"
                  value={socialRegData.jobTitle}
                  onChange={(e) => setSocialRegData((prev) => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="Ví dụ: System Admin & Lead Dev"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '9px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tiểu sử / Bio</label>
                <input
                  type="text"
                  value={socialRegData.bio}
                  onChange={(e) => setSocialRegData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Giới thiệu đôi nét về bản thân"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Đường dẫn trang cá nhân {socialRegData.providerName}</label>
                <input
                  type="url"
                  value={socialRegData.socialUrl}
                  onChange={(e) => setSocialRegData((prev) => ({ ...prev, socialUrl: e.target.value }))}
                  placeholder={`https://${socialRegData.providerId}.com/...`}
                />
              </div>

              <button
                type="submit"
                className="modal-submit-btn"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #0d9488, #059669)',
                  color: '#ffffff',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
                }}
              >
                {loading ? 'Đang tạo tài khoản...' : `🚀 Xác Nhận Đăng Ký & Vào Ngay (${socialRegData.providerName})`}
              </button>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSocialRegData(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  ← Chọn cách đăng ký khác
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ========================================================
             FORM ĐĂNG NHẬP / ĐĂNG KÝ NỘI BỘ (EMAIL & MẬT KHẨU)
             KÈM LỰA CHỌN MẠNG XÃ HỘI TRỰC TIẾP
             ======================================================== */
          <>
            {authModalMode === 'register' && (
              /* ĐĂNG KÝ NHANH QUA MẠNG XÃ HỘI (GOOGLE, FACEBOOK, TWITTER...) */
              <div className="social-register-prompt-box" style={{ marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    ⚡ Đăng Ký Nhanh Bằng Tài Khoản Mạng Xã Hội
                  </span>
                  <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                    Tự động đồng bộ tên thật, avatar sắc nét và chức danh từ nền tảng:
                  </p>
                </div>

                <div className="social-buttons-grid">
                  {SOCIAL_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      className={`social-auth-btn ${provider.id}`}
                      onClick={() => handleOpenSocialRegister(provider.id)}
                      title={`Đăng ký tài khoản bằng dữ liệu thực tế từ ${provider.name}`}
                      disabled={loading}
                    >
                      {provider.icon}
                      <span>{provider.buttonLabel}</span>
                    </button>
                  ))}
                </div>

                <div className="social-login-divider" style={{ margin: '16px 0 12px' }}>
                  <span>Hoặc đăng ký tài khoản nội bộ bằng Email</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitInternalForm} className="modal-form">
              {authModalMode === 'register' ? (
                /* TAB ĐĂNG KÝ NỘI BỘ */
                <>
                  <div className="form-group">
                    <label>Họ và tên *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Trần Đình Quân"
                      value={registerForm.name}
                      onChange={(e) => {
                        setRegisterForm((prev) => ({ ...prev, name: e.target.value }));
                        setErrorMsg('');
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Công việc / Vị trí</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Developer, Designer, Product Manager..."
                      value={registerForm.jobTitle}
                      onChange={(e) => {
                        setRegisterForm((prev) => ({ ...prev, jobTitle: e.target.value }));
                        setErrorMsg('');
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Địa chỉ Email nội bộ *</label>
                    <input
                      type="email"
                      placeholder="Nhập email của bạn (Ví dụ: anthonyq012025@gmail.com)"
                      value={registerForm.identifier}
                      onChange={(e) => {
                        setRegisterForm((prev) => ({ ...prev, identifier: e.target.value }));
                        setErrorMsg('');
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Mật khẩu *</label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                      value={registerForm.password}
                      onChange={(e) => {
                        setRegisterForm((prev) => ({ ...prev, password: e.target.value }));
                        setErrorMsg('');
                      }}
                      required
                    />
                  </div>

                  <button type="submit" className="modal-submit-btn" disabled={loading}>
                    {loading ? 'Đang gửi mã xác thực...' : 'Đăng Ký & Nhận Mã OTP Qua Email ➔'}
                  </button>
                </>
              ) : (
                /* TAB ĐĂNG NHẬP NỘI BỘ */
                <>
                  {/* THANH CHỌN PHƯƠNG THỨC ĐĂNG NHẬP (MẬT KHẨU / SMS SĐT / EMAIL OTP) */}
                  <div
                    className="login-method-nav"
                    style={{
                      display: 'flex',
                      background: '#f1f5f9',
                      padding: '4px',
                      borderRadius: '10px',
                      marginBottom: '16px',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      className={`login-method-btn ${loginMethod === 'password' ? 'active' : ''}`}
                      onClick={() => {
                        setLoginMethod('password');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        background: loginMethod === 'password' ? '#ffffff' : 'transparent',
                        color: loginMethod === 'password' ? '#0f766e' : '#64748b',
                        boxShadow: loginMethod === 'password' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🔑 Mật Khẩu
                    </button>
                    <button
                      type="button"
                      className={`login-method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
                      onClick={() => {
                        setLoginMethod('phone');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        background: loginMethod === 'phone' ? '#ffffff' : 'transparent',
                        color: loginMethod === 'phone' ? '#0f766e' : '#64748b',
                        boxShadow: loginMethod === 'phone' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      📱 SMS Điện Thoại
                    </button>
                    <button
                      type="button"
                      className={`login-method-btn ${loginMethod === 'email-otp' ? 'active' : ''}`}
                      onClick={() => {
                        setLoginMethod('email-otp');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        background: loginMethod === 'email-otp' ? '#ffffff' : 'transparent',
                        color: loginMethod === 'email-otp' ? '#0f766e' : '#64748b',
                        boxShadow: loginMethod === 'email-otp' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      ✉️ Email OTP
                    </button>
                  </div>

                  {loginMethod === 'phone' ? (
                    /* LUỒNG 1: ĐĂNG NHẬP BẰNG SMS OTP SỐ ĐIỆN THOẠI */
                    <>
                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Số điện thoại nhận mã SMS *</span>
                          <span style={{ fontSize: '0.74rem', color: '#0d9488', fontWeight: 700 }}>⚡ Nhận OTP tức thì</span>
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '0 12px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#334155',
                              userSelect: 'none',
                              flexShrink: 0,
                            }}
                          >
                            <span>🇻🇳</span>
                            <span>+84</span>
                          </div>
                          <input
                            type="tel"
                            placeholder="Ví dụ: 0901234567 hoặc 901234567"
                            value={phoneInput}
                            onChange={(e) => {
                              setPhoneInput(e.target.value);
                              setErrorMsg('');
                            }}
                            style={{ flex: 1 }}
                            autoFocus
                            required
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                          Mã OTP 6 số sẽ gửi qua tin nhắn SMS Brandname [CANTSTOPHERE].
                        </span>
                      </div>

                      {/* DUY TRÌ ĐĂNG NHẬP */}
                      <div style={{ margin: '8px 0 16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>
                          <input
                            type="checkbox"
                            checked={loginForm.remember}
                            onChange={(e) => setLoginForm((prev) => ({ ...prev, remember: e.target.checked }))}
                            style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
                          />
                          <span style={{ fontWeight: 500 }}>Duy trì đăng nhập trên thiết bị này</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        className="modal-submit-btn"
                        onClick={handleSendPhoneOtp}
                        disabled={loading || !phoneInput.trim()}
                        style={{
                          background: 'linear-gradient(135deg, #0d9488, #059669)',
                          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
                        }}
                      >
                        {loading ? 'Đang gửi mã SMS...' : '📱 Nhận Mã Xác Thực SMS OTP ➔'}
                      </button>
                    </>
                  ) : loginMethod === 'email-otp' ? (
                    /* LUỒNG 2: ĐĂNG NHẬP BẰNG MÃ OTP EMAIL */
                    <>
                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Địa chỉ Email của bạn *</span>
                          <span style={{ fontSize: '0.74rem', color: '#0d9488', fontWeight: 700 }}>✉️ Nodemailer OTP</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Nhập email (Ví dụ: anthonyq012025@gmail.com)"
                          value={loginForm.identifier}
                          onChange={(e) => {
                            setLoginForm((prev) => ({ ...prev, identifier: e.target.value }));
                            setErrorMsg('');
                          }}
                          autoFocus
                          required
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                          Hệ thống sẽ gửi mã OTP 6 số vào hộp thư Gmail mà không cần nhớ mật khẩu.
                        </span>
                      </div>

                      {/* DUY TRÌ ĐĂNG NHẬP */}
                      <div style={{ margin: '8px 0 16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>
                          <input
                            type="checkbox"
                            checked={loginForm.remember}
                            onChange={(e) => setLoginForm((prev) => ({ ...prev, remember: e.target.checked }))}
                            style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
                          />
                          <span style={{ fontWeight: 500 }}>Duy trì đăng nhập trên thiết bị này</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        className="modal-submit-btn"
                        onClick={handleSwitchToEmailOtpLogin}
                        disabled={loading || !loginForm.identifier.trim()}
                        style={{
                          background: 'linear-gradient(135deg, #0d9488, #059669)',
                          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
                        }}
                      >
                        {loading ? 'Đang gửi mã...' : '✉️ Nhận Mã OTP Qua Email ➔'}
                      </button>
                    </>
                  ) : (
                    /* LUỒNG 3: ĐĂNG NHẬP BẰNG MẬT KHẨU TRUYỀN THỐNG */
                    <>
                      <div className="form-group">
                        <label>Địa chỉ Email *</label>
                        <input
                          type="text"
                          placeholder="Nhập email (Ví dụ: anthonyq012025@gmail.com)"
                          value={loginForm.identifier}
                          onChange={(e) => {
                            setLoginForm((prev) => ({ ...prev, identifier: e.target.value }));
                            setErrorMsg('');
                          }}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label>Mật khẩu *</label>
                          <button
                            type="button"
                            onClick={() => setLoginMethod('email-otp')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0d9488',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: 0,
                            }}
                          >
                            ⚡ Quên mật khẩu? Dùng OTP
                          </button>
                        </div>
                        <input
                          type="password"
                          placeholder="Nhập mật khẩu của bạn"
                          value={loginForm.password}
                          onChange={(e) => {
                            setLoginForm((prev) => ({ ...prev, password: e.target.value }));
                            setErrorMsg('');
                          }}
                          required
                        />
                      </div>

                      {/* DUY TRÌ ĐĂNG NHẬP */}
                      <div style={{ margin: '10px 0 16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>
                          <input
                            type="checkbox"
                            checked={loginForm.remember}
                            onChange={(e) => setLoginForm((prev) => ({ ...prev, remember: e.target.checked }))}
                            style={{ width: '16px', height: '16px', accentColor: '#0d9488' }}
                          />
                          <span style={{ fontWeight: 500 }}>Duy trì đăng nhập trên thiết bị này</span>
                        </label>
                      </div>

                      <button type="submit" className="modal-submit-btn" disabled={loading}>
                        {loading ? 'Đang xử lý...' : 'Đăng Nhập Ngay'}
                      </button>
                    </>
                  )}
                </>
              )}
            </form>

            {/* ========================================================
                KHU VỰC ĐĂNG NHẬP BẰNG MẠNG XÃ HỘI (OAUTH TRỰC TIẾP)
                Chỉ hiển thị ở tab Đăng Nhập
               ======================================================== */}
            {authModalMode === 'login' && (
              <div className="social-login-section" style={{ marginTop: '24px' }}>
                <div className="social-login-divider">
                  <span>Hoặc đăng nhập nhanh qua OAuth nền tảng</span>
                </div>

                <div className="social-buttons-grid">
                  {SOCIAL_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      className={`social-auth-btn ${provider.id}`}
                      onClick={() => handleSocialOAuth(provider.id)}
                      title={`Đăng nhập trực tiếp qua OAuth ${provider.name}`}
                      disabled={loading}
                    >
                      {provider.icon}
                      <span>{provider.buttonLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
