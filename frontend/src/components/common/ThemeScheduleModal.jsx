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
          background: 'var(--bg-card)',
          color: 'var(--text-main)',
          border: '1.5px solid var(--border-card)',
          borderRadius: '20px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.4), 0 0 30px var(--pastel-sage-glow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          title="Đóng cửa sổ"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Tiêu đề Modal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <span className="healing-icon-pill healing-icon-amber" style={{ width: '42px', height: '42px', fontSize: '1.15rem' }}>
            <i className="fa-solid fa-clock"></i>
          </span>
          <h3 className="modal-heading" style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-main)', fontWeight: 800 }}>
            Cài Đặt Chế Độ Ngày & Đêm Theo Giờ
          </h3>
        </div>
        <p className="modal-subtitle" style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
          Tự động điều chỉnh màu sắc giao diện theo đồng hồ thời gian thực để bảo vệ thị giác, chống mỏi mắt khi làm việc buổi tối.
        </p>

        {/* Khung Thông Báo Giờ Thời Gian Thực & Trạng Thái Hiện Tại */}
        <div
          style={{
            background: 'var(--bg-page)',
            border: '1.5px solid var(--pastel-sage-border)',
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
            <span className="healing-icon-pill healing-icon-sage" style={{ width: '38px', height: '38px', fontSize: '1.1rem' }}>
              <i className="fa-regular fa-clock"></i>
            </span>
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                Đồng hồ hệ thống
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--pastel-sage)', fontFamily: 'monospace' }}>
                {currentTimeStr || '00:00:00'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Trạng thái đang hiển thị
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: currentActiveTheme === THEMES.LIGHT ? 'var(--pastel-amber-bg)' : 'var(--pastel-sage-bg)',
                color: currentActiveTheme === THEMES.LIGHT ? 'var(--pastel-amber)' : 'var(--pastel-sage)',
                fontSize: '0.84rem',
                fontWeight: 800,
                marginTop: '3px',
                border: currentActiveTheme === THEMES.LIGHT ? '1.5px solid var(--pastel-amber-border)' : '1.5px solid var(--pastel-sage-border)',
              }}
            >
              <span>{currentActiveTheme === THEMES.LIGHT ? <i className="fa-solid fa-sun"></i> : <i className="fa-solid fa-moon"></i>}</span>
              <span>{currentActiveTheme === THEMES.LIGHT ? 'Chế Độ Ngày (Sáng)' : 'Chế Độ Đêm (Tối)'}</span>
            </div>
          </div>
        </div>

        {/* Lựa Chọn Phương Thức Hoạt Động */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <i className="fa-solid fa-gear"></i> Chế độ hoạt động giao diện:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {/* Lựa chọn 1: Tự động theo giờ */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.AUTO)}
              style={{
                background: schedule.mode === THEME_MODES.AUTO ? 'var(--pastel-sage-bg)' : 'var(--bg-input)',
                border: schedule.mode === THEME_MODES.AUTO ? '2px solid var(--pastel-sage)' : '1.5px solid var(--border-card)',
                borderRadius: '12px',
                padding: '12px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.AUTO ? 'var(--pastel-sage)' : 'var(--text-main)',
                boxShadow: schedule.mode === THEME_MODES.AUTO ? '0 4px 14px var(--pastel-sage-glow)' : 'none',
              }}
            >
              <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                <i className="fa-regular fa-clock"></i>
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>Theo Giờ</div>
              <div style={{ fontSize: '0.72rem', color: schedule.mode === THEME_MODES.AUTO ? 'var(--pastel-sage)' : 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Tự động đổi
              </div>
            </button>

            {/* Lựa chọn 2: Luôn là Ban Ngày */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.LIGHT)}
              style={{
                background: schedule.mode === THEME_MODES.LIGHT ? 'var(--pastel-amber-bg)' : 'var(--bg-input)',
                border: schedule.mode === THEME_MODES.LIGHT ? '2px solid var(--pastel-amber)' : '1.5px solid var(--border-card)',
                borderRadius: '12px',
                padding: '12px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.LIGHT ? 'var(--pastel-amber)' : 'var(--text-main)',
                boxShadow: schedule.mode === THEME_MODES.LIGHT ? '0 4px 14px var(--pastel-amber-glow)' : 'none',
              }}
            >
              <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                <i className="fa-solid fa-sun"></i>
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>Ban Ngày</div>
              <div style={{ fontSize: '0.72rem', color: schedule.mode === THEME_MODES.LIGHT ? 'var(--pastel-amber)' : 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Luôn sáng
              </div>
            </button>

            {/* Lựa chọn 3: Luôn là Ban Đêm */}
            <button
              type="button"
              onClick={() => handleModeChange(THEME_MODES.DARK)}
              style={{
                background: schedule.mode === THEME_MODES.DARK ? 'var(--pastel-sage-bg)' : 'var(--bg-input)',
                border: schedule.mode === THEME_MODES.DARK ? '2px solid var(--pastel-sage)' : '1.5px solid var(--border-card)',
                borderRadius: '12px',
                padding: '12px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                color: schedule.mode === THEME_MODES.DARK ? 'var(--pastel-sage)' : 'var(--text-main)',
                boxShadow: schedule.mode === THEME_MODES.DARK ? '0 4px 14px var(--pastel-sage-glow)' : 'none',
              }}
            >
              <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                <i className="fa-solid fa-moon"></i>
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>Ban Đêm</div>
              <div style={{ fontSize: '0.72rem', color: schedule.mode === THEME_MODES.DARK ? 'var(--pastel-sage)' : 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Luôn tối
              </div>
            </button>
          </div>
        </div>

        {/* Khung Cài Đặt Khung Giờ (Chỉ Áp Dụng Khi Ở Chế Độ Tự Động) */}
        <div
          style={{
            background: 'var(--bg-page)',
            border: '1.5px solid var(--border-card)',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '18px',
            opacity: schedule.mode === THEME_MODES.AUTO ? 1 : 0.65,
            transition: 'opacity 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-business-time"></i> Khung giờ chuyển đổi Ngày / Đêm:
            </span>
            {schedule.mode === THEME_MODES.AUTO && (
              <span style={{ fontSize: '0.78rem', color: 'var(--pastel-sage)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-check"></i> Đang kích hoạt
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Giờ Bắt Đầu Chế Độ Ngày */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--pastel-amber)', fontWeight: 700, marginBottom: '6px' }}>
                <i className="fa-solid fa-sun"></i>
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
                  border: '1.5px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                Sáng ấm áp (Mặc định 06:00)
              </span>
            </div>

            {/* Giờ Bắt Đầu Chế Độ Đêm */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--pastel-sage)', fontWeight: 700, marginBottom: '6px' }}>
                <i className="fa-solid fa-moon"></i>
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
                  border: '1.5px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', fontWeight: 600 }}>
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
