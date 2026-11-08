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

// Đăng ký PWA Service Worker (Cho Smartphone, Tablet, PC, Mac)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Kiểm tra cập nhật ngầm định kỳ
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
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

