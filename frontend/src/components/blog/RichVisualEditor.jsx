import React, { useState, useEffect, useRef } from 'react';
import { uploadService } from '../../services/uploadService';
import { extractYouTubeId, createYouTubeEmbed } from '../../utils/contentFormatter';

const CURATED_EMOJIS = [
  '🫂', '❤️', '💔', '🥀', '🌧️', '☕', '🥺', '😢', '🩹', '🕊️', '🧘', '💭', '🫶', '🕯️',
  '💼', '💻', '🚀', '💪', '🎯', '⏳', '💡', '🏆', '🌿', '☀️', '🔥', '✨', '📝', '🤝'
];

export const RichVisualEditor = ({ value, onChange, placeholder = 'Hãy thoải mái viết ra những gì bạn đang trăn trở...' }) => {
  const editorRef = useRef(null);
  const inlineImageInputRef = useRef(null);

  // Modal trạng thái chèn Video YouTube
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoPreviewId, setVideoPreviewId] = useState(null);

  // Modal trạng thái chèn Image URL
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Dropdown Emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Cập nhật nội dung ban đầu vào contentEditable
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      // Chỉ gán nếu nội dung thực sự khác biệt để tránh nhảy con trỏ
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (onChange) {
        onChange(html);
      }
    }
  };

  // Thực thi lệnh định dạng nội dung chuẩn của trình duyệt (Tự động hỗ trợ Ctrl+Z / Ctrl+Y)
  const executeCmd = (command, val = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    handleInput();
  };

  // Hoàn tác / Làm lại
  const handleUndo = () => executeCmd('undo');
  const handleRedo = () => executeCmd('redo');

  // Chèn Emoji
  const handleInsertEmoji = (emoji) => {
    executeCmd('insertText', emoji);
    setShowEmojiPicker(false);
  };

  // ===============================================
  // XỬ LÝ CHÈN VIDEO YOUTUBE (POPUP RIÊNG - KHÔNG DÙNG PROMPT)
  // ===============================================
  const handleOpenVideoModal = () => {
    setVideoUrlInput('');
    setVideoPreviewId(null);
    setIsVideoModalOpen(true);
  };

  const handleVideoUrlChange = (e) => {
    const val = e.target.value;
    setVideoUrlInput(val);
    const vId = extractYouTubeId(val);
    setVideoPreviewId(vId);
  };

  const handleConfirmInsertVideo = () => {
    if (!videoPreviewId) {
      alert('Vui lòng nhập đường dẫn video YouTube hợp lệ!');
      return;
    }

    const embedHtml = `<div class="editor-video-card" contenteditable="false" data-youtube-id="${videoPreviewId}">
      <div class="video-container">
        <iframe src="https://www.youtube.com/embed/${videoPreviewId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    </div><p><br></p>`;

    executeCmd('insertHTML', embedHtml);
    setIsVideoModalOpen(false);
    setVideoUrlInput('');
    setVideoPreviewId(null);
  };

  // ===============================================
  // XỬ LÝ CHÈN ẢNH (TẢI TỪ MÁY HOẶC URL)
  // ===============================================
  const handleInlineImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      let finalUrl = event.target?.result;

      try {
        const uploadResult = await uploadService.uploadImage(file);
        if (uploadResult?.url) {
          finalUrl = uploadResult.url;
        }
      } catch (err) {
        console.warn('Lưu ảnh Base64 vào nội dung:', err.message);
      } finally {
        setUploadingImage(false);
      }

      // Chèn thẻ hình ảnh trực quan (người dùng thấy ảnh thật, không thấy chuỗi Base64)
      const imgHtml = `<p><img src="${finalUrl}" alt="${file.name}" style="max-width: 100%; border-radius: 8px; margin: 14px 0; display: block;" /></p><p><br></p>`;
      executeCmd('insertHTML', imgHtml);
    };

    reader.readAsDataURL(file);

    if (inlineImageInputRef.current) {
      inlineImageInputRef.current.value = '';
    }
  };

  const handleConfirmInsertImageUrl = () => {
    if (!imageUrlInput.trim()) return;

    const imgHtml = `<p><img src="${imageUrlInput.trim()}" alt="Ảnh bài viết" style="max-width: 100%; border-radius: 8px; margin: 14px 0; display: block;" /></p><p><br></p>`;
    executeCmd('insertHTML', imgHtml);
    setIsImageModalOpen(false);
    setImageUrlInput('');
  };

  return (
    <div className="rich-visual-editor-container">
      {/* Thanh công cụ định dạng chuyên nghiệp */}
      <div className="visual-toolbar">
        {/* Undo / Redo */}
        <button
          type="button"
          className="toolbar-btn"
          title="Hoàn tác (Ctrl + Z)"
          onClick={handleUndo}
        >
          ↶ Hoàn tác
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Làm lại (Ctrl + Y)"
          onClick={handleRedo}
        >
          ↷ Làm lại
        </button>

        <div className="toolbar-divider" />

        {/* Định dạng văn bản */}
        <button
          type="button"
          className="toolbar-btn"
          title="In đậm (Ctrl + B)"
          onClick={() => executeCmd('bold')}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="In nghiêng (Ctrl + I)"
          onClick={() => executeCmd('italic')}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Gạch chân (Ctrl + U)"
          onClick={() => executeCmd('underline')}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Tiêu đề phụ"
          onClick={() => executeCmd('formatBlock', '<h3>')}
        >
          H3
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Đoạn văn thường"
          onClick={() => executeCmd('formatBlock', '<p>')}
        >
          Văn bản
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Trích dẫn tâm sự"
          onClick={() => executeCmd('formatBlock', '<blockquote>')}
        >
          ❝ Trích dẫn
        </button>

        <div className="toolbar-divider" />

        {/* Chèn Emoji cảm xúc */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="toolbar-btn"
            title="Chèn biểu tượng cảm xúc"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😀 Cảm xúc
          </button>

          {showEmojiPicker && (
            <div className="emoji-popover">
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
                Chọn biểu cảm sẻ chia:
              </div>
              <div className="emoji-grid">
                {CURATED_EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="emoji-btn"
                    onClick={() => handleInsertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chèn Video YouTube (Mở modal riêng) */}
        <button
          type="button"
          className="toolbar-btn"
          title="Nhúng video YouTube với khung xem trực tiếp"
          onClick={handleOpenVideoModal}
          style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', fontWeight: 600 }}
        >
          🎬 Chèn Video YouTube
        </button>

        {/* Tải ảnh từ máy tính */}
        <button
          type="button"
          className="toolbar-btn"
          title="Tải ảnh từ máy tính lên nội dung bài"
          onClick={() => inlineImageInputRef.current?.click()}
          disabled={uploadingImage}
        >
          {uploadingImage ? '⏳ Đang tải ảnh...' : '🖼️ Tải ảnh từ máy'}
        </button>
        <input
          type="file"
          ref={inlineImageInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleInlineImageUpload}
        />

        {/* Chèn ảnh từ URL */}
        <button
          type="button"
          className="toolbar-btn"
          title="Chèn ảnh từ link mạng"
          onClick={() => {
            setImageUrlInput('');
            setIsImageModalOpen(true);
          }}
        >
          🔗 Link ảnh
        </button>

        <button
          type="button"
          className="toolbar-btn"
          title="Đường kẻ ngang phân cách"
          onClick={() => executeCmd('insertHorizontalRule')}
        >
          ➖ Dòng kẻ
        </button>
      </div>

      {/* Khung soạn thảo Visual Trực quan (WYSIWYG) */}
      <div
        ref={editorRef}
        className="visual-editor-canvas"
        contentEditable={true}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        data-placeholder={placeholder}
      />

      {/* ========================================================
          CỬA SỔ PHỤ: CHÈN VIDEO YOUTUBE (GIAO DIỆN CHUẨN XỊN)
          ======================================================== */}
      {isVideoModalOpen && (
        <div className="sub-modal-overlay" onClick={() => setIsVideoModalOpen(false)}>
          <div className="sub-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
                🎬 Chèn Video YouTube vào bài viết
              </h4>
              <button
                type="button"
                className="modal-close-btn"
                style={{ position: 'static' }}
                onClick={() => setIsVideoModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '14px' }}>
              Dán liên kết YouTube để nhúng trực tiếp video phát cùng bài tâm sự:
            </p>

            <div className="form-group">
              <label>Link Video YouTube (URL)</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                value={videoUrlInput}
                onChange={handleVideoUrlChange}
                autoFocus
              />
            </div>

            {/* Xem trước video YouTube trước khi chèn */}
            {videoPreviewId ? (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  ✓ Đã nhận diện video:
                </span>
                <div className="video-container" style={{ margin: '0 auto', maxHeight: '220px' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoPreviewId}`}
                    title="YouTube Preview"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : videoUrlInput.trim() ? (
              <div style={{ fontSize: '0.8rem', color: '#e11d48', marginBottom: '12px' }}>
                ⚠️ Chưa nhận diện được mã video. Vui lòng kiểm tra lại đường dẫn!
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="page-btn"
                onClick={() => setIsVideoModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="modal-submit-btn"
                style={{ margin: 0, background: '#e11d48' }}
                onClick={handleConfirmInsertVideo}
                disabled={!videoPreviewId}
              >
                Chèn Video Vào Bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CỬA SỔ PHỤ: CHÈN HÌNH ẢNH TỪ URL
          ======================================================== */}
      {isImageModalOpen && (
        <div className="sub-modal-overlay" onClick={() => setIsImageModalOpen(false)}>
          <div className="sub-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
                🔗 Chèn Hình Ảnh từ Đường Dẫn (URL)
              </h4>
              <button
                type="button"
                className="modal-close-btn"
                style={{ position: 'static' }}
                onClick={() => setIsImageModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="form-group">
              <label>Đường dẫn hình ảnh (URL)</label>
              <input
                type="text"
                placeholder="https://example.com/hinh-anh.jpg"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                autoFocus
              />
            </div>

            {imageUrlInput.trim() && (
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Xem trước hình ảnh:
                </span>
                <img
                  src={imageUrlInput.trim()}
                  alt="Preview"
                  style={{ maxHeight: '180px', borderRadius: '6px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="page-btn"
                onClick={() => setIsImageModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="modal-submit-btn"
                style={{ margin: 0 }}
                onClick={handleConfirmInsertImageUrl}
                disabled={!imageUrlInput.trim()}
              >
                Chèn Ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

