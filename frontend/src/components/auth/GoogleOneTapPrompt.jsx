import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Legacy Google One-Tap listener preserved for backwards compatibility.
 * Tuân thủ Quy tắc Bảo mật: không lưu trữ danh sách tài khoản trong localStorage
 * và không đề xuất email hardcoded ở phía Frontend.
 */
export const GoogleOneTapPrompt = () => {
  const { openLoginModal } = useAuth();

  useEffect(() => {
    try {
      localStorage.removeItem('saved_google_accounts');
    } catch (_) {}
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      openLoginModal('login');
    };
    window.addEventListener('open_google_onetap', handleOpen);
    return () => window.removeEventListener('open_google_onetap', handleOpen);
  }, [openLoginModal]);

  return null;
};
