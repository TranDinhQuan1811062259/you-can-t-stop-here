import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initTheme } from './utils/themeUtils';
import { getActiveSeason } from './utils/seasonUtils';
import { initGlobalKeyboardAsmr } from './utils/keyboardSoundEngine';

// Khởi tạo chế độ Ngày / Đêm & Favicon sắc nét theo thời tiết & ASMR Phím cơ
initTheme();
getActiveSeason();
initGlobalKeyboardAsmr();

// Quản lý PWA Service Worker: Chỉ bật ở Production; ở môi trường Dev tự động hủy đăng ký và xóa cache
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('⚡ Đã có phiên bản mới của Freedom App!');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('Lỗi đăng ký PWA Service Worker:', err);
        });
    });
  } else {
    // Môi trường Dev (Vite): Hủy đăng ký Service Worker & dọn sạch CacheStorage để đảm bảo HMR và code mới luôn cập nhật tức thì
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      }).catch(() => {});
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

