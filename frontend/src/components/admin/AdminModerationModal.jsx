import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postService } from '../../services/postService';
import { formatDate } from '../../utils/formatDate';

export const AdminModerationModal = ({ isOpen, onClose, onPostDeleted }) => {
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchFlaggedPosts = async () => {
    setLoading(true);
    try {
      const res = await postService.getPosts({ limit: 100 });
      const posts = res.data?.posts || res.data || [];
      const flagged = posts.filter(
        (p) => p.isFlagged === true || p.moderationStatus === 'flagged'
      );
      setFlaggedPosts(flagged);
    } catch (err) {
      console.warn('Lỗi lấy danh sách bài viết kiểm duyệt:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFlaggedPosts();
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xóa ngang bài viết vi phạm tức thì
  const handleTakedown = async (post) => {
    const confirmDelete = window.confirm(
      `🚨 XÁC NHẬN XÓA NGANG (ADMIN):\n\nBạn có chắc chắn muốn gỡ bỏ vĩnh viễn bài viết "${post.title}" khỏi hệ thống?\n\nHành động này sẽ xóa ngay lập tức trên cả ổ cứng và Database để bảo vệ an toàn cho website!`
    );
    if (!confirmDelete) return;

    setActionLoadingId(post._id);
    try {
      await postService.deletePost(post._id || post.slug);
      setFlaggedPosts((prev) => prev.filter((p) => p._id !== post._id && p.slug !== post.slug));
      setMessage(`✓ Đã xóa ngang bài viết "${post.title}" thành công!`);
      window.dispatchEvent(new Event('post_updated'));
      if (typeof onPostDeleted === 'function') onPostDeleted(post._id);
    } catch (err) {
      alert(`Lỗi xóa bài: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Phê duyệt an toàn cho bài viết
  const handleApprove = async (post) => {
    setActionLoadingId(post._id);
    try {
      await postService.moderatePost(post._id || post.slug, { action: 'approve' });
      setFlaggedPosts((prev) => prev.filter((p) => p._id !== post._id && p.slug !== post.slug));
      setMessage(`✓ Đã phê duyệt an toàn cho bài viết "${post.title}"!`);
      window.dispatchEvent(new Event('post_updated'));
    } catch (err) {
      alert(`Lỗi phê duyệt: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10005 }}>
      <div
        className="modal-container admin-moderation-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Trung Tâm Kiểm Duyệt Nội Dung & An Toàn Web (Admin)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Tự động rà quét yếu tố Chính trị, kích động, từ ngữ nhạy cảm & xóa ngang vi phạm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Thông báo thao tác */}
        {message && (
          <div
            style={{
              padding: '10px 20px',
              background: '#ecfdf5',
              borderBottom: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        {/* Nội dung danh sách bài bị gắn cờ */}
        <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
              Danh sách bài viết cần Admin xử lý: ({flaggedPosts.length})
            </div>
            <button
              type="button"
              onClick={fetchFlaggedPosts}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              🔄 Tải lại
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              ⏳ Đang quét dữ liệu bài viết...
            </div>
          ) : flaggedPosts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '50px 20px',
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎉</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontWeight: 700 }}>
                Hệ thống an toàn tuyệt đối!
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Hiện không có bài viết nào vi phạm Chính trị hoặc chứa từ ngữ nhạy cảm cần can thiệp.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {flaggedPosts.map((p) => {
                const isWorking = actionLoadingId === p._id;

                return (
                  <div
                    key={p._id || p.slug}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginBottom: '10px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            ⚠️ Cần kiểm duyệt
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {formatDate(p.createdAt)}
                          </span>
                        </div>
                        <Link
                          to={`/post/${p.slug}`}
                          onClick={onClose}
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            textDecoration: 'none',
                            display: 'block',
                          }}
                        >
                          {p.title}
                        </Link>
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                          Tác giả: <strong>{p.author || 'Ẩn danh'}</strong>
                        </div>
                      </div>

                      {p.coverImage && (
                        <img
                          src={p.coverImage}
                          alt={p.title}
                          style={{
                            width: '80px',
                            height: '56px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>

                    {/* Hộp cảnh báo lý do nhạy cảm */}
                    <div
                      style={{
                        background: '#fff1f2',
                        borderLeft: '4px solid #ef4444',
                        padding: '8px 12px',
                        borderRadius: '0 6px 6px 0',
                        fontSize: '0.82rem',
                        color: '#991b1b',
                        marginBottom: '14px',
                      }}
                    >
                      <strong>Lý do gắn cờ:</strong> {p.flagReason || 'Chứa yếu tố nhạy cảm Chính trị hoặc từ ngữ hạn chế'}
                    </div>

                    {/* Nút hành động của Admin */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleApprove(p)}
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #10b981',
                          color: '#047857',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        ✓ Duyệt an toàn
                      </button>

                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleTakedown(p)}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '7px 16px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)',
                        }}
                      >
                        {isWorking ? 'Đang xóa...' : '🚨 Xóa ngang bài viết (Admin)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '12px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            💡 Từ ngữ nhạy cảm thông thường (D.I.E, c.h.ế.t...) đã được tự động chèn dấu chấm để giảm thiểu rủi ro.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              background: '#e2e8f0',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

