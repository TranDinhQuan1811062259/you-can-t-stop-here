import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { postService } from '../../services/postService';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import { RichVisualEditor } from './RichVisualEditor';
import { MediaCameraCaptureModal } from './MediaCameraCaptureModal';
import { formatPostContent } from '../../utils/contentFormatter';
import { maskSensitiveText, analyzeContentSafety } from '../../utils/sensitiveFilter';
import { PostAtmosphereSelector } from './PostAtmosphereSelector';
import { AsmrKeyboardToggle } from '../common/AsmrKeyboardToggle';

export const EditPostModal = ({ isOpen, onClose, post, onPostUpdated }) => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    authorJob: '',
    summary: '',
    content: '',
    category: '',
    coverImage: '',
    tags: '',
    views: 1,
    showReactionCount: true,
    allowComments: true,
    visibility: 'public',
    audioMood: 'auto',
    voiceGender: 'female',
    voiceRegion: 'north',
    atmosphere: {
      theme: 'default',
      soundEnabled: true,
      bgPreset: 'default',
      customColor: '',
      customBgGradient: '',
      particleEffect: 'none',
    },
  });

  const [activeTab, setActiveTab] = useState('edit');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isCoverCameraOpen, setIsCoverCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quản lý tạo thể loại bài viết mới trực tiếp
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🌍');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCatLoading, setCreatingCatLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      categoryService
        .getCategories()
        .then((res) => setCategories(res.data || []))
        .catch((err) => console.warn('Lỗi lấy danh mục:', err));

      if (post) {
        setFormData({
          title: post.title || '',
          author: post.author || post.user?.name || 'Trần Đình Quân',
          authorJob: post.authorJob || post.user?.jobTitle || 'System Admin & Lead Dev',
          summary: post.summary || '',
          content: post.content || '',
          category: post.category?._id || post.category || '',
          coverImage: post.coverImage || '',
          tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
          views: post.views !== undefined ? post.views : 1,
          showReactionCount: post.showReactionCount !== false,
          allowComments: post.allowComments !== false,
          visibility: post.visibility || 'public',
          audioMood: post.audioMood || 'auto',
          voiceGender: post.voiceGender || 'female',
          voiceRegion: post.voiceRegion || 'north',
          atmosphere: post.atmosphere || {
            theme: 'default',
            soundEnabled: true,
            bgPreset: 'default',
            customColor: '',
            customBgGradient: '',
            particleEffect: 'none',
          },
        });
        setErrorMsg('');
      }
    }
  }, [isOpen, post]);

  // Khóa cuộn trang nền và hỗ trợ đóng modal bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleContentChange = (newHtml) => {
    setFormData((prev) => ({ ...prev, content: newHtml }));
    setErrorMsg('');
  };

  // Tạo thể loại bài viết mới trực tiếp
  const handleCreateNewCategory = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!newCatName.trim()) return;

    try {
      setCreatingCatLoading(true);
      const res = await categoryService.createCategory({
        name: newCatName.trim(),
        icon: newCatIcon || '🌍',
        description: newCatDesc.trim(),
      });

      const created = res.data?.data;
      if (created) {
        setCategories((prev) => {
          const exists = prev.some((c) => c._id === created._id || c.slug === created.slug);
          return exists ? prev : [...prev, created];
        });
        setFormData((prev) => ({ ...prev, category: created._id }));
        setIsCreatingCategory(false);
        setNewCatName('');
        setNewCatDesc('');
        window.dispatchEvent(
          new CustomEvent('freedom_category_created', { detail: { category: created } })
        );
      }
    } catch (err) {
      console.error('Lỗi khi tạo thể loại:', err);
      alert('Không thể tạo thể loại: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreatingCatLoading(false);
    }
  };

  const handleCoverImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result;
      setFormData((prev) => ({ ...prev, coverImage: base64Url }));

      try {
        const uploadResult = await uploadService.uploadImage(file);
        if (uploadResult?.url) {
          setFormData((prev) => ({ ...prev, coverImage: uploadResult.url }));
        }
      } catch (err) {
        console.warn('Upload ảnh qua API ghi nhận:', err.message);
      } finally {
        setUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setFormData((prev) => ({ ...prev, coverImage: '' }));
  };

  const handleCoverCameraCaptured = (media) => {
    if (media?.dataUrl) {
      setFormData((prev) => ({ ...prev, coverImage: media.dataUrl }));
    }
    setIsCoverCameraOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.summary || !formData.content) {
      setErrorMsg('Vui lòng điền đầy đủ Tiêu đề, Tóm tắt và Nội dung.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const cleanTitle = maskSensitiveText(formData.title.trim());
      const cleanSummary = maskSensitiveText(formData.summary.trim());
      const cleanContent = maskSensitiveText(formData.content);
      const cleanTags = formData.tags
        ? formData.tags.split(',').map((t) => maskSensitiveText(t.trim().replace(/^#/, ''))).filter(Boolean)
        : [];

      const payload = {
        title: cleanTitle,
        author: formData.author.trim(),
        authorJob: formData.authorJob.trim(),
        summary: cleanSummary,
        content: cleanContent,
        category: formData.category || undefined,
        coverImage: formData.coverImage || undefined,
        tags: cleanTags,
        views: parseInt(formData.views, 10) || 1,
        showReactionCount: formData.showReactionCount,
        allowComments: formData.allowComments,
        audioMood: formData.audioMood || 'auto',
        voiceGender: formData.voiceGender || 'female',
        voiceRegion: formData.voiceRegion || 'north',
        atmosphere: formData.atmosphere,
      };

      const res = await postService.updatePost(post._id, payload);
      if (onPostUpdated) {
        onPostUpdated(res.data);
      }
      window.dispatchEvent(new Event('post_updated'));
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Không thể cập nhật bài viết lúc này. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="modal-backdrop edit-post-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div
        className="modal-box edit-post-modal-box"
        style={{
          maxWidth: '860px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          zIndex: 100001,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          type="button"
          title="Đóng cửa sổ chỉnh sửa (Esc hoặc click ra ngoài)"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="modal-heading" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="healing-icon-pill healing-icon-amber" style={{ width: '30px', height: '30px', fontSize: '0.85rem' }}>
              <i className="fa-solid fa-pen-to-square"></i>
            </span>
            <span>Chỉnh Sửa Bài Viết</span>
          </h3>
          <div style={{ marginRight: '36px' }}>
            <AsmrKeyboardToggle variant="pill" />
          </div>
        </div>
        <p className="modal-subtitle">
          Cập nhật thông tin tác giả, tiêu đề, nội dung trực quan (WYSIWYG) và lượt đọc thực tế của bài viết.
        </p>

        {errorMsg && <div className="modal-error">{errorMsg}</div>}

        {/* Cảnh báo kiểm duyệt an toàn thời gian thực */}
        {(() => {
          const safety = analyzeContentSafety(formData.title, formData.summary, formData.content, formData.tags ? formData.tags.split(',') : []);
          if (!safety.isFlagged) return null;
          return (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '14px',
                color: '#92400e',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <div>
                <strong>Lưu ý an toàn:</strong> Phát hiện yếu tố nhạy cảm / chính trị ({safety.foundWords.join(', ')}). Khi lưu, từ ngữ sẽ tự động được chèn dấu chấm (D.I.E, c.h.ế.t...) và bài viết sẽ chuyển qua chế độ Admin kiểm duyệt để bảo vệ an toàn cho website.
              </div>
            </div>
          );
        })()}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Tiêu đề bài viết *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          {/* Hàng thông tin tác giả hiển thị */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Tác giả bài viết *</label>
              <input
                type="text"
                name="author"
                placeholder="Ví dụ: Trần Đình Quân"
                value={formData.author}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Chức danh / Nghề nghiệp tác giả</label>
              <input
                type="text"
                name="authorJob"
                placeholder="Ví dụ: System Admin & Lead Dev"
                value={formData.authorJob}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', alignItems: 'flex-start' }}>
            <div className="form-group category-select-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, fontWeight: 700 }}>Chuyên mục / Thể loại *</label>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                  style={{
                    fontSize: '0.78rem',
                    padding: '2px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isCreatingCategory ? '#fef2f2' : '#f0fdf4',
                    borderColor: isCreatingCategory ? '#fca5a5' : '#86efac',
                    color: isCreatingCategory ? '#dc2626' : '#15803d',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '6px',
                  }}
                >
                  {isCreatingCategory ? '✕ Đóng' : '✨ + Thể loại mới'}
                </button>
              </div>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {(c.icon ? `${c.icon} ` : '🏷️ ') + c.name}
                  </option>
                ))}
              </select>

              {/* Khung tạo thể loại mới trượt ra tiện lợi */}
              {isCreatingCategory && (
                <div
                  className="new-category-inline-creator"
                  style={{
                    marginTop: '10px',
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: '12px',
                    border: '1.5px dashed #0d9488',
                    animation: 'fadeIn 0.25s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>🌍</span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f766e' }}>
                      Thêm thể loại mới (Thế giới, Chiến sự, Xã hội...)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Tên thể loại mới..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateNewCategory();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewCategory}
                      disabled={!newCatName.trim() || creatingCatLoading}
                      style={{
                        padding: '7px 12px',
                        background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: !newCatName.trim() || creatingCatLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {creatingCatLoading ? '...' : 'Lưu & Chọn'}
                    </button>
                  </div>

                  {/* Khay chọn Icon nhanh */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Biểu tượng:</span>
                    {['🌍', '🕊️', '💣', '📰', '🌐', '🛡️', '⚖️', '🏛️', '💬', '☕', '🌱', '✨', '🔥'].map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewCatIcon(ic)}
                        style={{
                          background: newCatIcon === ic ? '#ccfbf1' : '#ffffff',
                          border: newCatIcon === ic ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                          borderRadius: '5px',
                          width: '26px',
                          height: '26px',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: newCatIcon === ic ? 'scale(1.15)' : 'none',
                        }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Lượt đọc thực tế</label>
              <input
                type="number"
                name="views"
                min="0"
                value={formData.views}
                onChange={handleChange}
                title="Lượt đọc thực tế trong cơ sở dữ liệu"
              />
            </div>
          </div>

          {/* Ảnh bìa */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Ảnh bìa bài viết</label>
              <button
                type="button"
                className="page-btn"
                onClick={() => setIsCoverCameraOpen(true)}
                style={{
                  fontSize: '0.8rem',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ecfdf5',
                  borderColor: '#6ee7b7',
                  color: '#047857',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📸 Chụp từ Camera/Webcam
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                disabled={uploadingCover}
                style={{ fontSize: '0.85rem' }}
              />
              {uploadingCover && (
                <span style={{ fontSize: '0.85rem', color: 'var(--primary-hover)', fontWeight: 600 }}>
                  ☁️ Đang cập nhật ảnh...
                </span>
              )}
            </div>

            {formData.coverImage && (
              <div className="cover-preview-box">
                <img
                  src={formData.coverImage}
                  alt="Ảnh bìa bài viết"
                  className="cover-preview-img"
                />
                <button
                  type="button"
                  className="cover-remove-btn"
                  title="Xóa ảnh bìa"
                  onClick={handleRemoveCover}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Đoạn tóm tắt ngắn *</label>
            <input
              type="text"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              required
            />
          </div>

          {/* Khu vực soạn thảo Visual WYSIWYG */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0 }}>Nội dung bài viết (Trực quan & Hỗ trợ Ctrl+Z) *</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className={`toolbar-btn ${activeTab === 'edit' ? 'active' : ''}`}
                  onClick={() => setActiveTab('edit')}
                >
                  ✍️ Soạn thảo trực quan
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  👁️ Xem trước
                </button>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <RichVisualEditor
                value={formData.content}
                onChange={handleContentChange}
                placeholder="Nội dung bài viết tâm sự..."
              />
            ) : (
              <div
                className="preview-pane"
                dangerouslySetInnerHTML={{
                  __html: formatPostContent(formData.content || '<em>(Chưa có nội dung)</em>'),
                }}
              />
            )}
          </div>

          <div className="form-group">
            <label>Thẻ tag liên quan (cách nhau bằng dấu phẩy)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginTop: '14px', background: 'rgba(99, 102, 241, 0.05)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <label style={{ fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.95rem' }}>
              <span>🎧</span>
              <span>Cài đặt Giọng đọc A.I Tiếng Việt & Ngữ điệu vùng miền</span>
            </label>
            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b' }}>
              Bạn có thể cập nhật giọng đọc Nam hoặc Nữ, ngữ điệu vùng miền (Bắc / Trung / Nam) và tâm trạng mặc định cho bài viết.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '10px' }}>
              {/* Chọn Giới Tính Giọng Đọc */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  👤 Giới tính giọng đọc:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, voiceGender: 'female' }))}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: formData.voiceGender === 'female' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: formData.voiceGender === 'female' ? 'rgba(13, 148, 136, 0.1)' : '#ffffff',
                      color: formData.voiceGender === 'female' ? '#0d9488' : '#475569',
                      fontWeight: formData.voiceGender === 'female' ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>👩</span>
                    <span>Giọng Nữ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, voiceGender: 'male' }))}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: formData.voiceGender === 'male' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: formData.voiceGender === 'male' ? 'rgba(13, 148, 136, 0.1)' : '#ffffff',
                      color: formData.voiceGender === 'male' ? '#0d9488' : '#475569',
                      fontWeight: formData.voiceGender === 'male' ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>👨</span>
                    <span>Giọng Nam</span>
                  </button>
                </div>
              </div>

              {/* Chọn Ngôn Ngữ Vùng Miền */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  📍 Vùng miền đặc trưng:
                </label>
                <select
                  name="voiceRegion"
                  value={formData.voiceRegion || 'north'}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #c7d2fe',
                    fontSize: '0.84rem',
                    background: '#ffffff',
                    fontWeight: 600,
                    color: '#1e1b4b',
                  }}
                >
                  <option value="north">🏛️ Miền Bắc (Hà Nội - Chuẩn thanh lịch, đĩnh đạc)</option>
                  <option value="central">🏖️ Miền Trung (Huế & Đà Nẵng - Da diết, sâu lắng)</option>
                  <option value="south">🌴 Miền Nam (Sài Gòn - Ngọt ngào, phóng khoáng)</option>
                </select>
              </div>
            </div>

            {/* Chọn Cảm Xúc Bài Viết */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                🎭 Tâm trạng ngữ điệu:
              </label>
              <select
                name="audioMood"
                value={formData.audioMood || 'auto'}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #c7d2fe',
                  fontSize: '0.86rem',
                  background: '#ffffff',
                  fontWeight: 600,
                  color: '#1e1b4b',
                }}
              >
                <option value="auto">✨ Tự động theo tâm trạng (A.I tự phân tích cảm xúc từ ngữ)</option>
                <option value="melancholic">🌧️ Trầm buồn, sâu lắng & vỗ về (Tâm sự đêm muộn, burnout, áp lực)</option>
                <option value="uplifting">☀️ Vui tươi, tích cực & hứng khởi (Small wins, khởi sắc, truyền cảm hứng)</option>
                <option value="child">🎈 Hồn nhiên, trong trẻo (Giọng đọc trẻ em đáng yêu)</option>
                <option value="podcast">🎙️ Podcast truyền cảm (Chuẩn phát thanh viên Storyteller)</option>
                <option value="custom_voice">🧬 Giọng A.I nhân bản chính chủ (Dùng giọng thu âm của bạn)</option>
              </select>
            </div>
          </div>

          {/* Chế độ hiển thị bài viết (Công khai hoặc Chỉ bạn bè) */}
          <div className="form-group" style={{ marginTop: '14px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontWeight: 700, color: 'var(--bg-dark)', marginBottom: '8px', display: 'block' }}>
              🔒 Chế độ hiển thị bài viết
            </label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="radio"
                  name="edit-visibility"
                  value="public"
                  checked={formData.visibility === 'public'}
                  onChange={() => setFormData({ ...formData, visibility: 'public' })}
                />
                <span>🌐 <strong>Công khai</strong> (Tất cả mọi người đều đọc được)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="radio"
                  name="edit-visibility"
                  value="friends"
                  checked={formData.visibility === 'friends'}
                  onChange={() => setFormData({ ...formData, visibility: 'friends' })}
                />
                <span>👥 <strong>Chỉ bạn bè</strong> (Chỉ bạn bè đã kết bạn mới xem được)</span>
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: 'var(--bg-dark)', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={formData.showReactionCount}
                onChange={(e) => setFormData({ ...formData, showReactionCount: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              <span>👁️ Cho phép hiển thị số lượng bày tỏ cảm xúc trên bài viết</span>
            </label>
            <p style={{ margin: '4px 0 0 28px', fontSize: '0.82rem', color: '#64748b' }}>
              Nếu bỏ chọn, người đọc chỉ thấy các biểu tượng cảm xúc (Đồng Cảm 🫂, Stop 🛑, Yêu thích ❤️, Cố Lên 💪) mà không thấy con số cụ thể.
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: 'var(--bg-dark)', marginBottom: 0, marginTop: '12px' }}>
              <input
                type="checkbox"
                checked={formData.allowComments}
                onChange={(e) => setFormData({ ...formData, allowComments: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              <span>💬 Cho phép mọi người gửi bình luận & động viên dưới bài viết</span>
            </label>
            <p style={{ margin: '4px 0 0 28px', fontSize: '0.82rem', color: '#64748b' }}>
              {formData.allowComments
                ? 'Đang bật: Người đọc có thể gửi lời chia sẻ, bình luận và động viên bạn.'
                : 'Đang tắt: Khóa tính năng bình luận, không ai có thể bình luận dưới bài viết này (bạn có thể mở lại bất cứ lúc nào).'}
            </p>
          </div>

          {/* Cài đặt Không Gian Cảm Xúc & Background Đặc Trưng */}
          <PostAtmosphereSelector
            atmosphere={formData.atmosphere}
            onChange={(newAtmosphere) => setFormData((prev) => ({ ...prev, atmosphere: newAtmosphere }))}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
              disabled={loading || uploadingCover}
            >
              {loading ? 'Đang lưu...' : 'Lưu Thay Đổi Bài Viết'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Camera / Webcam chụp ảnh bìa trực tiếp */}
      <MediaCameraCaptureModal
        isOpen={isCoverCameraOpen}
        onClose={() => setIsCoverCameraOpen(false)}
        onMediaCaptured={handleCoverCameraCaptured}
      />
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
