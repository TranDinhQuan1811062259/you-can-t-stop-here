import React, { useState, useEffect, useRef } from 'react';
import { postService } from '../../services/postService';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import { RichVisualEditor } from './RichVisualEditor';
import { MediaCameraCaptureModal } from './MediaCameraCaptureModal';
import { formatPostContent } from '../../utils/contentFormatter';
import { maskSensitiveText, analyzeContentSafety } from '../../utils/sensitiveFilter';
import { PostAtmosphereSelector } from './PostAtmosphereSelector';

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: '',
    coverImage: '',
    tags: '',
    showReactionCount: true,
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

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' hoặc 'preview'
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isCoverCameraOpen, setIsCoverCameraOpen] = useState(false);
  const [importingDoc, setImportingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Quản lý tạo thể loại bài viết mới trực tiếp
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🌍');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCatLoading, setCreatingCatLoading] = useState(false);

  const docFileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      categoryService
        .getCategories()
        .then((res) => {
          setCategories(res.data || []);
          if (res.data?.length > 0 && !formData.category) {
            setFormData((prev) => ({ ...prev, category: res.data[0]._id }));
          }
        })
        .catch((err) => console.warn('Lỗi lấy danh mục:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  // ==========================================
  // XỬ LÝ ẢNH BÌA
  // ==========================================
  const handleCoverImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setInfoMsg('');
    setUploadingCover(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result;
      setFormData((prev) => ({ ...prev, coverImage: base64Url }));

      try {
        const uploadResult = await uploadService.uploadImage(file);
        if (uploadResult?.url) {
          setFormData((prev) => ({ ...prev, coverImage: uploadResult.url }));
          setInfoMsg('✓ Đã tải và lưu trữ ảnh bìa thành công!');
        }
      } catch (err) {
        setInfoMsg('✓ Đã lưu ảnh bìa cục bộ cho bài viết của bạn.');
      } finally {
        setUploadingCover(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setFormData((prev) => ({ ...prev, coverImage: '' }));
    setInfoMsg('');
  };

  const handleCoverCameraCaptured = (media) => {
    if (media?.dataUrl) {
      setFormData((prev) => ({ ...prev, coverImage: media.dataUrl }));
      setInfoMsg('✓ Đã chụp ảnh bìa trực tiếp từ Camera/Webcam!');
    }
    setIsCoverCameraOpen(false);
  };

  // ==========================================
  // NHẬP TỪ FILE WORD / PDF / TXT
  // ==========================================
  const handleDocFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingDoc(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'txt' || ext === 'md') {
        const textReader = new FileReader();
        textReader.onload = (event) => {
          const text = event.target?.result || '';
          applyImportedText(text, file.name);
          setImportingDoc(false);
        };
        textReader.readAsText(file, 'utf-8');
        return;
      }

      const result = await uploadService.uploadDocument(file);
      if (result) {
        const formattedHtml = result.content
          ? result.content.split(/\n{2,}/).map((p) => `<p>${p.trim()}</p>`).join('')
          : '';

        setFormData((prev) => ({
          ...prev,
          title: prev.title || result.title || '',
          summary: prev.summary || result.summary || '',
          content: prev.content ? `${prev.content}${formattedHtml}` : formattedHtml,
        }));
        setInfoMsg(`✓ Đã nhập thành công nội dung từ "${file.name}" (${result.wordCount || 0} từ)!`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Không thể trích xuất file văn bản. Vui lòng kiểm tra lại định dạng file!');
    } finally {
      setImportingDoc(false);
      if (docFileInputRef.current) {
        docFileInputRef.current.value = '';
      }
    }
  };

  const applyImportedText = (fullText, fileName) => {
    const paragraphs = fullText
      .split(/\r?\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    let title = '';
    let summary = '';

    if (paragraphs.length > 0 && paragraphs[0].length <= 120) {
      title = paragraphs[0].replace(/^[#\*\-_\s]+/, '').trim();
    } else {
      title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    if (paragraphs.length > 1) {
      summary = paragraphs[1].slice(0, 180);
    } else {
      summary = title;
    }

    const htmlContent = paragraphs.map((p) => `<p>${p}</p>`).join('');

    setFormData((prev) => ({
      ...prev,
      title: prev.title || title,
      summary: prev.summary || summary,
      content: prev.content ? `${prev.content}${htmlContent}` : htmlContent,
    }));
    setInfoMsg(`✓ Đã nhập thành công nội dung từ "${fileName}"!`);
  };

  // ==========================================
  // SUBMIT
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.summary || !formData.content || !formData.category) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Tự động chèn dấu chấm vào từ ngữ nhạy cảm (ví dụ Die -> D.I.E, chết -> c.h.ế.t)
      const cleanTitle = maskSensitiveText(formData.title.trim());
      const cleanSummary = maskSensitiveText(formData.summary.trim());
      const cleanContent = maskSensitiveText(formData.content);
      const cleanTags = formData.tags
        ? formData.tags.split(',').map((t) => maskSensitiveText(t.trim().replace(/^#/, ''))).filter(Boolean)
        : [];

      const res = await postService.createPost({
        title: cleanTitle,
        summary: cleanSummary,
        content: cleanContent,
        category: formData.category,
        coverImage: formData.coverImage || undefined,
        tags: cleanTags,
        showReactionCount: formData.showReactionCount,
        audioMood: formData.audioMood || 'auto',
        voiceGender: formData.voiceGender || 'female',
        voiceRegion: formData.voiceRegion || 'north',
        atmosphere: formData.atmosphere,
      });

      if (onPostCreated) {
        onPostCreated(res.data);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Không thể đăng bài lúc này. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: '820px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <h3 className="modal-heading">✍️ Trút Bầu Tâm Sự</h3>
        <p className="modal-subtitle">
          Không gian lắng nghe những trăn trở trong công việc. Bạn có thể chèn video YouTube, hình ảnh và icon cảm xúc để bài viết sinh động hơn.
        </p>

        {errorMsg && <div className="modal-error">{errorMsg}</div>}
        {infoMsg && (
          <div
            style={{
              background: '#ecfdf5',
              borderLeft: '4px solid #10b981',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '0.86rem',
              marginBottom: '14px',
              fontWeight: 500,
            }}
          >
            {infoMsg}
          </div>
        )}

        {/* Thanh Nhập nội dung từ file */}
        <div className="doc-import-bar">
          <div className="doc-import-info">
            <span style={{ fontSize: '1.25rem' }}>📄</span>
            <span>
              <strong>Bạn đã viết sẵn bài tâm sự?</strong> Nhập nhanh từ file Word (.docx), PDF hoặc TXT.
            </span>
          </div>
          <button
            type="button"
            className="doc-import-btn"
            disabled={importingDoc}
            onClick={() => docFileInputRef.current?.click()}
          >
            {importingDoc ? '⏳ Đang đọc file...' : '📂 Chọn file Word/PDF/TXT'}
          </button>
          <input
            type="file"
            ref={docFileInputRef}
            accept=".docx,.doc,.pdf,.txt,.md,.rtf"
            style={{ display: 'none' }}
            onChange={handleDocFileSelect}
          />
        </div>

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
                <strong>Lưu ý an toàn:</strong> Nội dung có chứa từ ngữ nhạy cảm ({safety.foundWords.join(', ')}). Hệ thống sẽ tự động chèn dấu chấm (D.I.E, c.h.ế.t...) và gắn cờ để Admin kiểm duyệt nhằm bảo vệ website không bị vi phạm.
              </div>
            </div>
          );
        })()}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Tiêu đề bài viết / cảm nghĩ *</label>
            <input
              type="text"
              name="title"
              placeholder="Ví dụ: Hôm nay mình đã vượt qua ngày thứ 21 áp lực liên miên..."
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group category-select-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0, fontWeight: 700 }}>Chuyên mục / Thể loại bài viết *</label>
              <button
                type="button"
                className="page-btn"
                onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                style={{
                  fontSize: '0.8rem',
                  padding: '3px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: isCreatingCategory ? '#fef2f2' : '#f0fdf4',
                  borderColor: isCreatingCategory ? '#fca5a5' : '#86efac',
                  color: isCreatingCategory ? '#dc2626' : '#15803d',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: '8px',
                }}
              >
                {isCreatingCategory ? '✕ Đóng' : '✨ + Tạo thể loại mới'}
              </button>
            </div>

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.92rem',
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
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '12px',
                  border: '1.5px dashed #0d9488',
                  animation: 'fadeIn 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🌍</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f766e' }}>
                    Tạo thể loại bài viết mới (Thời sự, Thế giới, Chiến sự, Cuộc sống...)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Nhập tên thể loại (VD: Chiến sự Trung Đông, Tình hình Quốc tế...)"
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
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    disabled={!newCatName.trim() || creatingCatLoading}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: !newCatName.trim() || creatingCatLoading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {creatingCatLoading ? 'Đang tạo...' : 'Lưu & Chọn luôn ➔'}
                  </button>
                </div>

                {/* Khay chọn Icon nhanh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Biểu tượng:</span>
                  {['🌍', '🕊️', '💣', '📰', '🌐', '🛡️', '⚖️', '🏛️', '💬', '☕', '🌱', '✨', '🔥', '💼'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewCatIcon(ic)}
                      style={{
                        background: newCatIcon === ic ? '#ccfbf1' : '#ffffff',
                        border: newCatIcon === ic ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        width: '28px',
                        height: '28px',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: newCatIcon === ic ? 'scale(1.15)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Chọn ${ic}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ảnh bìa bài viết (Hỗ trợ Ảnh JPG/PNG và Ảnh động GIF 🎬) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Ảnh bìa bài viết (Hỗ trợ JPG/PNG, GIF & Chụp trực tiếp 🎬)</label>
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*,.gif"
                onChange={handleCoverImageChange}
                disabled={uploadingCover}
                style={{ fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>hoặc dán link GIF:</span>
              <input
                type="url"
                placeholder="https://.../cover.gif"
                value={formData.coverImage?.startsWith('http') ? formData.coverImage : ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, coverImage: e.target.value }))}
                style={{ flex: 1, minWidth: '180px', fontSize: '0.85rem', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              {uploadingCover && (
                <span style={{ fontSize: '0.85rem', color: 'var(--primary-hover)', fontWeight: 600 }}>
                  ☁️ Đang xử lý ảnh bìa/GIF...
                </span>
              )}
            </div>

            {formData.coverImage && (
              <div className="cover-preview-box">
                <img
                  src={formData.coverImage}
                  alt="Ảnh bìa bài viết hoặc GIF đã chọn"
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
            <label>Đoạn tóm tắt ngắn (1-2 câu hiển thị ở trang chủ) *</label>
            <input
              type="text"
              name="summary"
              placeholder="Tóm tắt ngắn gọn cảm xúc cốt lõi của bạn..."
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
                placeholder="Hãy thoải mái viết ra những gì bạn đang trăn trở. Chèn hình ảnh, video YouTube và icon cảm xúc để bộc lộ trọn vẹn cảm xúc của bạn..."
              />
            ) : (
              <div
                className="preview-pane"
                dangerouslySetInnerHTML={{
                  __html: formatPostContent(formData.content || '<em>(Chưa có nội dung để xem trước)</em>'),
                }}
              />
            )}
          </div>

          <div className="form-group">
            <label>Thẻ tag liên quan (cách nhau bằng dấu phẩy)</label>
            <input
              type="text"
              name="tags"
              placeholder="Burnout, OT, Deadline, Chuyển nghề, Quyết tâm"
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
              Bạn có thể chọn giọng đọc Nam hoặc Nữ, ngữ điệu vùng miền (Bắc / Trung / Nam) và tâm trạng mặc định khi người đọc bấm nút "Nghe AI đọc".
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
                  name="visibility"
                  value="public"
                  checked={formData.visibility === 'public'}
                  onChange={() => setFormData({ ...formData, visibility: 'public' })}
                />
                <span>🌐 <strong>Công khai</strong> (Tất cả mọi người đều đọc được)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="radio"
                  name="visibility"
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
              Nếu bỏ chọn, bài viết chỉ hiển thị các biểu tượng cảm xúc (Đồng Cảm 🫂, Stop 🛑, Yêu thích ❤️, Cố Lên 💪) mà không hiển thị con số cụ thể.
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
              disabled={loading || uploadingCover || importingDoc}
            >
              {loading ? 'Đang gửi...' : 'Đăng Tâm Sự Ngay'}
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
};
