import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initTheme } from './utils/themeUtils';
import { getActiveSeason } from './utils/seasonUtils';

// Khởi tạo chế độ Ngày / Đêm & Favicon sắc nét theo thời tiết
initTheme();
getActiveSeason();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

