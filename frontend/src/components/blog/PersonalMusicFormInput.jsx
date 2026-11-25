import React, { useState, useEffect } from 'react';
import { validatePersonalMusicUrl } from '../../utils/personalMusicUtils';

const extractSearchKeyword = (rawValue) => {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    /^www\./i.test(trimmed) ||
    /^(?:open\.)?spotify\.com\b/i.test(trimmed) ||
    /^(?:m\.|on\.)?soundcloud\.com\b/i.test(trimmed) ||
    /^(?:music\.|www\.|m\.)?youtube\.com\b/i.test(trimmed) ||
    /^youtu\.be\b/i.test(trimmed) ||
    /^(?:mp3\.)?zingmp3\.vn\b/i.test(trimmed);
  return looksLikeUrl ? '' : trimmed;
};

const MUSIC_PLATFORMS = [
  {
    id: 'spotify',
    name: 'Spotify',
    color: '#1db954',
    icon: 'fa-brands fa-spotify',
    buildUrl: (keyword) =>
      keyword
        ? `https://open.spotify.com/search/${encodeURIComponent(keyword)}`
        : 'https://open.spotify.com/search',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    color: '#ff5500',
    icon: 'fa-brands fa-soundcloud',
    buildUrl: (keyword) =>
      keyword
        ? `https://soundcloud.com/search?q=${encodeURIComponent(keyword)}`
        : 'https://soundcloud.com/search',
  },
  {
    id: 'youtube',
    name: 'YouTube Music',
    color: '#ef4444',
    icon: 'fa-brands fa-youtube',
    buildUrl: (keyword) =>
      keyword
        ? `https://music.youtube.com/search?q=${encodeURIComponent(keyword)}`
        : 'https://music.youtube.com/search',
  },
  {
    id: 'zingmp3',
    name: 'Zing MP3',
    color: '#8b5cf6',
    icon: 'fa-solid fa-music',
    buildUrl: (keyword) =>
      keyword
        ? `https://zingmp3.vn/tim-kiem/tat-ca?q=${encodeURIComponent(keyword)}`
        : 'https://zingmp3.vn',
  },
];

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
  const searchKeyword = extractSearchKeyword(urlInput);

  return (
    <div
      className="personal-music-form-card"
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        marginTop: '14px',
        marginLeft: 0,
        marginRight: 0,
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(14, 165, 233, 0.22)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '6px',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <label
          style={{
            fontWeight: 700,
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            fontSize: '0.95rem',
            lineHeight: 1.4,
            margin: 0,
            flex: '1 1 auto',
            minWidth: 0,
            maxWidth: '100%',
            overflowWrap: 'anywhere',
          }}
        >
          <span aria-hidden="true">🎧</span>
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
              flexShrink: 0,
            }}
          >
            <i className={badge.icon}></i>
            <span>{badge.name}</span>
          </span>
        )}
      </div>

      <p
        style={{
          margin: '0 0 10px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          fontSize: '0.8rem',
          color: '#64748b',
          lineHeight: 1.45,
          overflowWrap: 'anywhere',
        }}
      >
        Dán liên kết bài hát bạn yêu thích (hoặc nhập tên bài hát rồi bấm mở nhanh nền tảng bên dưới để lấy link). Hệ thống tự nhận diện và hiển thị dưới dạng thẻ phát nhạc tinh tế.
      </p>

      {/* Input Link */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <input
          type="url"
          value={urlInput}
          onChange={handleUrlChange}
          placeholder="Ví dụ: https://open.spotify.com/track/... hoặc gõ tên bài hát"
          style={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            marginLeft: 0,
            marginRight: 0,
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
        <div
          style={{
            marginTop: '6px',
            fontSize: '0.78rem',
            color: '#b45309',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '5px',
            lineHeight: 1.4,
            overflowWrap: 'anywhere',
          }}
        >
          <span>⚠️</span>
          <span>
            {searchKeyword
              ? `Đang dùng "${searchKeyword}" làm từ khóa tìm kiếm — bấm nút nền tảng bên dưới để mở và chép link bài hát.`
              : validation.error || validation.reason || 'Liên kết chưa đúng định dạng hoặc không nằm trong danh sách hỗ trợ.'}
          </span>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
            gap: '10px',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ minWidth: 0, maxWidth: '100%' }}>
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
                maxWidth: '100%',
                minWidth: 0,
                marginLeft: 0,
                marginRight: 0,
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ minWidth: 0, maxWidth: '100%' }}>
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
                maxWidth: '100%',
                minWidth: 0,
                marginLeft: 0,
                marginRight: 0,
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

      {/* Nút mở nhanh 4 nền tảng âm nhạc ở tab mới */}
      <div
        className="personal-music-platforms-bar"
        style={{
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          flexWrap: 'wrap',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 600,
            color: '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.68rem', color: '#0284c7' }} aria-hidden="true"></i>
          <span>Mở nhanh để chọn nhạc:</span>
        </span>
        {MUSIC_PLATFORMS.map((p) => {
          const targetUrl = p.buildUrl(searchKeyword);
          return (
            <a
              key={p.id}
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="personal-music-platform-btn"
              style={{ '--platform-color': p.color }}
              onClick={(e) => {
                e.preventDefault();
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
              }}
              title={
                searchKeyword
                  ? `Tìm "${searchKeyword}" trên ${p.name} (mở tab mới)`
                  : `Mở ${p.name} ở tab mới để chọn bài hát`
              }
            >
              <i className={p.icon} style={{ color: p.color, fontSize: '0.78rem' }} aria-hidden="true"></i>
              <span>{p.name}</span>
              <i className="fa-solid fa-up-right-from-square platform-ext-icon" aria-hidden="true"></i>
            </a>
          );
        })}
      </div>
    </div>
  );
};
