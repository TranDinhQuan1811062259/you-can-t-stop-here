import React, { useState, useEffect, useRef } from 'react';
import { storyService } from '../../services/storyService';
import { uploadService } from '../../services/uploadService';
import { MUSIC_PRESETS } from '../../utils/musicPresets';
import { playClickSound } from '../../utils/soundEffects';
import { playStoryPresetSound, stopStoryMusic } from '../../utils/storyAudioEngine';

const STORY_GRADIENTS = [
  { id: 'sunset', name: 'Hoàng Hôn', css: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)', text: '#ffffff' },
  { id: 'midnight', name: 'Đêm Muộn', css: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)', text: '#f8fafc' },
  { id: 'emerald', name: 'Rừng Xanh', css: 'linear-gradient(135deg, #065f46 0%, #0d9488 50%, #059669 100%)', text: '#ffffff' },
  { id: 'lavender', name: 'Oải Hương', css: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #d946ef 100%)', text: '#ffffff' },
  { id: 'warm', name: 'Nắng Ấm', css: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)', text: '#1e293b' },
];

const BRUSH_COLORS = ['#ffffff', '#facc15', '#f43f5e', '#38bdf8', '#4ade80', '#c084fc', '#000000'];

export const CreateStoryModal = ({ isOpen, onClose, storyToEdit = null }) => {
  const [content, setContent] = useState('');
  const [bgGradientId, setBgGradientId] = useState('sunset');
  const [selectedMusicId, setSelectedMusicId] = useState('lofi_night');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Media Upload States (Image & Video)
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState('none'); // 'none' | 'image' | 'video'
  const fileInputRef = useRef(null);

  // Canvas Drawing States
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const historyRef = useRef([]);

  const isEditing = Boolean(storyToEdit);

  useEffect(() => {
    if (isOpen) {
      if (storyToEdit) {
        setContent(storyToEdit.content || '');
        setBgGradientId(storyToEdit.bgGradient || 'sunset');
        const matchMusic = MUSIC_PRESETS.find((p) => p.title === storyToEdit.musicTitle);
        setSelectedMusicId(matchMusic?.id || 'lofi_night');
        setMediaPreviewUrl(storyToEdit.mediaUrl || null);
        setMediaType(storyToEdit.mediaType || (storyToEdit.mediaUrl ? 'image' : 'none'));
        setMediaFile(null);
      } else {
        setContent('');
        setBgGradientId('sunset');
        setSelectedMusicId('lofi_night');
        setMediaPreviewUrl(null);
        setMediaType('none');
        setMediaFile(null);
      }
      setErrorMsg('');
      setHasDrawn(false);
      setIsPlayingPreview(false);
      historyRef.current = [];

      setTimeout(() => {
        initCanvas();
      }, 100);
    } else {
      stopStoryMusic();
      setIsPlayingPreview(false);
    }

    return () => {
      stopStoryMusic();
    };
  }, [isOpen, storyToEdit]);

  // Khởi tạo Canvas
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 320;
    canvas.height = rect.height || 460;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (storyToEdit?.drawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
        saveHistory();
      };
      img.src = storyToEdit.drawingData;
    } else {
      saveHistory();
    }
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      historyRef.current.push(canvas.toDataURL());
      if (historyRef.current.length > 15) historyRef.current.shift();
    } catch (e) {}
  };

  const handleUndo = () => {
    playClickSound();
    if (historyRef.current.length <= 1) {
      handleClearCanvas();
      return;
    }
    historyRef.current.pop();
    const prevData = historyRef.current[historyRef.current.length - 1];
    const canvas = canvasRef.current;
    if (!canvas || !prevData) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prevData;
  };

  const handleClearCanvas = () => {
    playClickSound();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    saveHistory();
    setHasDrawn(false);
  };

  // Các sự kiện vẽ mượt mà hỗ trợ chuột & cảm ứng
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
  };

  // Xử lý tải ảnh hoặc video lên Story
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      setErrorMsg('Tệp tải lên quá lớn! Vui lòng chọn tệp nhỏ hơn 30MB.');
      return;
    }

    const isVid = file.type.startsWith('video/');
    setMediaFile(file);
    setMediaType(isVid ? 'video' : 'image');
    setErrorMsg('');

    // Đọc preview bằng FileReader
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMediaPreviewUrl(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    playClickSound();
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Nghe thử nhạc nền bằng Web Audio API Synthesizer
  const handleTogglePreviewMusic = () => {
    playClickSound();
    if (isPlayingPreview) {
      stopStoryMusic();
      setIsPlayingPreview(false);
    } else {
      playStoryPresetSound(selectedMusicId, 0.6);
      setIsPlayingPreview(true);
    }
  };

  const handleMusicSelect = (musicId) => {
    setSelectedMusicId(musicId);
    if (isPlayingPreview) {
      playStoryPresetSound(musicId, 0.6);
    }
  };

  const handleModalClose = () => {
    stopStoryMusic();
    setIsPlayingPreview(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!content.trim() && !hasDrawn && !mediaPreviewUrl) {
      setErrorMsg('Vui lòng gõ chữ, tải ảnh/video hoặc vẽ nét cọ lên Story trước khi đăng!');
      return;
    }

    if (content.length > 280) {
      setErrorMsg('Story giới hạn tối đa 280 ký tự!');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const canvas = canvasRef.current;
      const drawingData = hasDrawn && canvas ? canvas.toDataURL('image/png') : null;
      const musicObj = MUSIC_PRESETS.find((p) => p.id === selectedMusicId);

      // Nếu có tệp mới được chọn, thử tải lên máy chủ
      let finalMediaUrl = mediaPreviewUrl;
      if (mediaFile) {
        try {
          const uploadRes = await uploadService.uploadImage(mediaFile);
          if (uploadRes?.data?.url || uploadRes?.url) {
            finalMediaUrl = uploadRes.data?.url || uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('Lỗi upload server, tự động lưu Base64 trực tiếp:', uploadErr);
        }
      }

      const payload = {
        content: content.trim(),
        drawingData,
        mediaUrl: finalMediaUrl || null,
        mediaType: finalMediaUrl ? mediaType : 'none',
        musicTitle: musicObj?.title || 'Lofi Chill',
        musicUrl: musicObj?.url || '',
        bgGradient: bgGradientId,
      };

      if (isEditing) {
        await storyService.updateStory(storyToEdit._id, payload);
      } else {
        await storyService.createStory(payload);
      }

      stopStoryMusic();
      setIsPlayingPreview(false);
      window.dispatchEvent(new Event('freedom_story_updated'));
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Không thể đăng Story lúc này. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentGradient = STORY_GRADIENTS.find((g) => g.id === bgGradientId) || STORY_GRADIENTS[0];

  return (
    <div
      className="create-story-backdrop"
      onClick={handleModalClose}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div
        className="modal-box create-story-modal-box"
        style={{
          maxWidth: '820px',
          width: '100%',
          margin: 'auto',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={handleModalClose}
          style={{ position: 'absolute', top: '18px', right: '18px', zIndex: 10 }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <span
            style={{
              background: 'linear-gradient(45deg, #f59e0b, #ec4899)',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 14px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)',
            }}
          >
            {isEditing ? '✏️ Chỉnh Sửa Story' : '✨ Tạo Story 24h Mới'}
          </span>
          <h3 style={{ margin: '8px 0 3px', fontSize: '1.3rem', color: '#0f172a', fontWeight: 800 }}>
            Chia Sẻ Khoảnh Khắc & Nạp Bình Yên
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Story biến mất sau <strong>24 giờ</strong>. Bạn có thể tự do tải ảnh, video, gõ chữ, chèn nhạc và vẽ nét cọ lên Story!
          </p>
        </div>

        {errorMsg && (
          <div className="alert-message error" style={{ margin: '0 0 16px' }}>
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 330px) 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* CỘT TRÁI: KHUNG XEM TRƯỚC VÀ CANVAS VẼ TRỰC TIẾP (PREVIEW & DRAWING) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              className="story-canvas-preview-wrap"
              style={{
                width: '320px',
                height: '460px',
                borderRadius: '20px',
                background: mediaPreviewUrl ? '#0f172a' : currentGradient.css,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 16px 36px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px 20px',
                boxSizing: 'border-box',
              }}
            >
              {/* Media nền (Ảnh hoặc Video) */}
              {mediaPreviewUrl && (
                <>
                  {mediaType === 'video' ? (
                    <video
                      src={mediaPreviewUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <img
                      src={mediaPreviewUrl}
                      alt="Story Media Preview"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 1,
                      }}
                    />
                  )}
                  {/* Lớp phủ mờ để chữ luôn nổi bật */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.45) 100%)',
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  />
                </>
              )}

              {/* Huy hiệu nhạc nền góc trên */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  borderRadius: '999px',
                  padding: '3px 10px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 4,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                <span>🎵</span>
                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {MUSIC_PRESETS.find((p) => p.id === selectedMusicId)?.title || 'Lofi Chill'}
                </span>
              </div>

              {/* Nhãn 24h & Gỡ Media góc trên phải */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 4 }}>
                {mediaPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    title="Gỡ ảnh/video này để dùng màu nền"
                    style={{
                      background: 'rgba(239, 68, 68, 0.85)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Gỡ
                  </button>
                )}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    borderRadius: '999px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                  }}
                >
                  24H
                </div>
              </div>

              {/* Chữ hiển thị giữa story */}
              <div
                style={{
                  color: mediaPreviewUrl ? '#ffffff' : currentGradient.text,
                  fontSize: content.length > 150 ? '0.96rem' : content.length > 80 ? '1.15rem' : '1.35rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  textShadow: '0 2px 10px rgba(0,0,0,0.6)',
                  zIndex: 2,
                  maxHeight: '320px',
                  overflowY: 'auto',
                  pointerEvents: 'none',
                  padding: '0 8px',
                }}
              >
                {content || (
                  <span style={{ opacity: mediaPreviewUrl ? 0.8 : 0.5, fontStyle: 'italic', fontSize: '0.9rem' }}>
                    {mediaPreviewUrl ? 'Gõ thêm tâm sự nếu thích...' : 'Chạm vào khung bên phải để viết tâm sự...'}
                  </span>
                )}
              </div>

              {/* Canvas vẽ tự do đè lên trên */}
              <canvas
                ref={canvasRef}
                className="interactive-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 3,
                  cursor: isEraser ? 'cell' : 'crosshair',
                  touchAction: 'none',
                }}
              />
            </div>

            {/* Thanh công cụ Cọ vẽ Canvas bên dưới preview */}
            <div
              style={{
                marginTop: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '8px 12px',
                width: '320px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                  🎨 Cây Cọ Vẽ Lên Story:
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleUndo}
                    title="Hoàn tác nét vẽ trước"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#64748b' }}
                  >
                    ↩️ Undo
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    title="Xóa toàn bộ nét vẽ"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#ef4444' }}
                  >
                    🗑️ Xóa nét
                  </button>
                </div>
              </div>

              {/* Bảng chọn màu cọ vẽ & Tẩy */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {BRUSH_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setBrushColor(col);
                      setIsEraser(false);
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: col,
                      border: brushColor === col && !isEraser ? '2.5px solid #0d9488' : '1.5px solid #cbd5e1',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsEraser(true);
                  }}
                  style={{
                    background: isEraser ? '#0d9488' : '#e2e8f0',
                    color: isEraser ? '#ffffff' : '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🧼 Tẩy
                </button>
              </div>

              {/* Kích thước nét cọ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Nét cọ:</span>
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  style={{ flex: 1, accentColor: '#0d9488', height: '4px' }}
                />
                <span
                  style={{
                    width: `${brushSize}px`,
                    height: `${brushSize}px`,
                    borderRadius: '50%',
                    background: isEraser ? '#94a3b8' : brushColor,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: FORM NHẬP NỘI DUNG, UPLOAD MEDIA, CHỌN NHẠC & MÀU NỀN */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Input File Ẩn cho Upload Ảnh / Video */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Mục 1: Tải Ảnh hoặc Video lên Story */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                  🖼️ / 🎬 Hình ảnh hoặc Video (Tùy chọn):
                </label>
                {mediaPreviewUrl && (
                  <span style={{ fontSize: '0.74rem', color: '#0d9488', fontWeight: 700 }}>
                    ✓ Đã chọn {mediaType === 'video' ? 'Video' : 'Hình ảnh'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    fileInputRef.current?.click();
                  }}
                  className="story-media-upload-btn"
                  title="Chọn ảnh (JPG, PNG, GIF) hoặc Video (MP4, WEBM) từ thiết bị"
                >
                  <span>📷</span>
                  <span>{mediaPreviewUrl ? 'Đổi Tệp Khác' : 'Chọn Ảnh hoặc Video từ máy'}</span>
                </button>
                {mediaPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    style={{
                      background: 'none',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#ef4444',
                      padding: '7px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Gỡ Tệp
                  </button>
                )}
              </div>
            </div>

            {/* Mục 2: Nhập nội dung Story */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                  Nội dung tâm sự {mediaPreviewUrl ? '(Tùy chọn)' : '*'}
                </label>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: content.length > 250 ? '#ef4444' : '#0d9488',
                  }}
                >
                  {content.length}/280 ký tự
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={280}
                placeholder="Chia sẻ một khoảnh khắc, cảm xúc hoặc một lời tự động viên hôm nay..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Mục 3: Chọn Màu Nền Gradient (Ẩn nhẹ nếu đã có media) */}
            {!mediaPreviewUrl && (
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  🎨 Phong cách màu nền Gradient:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {STORY_GRADIENTS.map((grad) => (
                    <button
                      key={grad.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setBgGradientId(grad.id);
                      }}
                      style={{
                        height: '38px',
                        borderRadius: '8px',
                        background: grad.css,
                        border: bgGradientId === grad.id ? '2.5px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: grad.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {grad.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mục 4: Chọn & Nghe Thử Nhạc Nền Đi Kèm */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  🎵 Chèn bản nhạc nền êm dịu (100% Web Audio):
                </label>
                <button
                  type="button"
                  onClick={handleTogglePreviewMusic}
                  className={`story-music-preview-btn ${isPlayingPreview ? 'is-playing' : ''}`}
                  title={isPlayingPreview ? 'Bấm để dừng nghe thử' : 'Bấm để nghe thử bản nhạc này'}
                >
                  <span>{isPlayingPreview ? '⏹ Dừng' : '▶️ Nghe Thử'}</span>
                </button>
              </div>
              <select
                value={selectedMusicId}
                onChange={(e) => handleMusicSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#334155',
                  boxSizing: 'border-box',
                }}
              >
                {MUSIC_PRESETS.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.icon} {track.title} &bull; {track.artist}
                  </option>
                ))}
              </select>
            </div>

            {/* Thông tin bảo đảm 24 giờ */}
            <div
              style={{
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '0.78rem',
                color: '#0f766e',
                lineHeight: 1.45,
              }}
            >
              ⏳ <strong>Tồn tại 24 giờ:</strong> Sau khi đăng, Story sẽ tự động biến mất khỏi bảng tin sau đúng 24 tiếng. Bạn có thể chỉnh sửa lại chữ hoặc xóa bất cứ lúc nào!
            </div>

            {/* Nút Đăng Story */}
            <button
              type="submit"
              className="modal-submit-btn"
              disabled={loading || (!content.trim() && !hasDrawn && !mediaPreviewUrl)}
              style={{
                background: 'linear-gradient(135deg, #0d9488, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.94rem',
                fontWeight: 700,
                cursor: loading || (!content.trim() && !hasDrawn && !mediaPreviewUrl) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              }}
            >
              {loading ? 'Đang tải lên...' : isEditing ? '✓ Lưu Chỉnh Sửa Story' : '🚀 Đăng Story 24h Ngay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
