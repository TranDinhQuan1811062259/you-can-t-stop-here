import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatDate';
import { postService } from '../../services/postService';
import { playClickSound } from '../../utils/soundEffects';

export const PostCard = ({ post }) => {
  const { user } = useAuth();
  if (!post) return null;

  const categoryName = post.category?.name || 'Tâm sự';
  const postId = post._id || post.slug;

  const [isPlayingAi, setIsPlayingAi] = useState(false);

  // Lắng nghe trạng thái phát âm thanh A.I toàn cục
  useEffect(() => {
    const handleAudioState = (e) => {
      const { postId: activeId, state } = e.detail || {};
      if (activeId === postId) {
        setIsPlayingAi(state === 'playing');
      } else {
        setIsPlayingAi(false);
      }
    };

    window.addEventListener('freedom_ai_audio_state_change', handleAudioState);
    return () => {
      window.removeEventListener('freedom_ai_audio_state_change', handleAudioState);
    };
  }, [postId]);

  // Kích hoạt Nghe A.I đọc bài viết
  const handleToggleAiAudio = (e) => {
    e.preventDefault();
    e.stopPropagation();
    playClickSound();

    window.dispatchEvent(
      new CustomEvent('freedom_play_ai_post', {
        detail: { post },
      })
    );
  };

  // Kiểm tra xem bài viết có phải do người đang đăng nhập viết không
  const isCurrentUserAuthor =
    user &&
    ((post.user && (post.user._id === user._id || post.user === user._id)) ||
      post.author === user.name ||
      (user.role === 'admin' &&
        (post.author === 'Trần Đình Quân' ||
          post.author === 'Đình Quân Trần' ||
          user.email === 'anthonyq012025@gmail.com')));

  const authorName = (isCurrentUserAuthor && user?.name) ? user.name : (post.author || post.user?.name || 'Trần Đình Quân');
  const authorJob = (isCurrentUserAuthor && user?.jobTitle) ? user.jobTitle : (post.authorJob || post.user?.jobTitle || 'System Admin & Lead Dev');
  const authorAvatar = (isCurrentUserAuthor && user?.avatar) ? user.avatar : (post.authorAvatar || post.user?.avatar || '/images/man.jpg');
  const authorFrame = (isCurrentUserAuthor && user?.customLayout?.frameStyle)
    ? user.customLayout.frameStyle
    : (post.user?.customLayout?.frameStyle || 'none');

  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);

  const handleAdminDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `🚨 XÁC NHẬN XÓA NGANG (ADMIN):\n\nBạn có chắc chắn muốn xóa bài viết "${post.title}"?\n\nBài viết sẽ bị gỡ bỏ tức thì trên toàn hệ thống.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await postService.deletePost(post._id || post.slug);
      window.dispatchEvent(new Event('post_updated'));
    } catch (err) {
      alert(`Lỗi xóa bài: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleAdminApprove = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setApproving(true);
    try {
      await postService.moderatePost(post._id || post.slug, { action: 'approve' });
      window.dispatchEvent(new Event('post_updated'));
    } catch (err) {
      alert(`Lỗi duyệt bài: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  return (
    <article className={`post-card ${post.isFlagged ? 'is-flagged-card' : ''}`}>
      <div className="card-img-wrap">
        <Link to={`/post/${post.slug}`}>
          <img
            src={post.coverImage || '/images/sun.jpg'}
            alt={post.title}
            className="card-img"
            loading="lazy"
          />
        </Link>

        {/* Thanh Huy Hiệu Trên Đầu Ảnh - Thiết kế Flexbox chống tràn & chống đè chữ tuyệt đối */}
        <div className="card-top-badges-bar">
          <span className="card-category-badge" title={categoryName}>
            {categoryName}
          </span>

          <div className="card-top-actions-group">
            {/* Huy hiệu cảnh báo bài nhạy cảm Chính Trị */}
            {post.isFlagged && (
              <span
                className="card-flagged-badge"
                title={post.flagReason || 'Bài viết chứa yếu tố nhạy cảm Chính Trị'}
              >
                ⚠️ Nhạy Cảm
              </span>
            )}

            {/* Nút Nghe A.I Đọc Bài Viết Cảm Xúc (Đã kích hoạt click và hoạt ảnh âm thanh) */}
            <button
              type="button"
              className={`card-audio-mood-btn ${isPlayingAi ? 'is-active-playing' : ''}`}
              onClick={handleToggleAiAudio}
              title={
                isPlayingAi
                  ? 'Đang phát bài viết này. Bấm để tạm dừng đọc'
                  : `Bấm để kích hoạt A.I đọc bài viết: "${post.title}"`
              }
            >
              <span className="audio-btn-icon">{isPlayingAi ? '⏸' : '🎧'}</span>
              <span className="audio-btn-label">{isPlayingAi ? 'Đang đọc...' : 'Nghe AI đọc'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card-content">
        {/* Author row */}
        <Link
          to={`/profile/${post.user?._id || post.user || encodeURIComponent(authorName)}`}
          className="card-author-row card-author-link"
          title={`Xem trang cá nhân của ${authorName}`}
        >
          <img src={authorAvatar} alt={authorName} className={`card-author-avatar frame-${authorFrame}`} />
          <div className="card-author-info">
            <h5 className="card-author-name">{authorName}</h5>
            <span className="card-author-sub">{authorJob}</span>
          </div>
        </Link>

        <Link to={`/post/${post.slug}`}>
          <h3 className="card-title">{post.title}</h3>
        </Link>

        <p className="card-summary">{post.summary}</p>

        <div className="card-footer">
          {/* Cụm thống kê gọn gàng, bấm vào để xem chi tiết bài viết */}
          <Link
            to={`/post/${post.slug}`}
            className="card-stats-pill"
            title="Bấm để xem chi tiết lượt đọc, cảm xúc & bình luận"
          >
            <span className="pill-stat">
              <span className="stat-icon">❤️</span>
              <span className="stat-val">
                {post.showReactionCount !== false
                  ? (post.reactionCounts?.total || post.cheersCount || 0)
                  : 'Cảm xúc'}
              </span>
            </span>
            <span className="pill-divider">•</span>
            <span className="pill-stat">
              <span className="stat-icon">👁️</span>
              <span className="stat-val">{post.views || 1}</span>
            </span>
            {post.sharesCount > 0 && (
              <>
                <span className="pill-divider">•</span>
                <span className="pill-stat">
                  <span className="stat-icon">↗</span>
                  <span className="stat-val">{post.sharesCount}</span>
                </span>
              </>
            )}
          </Link>

          {/* Nút hành động đọc bài - Rõ ràng, không bị chèn ép hay rớt dòng */}
          <Link to={`/post/${post.slug}`} className="card-read-action-btn" title="Đọc bài viết và trò chuyện">
            <span>Đọc & Trò chuyện</span>
            <span className="read-arrow">&rarr;</span>
          </Link>
        </div>

        {/* Thanh công cụ kiểm duyệt & Xóa ngang dành riêng cho Admin */}
        {user?.role === 'admin' && (
          <div
            className="card-admin-bar"
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px dashed #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: post.isFlagged ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                {post.isFlagged ? '⚠️ Cần kiểm duyệt' : '🛡️ Admin'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {post.isFlagged && (
                <button
                  type="button"
                  disabled={approving}
                  onClick={handleAdminApprove}
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #86efac',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Xác nhận bài viết an toàn, bỏ gắn cờ"
                >
                  {approving ? '...' : '✓ Duyệt'}
                </button>
              )}

              <button
                type="button"
                disabled={deleting}
                onClick={handleAdminDelete}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                }}
                title="Xóa ngang tức thì bài viết vi phạm này khỏi hệ thống"
              >
                {deleting ? 'Đang xóa...' : '🚨 Xóa ngang (Admin)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
