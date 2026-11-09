import React, { useState, useEffect } from 'react';
import {
  ATMOSPHERE_THEMES,
  BACKGROUND_PRESETS,
  PARTICLE_EFFECTS,
  startPostAtmosphere,
  stopPostAtmosphere,
} from '../../utils/postAtmosphereEngine';

export const PostAtmosphereSelector = ({ atmosphere, onChange }) => {
  const currentAtmosphere = {
    theme: 'default',
    soundEnabled: true,
    bgPreset: 'default',
    customColor: '',
    customBgGradient: '',
    particleEffect: 'none',
    ...atmosphere,
  };

  const [previewingSound, setPreviewingSound] = useState(false);

  // Khi component unmount, tắt ngay âm thanh preview nếu đang phát
  useEffect(() => {
    return () => {
      stopPostAtmosphere();
    };
  }, []);

  const handleThemeSelect = (themeKey) => {
    const themeDef = ATMOSPHERE_THEMES[themeKey] || ATMOSPHERE_THEMES.default;
    const isDefault = themeKey === 'default';

    // Cập nhật theme, tự động gợi ý preset nền và hạt nếu người dùng chưa chọn custom
    const nextAtmosphere = {
      ...currentAtmosphere,
      theme: themeKey,
      soundEnabled: !isDefault,
      bgPreset: isDefault ? 'default' : themeDef.defaultBgPreset || currentAtmosphere.bgPreset,
      particleEffect: isDefault ? 'none' : themeDef.defaultParticle || currentAtmosphere.particleEffect,
    };

    onChange(nextAtmosphere);

    // Nếu đang nghe preview, chuyển sang âm thanh mới
    if (previewingSound) {
      if (themeKey === 'default') {
        stopPostAtmosphere();
        setPreviewingSound(false);
      } else {
        startPostAtmosphere(themeKey, 0.4);
      }
    }
  };

  const toggleSoundPreview = (e) => {
    e.preventDefault();
    if (currentAtmosphere.theme === 'default') return;

    if (previewingSound) {
      stopPostAtmosphere();
      setPreviewingSound(false);
    } else {
      startPostAtmosphere(currentAtmosphere.theme, 0.45);
      setPreviewingSound(true);
    }
  };

  const handleBgPresetChange = (presetId) => {
    let autoParticle = currentAtmosphere.particleEffect;
    let autoTheme = currentAtmosphere.theme;

    // Tự động đồng bộ Theme và Âm thanh phù hợp với Màu nền đã chọn nếu chưa chọn Theme cụ thể
    if (presetId === 'sadness_rain') {
      if (autoParticle === 'none') autoParticle = 'rain';
      if (autoTheme === 'default' || autoTheme === 'horror' || autoTheme === 'warmth') autoTheme = 'rain';
    } else if (presetId === 'horror_dark') {
      if (autoParticle === 'none') autoParticle = 'fog';
      if (autoTheme === 'default' || autoTheme === 'rain' || autoTheme === 'warmth') autoTheme = 'horror';
    } else if (presetId === 'joy_sunset') {
      if (autoParticle === 'none') autoParticle = 'sparkles';
      if (autoTheme === 'default' || autoTheme === 'horror' || autoTheme === 'rain') autoTheme = 'warmth';
    } else if (presetId === 'healing_emerald') {
      if (autoParticle === 'none') autoParticle = 'fireflies';
      if (autoTheme === 'default' || autoTheme === 'horror') autoTheme = 'forest';
    } else if (presetId === 'drama_crimson') {
      if (autoParticle === 'none') autoParticle = 'heartbeat_pulse';
      if (autoTheme === 'default' || autoTheme === 'peace') autoTheme = 'drama';
    } else if (presetId === 'cyberpunk') {
      if (autoParticle === 'none') autoParticle = 'sparkles';
      if (autoTheme === 'default') autoTheme = 'nostalgia';
    } else if (presetId === 'dream_pink') {
      if (autoParticle === 'none') autoParticle = 'sparkles';
      if (autoTheme === 'default') autoTheme = 'peace';
    } else if (presetId === 'default') {
      autoTheme = 'default';
      autoParticle = 'none';
    }

    onChange({
      ...currentAtmosphere,
      theme: autoTheme,
      soundEnabled: autoTheme !== 'default',
      bgPreset: presetId,
      particleEffect: autoParticle,
    });

    // Nếu đang nghe preview, cập nhật luôn âm thanh tương ứng
    if (previewingSound) {
      if (autoTheme === 'default') {
        stopPostAtmosphere();
        setPreviewingSound(false);
      } else {
        startPostAtmosphere(autoTheme, 0.4);
      }
    }
  };

  const handleParticleChange = (particleId) => {
    onChange({
      ...currentAtmosphere,
      particleEffect: particleId,
    });
  };

  const handleCustomColorChange = (color) => {
    onChange({
      ...currentAtmosphere,
      customColor: color,
      bgPreset: 'custom',
    });
  };

  const handleCustomGradientChange = (gradient) => {
    onChange({
      ...currentAtmosphere,
      customBgGradient: gradient,
      bgPreset: 'custom',
    });
  };

  const activeThemeMeta = ATMOSPHERE_THEMES[currentAtmosphere.theme] || ATMOSPHERE_THEMES.default;
  const activeBgPreset = BACKGROUND_PRESETS.find((p) => p.id === currentAtmosphere.bgPreset) || BACKGROUND_PRESETS[0];

  // Tính background thực tế cho Live Preview
  let previewBackground = activeBgPreset.previewBg;
  if (currentAtmosphere.bgPreset === 'custom') {
    previewBackground = currentAtmosphere.customBgGradient || currentAtmosphere.customColor || '#1e293b';
  }

  return (
    <div
      className="post-atmosphere-selector-card"
      style={{
        marginTop: '16px',
        padding: '16px 18px',
        borderRadius: '12px',
        border: `1.5px solid ${activeThemeMeta.accentColor}40`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        <label
          style={{
            fontWeight: 700,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.98rem',
            margin: 0,
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🎭</span>
          <span>Không Gian Cảm Xúc & Background Đặc Trưng</span>
        </label>

        {currentAtmosphere.theme !== 'default' && (
          <button
            type="button"
            onClick={toggleSoundPreview}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: `1.5px solid ${activeThemeMeta.accentColor}`,
              background: previewingSound ? activeThemeMeta.accentColor : '#ffffff',
              color: previewingSound ? '#ffffff' : activeThemeMeta.accentColor,
              boxShadow: previewingSound ? `0 2px 8px ${activeThemeMeta.accentColor}50` : 'none',
              transition: 'all 0.2s ease',
            }}
            title="Nghe thử âm thanh không gian cảm xúc được tạo bằng Web Audio API"
          >
            <span>{previewingSound ? '⏸ Đang nghe thử...' : '🔊 Nghe thử âm thanh'}</span>
            {previewingSound && (
              <span className="live-sound-wave" style={{ display: 'inline-flex', gap: '2px', alignItems: 'flex-end', height: '12px' }}>
                <span style={{ width: '2px', height: '100%', background: '#fff', borderRadius: '1px' }}></span>
                <span style={{ width: '2px', height: '60%', background: '#fff', borderRadius: '1px' }}></span>
                <span style={{ width: '2px', height: '80%', background: '#fff', borderRadius: '1px' }}></span>
              </span>
            )}
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
        Tạo nên một không gian riêng cho bài viết của bạn! Khi người khác đọc bài, họ sẽ được đắm chìm vào âm thanh đặc trưng (tiếng gió ma mị, mưa rả rích, nhịp tim drama, suối reo...) và màu nền độc đáo chứ không bị nhàm chán.
      </p>

      {/* 1. CHỌN KHÔNG GIAN CẢM XÚC (THEME) */}
      <div style={{ marginBottom: '14px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
          1. Chọn Vibe / Không Gian Cảm Xúc:
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '8px',
          }}
        >
          {Object.values(ATMOSPHERE_THEMES).map((thm) => {
            const isSelected = currentAtmosphere.theme === thm.id;
            return (
              <button
                key={thm.id}
                type="button"
                onClick={() => handleThemeSelect(thm.id)}
                style={{
                  padding: '9px 10px',
                  borderRadius: '10px',
                  border: isSelected ? `2px solid ${thm.accentColor}` : '1.5px solid #e2e8f0',
                  background: isSelected ? `${thm.accentColor}12` : '#ffffff',
                  color: isSelected ? thm.accentColor : '#475569',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  textAlign: 'center',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected ? `0 2px 10px ${thm.accentColor}25` : 'none',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{thm.icon}</span>
                <span style={{ fontSize: '0.78rem', lineHeight: 1.2 }}>{thm.badgeText}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CHỌN NỀN & MÀU SẮC ĐẶC TRƯNG */}
      <div style={{ marginBottom: '14px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
          2. Chọn Màu Nền & Background Preset:
        </span>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {BACKGROUND_PRESETS.map((preset) => {
            const isSelected = currentAtmosphere.bgPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleBgPresetChange(preset.id)}
                style={{
                  padding: '7px 13px',
                  borderRadius: '20px',
                  border: isSelected
                    ? `2px solid ${preset.accentColor || '#0d9488'}`
                    : '1.5px solid #e2e8f0',
                  background: isSelected ? (preset.badgeBg || '#f0fdfa') : '#ffffff',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? (preset.accentColor || '#0d9488') : '#334155',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected
                    ? `0 3px 12px ${preset.accentColor || '#0d9488'}35`
                    : '0 1px 3px rgba(0,0,0,0.04)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: preset.dotGradient || preset.previewBg,
                    border: `1.5px solid ${preset.accentColor || '#cbd5e1'}`,
                    boxShadow: `0 0 6px ${preset.accentColor || '#000'}40`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ whiteSpace: 'nowrap' }}>
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Khối Custom Color / Gradient khi chọn Custom */}
        {currentAtmosphere.bgPreset === 'custom' && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                Mã màu Hex:
              </label>
              <input
                type="color"
                value={currentAtmosphere.customColor || '#1e293b'}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                style={{ width: '36px', height: '30px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              />
              <span style={{ fontSize: '0.76rem', fontFamily: 'monospace', color: '#64748b' }}>
                {currentAtmosphere.customColor || '#1e293b'}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Hoặc dán CSS linear-gradient(135deg, #111 0%, #333 100%)"
                value={currentAtmosphere.customBgGradient || ''}
                onChange={(e) => handleCustomGradientChange(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '0.78rem',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. CHỌN HIỆU ỨNG HẠT VISUAL (PARTICLES) */}
      <div style={{ marginBottom: '14px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
          3. Hiệu Ứng Hạt Trực Quan (Particle Overlay):
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {PARTICLE_EFFECTS.map((part) => {
            const isSelected = currentAtmosphere.particleEffect === part.id;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => handleParticleChange(part.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: isSelected ? '#0d9488' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{part.icon}</span>
                <span>{part.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. LIVE MINIATURE PREVIEW KHUNG BÀI VIẾT */}
      <div>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
          👁️ Xem Trước Giao Diện Bài Viết Của Bạn:
        </span>
        <div
          className={`post-atmosphere-preview-box ${currentAtmosphere.particleEffect !== 'none' ? `has-particle-${currentAtmosphere.particleEffect}` : ''}`}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '12px',
            padding: '16px 20px',
            background: previewBackground,
            color: activeBgPreset.textColor,
            border: `2px solid ${activeBgPreset.accentColor || activeThemeMeta.accentColor}`,
            boxShadow: activeBgPreset.boxShadow || `0 6px 20px ${activeThemeMeta.accentColor}25`,
            transition: 'all 0.3s ease',
          }}
        >
          {/* Overlay hạt visual mô phỏng */}
          {currentAtmosphere.particleEffect === 'fog' && <div className="preview-fog-overlay" />}
          {currentAtmosphere.particleEffect === 'rain' && <div className="preview-rain-overlay" />}
          {currentAtmosphere.particleEffect === 'sparkles' && <div className="preview-sparkles-overlay" />}
          {currentAtmosphere.particleEffect === 'heartbeat_pulse' && <div className="preview-pulse-border" />}
          {currentAtmosphere.particleEffect === 'fireflies' && <div className="preview-fireflies-overlay" />}

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: activeBgPreset.id === 'default' ? `${activeThemeMeta.accentColor}18` : 'rgba(255, 255, 255, 0.16)',
                  color: activeBgPreset.id === 'default' ? activeThemeMeta.accentColor : '#ffffff',
                  border: `1px solid ${activeBgPreset.id === 'default' ? `${activeThemeMeta.accentColor}50` : 'rgba(255, 255, 255, 0.35)'}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span>{activeThemeMeta.icon}</span>
                <span>Không gian: {activeThemeMeta.badgeText}</span>
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: activeBgPreset.id === 'default' ? `${activeBgPreset.accentColor}18` : 'rgba(255, 255, 255, 0.16)',
                  color: activeBgPreset.id === 'default' ? activeBgPreset.accentColor : '#38bdf8',
                  border: `1px solid ${activeBgPreset.id === 'default' ? `${activeBgPreset.accentColor}50` : 'rgba(56, 189, 248, 0.45)'}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span>{activeBgPreset.icon}</span>
                <span>Màu nền: {activeBgPreset.name}</span>
              </span>
            </div>

            {currentAtmosphere.theme !== 'default' && (
              <span style={{ fontSize: '0.74rem', opacity: 0.9, fontStyle: 'italic', color: activeBgPreset.textColor }}>
                🎧 Âm thanh: {activeThemeMeta.soundLabel}
              </span>
            )}
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <h5
              style={{
                margin: '0 0 6px 0',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: activeBgPreset.textColor,
                textShadow: activeBgPreset.id === 'default' ? 'none' : '0 1px 4px rgba(0,0,0,0.6)',
                letterSpacing: '0.2px',
              }}
            >
              Tiêu đề bài viết: Không gian {activeBgPreset.name} {activeBgPreset.icon}
            </h5>
            <p
              style={{
                margin: '0 0 10px',
                fontSize: '0.84rem',
                opacity: 0.95,
                lineHeight: 1.6,
                color: activeBgPreset.textColor,
                textShadow: activeBgPreset.id === 'default' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              Không gian bài viết này sẽ hiện với phong cách màu sắc đặc trưng ({activeBgPreset.name}), hiệu ứng chuyển động ({currentAtmosphere.particleEffect !== 'none' ? currentAtmosphere.particleEffect : 'ánh sáng nền'}) và âm thanh duy trì khi người khác vào đọc...
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(4px)', color: activeBgPreset.textColor }}>
                🌟 Tương phản cao
              </span>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(4px)', color: activeBgPreset.textColor }}>
                🍃 Nhịp thở cảm xúc
              </span>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(4px)', color: activeBgPreset.textColor }}>
                🎵 Âm thanh sống động
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
