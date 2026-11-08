import React, { useState, useEffect, useRef } from 'react';
import {
  ASMR_PROFILES,
  isAsmrKeyboardEnabled,
  setAsmrKeyboardEnabled,
  getAsmrProfile,
  setAsmrProfile,
  getAsmrVolume,
  setAsmrVolume,
  triggerAsmrKeySound,
} from '../../utils/keyboardSoundEngine';

export const AsmrKeyboardToggle = ({ variant = 'badge', className = '', placement = 'down' }) => {
  const [enabled, setEnabled] = useState(() => isAsmrKeyboardEnabled());
  const [profile, setProfile] = useState(() => getAsmrProfile());
  const [volume, setVolume] = useState(() => getAsmrVolume());
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleState = (e) => setEnabled(e.detail?.enabled ?? isAsmrKeyboardEnabled());
    const handleProf = (e) => setProfile(e.detail?.profile ?? getAsmrProfile());

    window.addEventListener('freedom_asmr_state_changed', handleState);
    window.addEventListener('freedom_asmr_profile_changed', handleProf);

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('freedom_asmr_state_changed', handleState);
      window.removeEventListener('freedom_asmr_profile_changed', handleProf);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    setAsmrKeyboardEnabled(next);
    if (next) {
      triggerAsmrKeySound({ key: 'Enter' }, profile);
    }
  };

  const handleSelectProfile = (pId) => {
    setProfile(pId);
    setAsmrProfile(pId);
    triggerAsmrKeySound({ key: 'Enter' }, pId);
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setAsmrVolume(newVol);
    triggerAsmrKeySound({ key: 'Enter' }, profile);
  };

  const activeProfileData = ASMR_PROFILES[profile] || ASMR_PROFILES.thocky;

  return (
    <div className={`asmr-keyboard-toggle-wrap ${className}`} ref={menuRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={handleToggle}
        className={`asmr-toggle-btn ${enabled ? 'is-enabled' : 'is-disabled'} variant-${variant}`}
        title={
          enabled
            ? `Âm gõ phím ASMR: ĐANG BẬT (${activeProfileData.name}). Bấm để tắt hoặc nhấp bánh răng để chọn 8 thể loại.`
            : 'Bật âm thanh gõ phím cơ thư giãn ASMR'
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: variant === 'pill' ? '5px 12px' : '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          border: enabled
            ? `1.5px solid ${activeProfileData.color || '#10b981'}`
            : '1px solid var(--border-card, rgba(255, 255, 255, 0.18))',
          background: enabled
            ? `linear-gradient(135deg, ${activeProfileData.color || '#10b981'}25, rgba(6, 95, 70, 0.35))`
            : 'var(--bg-input, rgba(255, 255, 255, 0.06))',
          color: enabled
            ? activeProfileData.color || 'var(--pastel-sage, #059669)'
            : 'var(--text-main, #334155)',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '0.95rem' }}>{activeProfileData.icon}</span>
        <span>{enabled ? activeProfileData.name : 'ASMR Phím Cơ'}</span>
        {enabled && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: activeProfileData.color || '#34d399',
              boxShadow: `0 0 8px ${activeProfileData.color || '#34d399'}`,
              animation: 'pulseDot 1.5s infinite alternate',
            }}
          />
        )}
      </button>

      {/* Nút cài đặt mở danh sách 8 profile */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpenMenu((prev) => !prev);
        }}
        title="Chọn 8 thể loại âm thanh gõ phím ASMR"
        style={{
          marginLeft: '4px',
          background: isOpenMenu ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.08)',
          border: `1px solid ${isOpenMenu ? '#34d399' : 'rgba(255, 255, 255, 0.15)'}`,
          borderRadius: '50%',
          width: '26px',
          height: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpenMenu ? '#34d399' : '#cbd5e1',
          cursor: 'pointer',
          fontSize: '0.74rem',
          transition: 'all 0.2s ease',
        }}
      >
        <i className="fa-solid fa-gear"></i>
      </button>

      {/* Popover chọn 8 profile */}
      {isOpenMenu && (
        <div
          className="asmr-profile-popover"
          style={{
            position: 'absolute',
            ...(placement === 'up'
              ? { bottom: 'calc(100% + 8px)', top: 'auto' }
              : { top: 'calc(100% + 8px)', bottom: 'auto' }),
            right: 0,
            zIndex: 99999,
            width: '290px',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '16px',
            padding: '12px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(52, 211, 153, 0.18)',
            animation: 'fadeInUp 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎧</span>
              <span>8 Thể Loại ASMR Bàn Phím</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                8 Kiểu gõ
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpenMenu(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: '0.85rem',
                  lineHeight: 1,
                }}
                title="Đóng bảng chọn"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Thanh chỉnh âm lượng ASMR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '8px',
              marginBottom: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Âm lượng:</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer', height: '4px' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, minWidth: '32px', textAlign: 'right' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Danh sách 8 Profile có cuộn mượt */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '270px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {Object.values(ASMR_PROFILES).map((p) => {
              const isSelected = profile === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProfile(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: isSelected ? `1.5px solid ${p.color || '#10b981'}` : '1px solid rgba(255, 255, 255, 0.06)',
                    background: isSelected ? `${p.color || '#10b981'}20` : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? (p.color || '#34d399') : '#cbd5e1',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span style={{ fontSize: '1.25rem', width: '28px', textAlign: 'center', flexShrink: 0 }}>
                    {p.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '0.82rem' }}>{p.name}</strong>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: `${p.color || '#10b981'}33`,
                          color: p.color || '#34d399',
                          fontWeight: 700,
                        }}
                      >
                        {p.badge}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.desc}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ color: p.color || '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Tip */}
          <div
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.7rem',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            💡 Bấm vào kiểu gõ để nghe thử âm thanh ngay!
          </div>
        </div>
      )}
    </div>
  );
};
