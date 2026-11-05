import React, { useState, useEffect } from 'react';
import { postService } from '../../services/postService';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import { RichVisualEditor } from './RichVisualEditor';
import { formatPostContent } from '../../utils/contentFormatter';
import { maskSensitiveText, analyzeContentSafety } from '../../utils/sensitiveFilter';

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
    audioMood: 'auto',
  });

  const [activeTab, setActiveTab] = useState('edit');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
          audioMood: post.audioMood || 'auto',
        });
        setErrorMsg('');
      }
    }
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleContentChange = (newHtml) => {
    setFormData((prev) => ({ ...prev, content: newHtml }));
    setErrorMsg('');
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
        audioMood: formData.audioMood || 'auto',
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

        <h3 className="modal-heading">✏️ Chỉnh Sửa Bài Viết</h3>
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Chuyên mục *</label>
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

          <div className="form-group" style={{ marginTop: '14px', background: 'rgba(99, 102, 241, 0.05)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <label style={{ fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span>🎧</span>
              <span>Cài đặt Giọng đọc & Tâm trạng A.I cho bài viết</span>
            </label>
            <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b' }}>
              Người đọc có thể bấm "Nghe đọc" để A.I diễn đọc bài viết bằng giọng tương ứng với cảm xúc bạn chọn.
            </p>
            <select
              name="audioMood"
              value={formData.audioMood || 'auto'}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #c7d2fe',
                fontSize: '0.88rem',
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
              disabled={loading || uploadingCover}
            >
              {loading ? 'Đang lưu...' : 'Lưu Thay Đổi Bài Viết'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
