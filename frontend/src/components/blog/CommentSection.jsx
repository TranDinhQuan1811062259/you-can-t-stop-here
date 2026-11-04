import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { commentService } from '../../services/commentService';
import { formatDate } from '../../utils/formatDate';
import { LoadingSpinner } from '../common/LoadingSpinner';

const CHEER_TYPES = [
  { id: 'encourage', label: '💪 Cố lên nhé' },
  { id: 'hug', label: '🫂 Gửi cái ôm' },
  { id: 'advice', label: '💡 Lời khuyên' },
  { id: 'general', label: '💬 Đồng cảm' },
];

export const CommentSection = ({ postId }) => {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [selectedCheerType, setSelectedCheerType] = useState('encourage');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tải danh sách bình luận (Khách hay thành viên đều đọc được)
  const fetchComments = () => {
    commentService
      .getCommentsByPost(postId)
      .then((res) => {
        setComments(res.data || []);
      })
      .catch((err) => {
        console.warn('Lỗi tải bình luận:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (postId) {
      setLoading(true);
      fetchComments();
    }
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await commentService.createComment(postId, {
        content: newContent,
        cheerType: selectedCheerType,
      });
      // Đưa bình luận mới lên đầu danh sách
      setComments([res.data, ...comments]);
      setNewContent('');
    } catch (err) {
      setErrorMsg(err.message || 'Không thể gửi bình luận lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa lời nhắn này?')) return;
    try {
      await commentService.deleteComment(commentId);
      setComments(comments.filter((c) => c._id !== commentId));
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa bình luận');
    }
  };

  return (
    <div className="comment-section-box">
      <div className="comment-section-header">
        <h3 className="section-title">
          💬 Lời Động Viên & Trò Chuyện ({comments.length})
        </h3>
        <p className="section-subtitle">
          Một lời nói tử tế có thể thắp sáng cả một ngày u tối của ai đó.
        </p>
      </div>

      {/* Form gửi bình luận */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="comment-form">
          {errorMsg && <div className="modal-error">{errorMsg}</div>}

          {/* Chọn loại tương tác/cảm xúc */}
          <div className="cheer-type-selector">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tâm thế gửi gắm:</span>
            <div className="cheer-pills">
              {CHEER_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`cheer-pill-btn ${selectedCheerType === t.id ? 'active' : ''}`}
                  onClick={() => setSelectedCheerType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="comment-input-wrap">
            <img
              src={user?.avatar || '/images/man.jpg'}
              alt={user?.name}
              className="comment-author-avatar"
            />
            <textarea
              className="comment-textarea"
              placeholder={`Bạn muốn nhắn gửi lời động viên gì tới tác giả bài viết này?`}
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <button
              type="submit"
              className="comment-submit-btn"
              disabled={submitting || !newContent.trim()}
            >
              {submitting ? 'Đang gửi...' : 'Gửi Lời Động Viên ✨'}
            </button>
          </div>
        </form>
      ) : (
        /* Khách chưa đăng nhập: Banner mời gọi lịch sự */
        <div className="guest-cta-banner">
          <p>
            Bạn có câu chuyện tương tự hoặc muốn gửi lời động viên chân thành tới người viết?
          </p>
          <button
            type="button"
            className="guest-login-btn"
            onClick={openLoginModal}
          >
            Đăng Nhập Hoặc Tạo Tài Khoản Để Bình Luận
          </button>
        </div>
      )}

      {/* Danh sách các bình luận */}
      {loading ? (
        <LoadingSpinner message="Đang tải lời nhắn của cộng đồng..." />
      ) : comments.length === 0 ? (
        <div className="empty-comments">
          <p>Chưa có lời nhắn nào. Hãy là người đầu tiên gửi lời động viên nhé!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((c) => {
            const cheerObj = CHEER_TYPES.find((t) => t.id === c.cheerType);
            const isOwner = user && user._id === c.user?._id;
            const canDelete = isOwner || user?.role === 'admin';

            return (
              <div key={c._id} className="comment-card">
                <img
                  src={c.user?.avatar || '/images/man.jpg'}
                  alt={c.user?.name}
                  className="comment-avatar"
                />
                <div className="comment-body-wrap">
                  <div className="comment-top-row">
                    <div>
                      <span className="comment-user-name">
                        {c.user?.name || 'Ẩn danh'}
                      </span>
                      {c.user?.role === 'admin' && (
                        <span style={{ background: '#e74c3c', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px' }}>
                          ADMIN
                        </span>
                      )}
                      {c.user?.jobTitle && (
                        <span className="comment-user-job">
                          • {c.user.jobTitle}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {cheerObj && (
                        <span className="comment-cheer-tag">
                          {cheerObj.label}
                        </span>
                      )}
                      <span className="comment-time">
                        {formatDate(c.createdAt)}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          className="comment-del-btn"
                          onClick={() => handleDelete(c._id)}
                          title={user?.role === 'admin' ? "Quản trị viên xóa bình luận" : "Xóa bình luận của bạn"}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="comment-text">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

