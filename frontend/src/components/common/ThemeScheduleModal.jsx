import React, { useState, useEffect } from 'react';
import {
  THEMES,
  THEME_MODES,
  getThemeSchedule,
  saveThemeSchedule,
  getActiveTheme,
  DEFAULT_THEME_SCHEDULE,
  calculateThemeByTime,
} from '../../utils/themeUtils';
import { playClickSound } from '../../utils/soundEffects';

export const ThemeScheduleModal = ({ isOpen, onClose }) => {
  const [schedule, setSchedule] = useState(() => getThemeSchedule());
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Cập nhật đồng hồ thời gian thực mỗi giây
  useEffect(() => {
    if (!isOpen) return;

    const updateClock = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}:${s}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSchedule(getThemeSchedule());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentActiveTheme = getActiveTheme();
  const simulatedTheme = calculateThemeByTime(schedule);

  const handleModeChange = (mode) => {
    playClickSound();
    setSchedule((prev) => ({ ...prev, mode }));
  };

  const handleTimeChange = (field, value) => {
    setSchedule((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyPreset = (dayStart, nightStart) => {
    playClickSound();
    setSchedule((prev) => ({
      ...prev,
      mode: THEME_MODES.AUTO,
      dayStart,
      nightStart,
    }));
  };

  const handleSave = () => {
    playClickSound();
    saveThemeSchedule(schedule);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    playClickSound();
    const def = { ...DEFAULT_THEME_SCHEDULE };
    setSchedule(def);
    saveThemeSchedule(def);
  };

  return (
    <div className="modal-backdrop theme-schedule-backdrop" onClick={onClose}>
      <div
        className="modal-box theme-schedule-modal"
        style={{ maxWidth: '580px', width: '95%', padding: '24px 28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          title="Đóng cửa sổ"
        >
          ✕
        </button>

        {/* Tiêu đề Modal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '1.75rem' }}>⏰</span>
          <h3 className="modal-heading" style={{ margin: 0, fontSize: '1.35rem' }}>
            Cài Đặt Chế Độ Ngày & Đêm Theo Giờ
          </h3>
        </div>
        <p className="modal-subtitle" style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '0.86rem' }}>
          Tự động điều chỉnh màu sắc giao diện theo đồng hồ thời gian thực để bảo vệ thị giác, chống mỏi mắt khi làm việc buổi tối.
        </p>

        {/* Khung Thông Báo Giờ Thời Gian Thực & Trạng Thái Hiện Tại */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75), rgba(30, 41, 59, 0.75))',
            border: '1.5px solid rgba(45, 212, 191, 0.35)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🕒</span>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Đồng hồ hệ thống
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2dd4bf', fontFamily: 'monospace' }}>
                {currentTimeStr || '00:00:00'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Trạng thái đang hiển thị
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: currentActiveTheme === THEMES.LIGHT ? '#fef08a' : '#1e293b',
                color: currentActiveTheme === THEMES.LIGHT ? '#713f12' : '#38bdf8',
                fontSize: '0.82rem',
                fontWeight: 800,
                marginTop: '2px',
                border: currentActiveTheme === THEMES.LIGHT ? '1px solid #facc15' : '1px solid rgba(56, 189, 248, 0.4)',
              }}
            >
              <span>{currentActiveTheme === THEMES.LIGHT ? '☀️' : '🌙'}</span>
              <span>{currentActiveTheme === THEMES.LIGHT ? 'Chế Độ Ngày (Sáng)' : 'Chế Độ Đêm (Tối)'}</span>
            </div>
          </div>
        </div>

        {/* Lựa Chọn Phương Thức Hoạt Động */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f1f5f9', display: 'block', marginBottom: '8px' }}>
            ⚙️ Chế độ hoạt động giao diện:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {/* Lựa chọn 1: Tự động theo giờ */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.AUTO)}
              style={{
                background: schedule.mode === THEME_MODES.AUTO ? 'rgba(13, 148, 136, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: schedule.mode === THEME_MODES.AUTO ? '2px solid #0d9488' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '10px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.AUTO ? '#2dd4bf' : '#cbd5e1',
              }}
            >
              <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>🕒</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Theo Giờ</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: '2px' }}>Tự động đổi</div>
            </button>

            {/* Lựa chọn 2: Luôn là Ban Ngày */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.LIGHT)}
              style={{
                background: schedule.mode === THEME_MODES.LIGHT ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: schedule.mode === THEME_MODES.LIGHT ? '2px solid #facc15' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '10px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.LIGHT ? '#facc15' : '#cbd5e1',
              }}
            >
              <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>☀️</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Ban Ngày</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: '2px' }}>Luôn sáng</div>
            </button>

            {/* Lựa chọn 3: Luôn là Ban Đêm */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.DARK)}
              style={{
                background: schedule.mode === THEME_MODES.DARK ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: schedule.mode === THEME_MODES.DARK ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '10px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.DARK ? '#38bdf8' : '#cbd5e1',
              }}
            >
              <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>🌙</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Ban Đêm</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: '2px' }}>Luôn tối</div>
            </button>
          </div>
        </div>

        {/* Khung Cài Đặt Khung Giờ (Chỉ Áp Dụng Khi Ở Chế Độ Tự Động) */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '18px',
            opacity: schedule.mode === THEME_MODES.AUTO ? 1 : 0.6,
            transition: 'opacity 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
              ⏱ Khung giờ chuyển đổi Ngày / Đêm:
            </span>
            {schedule.mode === THEME_MODES.AUTO && (
              <span style={{ fontSize: '0.74rem', color: '#2dd4bf', fontWeight: 600 }}>
                ✓ Đang kích hoạt
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Giờ Bắt Đầu Chế Độ Ngày */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#facc15', fontWeight: 600, marginBottom: '6px' }}>
                <span>☀️</span>
                <span>Bắt đầu Chế Độ Ngày:</span>
              </label>
              <input
                type="time"
                value={schedule.dayStart || '06:00'}
                onChange={(e) => handleTimeChange('dayStart', e.target.value)}
                disabled={schedule.mode !== THEME_MODES.AUTO}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(250, 204, 21, 0.4)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                Sáng ấm áp (Mặc định 06:00)
              </span>
            </div>

            {/* Giờ Bắt Đầu Chế Độ Đêm */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, marginBottom: '6px' }}>
                <span>🌙</span>
                <span>Bắt đầu Chế Độ Đêm:</span>
              </label>
              <input
                type="time"
                value={schedule.nightStart || '18:00'}
                onChange={(e) => handleTimeChange('nightStart', e.target.value)}
                disabled={schedule.mode !== THEME_MODES.AUTO}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(56, 189, 248, 0.4)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                Tối dịu mắt (Mặc định 18:00)
              </span>
            </div>
          </div>

          {/* Gợi ý khung giờ nhanh */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '6px' }}>Gợi ý nhanh:</span>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => handleApplyPreset('06:00', '18:00')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                06:00 - 18:00 (Chuẩn tự nhiên)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('07:00', '19:00')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                07:00 - 19:00 (Công sở)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('08:00', '21:00')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                08:00 - 21:00 (Cú đêm)
              </button>
            </div>
          </div>
        </div>

        {/* Thông báo đã lưu */}
        {savedSuccess && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid #10b981',
              color: '#34d399',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: '14px',
            }}
          >
            ✓ Đã lưu và áp dụng lịch chuyển đổi Ngày / Đêm thành công!
          </div>
        )}

        {/* Nút Hành Động Cuối Modal */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="page-btn"
            onClick={handleReset}
            style={{ flex: 1, padding: '9px 12px', fontSize: '0.82rem' }}
            title="Khôi phục lại mốc 06:00 - 18:00"
          >
            Mặc định
          </button>
          <button
            type="button"
            className="page-btn"
            onClick={onClose}
            style={{ flex: 1, padding: '9px 12px', fontSize: '0.82rem' }}
          >
            Đóng
          </button>
          <button
            type="button"
            className="modal-submit-btn"
            onClick={handleSave}
            style={{ flex: 2, margin: 0, padding: '9px 16px', fontSize: '0.86rem' }}
          >
            Lưu & Áp Dụng Ngay
          </button>
        </div>
      </div>
    </div>
  );
};
