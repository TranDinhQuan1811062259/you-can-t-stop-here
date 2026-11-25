import React, { useState, useEffect } from 'react';
import {
  ATMOSPHERE_THEMES,
  startPostAtmosphere,
  stopPostAtmosphere,
  setPostAtmosphereVolume,
  isAtmospherePlaying,
} from '../../utils/postAtmosphereEngine';
import { onFirstUserGesture, hasUserInteracted } from '../../utils/audio-gesture-guard';

export const PostAtmosphereSoundBar = ({ atmosphere, postTitle }) => {
  if (!atmosphere || !atmosphere.theme || atmosphere.theme === 'default') {
    return null;
  }

  const themeMeta = ATMOSPHERE_THEMES[atmosphere.theme] || ATMOSPHERE_THEMES.horror;
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [isDucked, setIsDucked] = useState(false);

  // Khởi động âm thanh không gian khi người đọc vào trang bài viết (chỉ tạo AudioContext sau user gesture)
  useEffect(() => {
    let timer = null;
    let unsubscribeGesture = null;

    if (atmosphere.soundEnabled !== false) {
      const startSafely = () => {
        try {
          const started = startPostAtmosphere(atmosphere.theme, volume);
          setIsPlaying(Boolean(started));
        } catch (e) {
          setIsPlaying(false);
        }
      };

      // Delay nhẹ 600ms để hiệu ứng chuyển trang hoàn tất mượt mà
      timer = setTimeout(() => {
        if (hasUserInteracted()) {
          startSafely();
        } else {
          unsubscribeGesture = onFirstUserGesture(startSafely);
        }
      }, 600);
    }

    // Lắng nghe trạng thái động từ engine
    const handleState = (e) => {
      const detail = e.detail || {};
      setIsPlaying(detail.isPlaying);
      if (typeof detail.volume === 'number') {
        setVolume(detail.volume);
      }
    };

    const handleAmbientDuck = (e) => {
      const { isMusicDucking } = e.detail || {};
      if (isMusicDucking !== undefined) {
        setIsDucked(isMusicDucking);
      }
    };

    window.addEventListener('freedom_post_atmosphere_state_change', handleState);
    window.addEventListener('freedom_ambient_sound_changed', handleAmbientDuck);

    return () => {
      if (timer) clearTimeout(timer);
      if (unsubscribeGesture) unsubscribeGesture();
      stopPostAtmosphere();
      window.removeEventListener('freedom_post_atmosphere_state_change', handleState);
      window.removeEventListener('freedom_ambient_sound_changed', handleAmbientDuck);
    };
  }, [atmosphere.theme, atmosphere.soundEnabled]);

  const handleToggle = () => {
    if (isPlaying) {
      stopPostAtmosphere();
      setIsPlaying(false);
    } else {
      startPostAtmosphere(atmosphere.theme, volume);
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setPostAtmosphereVolume(val);
  };

  return (
    <div
      className="post-atmosphere-sound-bar"
      style={{
        margin: '18px 0',
        padding: '12px 18px',
        borderRadius: '14px',
        border: `1.5px solid ${themeMeta.accentColor}80`,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        boxShadow: `0 6px 20px rgba(0, 0, 0, 0.12), 0 0 16px ${themeMeta.accentColor}25`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        position: 'relative',
        zIndex: 5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={handleToggle}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: 'none',
            background: isPlaying
              ? `linear-gradient(135deg, ${themeMeta.accentColor} 0%, #0d9488 100%)`
              : '#e2e8f0',
            color: isPlaying ? '#ffffff' : '#0f172a',
            fontSize: '1.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isPlaying ? `0 4px 12px ${themeMeta.accentColor}50` : 'none',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
          title={isPlaying ? 'Tạm dừng âm thanh không gian' : 'Bật âm thanh không gian cảm xúc'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.15rem' }}>{themeMeta.icon}</span>
            <strong style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              Không Gian: {themeMeta.name}
            </strong>
            {isPlaying && (
              <span
                className="live-atmosphere-pill"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#047857',
                  border: '1.5px solid rgba(16, 185, 129, 0.45)',
                  padding: '2px 9px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.2px',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)',
                }}
              >
                <span className="live-sound-dot" />
                <span>Đang phát duy trì</span>
              </span>
            )}
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
            {themeMeta.soundLabel}
            {isDucked && (
              <span style={{ color: '#0d9488', fontWeight: 700, marginLeft: '6px' }}>
                • (Đang chìm nhẹ vì phát nhạc cá nhân)
              </span>
            )}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Âm lượng:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
          style={{
            width: '90px',
            accentColor: themeMeta.accentColor,
            cursor: 'pointer',
          }}
          title={`Âm lượng: ${Math.round(volume * 100)}%`}
        />
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', minWidth: '34px' }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};
