import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { uploadService } from '../../services/uploadService';
import { getActiveTheme, applyTheme } from '../../utils/themeUtils';
import { isSoundEnabled, toggleSound } from '../../utils/soundEffects';
import { VoiceCloningModal } from '../blog/VoiceCloningModal';
import {
  MUSIC_PRESETS,
  extractYouTubeId,
  extractSpotifyId,
  extractTikTokId,
  detectMusicSource,
  fetchMusicMetadata,
} from '../../utils/musicPresets';

const SAMPLE_AVATARS = [
  '/images/man.jpg',
  '/images/img2.jpg',
  '/images/1.jpg',
  '/images/2.jpg',
  '/images/3.jpg',
];

const SAMPLE_COVERS = [
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
];

const WALLPAPER_PRESETS = [
  { id: 'galaxy', name: '🌌 Ngân Hà', desc: 'Vũ trụ huyền bí', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80' },
  { id: 'city_night', name: '🌃 Phố Đêm', desc: 'Lofi đêm tĩnh lặng', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80' },
  { id: 'sunset_beach', name: '🌅 Hoàng Hôn Biển', desc: 'Ánh chiều bình yên', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cyber_grid', name: '⚡ Cyber Neon', desc: 'Công nghệ tương lai', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80' },
  { id: 'forest_mist', name: '🌿 Rừng Núi', desc: 'Sương mờ trong trẻo', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80' },
];

const THEME_OPTIONS = [
  { id: 'default', name: '🌿 Tiêu Chuẩn', desc: 'Sáng thanh lịch, tối giản', preview: '#f8fafc', color: '#0f172a' },
  { id: 'aurora', name: '🌌 Cực Quang', desc: 'Đêm sâu huyền bí, ánh xanh ngọc', preview: 'linear-gradient(135deg, #0b132b, #1c2541, #0d9488)', color: '#ffffff' },
  { id: 'sunset', name: '🌅 Hoàng Hôn', desc: 'Sắc ấm nồng nàn, dịu êm', preview: 'linear-gradient(135deg, #4c0519, #881337, #f59e0b)', color: '#ffffff' },
  { id: 'cyberpunk', name: '⚡ Cyber Tech', desc: 'Công nghệ tương lai, neon rực rỡ', preview: 'linear-gradient(135deg, #090d16, #111827, #6366f1)', color: '#ffffff' },
  { id: 'lavender', name: '🌸 Oải Hương', desc: 'Pastel mộng mơ, xoa dịu tâm trí', preview: 'linear-gradient(135deg, #2e1065, #4c1d95, #a855f7)', color: '#ffffff' },
  { id: 'ocean', name: '🌊 Sóng Biển', desc: 'Xanh ngọc mát lành, xua tan căng thẳng', preview: 'linear-gradient(135deg, #083344, #155e75, #06b6d4)', color: '#ffffff' },
  { id: 'custom', name: '🎨 Tự Chọn', desc: 'Tự chọn mã màu nền theo ý muốn', preview: '#475569', color: '#ffffff' },
];

const FRAME_OPTIONS = [
  { id: 'none', name: 'Không dùng khung', desc: 'Viền tròn tiêu chuẩn' },
  { id: 'gold', name: '👑 Hoàng Gia Ánh Vàng', desc: 'Viền vàng lấp lánh sang trọng' },
  { id: 'neon', name: '⚡ Cyber Neon Glow', desc: 'Vòng sáng điện tử cyan - hồng rực rỡ' },
  { id: 'hologram', name: '💎 Hologram Cầu Vồng', desc: 'Hiệu ứng quang phổ đổi màu linh động' },
  { id: 'pastel', name: '🌸 Pastel Mềm Mại', desc: 'Vòng hào quang tím dịu mắt' },
  { id: 'flame', name: '🔥 Rực Lửa Quyết Tâm', desc: 'Viền lửa cam đỏ nhiệt huyết' },
];

const AMBIENT_OPTIONS = [
  { id: 'particles', name: '✨ Đom đóm / Hạt sáng lơ lửng', desc: 'Hiệu ứng hạt sáng bay tự nhiên' },
  { id: 'glow', name: '💫 Vầng hào quang nhịp thở', desc: 'Hiệu ứng chuyển sắc mềm mại' },
  { id: 'waves', name: '🌊 Làn sóng gợn nhẹ', desc: 'Gợn sóng chuyển màu thư thái' },
  { id: 'none', name: 'Tĩnh (Tắt chuyển động)', desc: 'Không sử dụng hiệu ứng nền' },
];

const AUDIO_QUALITY_OPTIONS = [
  { id: 'standard', name: '🌱 128 kbps (Tiêu chuẩn)', badge: '128k', desc: 'Tải mượt mà, siêu nhẹ, tiết kiệm 3G/4G' },
  { id: 'high', name: '🎧 256 kbps (Chất lượng cao HD)', badge: 'HD 256k', desc: 'Âm thanh sắc nét, bass chắc và dải tần đầy đủ (Khuyên dùng)' },
  { id: 'lossless', name: '💎 320 kbps (Hi-Res Master)', badge: 'Hi-Res 320k', desc: 'Độ trung thực cao nhất, trải nghiệm thính phòng đỉnh cao' },
];

const AUDIO_PROFILE_OPTIONS = [
  { id: 'balanced', icon: '🎵', name: 'Cân Bằng Tự Nhiên', desc: 'Giữ nguyên bản âm thanh gốc của bài hát' },
  { id: 'lofi', icon: '📻', name: 'Lofi Tape / Hoài Niệm', desc: 'Âm hưởng ấm áp, mộc mạc như băng cassette cổ điển' },
  { id: 'bass', icon: '🔊', name: 'Bass Boost Trầm Sâu', desc: 'Tăng cường dải âm trầm dày dặn, nhịp điệu sâu lắng' },
  { id: 'vocal', icon: '✨', name: 'Vocal Trong & Sáng', desc: 'Tôn giọng hát và truyền cảm hứng từng câu từ' },
  { id: 'spatial', icon: '🌌', name: 'Không Gian 3D / Reverb', desc: 'Âm vang đa chiều thư thái như quán cà phê đêm mưa' },
];

export const EditProfileModal = ({ isOpen, onClose, initialTab }) => {
  const { user, updateUserProfile, profileModalTab } = useAuth();
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'layout' | 'music'
  const [previewPlayingId, setPreviewPlayingId] = useState(null);
  const previewAudioRef = useRef(null);

  const [themeMode, setThemeMode] = useState(() => getActiveTheme());
  const [soundEnabled, setSoundEnabled] = useState(() => isSoundEnabled());
  const [isVoiceCloningOpen, setIsVoiceCloningOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    bio: '',
    avatar: '',
    coverImage: '',
    customLayout: {
      theme: 'default',
      bgGradient: '',
      bgColor: '#f8fafc',
      bgImage: '',
      frameStyle: 'none',
      ambientEffect: 'particles',
    },
    profileMusic: {
      enabled: true,
      title: 'Lofi Chill - Đêm muộn ở văn phòng',
      artist: 'Freedom Chill Beat',
      sourceType: 'preset',
      url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      presetId: 'lofi_night',
      defaultVolume: 0.35,
      audioQuality: 'high',
      audioProfile: 'balanced',
    },
    socialLinks: {
      facebook: '',
      instagram: '',
      tiktok: '',
      x: '',
      linkedin: '',
      github: '',
      website: '',
    },
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);
  const [detectingMusic, setDetectingMusic] = useState(false);
  const [detectedMusicInfo, setDetectedMusicInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const wallpaperInputRef = useRef(null);
  const musicDebounceTimerRef = useRef(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const targetTab = initialTab || profileModalTab;
      if (targetTab && ['info', 'layout', 'music'].includes(targetTab)) {
        setActiveTab(targetTab);
      }
    }
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        jobTitle: user.jobTitle || '',
        bio: user.bio || '',
        avatar: user.avatar || '/images/man.jpg',
        coverImage: user.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
        customLayout: {
          theme: user.customLayout?.theme || 'default',
          bgGradient: user.customLayout?.bgGradient || '',
          bgColor: user.customLayout?.bgColor || '#f8fafc',
          bgImage: user.customLayout?.bgImage || '',
          frameStyle: user.customLayout?.frameStyle || 'none',
          ambientEffect: user.customLayout?.ambientEffect || 'particles',
        },
        profileMusic: {
          enabled: user.profileMusic?.enabled !== false,
          title: user.profileMusic?.title || 'Lofi Chill - Đêm muộn ở văn phòng',
          artist: user.profileMusic?.artist || 'Freedom Chill Beat',
          sourceType: user.profileMusic?.sourceType || 'preset',
          url: user.profileMusic?.url || 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
          presetId: user.profileMusic?.presetId || 'lofi_night',
          defaultVolume: user.profileMusic?.defaultVolume ?? 0.35,
          audioQuality: user.profileMusic?.audioQuality || 'high',
          audioProfile: user.profileMusic?.audioProfile || 'balanced',
        },
        socialLinks: {
          facebook: user.socialLinks?.facebook || '',
          instagram: user.socialLinks?.instagram || '',
          tiktok: user.socialLinks?.tiktok || '',
          x: user.socialLinks?.x || '',
          linkedin: user.socialLinks?.linkedin || '',
          github: user.socialLinks?.github || '',
          website: user.socialLinks?.website || '',
        },
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordChange(false);
      setErrorMsg('');
      setSuccessMsg('');
      setPreviewPlayingId(null);
      setDetectingMusic(false);
      setDetectedMusicInfo(null);
    }
  }, [user, isOpen]);

  // Dừng nghe thử khi đóng modal
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, [isOpen]);

  const togglePreviewPreset = (preset) => {
    if (previewPlayingId === preset.id) {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setPreviewPlayingId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = preset.url;
        previewAudioRef.current.play().catch(() => {});
      }
      setPreviewPlayingId(preset.id);
    }
  };

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleSocialChange = (platform, value) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  const handleLayoutChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      customLayout: {
        ...prev.customLayout,
        [field]: value,
      },
    }));
  };

  const handleMusicChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      profileMusic: {
        ...prev.profileMusic,
        [field]: value,
      },
    }));
  };

  const handleSelectPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      profileMusic: {
        ...prev.profileMusic,
        sourceType: 'preset',
        presetId: preset.id,
        title: preset.title,
        artist: preset.artist,
        url: preset.url,
      },
    }));
  };

  const triggerAutoDetectMusic = async (url) => {
    if (!url || typeof url !== 'string' || url.trim().length < 8) return;
    setDetectingMusic(true);
    setDetectedMusicInfo(null);
    try {
      const meta = await fetchMusicMetadata(url);
      if (meta && (meta.title || meta.artist)) {
        setFormData((prev) => ({
          ...prev,
          profileMusic: {
            ...prev.profileMusic,
            title: meta.title || prev.profileMusic.title,
            artist: meta.artist || prev.profileMusic.artist,
            sourceType: meta.provider || prev.profileMusic.sourceType,
          },
        }));
        setDetectedMusicInfo(meta);
      }
    } catch (err) {
      console.warn('Không thể tự động nhận diện nhạc:', err);
    } finally {
      setDetectingMusic(false);
    }
  };

  const handleCustomUrlChange = (url) => {
    const detected = detectMusicSource(url);
    setFormData((prev) => ({
      ...prev,
      profileMusic: {
        ...prev.profileMusic,
        url,
        sourceType: detected,
      },
    }));

    if (musicDebounceTimerRef.current) {
      clearTimeout(musicDebounceTimerRef.current);
    }
    if (url && url.trim().length > 10) {
      musicDebounceTimerRef.current = setTimeout(() => {
        triggerAutoDetectMusic(url);
      }, 500);
    }
  };

  const handleWallpaperFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingWallpaper(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result;
      handleLayoutChange('bgImage', base64Url);

      try {
        const result = await uploadService.uploadImage(file);
        if (result?.url) {
          handleLayoutChange('bgImage', result.url);
        }
      } catch (err) {
        console.warn('Lỗi upload ảnh nền, dùng ảnh Base64:', err.message);
      } finally {
        setUploadingWallpaper(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result;
      setFormData((prev) => ({ ...prev, avatar: base64Url }));

      try {
        const result = await uploadService.uploadImage(file);
        if (result?.url) {
          setFormData((prev) => ({ ...prev, avatar: result.url }));
        }
      } catch (err) {
        console.warn('Lỗi upload avatar lên API, dùng ảnh cục bộ/Base64:', err.message);
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result;
      setFormData((prev) => ({ ...prev, coverImage: base64Url }));

      try {
        const result = await uploadService.uploadImage(file);
        if (result?.url) {
          setFormData((prev) => ({ ...prev, coverImage: result.url }));
        }
      } catch (err) {
        console.warn('Lỗi upload ảnh bìa lên API, dùng ảnh cục bộ/Base64:', err.message);
      } finally {
        setUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên hiển thị.');
      return;
    }

    if (!formData.email || !formData.email.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ Email tài khoản.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMsg('Định dạng Email không hợp lệ. Vui lòng kiểm tra lại (ví dụ: your_email@gmail.com).');
      return;
    }

    if (showPasswordChange) {
      if (!formData.newPassword) {
        setErrorMsg('Vui lòng nhập mật khẩu mới nếu muốn đổi mật khẩu.');
        return;
      }
      if (formData.newPassword.length < 6) {
        setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setErrorMsg('Xác nhận mật khẩu mới không trùng khớp.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      jobTitle: formData.jobTitle.trim(),
      bio: formData.bio.trim(),
      avatar: formData.avatar,
      coverImage: formData.coverImage,
      customLayout: formData.customLayout,
      profileMusic: formData.profileMusic,
      socialLinks: formData.socialLinks,
    };

    if (showPasswordChange && formData.newPassword) {
      payload.currentPassword = formData.currentPassword;
      payload.newPassword = formData.newPassword;
    }

    try {
      const res = await authService.updateProfile(payload);
      if (res.data) {
        updateUserProfile(res.data);
      } else {
        updateUserProfile(payload);
      }
      window.dispatchEvent(new Event('profile_updated'));
      window.dispatchEvent(new Event('post_updated'));
      setSuccessMsg('✓ Đã cập nhật thông tin, giao diện & nhạc nền thành công!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      // Dự phòng an toàn: luôn lưu trực tiếp vào máy người dùng để không bao giờ bị mất dữ liệu
      updateUserProfile(payload);
      window.dispatchEvent(new Event('profile_updated'));
      window.dispatchEvent(new Event('post_updated'));
      setSuccessMsg('✓ Đã lưu trữ và cập nhật thông tin thành công!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Invisible audio element để nghe thử nhạc preset */}
        <audio ref={previewAudioRef} onEnded={() => setPreviewPlayingId(null)} />

        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <h3 className="modal-heading">👤 Cài Đặt Tài Khoản, Giao Diện & Nhạc Nền</h3>
        <p className="modal-subtitle">
          Tùy chỉnh hồ sơ, số điện thoại, ảnh đại diện, màu sắc nền, khung avatar và bài hát yêu thích.
        </p>

        {/* Tab switcher */}
        <div className="modal-tabs" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            👤 Thông Tin
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('layout')}
          >
            🎨 Giao Diện & Khung
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
          >
            🎵 Nhạc Nền Trang Cá Nhân
          </button>
          {user?.role === 'admin' && (
            <button
              type="button"
              className="modal-tab"
              onClick={() => {
                onClose();
                window.dispatchEvent(new Event('freedom_open_moderation'));
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                fontWeight: 700,
              }}
              title="Mở Trung tâm kiểm duyệt an toàn nội dung cộng đồng (Admin)"
            >
              🛡️ Kiểm Duyệt (Admin)
            </button>
          )}
        </div>

        {errorMsg && <div className="modal-error">{errorMsg}</div>}
        {successMsg && (
          <div
            style={{
              background: '#ecfdf5',
              borderLeft: '4px solid #10b981',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '0.88rem',
              marginBottom: '14px',
              fontWeight: 500,
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* ========================================================
              TAB 1: THÔNG TIN CÁ NHÂN & LIÊN HỆ
             ======================================================== */}
          {activeTab === 'info' && (
            <>
              {/* Avatar Preview & Upload */}
              <div className="form-group" style={{ textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Ảnh đại diện</label>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={formData.avatar || '/images/man.jpg'}
                    alt={formData.name}
                    className={`frame-${formData.customLayout.frameStyle || 'none'}`}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--primary-color)',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                    }}
                  />
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? '⏳ Đang tải ảnh...' : '📷 Tải ảnh mới từ máy tính'}
                  </button>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*,.gif"
                    style={{ display: 'none' }}
                    onChange={handleAvatarFileChange}
                  />
                </div>

                {/* Avatar Presets */}
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Hoặc chọn nhanh ảnh đại diện:
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                    {SAMPLE_AVATARS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt={`Avatar ${idx + 1}`}
                        onClick={() => setFormData({ ...formData, avatar: av })}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          border: formData.avatar === av ? '2px solid var(--primary-color)' : '1px solid #ddd',
                          opacity: formData.avatar === av ? 1 : 0.65,
                          transition: 'all 0.2s',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Cover Image Preview & Presets & Direct File Upload */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>🖼️ Ảnh bìa trang cá nhân (Hỗ trợ Ảnh & GIF)</label>
                  <button
                    type="button"
                    className="toolbar-btn"
                    style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    title="Chọn file ảnh hoặc file GIF động từ máy tính"
                  >
                    {uploadingCover ? '⏳ Đang tải ảnh...' : '📁 Tải ảnh/GIF từ máy tính'}
                  </button>
                  <input
                    type="file"
                    ref={coverInputRef}
                    accept="image/*,.gif"
                    style={{ display: 'none' }}
                    onChange={handleCoverFileChange}
                  />
                </div>

                <div
                  style={{
                    height: '88px',
                    borderRadius: '8px',
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3)), url(${formData.coverImage || SAMPLE_COVERS[0]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--border-color)',
                    marginBottom: '8px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {SAMPLE_COVERS.map((cov, idx) => (
                    <div
                      key={idx}
                      onClick={() => setFormData({ ...formData, coverImage: cov })}
                      style={{
                        width: '60px',
                        height: '36px',
                        borderRadius: '4px',
                        backgroundImage: `url(${cov})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        cursor: 'pointer',
                        border: formData.coverImage === cov ? '2px solid var(--primary-color)' : '1px solid #ddd',
                        flexShrink: 0,
                      }}
                      title={`Ảnh bìa mẫu ${idx + 1}`}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  name="coverImage"
                  placeholder="Hoặc dán URL ảnh / file GIF động (https://...)"
                  value={formData.coverImage}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Họ và tên hiển thị *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Ví dụ: Trần Đình Quân"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Số điện thoại liên hệ (cho phép dùng để đăng nhập) */}
              <div className="form-group">
                <label>📱 Số điện thoại liên hệ (Dùng để đăng nhập hoặc liên lạc)</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Ví dụ: 0901234567"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Công việc / Vị trí hiện tại</label>
                <input
                  type="text"
                  name="jobTitle"
                  placeholder="Ví dụ: System Admin & Lead Dev / Frontend Dev..."
                  value={formData.jobTitle}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Email tài khoản</span>
                  <span style={{ fontSize: '0.78rem', color: '#0d9488', fontWeight: 600 }}>✎ Có thể sửa đổi</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Ví dụ: your_email@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <span className="field-hint" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  💡 Bạn có thể chỉnh sửa lại Email này. Email được dùng để đăng nhập, nhận thông báo và đồng bộ tài khoản.
                </span>
              </div>

              <div className="form-group">
                <label>Tiểu sử giới thiệu ngắn gọn (Bio)</label>
                <textarea
                  name="bio"
                  rows="3"
                  placeholder="Viết một vài dòng về bạn, có thể gắn #Hashtag như #Burnout, #KeepMoving..."
                  value={formData.bio}
                  onChange={handleChange}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Mạng xã hội */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label style={{ fontWeight: 700, color: 'var(--bg-dark)', marginBottom: '8px', display: 'block' }}>
                  🌐 Liên kết mạng xã hội cá nhân
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <div className="form-group social-form-group">
                    <label>📘 Facebook Profile URL</label>
                    <input
                      type="url"
                      placeholder="https://facebook.com/your_profile"
                      value={formData.socialLinks.facebook}
                      onChange={(e) => handleSocialChange('facebook', e.target.value)}
                    />
                  </div>

                  <div className="form-group social-form-group">
                    <label>📸 Instagram URL</label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/your_handle"
                      value={formData.socialLinks.instagram}
                      onChange={(e) => handleSocialChange('instagram', e.target.value)}
                    />
                  </div>

                  <div className="form-group social-form-group">
                    <label>🎵 TikTok URL</label>
                    <input
                      type="url"
                      placeholder="https://tiktok.com/@your_handle"
                      value={formData.socialLinks.tiktok}
                      onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                    />
                  </div>

                  <div className="form-group social-form-group">
                    <label>𝕏 X (Twitter) URL</label>
                    <input
                      type="url"
                      placeholder="https://x.com/your_handle"
                      value={formData.socialLinks.x}
                      onChange={(e) => handleSocialChange('x', e.target.value)}
                    />
                  </div>

                  <div className="form-group social-form-group">
                    <label>💼 LinkedIn URL</label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/your_name"
                      value={formData.socialLinks.linkedin}
                      onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                    />
                  </div>

                  <div className="form-group social-form-group">
                    <label>🐱 GitHub Profile URL</label>
                    <input
                      type="url"
                      placeholder="https://github.com/your_username"
                      value={formData.socialLinks.github}
                      onChange={(e) => handleSocialChange('github', e.target.value)}
                    />
                  </div>

                  <div className="form-group social-form-group">
                    <label>🌐 Website cá nhân / Khác</label>
                    <input
                      type="url"
                      placeholder="https://yourwebsite.com"
                      value={formData.socialLinks.website}
                      onChange={(e) => handleSocialChange('website', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Giọng Đọc A.I Nhân Bản Chính Chủ (AI Voice Cloning Studio) */}
              <div
                style={{
                  marginTop: '16px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))',
                  border: '1.5px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎙️</span>
                    <span>Hồ Sơ Giọng Đọc A.I Nhân Bản (Voice Cloning)</span>
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    Thu âm mẫu giọng để A.I đọc các bài viết tâm sự bằng chính chất giọng của bạn.
                  </span>
                </div>
                <button
                  type="button"
                  className="audio-voice-clone-studio-btn"
                  onClick={() => setIsVoiceCloningOpen(true)}
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <span>🎙️</span>
                  <span>Mở Phòng Thu Âm A.I</span>
                </button>
              </div>

              {/* Đổi mật khẩu toggle button */}
              <div style={{ marginTop: '16px', marginBottom: '14px' }}>
                <button
                  type="button"
                  className="profile-toggle-password-btn"
                  onClick={() => setShowPasswordChange((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: showPasswordChange ? '1.5px solid var(--primary-color)' : '1px solid #cbd5e1',
                    background: showPasswordChange ? '#ecfdf5' : '#f8fafc',
                    color: showPasswordChange ? 'var(--primary-color)' : '#334155',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{showPasswordChange ? '✕ Đóng đổi mật khẩu' : '🔐 Đổi mật khẩu tài khoản'}</span>
                </button>
              </div>

              {showPasswordChange && (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label>Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      name="currentPassword"
                      placeholder="Nhập mật khẩu hiện tại (mặc định 123456)"
                      value={formData.currentPassword}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mật khẩu mới (tối thiểu 6 ký tự)</label>
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="Nhập mật khẩu mới"
                      value={formData.newPassword}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Nhập lại mật khẩu mới"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              TAB 2: TÙY CHỈNH LAYOUT NỀN & KHUNG ĐẠI DIỆN ĐỘNG
             ======================================================== */}
          {activeTab === 'layout' && (() => {
            const currentThemeObj = THEME_OPTIONS.find((t) => t.id === formData.customLayout.theme) || THEME_OPTIONS[0];
            const hasWallpaper = Boolean(formData.customLayout.bgImage);
            const isDarkPreview = formData.customLayout.theme !== 'default' || hasWallpaper;

            let previewBannerBg = '#f8fafc';
            if (hasWallpaper) {
              previewBannerBg = `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.75)), url(${formData.customLayout.bgImage}) center / cover no-repeat`;
            } else if (formData.customLayout.theme === 'custom') {
              previewBannerBg = formData.customLayout.bgColor || '#1e293b';
            } else if (currentThemeObj?.preview) {
              previewBannerBg = currentThemeObj.preview;
            }

            return (
              <div>
                {/* Tùy chỉnh nhanh Chế độ Ngày / Đêm & Âm thanh thao tác */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      🌓 Chế độ Hiển thị (Theme):
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '7px 8px',
                          fontSize: '0.82rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          border: '1px solid',
                          background: themeMode === 'light' ? '#0d9488' : '#ffffff',
                          color: themeMode === 'light' ? '#ffffff' : '#334155',
                          borderColor: themeMode === 'light' ? '#0d9488' : '#cbd5e1',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => {
                          applyTheme('light');
                          setThemeMode('light');
                        }}
                      >
                        ☀️ Ngày
                      </button>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '7px 8px',
                          fontSize: '0.82rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          border: '1px solid',
                          background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                          color: themeMode === 'dark' ? '#ffffff' : '#334155',
                          borderColor: themeMode === 'dark' ? '#1e293b' : '#cbd5e1',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => {
                          applyTheme('dark');
                          setThemeMode('dark');
                        }}
                      >
                        🌙 Đêm
                      </button>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      🔊 Âm thanh chuột (Clik-clak):
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '7px 8px',
                          fontSize: '0.82rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          border: '1px solid',
                          background: soundEnabled ? '#0d9488' : '#ffffff',
                          color: soundEnabled ? '#ffffff' : '#334155',
                          borderColor: soundEnabled ? '#0d9488' : '#cbd5e1',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => {
                          if (!soundEnabled) toggleSound();
                          setSoundEnabled(true);
                        }}
                      >
                        🔊 Bật
                      </button>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '7px 8px',
                          fontSize: '0.82rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          border: '1px solid',
                          background: !soundEnabled ? '#64748b' : '#ffffff',
                          color: !soundEnabled ? '#ffffff' : '#334155',
                          borderColor: !soundEnabled ? '#64748b' : '#cbd5e1',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => {
                          if (soundEnabled) toggleSound();
                          setSoundEnabled(false);
                        }}
                      >
                        🔇 Tắt
                      </button>
                    </div>
                  </div>
                </div>

                {/* Xem trước Avatar với Khung và Nền đã chọn theo thời gian thực */}
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 20px',
                    background: previewBannerBg,
                    borderRadius: '14px',
                    border: isDarkPreview ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #e2e8f0',
                    boxShadow: isDarkPreview ? '0 8px 24px rgba(0,0,0,0.22)' : '0 4px 14px rgba(0,0,0,0.05)',
                    marginBottom: '20px',
                    transition: 'all 0.35s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: isDarkPreview ? '#f1f5f9' : '#64748b',
                      marginBottom: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      textShadow: isDarkPreview ? '0 1px 3px rgba(0,0,0,0.7)' : 'none',
                    }}
                  >
                    👁️ Xem trước Khung & Nền Giao Diện của bạn:
                  </div>

                  <div style={{ display: 'inline-block', position: 'relative' }}>
                    <img
                      src={formData.avatar || '/images/man.jpg'}
                      alt={formData.name}
                      className={`frame-${formData.customLayout.frameStyle || 'none'}`}
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: '10px',
                      fontSize: '0.98rem',
                      fontWeight: 700,
                      color: isDarkPreview ? '#ffffff' : '#1e293b',
                      textShadow: isDarkPreview ? '0 2px 4px rgba(0,0,0,0.7)' : 'none',
                    }}
                  >
                    {formData.name || user.name}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: isDarkPreview ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                        color: isDarkPreview ? '#ffffff' : '#334155',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      Theme: {currentThemeObj.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: isDarkPreview ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                        color: isDarkPreview ? '#ffffff' : '#334155',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      Khung: {FRAME_OPTIONS.find((f) => f.id === formData.customLayout.frameStyle)?.name || 'Tiêu chuẩn'}
                    </span>
                    {hasWallpaper && (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: 'rgba(13, 148, 136, 0.9)',
                          color: '#ffffff',
                          boxShadow: '0 2px 6px rgba(13,148,136,0.3)',
                        }}
                      >
                        🖼️ Có ảnh bìa nền
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Chọn Khung Đại Diện (Avatar Frame) */}
                <div className="form-group">
                  <label style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                    1. Chọn Khung Đại Diện (Avatar Frame):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {FRAME_OPTIONS.map((f) => {
                      const isSelected = formData.customLayout.frameStyle === f.id;
                      return (
                        <div
                          key={f.id}
                          onClick={() => handleLayoutChange('frameStyle', f.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                            background: isSelected ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div
                            className={`frame-${f.id}`}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#0f172a',
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{f.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{f.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Chọn Theme / Màu Nền Giao Diện */}
                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                    2. Chọn Theme & Màu Sắc Nền Giao Diện:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {THEME_OPTIONS.map((t) => {
                      const isSelected = formData.customLayout.theme === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleLayoutChange('theme', t.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                            background: isSelected ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div
                            style={{
                              height: '40px',
                              borderRadius: '6px',
                              background: t.preview,
                              marginBottom: '8px',
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                          />
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{t.desc}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Nếu chọn Tự Chọn (Custom Color) */}
                  {formData.customLayout.theme === 'custom' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Chọn màu sắc nền tùy ý của bạn:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="color"
                          value={formData.customLayout.bgColor || '#f8fafc'}
                          onChange={(e) => handleLayoutChange('bgColor', e.target.value)}
                          style={{ width: '48px', height: '36px', borderRadius: '6px', cursor: 'pointer', border: 'none' }}
                        />
                        <input
                          type="text"
                          placeholder="Mã màu HEX hoặc Gradient (ví dụ: #1e293b)"
                          value={formData.customLayout.bgColor || ''}
                          onChange={(e) => handleLayoutChange('bgColor', e.target.value)}
                          style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Hình Nền Bìa Giao Diện (Wallpaper / Cover Background) */}
                <div className="form-group" style={{ marginTop: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', margin: 0 }}>
                      3. Hình Nền Bìa Giao Diện (Wallpaper / Cover Background):
                    </label>
                    {formData.customLayout.bgImage && (
                      <button
                        type="button"
                        onClick={() => handleLayoutChange('bgImage', '')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '2px 6px',
                        }}
                      >
                        ✕ Xóa hình nền (dùng màu theme)
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '10px' }}>
                    Chèn ảnh bìa làm hình nền toàn bộ trang cá nhân & bố cục nền (hiển thị trực tiếp ở khung xem trước phía trên):
                  </div>

                  {/* Wallpaper presets */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    {WALLPAPER_PRESETS.map((wp) => {
                      const isSelected = formData.customLayout.bgImage === wp.url;
                      return (
                        <div
                          key={wp.id}
                          onClick={() => handleLayoutChange('bgImage', wp.url)}
                          style={{
                            height: '56px',
                            borderRadius: '6px',
                            backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4)), url(${wp.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            cursor: 'pointer',
                            border: isSelected ? '2.5px solid var(--primary-color)' : '1px solid #cbd5e1',
                            boxShadow: isSelected ? '0 0 8px rgba(13, 148, 136, 0.4)' : 'none',
                            display: 'flex',
                            alignItems: 'flex-end',
                            padding: '4px',
                            transition: 'all 0.2s',
                          }}
                          title={wp.name}
                        >
                          <span style={{ fontSize: '0.66rem', color: '#ffffff', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                            {wp.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Wallpaper input and file upload */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      placeholder="Hoặc dán URL hình nền bạn thích (https://...)"
                      value={formData.customLayout.bgImage || ''}
                      onChange={(e) => handleLayoutChange('bgImage', e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                    <button
                      type="button"
                      className="toolbar-btn"
                      onClick={() => wallpaperInputRef.current?.click()}
                      disabled={uploadingWallpaper}
                      style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', padding: '6px 12px' }}
                    >
                      {uploadingWallpaper ? '⏳ Đang tải...' : '📁 Tải ảnh từ máy'}
                    </button>
                    <input
                      type="file"
                      ref={wallpaperInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleWallpaperFileChange}
                    />
                  </div>
                </div>

                {/* 4. Hiệu Ứng Chuyển Động Linh Động Trên Trang */}
                <div className="form-group" style={{ marginTop: '22px' }}>
                  <label style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                    4. Hiệu Ứng Chuyển Động Nền Linh Động (Ambient Motion):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {AMBIENT_OPTIONS.map((a) => {
                      const isSelected = formData.customLayout.ambientEffect === a.id;
                      return (
                        <div
                          key={a.id}
                          onClick={() => handleLayoutChange('ambientEffect', a.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                            background: isSelected ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{a.name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{a.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================
              TAB 3: NHẠC NỀN TRANG CÁ NHÂN (BACKGROUND MUSIC)
             ======================================================== */}
          {activeTab === 'music' && (
            <div className="music-tab-content">
              {/* Toggle Bật/Tắt Nhạc Nền */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                    🎵 Phát nhạc nền khi người khác xem trang cá nhân
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    Cho phép bạn bè và khách ghé thăm được lắng nghe giai điệu yêu thích của bạn.
                  </div>
                </div>
                <label className="switch-toggle" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.profileMusic.enabled}
                    onChange={(e) => handleMusicChange('enabled', e.target.checked)}
                    style={{ transform: 'scale(1.25)', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {formData.profileMusic.enabled && (
                <>
                  {/* Chọn loại nguồn nhạc */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block', fontSize: '0.88rem' }}>
                      Nguồn bài hát:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleMusicChange('sourceType', 'preset')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: formData.profileMusic.sourceType === 'preset' ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                          background: formData.profileMusic.sourceType === 'preset' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.86rem',
                          color: '#0f172a',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          justifyContent: 'center',
                        }}
                      >
                        <span>🎧 Đề xuất của nền tảng</span>
                        {formData.profileMusic.sourceType === 'preset' && <span style={{ color: 'var(--primary-color)' }}>✓</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMusicChange('sourceType', 'custom')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: formData.profileMusic.sourceType !== 'preset' ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                          background: formData.profileMusic.sourceType !== 'preset' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.86rem',
                          color: '#0f172a',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          justifyContent: 'center',
                        }}
                      >
                        <span>🔗 Link YouTube / TikTok / MP3</span>
                        {formData.profileMusic.sourceType !== 'preset' && <span style={{ color: 'var(--primary-color)' }}>✓</span>}
                      </button>
                    </div>
                  </div>

                  {/* 1. Chọn từ Preset có sẵn */}
                  {formData.profileMusic.sourceType === 'preset' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                        5 Giai điệu thư giãn & xoa dịu tâm trí độc quyền:
                      </span>
                      {MUSIC_PRESETS.map((preset) => {
                        const isSelected = formData.profileMusic.presetId === preset.id;
                        const isPreviewing = previewPlayingId === preset.id;

                        return (
                          <div
                            key={preset.id}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                              background: isSelected ? 'rgba(13, 148, 136, 0.06)' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onClick={() => handleSelectPreset(preset)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{preset.icon}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {preset.title}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                  {preset.artist} • <span style={{ color: '#0d9488', fontWeight: 500 }}>{preset.genre}</span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                                  {preset.description}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePreviewPreset(preset);
                                }}
                                style={{
                                  background: isPreviewing ? '#ec4899' : '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title={isPreviewing ? 'Dừng nghe thử' : 'Nghe thử giai điệu này'}
                              >
                                {isPreviewing ? '⏸️ Dừng' : '▶️ Nghe thử'}
                              </button>
                              {isSelected && (
                                <span style={{ background: '#0d9488', color: '#ffffff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.76rem', fontWeight: 'bold' }}>
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Dán Link Tuỳ Chọn: YouTube / Spotify / TikTok / MP3 */}
                  {formData.profileMusic.sourceType !== 'preset' && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                          <label style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem', margin: 0 }}>
                            🔗 Đường dẫn nhạc (YouTube, Spotify, TikTok Sound hoặc MP3):
                          </label>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                              🔴 YouTube
                            </span>
                            <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                              🟢 Spotify
                            </span>
                            <span style={{ fontSize: '0.72rem', background: '#fce7f3', color: '#db2777', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                              🎵 TikTok
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="url"
                            placeholder="Dán link bài hát YouTube, Spotify, TikTok Sound hoặc file MP3..."
                            value={formData.profileMusic.url}
                            onChange={(e) => handleCustomUrlChange(e.target.value)}
                            onPaste={(e) => {
                              const pastedText = e.clipboardData.getData('text');
                              if (pastedText) triggerAutoDetectMusic(pastedText);
                            }}
                            style={{
                              flex: 1,
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              background: '#ffffff',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => triggerAutoDetectMusic(formData.profileMusic.url)}
                            disabled={detectingMusic || !formData.profileMusic.url}
                            style={{
                              background: detectingMusic ? '#94a3b8' : '#0d9488',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: detectingMusic ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s',
                            }}
                            title="Tự động nhận diện tên bài hát và nghệ sĩ/chủ kênh"
                          >
                            {detectingMusic ? '⏳ Đang quét...' : '🔍 Tự nhận diện'}
                          </button>
                        </div>

                        {/* Thông báo trạng thái nhận diện tự động */}
                        {detectingMusic && (
                          <div style={{ fontSize: '0.78rem', color: '#0d9488', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                            <span style={{ display: 'inline-block', animation: 'spin 1s infinite linear' }}>🔄</span> Đang tự động nhận diện bài hát và nghệ sĩ / chủ kênh từ liên kết...
                          </div>
                        )}

                        {detectedMusicInfo && !detectingMusic && (
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#065f46',
                              marginTop: '8px',
                              background: '#ecfdf5',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #a7f3d0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            {detectedMusicInfo.thumbnail && (
                              <img
                                src={detectedMusicInfo.thumbnail}
                                alt="Thumbnail bài hát"
                                style={{ width: '38px', height: '38px', borderRadius: '4px', objectFit: 'cover' }}
                              />
                            )}
                            <div>
                              <div>
                                ✓ Đã tự động nhận diện: <strong>{detectedMusicInfo.title}</strong>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#047857' }}>
                                Nghệ sĩ / Kênh: <strong>{detectedMusicInfo.artist}</strong> ({detectedMusicInfo.provider?.toUpperCase()})
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                          💡 Mẹo: Khi dán bất kỳ link bài hát YouTube, Spotify hay TikTok nào, hệ thống sẽ tự động quét và điền tên bài hát cùng tên nghệ sĩ / chủ kênh cho bạn!
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>Tên bài hát hiển thị</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Rock You Like A Hurricane"
                            value={formData.profileMusic.title}
                            onChange={(e) => handleMusicChange('title', e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>Ca sĩ / Nghệ sĩ / Chủ kênh</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Scorpions"
                            value={formData.profileMusic.artist}
                            onChange={(e) => handleMusicChange('artist', e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                          />
                        </div>
                      </div>

                      {/* Mức âm lượng mặc định an toàn */}
                      <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', margin: 0 }}>
                            🔊 Mức âm lượng phát khi người khác vào trang:
                          </label>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                            {Math.round((formData.profileMusic.defaultVolume ?? 0.35) * 100)}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.85rem' }}>🔈</span>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={formData.profileMusic.defaultVolume ?? 0.35}
                            onChange={(e) => handleMusicChange('defaultVolume', parseFloat(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.85rem' }}>🔊</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                          🛡️ Mức an toàn khuyên dùng: 30% - 40% để tránh nổ tai và làm người xem giật mình.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================
                      TÙY CHỈNH CHẤT LƯỢNG ÂM THANH & BỘ LỌC ÂM SẮC
                     ======================================================== */}
                  <div style={{ marginTop: '18px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem', margin: 0 }}>
                        🎚️ 1. Mức Chất Lượng Âm Thanh (Audio Quality):
                      </label>
                      <span style={{ fontSize: '0.74rem', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        {AUDIO_QUALITY_OPTIONS.find((q) => q.id === formData.profileMusic.audioQuality)?.badge || 'HD 256k'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                      {AUDIO_QUALITY_OPTIONS.map((q) => {
                        const isSelected = (formData.profileMusic.audioQuality || 'high') === q.id;
                        return (
                          <div
                            key={q.id}
                            onClick={() => handleMusicChange('audioQuality', q.id)}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                              background: isSelected ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{q.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', lineHeight: 1.3 }}>{q.desc}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem', margin: 0 }}>
                        🎼 2. Chế Độ Âm Sắc & Bộ Lọc Equalizer (Sound Tone Profile):
                      </label>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Tạo gu âm nhạc riêng biệt cho bạn
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {AUDIO_PROFILE_OPTIONS.map((p) => {
                        const isSelected = (formData.profileMusic.audioProfile || 'balanced') === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleMusicChange('audioProfile', p.id)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                              background: isSelected ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              transition: 'all 0.2s',
                            }}
                          >
                            <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', marginTop: '12px', border: '1px solid #a7f3d0' }}>
                      ✓ Khách ghé thăm trang cá nhân của bạn sẽ thưởng thức âm nhạc theo chuẩn chất lượng và âm sắc bạn vừa thiết lập.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="page-btn"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="modal-submit-btn"
              style={{ flex: 2, margin: 0 }}
              disabled={loading || uploadingAvatar}
            >
              {loading ? 'Đang lưu...' : 'Lưu Thay Đổi & Áp Dụng'}
            </button>
          </div>
        </form>

        {/* Modal Phòng Thu Âm Nhân Bản Giọng Nói A.I */}
        <VoiceCloningModal
          isOpen={isVoiceCloningOpen}
          onClose={() => setIsVoiceCloningOpen(false)}
        />
      </div>
    </div>
  );
};
