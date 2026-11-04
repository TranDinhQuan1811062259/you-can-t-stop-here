import React, { useState, useEffect, useRef } from 'react';
import { postService } from '../../services/postService';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import { RichVisualEditor } from './RichVisualEditor';
import { formatPostContent } from '../../utils/contentFormatter';

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: '',
    coverImage: '',
    tags: '',
  });

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' hoặc 'preview'
  const [uploadingCover, setUploadingCover] = useState(false);
  const [importingDoc, setImportingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

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
      const res = await postService.createPost({
        title: formData.title,
        summary: formData.summary,
        content: formData.content,
        category: formData.category,
        coverImage: formData.coverImage || undefined,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
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

          <div className="form-group">
            <label>Chuyên mục phù hợp *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ảnh bìa bài viết */}
          <div className="form-group">
            <label>Ảnh bìa bài viết</label>
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
                  ☁️ Đang xử lý ảnh bìa...
                </span>
              )}
            </div>

            {formData.coverImage && (
              <div className="cover-preview-box">
                <img
                  src={formData.coverImage}
                  alt="Ảnh bìa bài viết đã chọn"
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
    </div>
  );
};
