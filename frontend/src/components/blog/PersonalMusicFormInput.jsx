import React, { useState, useEffect } from 'react';
import { validatePersonalMusicUrl } from '../../utils/personalMusicUtils';

/**
 * 🎵 PersonalMusicFormInput
 * Component nhập và xác thực liên kết nhạc cá nhân (Spotify, SoundCloud, YouTube Music, Zing MP3)
 * Dùng chung cho CreatePostModal và EditPostModal.
 */
export const PersonalMusicFormInput = ({ value, onChange }) => {
  const currentMusic = value || { enabled: false, url: '', provider: '', title: '', artist: '' };
  const [urlInput, setUrlInput] = useState(currentMusic.url || '');
  const [validation, setValidation] = useState(() => validatePersonalMusicUrl(currentMusic.url || ''));

  useEffect(() => {
    setUrlInput(currentMusic.url || '');
    setValidation(validatePersonalMusicUrl(currentMusic.url || ''));
  }, [currentMusic.url]);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrlInput(newUrl);

    if (!newUrl.trim()) {
      setValidation({ isValid: false, reason: 'URL trống' });
      onChange?.({
        enabled: false,
        url: '',
        provider: '',
        title: currentMusic.title || '',
        artist: currentMusic.artist || '',
      });
      return;
    }

    const res = validatePersonalMusicUrl(newUrl.trim());
    setValidation(res);

    if (res.isValid) {
      onChange?.({
        enabled: true,
        url: newUrl.trim(),
        provider: res.provider,
        title: currentMusic.title || '',
        artist: currentMusic.artist || '',
      });
    } else {
      onChange?.({
        ...currentMusic,
        url: newUrl.trim(),
      });
    }
  };

  const handleClearUrl = () => {
    setUrlInput('');
    setValidation({ isValid: false, reason: 'URL trống' });
    onChange?.({
      enabled: false,
      url: '',
      provider: '',
      title: '',
      artist: '',
    });
  };

  const handleMetadataChange = (field, val) => {
    onChange?.({
      ...currentMusic,
      [field]: val,
    });
  };

  const getProviderBadge = (provider) => {
    switch (provider) {
      case 'spotify':
        return { name: 'Spotify', color: '#1db954', icon: 'fa-brands fa-spotify' };
      case 'soundcloud':
        return { name: 'SoundCloud', color: '#ff5500', icon: 'fa-brands fa-soundcloud' };
      case 'youtube':
        return { name: 'YouTube Music', color: '#ff0000', icon: 'fa-brands fa-youtube' };
      case 'zingmp3':
        return { name: 'Zing MP3', color: '#8b5cf6', icon: 'fa-solid fa-music' };
      default:
        return null;
    }
  };

  const badge = validation.isValid ? getProviderBadge(validation.provider) : null;

  return (
    <div
      style={{
        marginTop: '14px',
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(14, 165, 233, 0.22)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label
          style={{
            fontWeight: 700,
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.95rem',
            margin: 0,
          }}
        >
          <span>🎧</span>
          <span>Đính Kèm Nhạc Cá Nhân (Spotify / SoundCloud / YouTube / Zing MP3)</span>
        </label>
        {validation.isValid && badge && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
              backgroundColor: `${badge.color}20`,
              color: badge.color,
              border: `1px solid ${badge.color}50`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className={badge.icon}></i>
            <span>{badge.name}</span>
          </span>
        )}
      </div>

      <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
        Dán liên kết bài hát bạn yêu thích để người đọc vừa thưởng thức bài viết vừa nghe giai điệu đồng điệu. Hệ thống tự nhận diện và hiển thị dưới dạng thẻ phát nhạc tinh tế.
      </p>

      {/* Input Link */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="url"
          value={urlInput}
          onChange={handleUrlChange}
          placeholder="Ví dụ: https://open.spotify.com/track/... hoặc https://youtu.be/... hoặc Zing MP3"
          style={{
            width: '100%',
            padding: '9px 36px 9px 12px',
            borderRadius: '8px',
            border: validation.isValid
              ? '1.5px solid #10b981'
              : urlInput.trim()
              ? '1.5px solid #f59e0b'
              : '1px solid #cbd5e1',
            fontSize: '0.86rem',
            background: '#ffffff',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {urlInput && (
          <button
            type="button"
            onClick={handleClearUrl}
            title="Xóa link nhạc"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Trạng thái xác thực & Gợi ý */}
      {urlInput.trim() && !validation.isValid && (
        <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>⚠️</span>
          <span>{validation.reason || 'Liên kết chưa đúng định dạng hoặc không nằm trong danh sách hỗ trợ.'}</span>
        </div>
      )}

      {/* Khi link hợp lệ: Cho phép nhập tên bài hát & nghệ sĩ (Tùy chọn) */}
      {validation.isValid && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px dashed rgba(14, 165, 233, 0.25)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
          }}
        >
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Tên bài hát (tùy chọn):
            </label>
            <input
              type="text"
              value={currentMusic.title || ''}
              onChange={(e) => handleMetadataChange('title', e.target.value)}
              placeholder="VD: Chuyện Đôi Ta, Bật Tình Yêu Lên..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Nghệ sĩ / Ca sĩ (tùy chọn):
            </label>
            <input
              type="text"
              value={currentMusic.artist || ''}
              onChange={(e) => handleMetadataChange('artist', e.target.value)}
              placeholder="VD: Emcee L, Hòa Minzy..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* Danh sách logo hỗ trợ dưới dạng chip nhỏ */}
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Hỗ trợ:</span>
        {[
          { name: 'Spotify', color: '#1db954', icon: 'fa-brands fa-spotify' },
          { name: 'SoundCloud', color: '#ff5500', icon: 'fa-brands fa-soundcloud' },
          { name: 'YouTube Music', color: '#ef4444', icon: 'fa-brands fa-youtube' },
          { name: 'Zing MP3', color: '#8b5cf6', icon: 'fa-solid fa-music' },
        ].map((p) => (
          <span
            key={p.name}
            style={{
              fontSize: '0.72rem',
              color: '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid #e2e8f0',
            }}
          >
            <i className={p.icon} style={{ color: p.color, fontSize: '0.75rem' }}></i>
            <span>{p.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
