import React, { useState } from 'react';
import { categoryService } from '../../services/categoryService';

export const CategoryFilter = ({
  categories = [],
  activeCategory = '',
  onSelectCategory,
  onCategoryCreated,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🌍');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Hàm suy đoán icon nếu category chưa có icon
  const getCatIcon = (cat) => {
    if (cat.icon) return cat.icon;
    const lower = (cat.name || '').toLowerCase();
    if (lower.includes('thế giới') || lower.includes('quốc tế') || lower.includes('global')) return '🌍';
    if (lower.includes('chiến sự') || lower.includes('chiến tranh') || lower.includes('hòa bình') || lower.includes('conflict')) return '🕊️';
    if (lower.includes('xã hội') || lower.includes('thời cuộc') || lower.includes('society')) return '🌐';
    if (lower.includes('kiệt sức') || lower.includes('burnout') || lower.includes('áp lực')) return '😫';
    if (lower.includes('khủng hoảng') || lower.includes('career')) return '🧭';
    if (lower.includes('chuyển ngành') || lower.includes('restart')) return '🌱';
    if (lower.includes('động lực') || lower.includes('small wins') || lower.includes('tia sáng')) return '✨';
    if (lower.includes('tâm sự') || lower.includes('life')) return '☕';
    return '🏷️';
  };

  const handleCreateCategory = async (e) => {
    e?.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await categoryService.createCategory({
        name: newCatName.trim(),
        icon: newCatIcon || '🌍',
        description: newCatDesc.trim(),
      });

      const created = res.data?.data;
      if (created) {
        if (onCategoryCreated) onCategoryCreated(created);
        if (onSelectCategory) onSelectCategory(created.slug);

        window.dispatchEvent(
          new CustomEvent('freedom_category_created', { detail: { category: created } })
        );

        setIsModalOpen(false);
        setNewCatName('');
        setNewCatDesc('');
      }
    } catch (err) {
      console.error('Lỗi khi tạo thể loại:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tạo thể loại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="category-filter-wrapper" style={{ marginBottom: '24px' }}>
      <div
        className="category-filter-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Nút xem Tất cả */}
        <button
          className={`cat-btn ${activeCategory === '' ? 'active' : ''}`}
          onClick={() => onSelectCategory('')}
          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>🔥</span>
          <span>Tất cả bài viết</span>
        </button>

        {/* Danh sách thể loại */}
        {categories.map((cat) => {
          const isActive = activeCategory === cat.slug;
          const icon = getCatIcon(cat);
          return (
            <button
              key={cat._id || cat.slug}
              className={`cat-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.slug)}
              title={cat.description || cat.name}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}

        {/* Nút bấm Tạo thể loại mới trực tiếp */}
        <button
          type="button"
          className="cat-btn add-cat-quick-btn"
          onClick={() => setIsModalOpen(true)}
          style={{
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(16, 185, 129, 0.15) 100%)',
            border: '1.5px dashed #0d9488',
            color: '#0d9488',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Tạo thêm thể loại bài viết mới (Thời sự, Thế giới, Chiến sự...)"
        >
          <span>✨</span>
          <span>+ Thêm thể loại</span>
        </button>
      </div>

      {/* MODAL / DIALOG TẠO THỂ LOẠI MỚI */}
      {isModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
              border: '1.5px solid #e2e8f0',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.6rem' }}>🌍</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                    Tạo Thể Loại Bài Viết Mới
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Thêm thể loại để cùng cộng đồng bày tỏ tin tức, tình hình thế giới, chiến sự & đời sống.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '12px', fontWeight: 600 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCategory}>
              {/* Tên thể loại */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Tên thể loại *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chiến sự & Tình hình Thế giới, Góc nhìn thời cuộc..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Khay chọn Icon Emoji */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Biểu tượng đại diện:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['🌍', '🕊️', '💣', '📰', '🌐', '🛡️', '⚖️', '🏛️', '💬', '☕', '🌱', '✨', '🔥', '💼', '💡', '❤️'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewCatIcon(ic)}
                      style={{
                        background: newCatIcon === ic ? '#ccfbf1' : '#f8fafc',
                        border: newCatIcon === ic ? '2px solid #0d9488' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        width: '34px',
                        height: '34px',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: newCatIcon === ic ? 'scale(1.15)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mô tả ngắn */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mô tả ngắn (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Mô tả tóm tắt nội dung của thể loại này..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Nút hành động */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim() || loading}
                  style={{
                    padding: '9px 20px',
                    background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: !newCatName.trim() || loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
                  }}
                >
                  {loading ? 'Đang tạo...' : 'Tạo & Chọn Xem Ngay ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
