import React, { useState, useEffect, useRef } from 'react';
import {
  ASMR_PROFILES,
  isAsmrKeyboardEnabled,
  setAsmrKeyboardEnabled,
  getAsmrProfile,
  setAsmrProfile,
  triggerAsmrKeySound,
} from '../../utils/keyboardSoundEngine';

export const AsmrKeyboardToggle = ({ variant = 'badge', className = '' }) => {
  const [enabled, setEnabled] = useState(() => isAsmrKeyboardEnabled());
  const [profile, setProfile] = useState(() => getAsmrProfile());
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

  const activeProfileData = ASMR_PROFILES[profile] || ASMR_PROFILES.thocky;

  return (
    <div className={`asmr-keyboard-toggle-wrap ${className}`} ref={menuRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={handleToggle}
        className={`asmr-toggle-btn ${enabled ? 'is-enabled' : 'is-disabled'} variant-${variant}`}
        title={
          enabled
            ? `Âm gõ phím ASMR: ĐANG BẬT (${activeProfileData.name}). Bấm để tắt hoặc nhấp mũi tên để đổi kiểu gõ.`
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
          border: enabled ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.18)',
          background: enabled
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(6, 95, 70, 0.35))'
            : 'rgba(255, 255, 255, 0.06)',
          color: enabled ? '#34d399' : '#94a3b8',
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
              background: '#34d399',
              boxShadow: '0 0 8px #34d399',
              animation: 'pulseDot 1.5s infinite alternate',
            }}
          />
        )}
      </button>

      {/* Nút mũi tên mở danh sách profile khi đã bật */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpenMenu((prev) => !prev);
        }}
        title="Chọn kiểu âm thanh phím cơ"
        style={{
          marginLeft: '4px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#cbd5e1',
          cursor: 'pointer',
          fontSize: '0.72rem',
          transition: 'all 0.2s ease',
        }}
      >
        <i className="fa-solid fa-gear"></i>
      </button>

      {/* Popover chọn profile */}
      {isOpenMenu && (
        <div
          className="asmr-profile-popover"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            right: 0,
            zIndex: 99999,
            width: '240px',
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '16px',
            padding: '10px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(52, 211, 153, 0.15)',
            animation: 'fadeInUp 0.15s ease-out',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '6px',
            }}
          >
            <span>🎧</span>
            <span>Chọn Kiểu Âm Thanh Gõ Phím</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.values(ASMR_PROFILES).map((p) => {
              const isSelected = profile === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProfile(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: isSelected ? '1px solid #10b981' : '1px solid transparent',
                    background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#34d399' : '#cbd5e1',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.2rem', marginTop: '2px' }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3 }}>{p.desc}</div>
                  </div>
                  {isSelected && <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.72rem',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            💡 Gõ thử bất kỳ phím nào để nghe âm thanh!
          </div>
        </div>
      )}
    </div>
  );
};
