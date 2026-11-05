import React, { useState, useEffect } from 'react';
import { playClickSound } from '../../utils/soundEffects';

export const FloatingSmsAlert = () => {
  const [smsData, setSmsData] = useState(null);

  useEffect(() => {
    const handleSms = (e) => {
      const data = e.detail;
      if (data) {
        setSmsData(data);
        playClickSound();

        // Tự động ẩn sau 7 giây
        const timer = setTimeout(() => {
          setSmsData(null);
        }, 7000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('freedom_sms_alert_received', handleSms);
    return () => window.removeEventListener('freedom_sms_alert_received', handleSms);
  }, []);

  if (!smsData) return null;

  return (
    <div className="floating-sms-alert-wrapper" role="status" aria-live="polite">
      <div className="floating-sms-alert-card">
        <div className="floating-sms-top-row">
          <div className="floating-sms-badge">
            <span className="sms-icon">📱</span>
            <span className="sms-brand">SMS TỔNG ĐÀI • YOU CAN'T STOP HERE</span>
          </div>
          <div className="floating-sms-right">
            <span className="sms-time-stamp">{smsData.time || 'Vừa xong'}</span>
            <button
              type="button"
              className="sms-close-btn"
              onClick={() => setSmsData(null)}
              title="Đóng thông báo SMS"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="floating-sms-body">
          <p className="sms-message-text">
            {smsData.content || `SĐT của bạn (${smsData.phoneNumber}) đã được đăng nhập thành công bởi thiết bị Windows PC.`}
          </p>
        </div>

        <div className="floating-sms-subtext">
          <span>Gửi từ tổng đài SMS Brandname tự động • Tin nhắn bảo mật</span>
        </div>
      </div>
    </div>
  );
};

