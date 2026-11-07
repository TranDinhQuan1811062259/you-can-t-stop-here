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
        style={{
          maxWidth: '580px',
          width: '95%',
          padding: '24px 28px',
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: '20px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.5), 0 0 30px rgba(13, 148, 136, 0.15)',
        }}
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
          <h3 className="modal-heading" style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
            Cài Đặt Chế Độ Ngày & Đêm Theo Giờ
          </h3>
        </div>
        <p className="modal-subtitle" style={{ margin: '0 0 16px', color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
          Tự động điều chỉnh màu sắc giao diện theo đồng hồ thời gian thực để bảo vệ thị giác, chống mỏi mắt khi làm việc buổi tối.
        </p>

        {/* Khung Thông Báo Giờ Thời Gian Thực & Trạng Thái Hiện Tại */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1.5px solid rgba(45, 212, 191, 0.45)',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.35rem' }}>🕒</span>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                Đồng hồ hệ thống
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2dd4bf', fontFamily: 'monospace' }}>
                {currentTimeStr || '00:00:00'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Trạng thái đang hiển thị
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: currentActiveTheme === THEMES.LIGHT ? '#fef08a' : '#1e293b',
                color: currentActiveTheme === THEMES.LIGHT ? '#713f12' : '#38bdf8',
                fontSize: '0.84rem',
                fontWeight: 800,
                marginTop: '3px',
                border: currentActiveTheme === THEMES.LIGHT ? '1.5px solid #facc15' : '1.5px solid rgba(56, 189, 248, 0.5)',
              }}
            >
              <span>{currentActiveTheme === THEMES.LIGHT ? '☀️' : '🌙'}</span>
              <span>{currentActiveTheme === THEMES.LIGHT ? 'Chế Độ Ngày (Sáng)' : 'Chế Độ Đêm (Tối)'}</span>
            </div>
          </div>
        </div>

        {/* Lựa Chọn Phương Thức Hoạt Động */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
            ⚙️ Chế độ hoạt động giao diện:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {/* Lựa chọn 1: Tự động theo giờ */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.AUTO)}
              style={{
                background: schedule.mode === THEME_MODES.AUTO ? '#ecfdf5' : '#f8fafc',
                border: schedule.mode === THEME_MODES.AUTO ? '2px solid #059669' : '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.AUTO ? '#047857' : '#1e293b',
                boxShadow: schedule.mode === THEME_MODES.AUTO ? '0 4px 14px rgba(5, 150, 105, 0.18)' : 'none',
              }}
            >
              <div style={{ fontSize: '1.35rem', marginBottom: '4px' }}>🕒</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>Theo Giờ</div>
              <div style={{ fontSize: '0.72rem', color: schedule.mode === THEME_MODES.AUTO ? '#047857' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
                Tự động đổi
              </div>
            </button>

            {/* Lựa chọn 2: Luôn là Ban Ngày */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.LIGHT)}
              style={{
                background: schedule.mode === THEME_MODES.LIGHT ? '#fefce8' : '#f8fafc',
                border: schedule.mode === THEME_MODES.LIGHT ? '2px solid #ca8a04' : '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.LIGHT ? '#854d0e' : '#1e293b',
                boxShadow: schedule.mode === THEME_MODES.LIGHT ? '0 4px 14px rgba(202, 138, 4, 0.2)' : 'none',
              }}
            >
              <div style={{ fontSize: '1.35rem', marginBottom: '4px' }}>☀️</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>Ban Ngày</div>
              <div style={{ fontSize: '0.72rem', color: schedule.mode === THEME_MODES.LIGHT ? '#854d0e' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
                Luôn sáng
              </div>
            </button>

            {/* Lựa chọn 3: Luôn là Ban Đêm */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.DARK)}
              style={{
                background: schedule.mode === THEME_MODES.DARK ? '#f0f9ff' : '#f8fafc',
                border: schedule.mode === THEME_MODES.DARK ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.DARK ? '#0369a1' : '#1e293b',
                boxShadow: schedule.mode === THEME_MODES.DARK ? '0 4px 14px rgba(2, 132, 199, 0.2)' : 'none',
              }}
            >
              <div style={{ fontSize: '1.35rem', marginBottom: '4px' }}>🌙</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>Ban Đêm</div>
              <div style={{ fontSize: '0.72rem', color: schedule.mode === THEME_MODES.DARK ? '#0369a1' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
                Luôn tối
              </div>
            </button>
          </div>
        </div>

        {/* Khung Cài Đặt Khung Giờ (Chỉ Áp Dụng Khi Ở Chế Độ Tự Động) */}
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '18px',
            opacity: schedule.mode === THEME_MODES.AUTO ? 1 : 0.65,
            transition: 'opacity 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
              ⏱ Khung giờ chuyển đổi Ngày / Đêm:
            </span>
            {schedule.mode === THEME_MODES.AUTO && (
              <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800 }}>
                ✓ Đang kích hoạt
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Giờ Bắt Đầu Chế Độ Ngày */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#b45309', fontWeight: 700, marginBottom: '6px' }}>
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
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #94a3b8',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                Sáng ấm áp (Mặc định 06:00)
              </span>
            </div>

            {/* Giờ Bắt Đầu Chế Độ Đêm */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#0369a1', fontWeight: 700, marginBottom: '6px' }}>
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
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #94a3b8',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                Tối dịu mắt (Mặc định 18:00)
              </span>
            </div>
          </div>

          {/* Gợi ý khung giờ nhanh */}
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.76rem', color: '#334155', marginRight: '6px', fontWeight: 700 }}>Gợi ý nhanh:</span>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => handleApplyPreset('06:00', '18:00')}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                06:00 - 18:00 (Chuẩn tự nhiên)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('07:00', '19:00')}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                07:00 - 19:00 (Công sở)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('08:00', '21:00')}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
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
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              color: '#047857',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.86rem',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '14px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
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
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: '#f1f5f9',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
            title="Khôi phục lại mốc 06:00 - 18:00"
          >
            Mặc định
          </button>
          <button
            type="button"
            className="page-btn"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: '#e2e8f0',
              border: '1.5px solid #cbd5e1',
              color: '#0f172a',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
          <button
            type="button"
            className="modal-submit-btn"
            onClick={handleSave}
            style={{
              flex: 2,
              margin: 0,
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
              cursor: 'pointer',
            }}
          >
            Lưu & Áp Dụng Ngay
          </button>
        </div>
      </div>
    </div>
  );
};
