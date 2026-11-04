import React, { useState, useEffect } from 'react';
import { postService } from '../../services/postService';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import { RichVisualEditor } from './RichVisualEditor';
import { formatPostContent } from '../../utils/contentFormatter';

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
      const payload = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        authorJob: formData.authorJob.trim(),
        summary: formData.summary.trim(),
        content: formData.content,
        category: formData.category || undefined,
        coverImage: formData.coverImage || undefined,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        views: parseInt(formData.views, 10) || 1,
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
