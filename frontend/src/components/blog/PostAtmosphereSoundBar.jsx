import React, { useState, useEffect } from 'react';
import {
  ATMOSPHERE_THEMES,
  startPostAtmosphere,
  stopPostAtmosphere,
  setPostAtmosphereVolume,
  isAtmospherePlaying,
} from '../../utils/postAtmosphereEngine';

export const PostAtmosphereSoundBar = ({ atmosphere, postTitle }) => {
  if (!atmosphere || !atmosphere.theme || atmosphere.theme === 'default') {
    return null;
  }

  const themeMeta = ATMOSPHERE_THEMES[atmosphere.theme] || ATMOSPHERE_THEMES.horror;
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [isDucked, setIsDucked] = useState(false);

  // Khởi động âm thanh không gian khi người đọc vào trang bài viết
  useEffect(() => {
    let timer = null;
    if (atmosphere.soundEnabled !== false) {
      // Delay nhẹ 600ms để hiệu ứng chuyển trang hoàn tất mượt mà
      timer = setTimeout(() => {
        try {
          startPostAtmosphere(atmosphere.theme, volume);
          setIsPlaying(true);
        } catch (e) {
          // Trình duyệt có thể cần tương tác click của người dùng
          setIsPlaying(false);
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
        borderRadius: '12px',
        border: `1.5px solid ${themeMeta.accentColor}50`,
        background: `linear-gradient(135deg, ${themeMeta.accentColor}15 0%, rgba(255, 255, 255, 0.95) 100%)`,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 4px 18px ${themeMeta.accentColor}18`,
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
            color: isPlaying ? '#ffffff' : '#475569',
            fontSize: '1.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isPlaying ? `0 4px 12px ${themeMeta.accentColor}40` : 'none',
            transition: 'all 0.2s ease',
          }}
          title={isPlaying ? 'Tạm dừng âm thanh không gian' : 'Bật âm thanh không gian cảm xúc'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.15rem' }}>{themeMeta.icon}</span>
            <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>
              Không Gian: {themeMeta.name}
            </strong>
            {isPlaying && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: `${themeMeta.accentColor}20`,
                  color: themeMeta.accentColor,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                <span className="live-sound-dot" />
                <span>Đang phát duy trì</span>
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {themeMeta.soundLabel}
            {isDucked && (
              <span style={{ color: '#0d9488', fontWeight: 600, marginLeft: '6px' }}>
                • (Đang chìm nhẹ vì phát nhạc cá nhân)
              </span>
            )}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '0.8rem', color: '#475569' }}>Âm lượng:</span>
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
        <span style={{ fontSize: '0.78rem', color: '#64748b', minWidth: '32px' }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};
