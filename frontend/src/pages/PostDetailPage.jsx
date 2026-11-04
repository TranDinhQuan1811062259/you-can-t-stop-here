import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { postService } from '../services/postService';
import { formatDate } from '../utils/formatDate';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { CommentSection } from '../components/blog/CommentSection';
import { EditPostModal } from '../components/blog/EditPostModal';
import { formatPostContent } from '../utils/contentFormatter';
import { useAuth } from '../context/AuthContext';

export const PostDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cheers, setCheers] = useState(0);
  const [hasCheered, setHasCheered] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);
    setError(null);
    setHasCheered(false);

    postService
      .getPostBySlug(slug)
      .then((res) => {
        if (isSubscribed) {
          setPost(res.data);
          setCheers(res.data.cheersCount || 0);
        }
      })
      .catch((err) => {
        if (isSubscribed) setError(err.message || 'Không tìm thấy bài viết.');
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    postService
      .getRecentPosts(4)
      .then((res) => {
        if (isSubscribed) setRecentPosts(res.data || []);
      })
      .catch((err) => console.warn(err));

    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isSubscribed = false;
    };
  }, [slug]);

  const handleCheer = async () => {
    if (hasCheered || !post) return;
    setCheers((prev) => prev + 1);
    setHasCheered(true);

    try {
      await postService.cheerPost(post._id);
    } catch (err) {
      console.warn('Lỗi cheer:', err);
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPost(updatedPost);
    setCheers(updatedPost.cheersCount || 0);
    if (updatedPost.slug && updatedPost.slug !== slug) {
      navigate(`/post/${updatedPost.slug}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0' }}>
        <LoadingSpinner message="Đang tải tâm sự..." />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container" style={{ padding: '80px 0' }}>
        <ErrorMessage message={error || 'Tâm sự không tồn tại.'} />
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/" className="page-btn">
            &larr; Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Tác giả và thông tin người viết chính xác
  const authorName = post.author || post.user?.name || 'Trần Đình Quân';
  const authorJob = post.authorJob || post.user?.jobTitle || 'System Admin & Lead Dev';
  const authorAvatar = post.user?.avatar || '/images/man.jpg';
  const authorBio = post.user?.bio || 'Chủ sở hữu & Quản trị viên hệ thống You Can\'t Stop Here.';

  // Kiểm tra quyền chỉnh sửa (Tác giả bài viết hoặc Admin)
  const canEdit =
    user &&
    (user.role === 'admin' ||
      user._id === post.user?._id ||
      user._id === post.user ||
      authorName === user.name);

  return (
    <div className="post-detail-wrap">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb-nav">
          <Link to="/" style={{ color: 'var(--primary-color)' }}>Trang chủ</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link
            to={`/category/${post.category?.slug}`}
            style={{ color: 'var(--primary-color)' }}
          >
            {post.category?.name || 'Tâm sự'}
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>{post.title}</span>
        </div>

        <div className="post-detail-layout">
          {/* Main Content Area */}
          <div>
            <article className="post-main-content">
              <span className="post-header-badge">
                {post.category?.name || 'Tâm sự'}
              </span>

              <h1 className="post-full-title">{post.title}</h1>

              <div className="post-author-bar">
                <img src={authorAvatar} alt={authorName} className="post-author-avatar-lg" />
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--bg-dark)', fontWeight: 700 }}>
                    {authorName}
                  </h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{authorJob}</span>
                </div>
                <div className="post-stats-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅 {formatDate(post.createdAt)}</span>
                  <span>👁️ {post.views || 1} lượt đọc</span>
                  {canEdit && (
                    <button
                      type="button"
                      className="edit-post-trigger-btn"
                      onClick={() => setIsEditModalOpen(true)}
                      title="Chỉnh sửa bài viết này"
                    >
                      ✏️ Sửa bài viết
                    </button>
                  )}
                </div>
              </div>

              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="post-featured-image"
                />
              )}

              {/* Body */}
              <div
                className="post-body"
                dangerouslySetInnerHTML={{ __html: formatPostContent(post.content) }}
              />

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="post-tags-row">
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Chủ đề:</span>
                  {post.tags.map((tag, idx) => (
                    <span key={idx} className="post-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Cheer Interaction Box */}
              <div className="post-cheer-action-box">
                <p style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '12px' }}>
                  Câu chuyện này có chạm đến cảm xúc của bạn không?
                </p>
                <button
                  className={`cheer-action-btn ${hasCheered ? 'cheered' : ''}`}
                  onClick={handleCheer}
                  disabled={hasCheered}
                >
                  {hasCheered ? '❤️ Đã gửi lời động viên!' : `💪 Gửi lời động viên tới ${authorName} (${cheers})`}
                </button>
              </div>
            </article>

            {/* Social Comment & Encouragement Section */}
            <CommentSection postId={post._id} />
          </div>

          {/* Sidebar */}
          <aside className="sidebar">
            {/* Widget: Tác giả */}
            <div className="sidebar-widget">
              <h3 className="widget-title">Người Chia Sẻ</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <img
                  src={authorAvatar}
                  alt={authorName}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--bg-dark)' }}>{authorName}</h4>
                  <span style={{ fontSize: '0.82rem', color: 'var(--primary-hover)', fontWeight: 600 }}>
                    {authorJob}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                {authorBio}
              </p>
            </div>

            {/* Widget: Tâm sự khác */}
            <div className="sidebar-widget">
              <h3 className="widget-title">Tâm Sự Khác</h3>
              <div className="recent-posts-list">
                {recentPosts.map((rPost) => (
                  <div key={rPost._id} className="recent-post-item">
                    <img
                      src={rPost.coverImage || '/images/sun.jpg'}
                      alt={rPost.title}
                      className="recent-post-thumb"
                    />
                    <div className="recent-post-info">
                      <Link to={`/post/${rPost.slug}`} className="recent-post-title">
                        {rPost.title}
                      </Link>
                      <span className="recent-post-meta">
                        💪 {rPost.cheersCount || 0} động viên
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Popup chỉnh sửa bài viết */}
      {isEditModalOpen && (
        <EditPostModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          post={post}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
};
