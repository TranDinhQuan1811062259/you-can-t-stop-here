import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { postService } from '../services/postService';
import { formatDate } from '../utils/formatDate';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { CommentSection } from '../components/blog/CommentSection';
import { EditPostModal } from '../components/blog/EditPostModal';
import { PostReactionsBar } from '../components/blog/PostReactionsBar';
import { PostAudioPlayer } from '../components/blog/PostAudioPlayer';
import { formatPostContent } from '../utils/contentFormatter';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export const PostDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChatWithUser, handleAddFriend, friendsList } = useChat();

  const [post, setPost] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cheers, setCheers] = useState(0);
  const [hasCheered, setHasCheered] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);
  const [adminApproving, setAdminApproving] = useState(false);

  const handleAdminDelete = async () => {
    const confirmed = window.confirm(
      `🚨 XÁC NHẬN XÓA NGANG BÀI VIẾT (ADMIN):\n\nBạn có chắc chắn muốn gỡ bỏ vĩnh viễn bài viết "${post.title}"?\n\nBài viết sẽ bị xóa ngay lập tức trên cả Database và ổ cứng.`
    );
    if (!confirmed) return;

    setAdminDeleting(true);
    try {
      await postService.deletePost(post._id || post.slug);
      alert('✓ Admin đã xóa ngang bài viết vi phạm thành công!');
      window.dispatchEvent(new Event('post_updated'));
      navigate('/', { replace: true });
    } catch (err) {
      alert(`Lỗi khi xóa bài: ${err.message}`);
    } finally {
      setAdminDeleting(false);
    }
  };

  const handleAdminApprove = async () => {
    setAdminApproving(true);
    try {
      await postService.moderatePost(post._id || post.slug, { action: 'approve' });
      setPost((prev) => ({ ...prev, isFlagged: false, moderationStatus: 'approved' }));
      alert('✓ Đã phê duyệt an toàn cho bài viết!');
      window.dispatchEvent(new Event('post_updated'));
    } catch (err) {
      alert(`Lỗi duyệt bài: ${err.message}`);
    } finally {
      setAdminApproving(false);
    }
  };

  const fetchPostDetail = () => {
    postService
      .getPostBySlug(slug)
      .then((res) => {
        setPost(res.data);
        setCheers(res.data.cheersCount || 0);
      })
      .catch((err) => {
        setError(err.message || 'Không tìm thấy bài viết.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setHasCheered(false);

    fetchPostDetail();

    postService
      .getRecentPosts(4)
      .then((res) => {
        setRecentPosts(res.data || []);
      })
      .catch((err) => console.warn(err));

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const handleRefresh = () => {
      fetchPostDetail();
    };

    window.addEventListener('profile_updated', handleRefresh);
    window.addEventListener('post_updated', handleRefresh);

    return () => {
      window.removeEventListener('profile_updated', handleRefresh);
      window.removeEventListener('post_updated', handleRefresh);
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

  // Kiểm tra xem tài khoản đang đăng nhập có phải tác giả bài viết này không
  const isCurrentUserAuthor =
    user &&
    ((post.user && (post.user._id === user._id || post.user === user._id)) ||
      post.author === user.name ||
      (user.role === 'admin' &&
        (post.author === 'Trần Đình Quân' ||
          post.author === 'Đình Quân Trần' ||
          user.email === 'anthonyq012025@gmail.com')));

  // Tác giả và thông tin người viết chính xác (Ưu tiên đồng nhất với thông tin tài khoản hiện tại nếu là tác giả)
  const authorName = (isCurrentUserAuthor && user?.name) ? user.name : (post.author || post.user?.name || 'Trần Đình Quân');
  const authorJob = (isCurrentUserAuthor && user?.jobTitle) ? user.jobTitle : (post.authorJob || post.user?.jobTitle || 'System Admin & Lead Dev');
  const authorAvatar = (isCurrentUserAuthor && user?.avatar) ? user.avatar : (post.authorAvatar || post.user?.avatar || '/images/man.jpg');
  const authorFrame = (isCurrentUserAuthor && user?.customLayout?.frameStyle)
    ? user.customLayout.frameStyle
    : (post.user?.customLayout?.frameStyle || 'none');
  const authorBio = (isCurrentUserAuthor && user?.bio) ? user.bio : (post.user?.bio || 'Chủ sở hữu & Quản trị viên hệ thống You Can\'t Stop Here.');
  const authorSocial = (isCurrentUserAuthor && user?.socialLinks) ? user.socialLinks : (post.user?.socialLinks || post.authorSocialLinks || {});
  const authorProfileUrl = `/profile/${post.user?._id || post.user || encodeURIComponent(authorName)}`;

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
              {/* Cảnh báo kiểm duyệt dành riêng cho bài nhạy cảm Chính Trị */}
              {post.isFlagged && (
                <div
                  className="post-admin-flag-alert"
                  style={{
                    background: '#fff1f2',
                    border: '2px solid #fecaca',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '20px',
                    color: '#991b1b',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.6rem' }}>🛡️</span>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: '#b91c1c' }}>CẢNH BÁO KIỂM DUYỆT (ADMIN):</strong>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}>
                          {post.flagReason || 'Bài viết chứa yếu tố nhạy cảm Chính Trị hoặc từ ngữ bị hạn chế.'}
                        </p>
                      </div>
                    </div>

                    {user?.role === 'admin' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={adminApproving}
                          onClick={handleAdminApprove}
                          style={{
                            background: '#ecfdf5',
                            border: '1px solid #10b981',
                            color: '#047857',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                          }}
                        >
                          {adminApproving ? '...' : '✓ Duyệt an toàn'}
                        </button>
                        <button
                          type="button"
                          disabled={adminDeleting}
                          onClick={handleAdminDelete}
                          style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: '0 3px 8px rgba(220, 38, 38, 0.3)',
                          }}
                        >
                          {adminDeleting ? 'Đang xóa...' : '🚨 Xóa ngang vi phạm'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <span className="post-header-badge">
                {post.category?.name || 'Tâm sự'}
              </span>

              <h1 className="post-full-title">{post.title}</h1>

              <div className="post-author-bar">
                <div className="post-author-left">
                  <Link to={authorProfileUrl} title={`Xem trang cá nhân của ${authorName}`}>
                    <img src={authorAvatar} alt={authorName} className={`post-author-avatar-lg frame-${authorFrame}`} />
                  </Link>
                  <div className="post-author-details">
                    <div className="post-author-name-row">
                      <Link to={authorProfileUrl} className="post-author-name-link" title={`Xem trang cá nhân của ${authorName}`}>
                        <h4 className="post-author-name">{authorName}</h4>
                      </Link>
                      {isCurrentUserAuthor && <span className="author-self-badge">Tác giả</span>}
                    </div>
                    <div className="post-author-sub-row">
                      <span className="post-author-job">{authorJob}</span>
                      {authorSocial && (authorSocial.facebook || authorSocial.instagram || authorSocial.tiktok || authorSocial.x || authorSocial.linkedin || authorSocial.github || authorSocial.website) && (
                        <div className="author-bar-social-mini">
                          {authorSocial.facebook && (
                            <a href={authorSocial.facebook.startsWith('http') ? authorSocial.facebook : `https://${authorSocial.facebook}`} target="_blank" rel="noopener noreferrer" title="Facebook" className="mini-social-icon">📘</a>
                          )}
                          {authorSocial.instagram && (
                            <a href={authorSocial.instagram.startsWith('http') ? authorSocial.instagram : `https://${authorSocial.instagram}`} target="_blank" rel="noopener noreferrer" title="Instagram" className="mini-social-icon">📸</a>
                          )}
                          {authorSocial.tiktok && (
                            <a href={authorSocial.tiktok.startsWith('http') ? authorSocial.tiktok : `https://${authorSocial.tiktok}`} target="_blank" rel="noopener noreferrer" title="TikTok" className="mini-social-icon">🎵</a>
                          )}
                          {authorSocial.x && (
                            <a href={authorSocial.x.startsWith('http') ? authorSocial.x : `https://${authorSocial.x}`} target="_blank" rel="noopener noreferrer" title="X (Twitter)" className="mini-social-icon">𝕏</a>
                          )}
                          {authorSocial.linkedin && (
                            <a href={authorSocial.linkedin.startsWith('http') ? authorSocial.linkedin : `https://${authorSocial.linkedin}`} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="mini-social-icon">💼</a>
                          )}
                          {authorSocial.github && (
                            <a href={authorSocial.github.startsWith('http') ? authorSocial.github : `https://${authorSocial.github}`} target="_blank" rel="noopener noreferrer" title="GitHub" className="mini-social-icon">🐱</a>
                          )}
                          {authorSocial.website && (
                            <a href={authorSocial.website.startsWith('http') ? authorSocial.website : `https://${authorSocial.website}`} target="_blank" rel="noopener noreferrer" title="Website" className="mini-social-icon">🌐</a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="post-stats-pill" style={{ whiteSpace: 'nowrap' }}>
                  <span className="post-stat-item" style={{ whiteSpace: 'nowrap' }}>
                    <span>🗓️</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{formatDate(post.createdAt)}</span>
                  </span>
                  <span className="post-stat-item" style={{ whiteSpace: 'nowrap' }}>
                    <span>👁️</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{post.views || 1} lượt đọc</span>
                  </span>
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

                  {/* Nút Xóa Ngang Dành Cho Admin (Ngay cả khi bài không bị gắn cờ) */}
                  {user?.role === 'admin' && !post.isFlagged && (
                    <button
                      type="button"
                      disabled={adminDeleting}
                      onClick={handleAdminDelete}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                      }}
                      title="Quyền Admin: Xóa ngang bài viết khỏi toàn hệ thống"
                    >
                      {adminDeleting ? 'Đang xóa...' : '🚨 Xóa ngang (Admin)'}
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

              {/* Trình Đọc Bài Viết A.I Thông Minh Bằng Giọng Cảm Xúc & Giọng Nhân Bản */}
              <PostAudioPlayer post={post} />

              {/* Body */}
              <div
                className="post-body"
                dangerouslySetInnerHTML={{ __html: formatPostContent(post.content) }}
              />

              {/* Tags (Hashtags hoạt động - bấm vào để lọc bài liên quan) */}
              {post.tags && post.tags.length > 0 && (
                <div className="post-tags-row">
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Chủ đề:</span>
                  {post.tags.map((tag, idx) => (
                    <Link
                      key={idx}
                      to={`/?tag=${encodeURIComponent(tag.replace(/^#/, ''))}`}
                      className="post-tag clickable-tag"
                      title={`Bấm để xem các câu chuyện về #${tag}`}
                    >
                      #{tag.replace(/^#/, '')}
                    </Link>
                  ))}
                </div>
              )}

              {/* Bày tỏ cảm xúc (Facebook-style Reactions) & Chia sẻ */}
              <PostReactionsBar
                post={post}
                onPostUpdated={(updated) => {
                  setPost(updated);
                  if (updated.cheersCount !== undefined) setCheers(updated.cheersCount);
                }}
              />
            </article>

            {/* Social Comment & Encouragement Section */}
            <CommentSection postId={post._id} postAuthorName={authorName} />
          </div>

          {/* Sidebar */}
          <aside className="sidebar">
            {/* Widget: Tác giả */}
            <div className="sidebar-widget">
              <h3 className="widget-title">Người Chia Sẻ</h3>
              <Link
                to={authorProfileUrl}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', textDecoration: 'none' }}
                title={`Bấm để xem trang cá nhân của ${authorName}`}
              >
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className={`frame-${authorFrame}`}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--bg-dark)' }}>{authorName}</h4>
                  <span style={{ fontSize: '0.82rem', color: 'var(--primary-hover)', fontWeight: 600 }}>
                    {authorJob}
                  </span>
                </div>
              </Link>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                {authorBio}
              </p>
              <Link
                to={authorProfileUrl}
                style={{
                  display: 'inline-block',
                  marginTop: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--primary-color)',
                  textDecoration: 'none',
                }}
              >
                👤 Xem trang cá nhân & bài viết &rarr;
              </Link>

              {/* Các liên kết Mạng xã hội của tác giả */}
              {authorSocial && (authorSocial.facebook || authorSocial.instagram || authorSocial.tiktok || authorSocial.x || authorSocial.linkedin || authorSocial.website) && (
                <div className="author-social-links-box">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Kết Nối Mạng Xã Hội
                  </span>
                  <div className="social-badges-flex">
                    {authorSocial.facebook && (
                      <a
                        href={authorSocial.facebook.startsWith('http') ? authorSocial.facebook : `https://${authorSocial.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-badge-btn fb"
                        title="Facebook của tác giả"
                      >
                        📘 Facebook
                      </a>
                    )}
                    {authorSocial.instagram && (
                      <a
                        href={authorSocial.instagram.startsWith('http') ? authorSocial.instagram : `https://${authorSocial.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-badge-btn insta"
                        title="Instagram của tác giả"
                      >
                        📸 Instagram
                      </a>
                    )}
                    {authorSocial.tiktok && (
                      <a
                        href={authorSocial.tiktok.startsWith('http') ? authorSocial.tiktok : `https://${authorSocial.tiktok}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-badge-btn tiktok"
                        title="TikTok của tác giả"
                      >
                        🎵 TikTok
                      </a>
                    )}
                    {authorSocial.x && (
                      <a
                        href={authorSocial.x.startsWith('http') ? authorSocial.x : `https://${authorSocial.x}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-badge-btn x-twitter"
                        title="X (Twitter) của tác giả"
                      >
                        𝕏 Twitter
                      </a>
                    )}
                    {authorSocial.linkedin && (
                      <a
                        href={authorSocial.linkedin.startsWith('http') ? authorSocial.linkedin : `https://${authorSocial.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-badge-btn linkedin"
                        title="LinkedIn của tác giả"
                      >
                        💼 LinkedIn
                      </a>
                    )}
                    {authorSocial.github && (
                      <a
                        href={authorSocial.github.startsWith('http') ? authorSocial.github : `https://${authorSocial.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-badge-btn github"
                        title="GitHub của tác giả"
                      >
                        🐱 GitHub
                      </a>
                    )}
                    {authorSocial.website && (
                      <a
                        href={authorSocial.website.startsWith('http') ? authorSocial.website : `https://${authorSocial.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-badge-btn web"
                        title="Website cá nhân của tác giả"
                      >
                        🌐 Website
                      </a>
                    )}
                  </div>
                </div>
              )}

              {user && !isCurrentUserAuthor && (
                <div className="author-actions-bar">
                  <button
                    type="button"
                    className="author-chat-btn"
                    onClick={() => {
                      const target = post.user?._id
                        ? post.user
                        : { _id: post.user || 'author', name: authorName, avatar: authorAvatar, jobTitle: authorJob };
                      openChatWithUser(target);
                    }}
                    title={`Nhắn tin trực tiếp với ${authorName}`}
                  >
                    ✉️ Nhắn tin
                  </button>
                  {friendsList.some((f) => f._id === (post.user?._id || post.user) || f.name === authorName) ? (
                    <span className="author-friend-badge">✓ Bạn bè</span>
                  ) : (
                    <button
                      type="button"
                      className="author-friend-btn"
                      onClick={async () => {
                        const targetId = post.user?._id || post.user;
                        if (targetId) {
                          await handleAddFriend(targetId);
                          alert(`Đã kết bạn với ${authorName}! Tên đã lưu vào danh bạ.`);
                        }
                      }}
                      title={`Kết bạn với ${authorName}`}
                    >
                      🤝 Kết bạn
                    </button>
                  )}
                </div>
              )}
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
