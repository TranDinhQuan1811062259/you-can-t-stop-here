import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatDate';
import { postService, prefetchPostBySlug } from '../../services/postService';
import { prefetchUserProfile } from '../../services/authService';
import { playClickSound } from '../../utils/soundEffects';
import { ATMOSPHERE_THEMES } from '../../utils/postAtmosphereEngine';
import { SharePostModal } from './SharePostModal';
import { IdleWeatherText } from '../common/IdleWeatherText';
import { PostCardIdleOverlay } from './PostCardIdleOverlay';
import { getHighestBadge } from '../../utils/badgeHelper';
import { extractYouTubeId } from '../../utils/contentFormatter';
import { calculateReadingTime } from '../../utils/readingTime';
import { AuthorQuickPeekWrapper } from '../profile/AuthorQuickPeekCard';

const DEFAULT_EMPTY_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 7.5a3 3 0 100 6 3 3 0 000-6zm-6.75 10.5a7.48 7.48 0 0113.5 0 8.22 8.22 0 01-13.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";

export const PostCard = ({ post }) => {
  const { user } = useAuth();

  const categoryName = post?.category?.name || 'Tâm sự';
  const categoryIcon = post?.category?.icon || (() => {
    const lower = categoryName.toLowerCase();
    if (lower.includes('thế giới') || lower.includes('quốc tế') || lower.includes('global')) return '🌍';
    if (lower.includes('chiến sự') || lower.includes('chiến tranh') || lower.includes('hòa bình') || lower.includes('xung đột')) return '🕊️';
    if (lower.includes('xã hội') || lower.includes('thời cuộc') || lower.includes('society')) return '🌐';
    if (lower.includes('kiệt sức') || lower.includes('burnout') || lower.includes('áp lực')) return '😫';
    if (lower.includes('khủng hoảng') || lower.includes('career')) return '🧭';
    if (lower.includes('chuyển ngành') || lower.includes('restart')) return '🌱';
    if (lower.includes('động lực') || lower.includes('small wins') || lower.includes('tia sáng')) return '✨';
    if (lower.includes('tâm sự') || lower.includes('life')) return '☕';
    return '🏷️';
  })();
  const postId = post?._id || post?.slug;
  const readingInfo = post ? calculateReadingTime(post) : { minutes: 1, text: '1 phút đọc' };

  const [isPlayingAi, setIsPlayingAi] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [localSharesCount, setLocalSharesCount] = useState(post?.sharesCount || post?.repostCount || 0);

  // Predictive Post Detail Warm-Cache: Nạp trước bài viết âm thầm khi hover 120ms hoặc focus
  const hoverPrefetchTimerRef = useRef(null);
  const hoverAuthorPrefetchTimerRef = useRef(null);

  const cancelPostPrefetch = () => {
    if (hoverPrefetchTimerRef.current) {
      clearTimeout(hoverPrefetchTimerRef.current);
      hoverPrefetchTimerRef.current = null;
    }
  };

  const schedulePostPrefetch = (immediate = false) => {
    cancelPostPrefetch();
    if (!post?.slug) return;
    if (immediate) {
      prefetchPostBySlug(post.slug);
      return;
    }
    hoverPrefetchTimerRef.current = setTimeout(() => {
      hoverPrefetchTimerRef.current = null;
      prefetchPostBySlug(post.slug);
    }, 120);
  };

  const cancelAuthorPrefetch = () => {
    if (hoverAuthorPrefetchTimerRef.current) {
      clearTimeout(hoverAuthorPrefetchTimerRef.current);
      hoverAuthorPrefetchTimerRef.current = null;
    }
  };

  const scheduleAuthorPrefetch = (immediate = false) => {
    cancelAuthorPrefetch();
    const authorTarget = post?.user?._id || post?.user || post?.author || post?.user?.name;
    if (!authorTarget) return;
    if (immediate) {
      prefetchUserProfile(authorTarget);
      return;
    }
    hoverAuthorPrefetchTimerRef.current = setTimeout(() => {
      hoverAuthorPrefetchTimerRef.current = null;
      prefetchUserProfile(authorTarget);
    }, 120);
  };

  useEffect(() => {
    return () => {
      cancelPostPrefetch();
      cancelAuthorPrefetch();
    };
  }, []);

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

  // Kiểm tra xem bài viết có phải do người đang đăng nhập viết không (Chỉ khớp ID chính chủ hoặc tác giả legacy không gắn user)
  const isCurrentUserAuthor = Boolean(
    user &&
    post &&
    ((post.user && (post.user._id || post.user)?.toString() === user._id?.toString()) ||
      (!post.user && post.author && user.name && post.author.trim().toLowerCase() === user.name.trim().toLowerCase()))
  );

  // Giữ đúng tác giả của từng bài viết; nếu là chính chủ đang đăng nhập thì đồng bộ 100% tên & avatar hiện tại
  const cleanAdminAvatar = '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
  const rawAuthor = post?.user?.name || post?.author || (isCurrentUserAuthor ? user.name : '');
  const isInvalidAuthor =
    !rawAuthor ||
    typeof rawAuthor !== 'string' ||
    ['hình ảnh', 'hình anh', 'image', 'picture', 'photo', 'ảnh'].includes(rawAuthor.trim().toLowerCase());
  const authorName = isInvalidAuthor
    ? (isCurrentUserAuthor ? user?.name || 'Thành viên cộng đồng' : 'Thành viên ẩn danh')
    : rawAuthor.trim();
  const authorJob = post?.authorJob || post?.user?.jobTitle || (isCurrentUserAuthor ? user.jobTitle : 'Thành viên cộng đồng');

  // Đồng bộ Avatar chuẩn xác 100%:
  const getAuthorAvatar = () => {
    // 1. Nếu tác giả bài viết có avatar riêng hợp lệ
    const raw = post?.authorAvatar || post?.user?.avatar || (isCurrentUserAuthor ? user?.avatar : '');
    if (raw && !raw.includes('man.jpg') && !raw.includes('google_avatar')) {
      return raw;
    }

    // 2. Chỉ gắn avatar Admin nếu bài viết thực sự do tài khoản role admin đăng
    const isPostByAdmin =
      post?.user?.role === 'admin' ||
      (isCurrentUserAuthor && user?.role === 'admin');

    if (isPostByAdmin) {
      return cleanAdminAvatar;
    }

    return DEFAULT_EMPTY_AVATAR;
  };

  const authorAvatar = getAuthorAvatar();
  const authorFrame = user?.customLayout?.frameStyle && isCurrentUserAuthor ? user.customLayout.frameStyle : (post?.user?.customLayout?.frameStyle || 'none');
  const authorStreak = isCurrentUserAuthor ? (user?.streakCount || 0) : (post?.user?.streakCount || post?.authorStreakCount || 0);
  const authorHonorBadge = getHighestBadge(authorStreak);

  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);

  if (!post) return null;

  // Xóa bài viết dành riêng cho chính chủ tác giả
  const handleAuthorDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `🗑️ XÁC NHẬN XÓA BÀI VIẾT:\n\nBạn có chắc chắn muốn xóa bài viết "${post.title}" của mình không?\n\nBài viết sẽ bị gỡ bỏ khỏi trang chủ và trang cá nhân của bạn.`
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

  const postAtmosphere = post.atmosphere || { theme: 'default', soundEnabled: true, bgPreset: 'default' };
  const themeMeta = ATMOSPHERE_THEMES[postAtmosphere.theme] || ATMOSPHERE_THEMES.default;
  const hasAtmosphere = postAtmosphere.theme && postAtmosphere.theme !== 'default';
  const customAccentColor = postAtmosphere.customColor || themeMeta.accentColor;

  // Xử lý định dạng bài viết đa phương tiện (article, photo, video)
  const postFormat = post.postType || 'article';
  const videoSource = (post.mediaUrls && post.mediaUrls[0]) || post.coverImage || '';
  const ytVideoId = postFormat === 'video' ? extractYouTubeId(videoSource) : null;
  const isDirectVideo =
    postFormat === 'video' &&
    videoSource &&
    !ytVideoId &&
    (videoSource.includes('.mp4') || videoSource.includes('.webm') || videoSource.includes('/video/upload/') || videoSource.startsWith('data:video'));
  const photoSource = (post.mediaUrls && post.mediaUrls[0]) || post.coverImage || '/images/office-night.jpg';
  const photoCount = post.mediaUrls && Array.isArray(post.mediaUrls) ? post.mediaUrls.length : 1;

  return (
    <article
      className={`post-card post-card-${postFormat} ${post.isFlagged ? 'is-flagged-card' : ''} ${hasAtmosphere ? 'has-atmosphere-card' : ''}`}
      style={hasAtmosphere ? { borderTop: `3px solid ${customAccentColor}` } : {}}
      onMouseEnter={() => schedulePostPrefetch(false)}
      onMouseLeave={cancelPostPrefetch}
      onFocus={() => schedulePostPrefetch(true)}
    >
      {/* Hiệu ứng thời tiết tích tụ trên khung bài viết khi nhàn rỗi (Tuyết / Hoa / Lá / Tan chảy) */}
      <PostCardIdleOverlay />

      <div className="card-img-wrap">
        {/* Render media theo định dạng bài viết */}
        {postFormat === 'video' && ytVideoId ? (
          <div
            className="card-video-frame"
            style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              background: '#0f172a',
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${ytVideoId}`}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          </div>
        ) : postFormat === 'video' && isDirectVideo ? (
          <div
            className="card-video-frame"
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: '340px',
              overflow: 'hidden',
              background: '#000000',
            }}
          >
            <video
              src={videoSource}
              controls
              preload="metadata"
              playsInline
              style={{
                width: '100%',
                maxHeight: '340px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <Link to={`/post/${post.slug}`} className="card-img-link" title={post.title}>
            <img
              src={postFormat === 'photo' ? photoSource : (post.coverImage || '/images/office-night.jpg')}
              alt={post.title}
              className={`card-img ${postFormat === 'photo' ? 'card-photo-img' : ''}`}
              loading="lazy"
              style={postFormat === 'photo' ? { objectFit: 'cover', aspectRatio: '16/10' } : {}}
              onError={(e) => {
                if (!e.target.dataset.triedFallback) {
                  e.target.dataset.triedFallback = '1';
                  e.target.src = '/images/office-night.jpg';
                }
              }}
            />
            {postFormat === 'photo' && photoCount > 1 && (
              <span
                className="card-photo-count-badge"
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  zIndex: 2,
                }}
              >
                <span>📷</span>
                <span>+{photoCount - 1} ảnh</span>
              </span>
            )}
          </Link>
        )}

        {/* Thanh Huy Hiệu Trên Đầu Ảnh (Category + Chế độ xem bên trái; Định dạng + Không gian bên phải) */}
        <div className="card-top-badges-bar">
          <div className="card-badges-left">
            <Link
              to={post.category?.slug ? `/?category=${post.category.slug}` : '/'}
              className="card-category-badge"
              title={`Thể loại: ${categoryName} (Bấm để xem tất cả bài viết cùng chủ đề)`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="category-icon">{categoryIcon}</span>
              <span className="card-category-badge-text">{categoryName}</span>
            </Link>

            {/* Huy hiệu định dạng bài viết */}
            {postFormat === 'photo' && (
              <span
                className="card-format-pill"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(168, 85, 247, 0.35)',
                }}
                title="Định dạng: Khoảnh khắc ảnh kèm status"
              >
                📸 Ảnh
              </span>
            )}
            {postFormat === 'video' && (
              <span
                className="card-format-pill"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                }}
                title="Định dạng: Video ngắn"
              >
                🎬 Video
              </span>
            )}
            {postFormat === 'article' && (
              <span
                className="card-format-pill"
                style={{
                  background: 'rgba(13, 148, 136, 0.2)',
                  color: '#14b8a6',
                  border: '1px solid rgba(20, 184, 166, 0.35)',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Định dạng: Bài viết sâu"
              >
                📝 Bài viết
              </span>
            )}

            <span
              className={`card-visibility-pill ${post.visibility === 'friends' ? 'is-friends' : 'is-public'}`}
              title={post.visibility === 'friends' ? 'Chế độ: Chỉ bạn bè mới xem được' : 'Chế độ: Công khai cho tất cả'}
            >
              {post.visibility === 'friends' ? (
                <i className="fa-solid fa-user-group" style={{ fontSize: '0.72rem' }}></i>
              ) : (
                <i className="fa-solid fa-globe" style={{ fontSize: '0.72rem' }}></i>
              )}
            </span>
          </div>

          <div className="card-badges-right">
            {hasAtmosphere && (
              <span
                className="card-atmosphere-badge"
                style={{
                  color: customAccentColor,
                  borderColor: `${customAccentColor}60`,
                  boxShadow: `0 2px 8px ${customAccentColor}25`,
                }}
                title={`Không gian bài viết: ${themeMeta.name}`}
              >
                <span className="atmosphere-icon">{themeMeta.icon}</span>
                <span className="atmosphere-text">{themeMeta.badgeText}</span>
              </span>
            )}

            {/* Huy hiệu cảnh báo bài nhạy cảm Chính Trị (nếu có) */}
            {post.isFlagged && (
              <span
                className="card-flagged-badge"
                title={post.flagReason || 'Bài viết chứa yếu tố nhạy cảm Chính Trị'}
              >
                ⚠️ Nhạy Cảm
              </span>
            )}
          </div>
        </div>

        {/* Nút Nghe A.I Đọc Bài Viết Cảm Xúc (cho bài viết và photo có nội dung) */}
        {postFormat !== 'video' && (
          <div className="card-bottom-audio-bar">
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
              <span className="audio-btn-icon">
                {isPlayingAi ? (
                  <i className="fa-solid fa-pause"></i>
                ) : (
                  <i className="fa-solid fa-headphones"></i>
                )}
              </span>
              <span className="audio-btn-label">{isPlayingAi ? 'Đang đọc...' : 'Nghe AI đọc'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="card-content">
        {/* Author row with Desktop Quick-Peek */}
        <AuthorQuickPeekWrapper
          targetUserId={post.user?._id || post.user}
          fallbackName={authorName}
          fallbackAvatar={authorAvatar}
          fallbackJob={authorJob}
        >
          <Link
            to={`/profile/${post.user?._id || post.user || encodeURIComponent(authorName)}`}
            className="card-author-row card-author-link"
            title={`Xem trang cá nhân của ${authorName}`}
            onMouseEnter={() => scheduleAuthorPrefetch(false)}
            onMouseLeave={cancelAuthorPrefetch}
            onFocus={() => scheduleAuthorPrefetch(true)}
          >
            <img src={authorAvatar} alt={authorName} className={`card-author-avatar frame-${authorFrame}`} />
            <div className="card-author-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h5 className="card-author-name">{authorName}</h5>
                {authorHonorBadge && (
                  <span
                    className="author-honor-mini-badge"
                    style={{
                      background: authorHonorBadge.bg,
                      color: authorHonorBadge.color,
                      border: `1px solid ${authorHonorBadge.border}`,
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      lineHeight: 1.2,
                    }}
                    title={`Chuỗi ${authorStreak} ngày giữ lửa: ${authorHonorBadge.desc}`}
                  >
                    <span>{authorHonorBadge.icon}</span>
                    <span>{authorHonorBadge.name}</span>
                  </span>
                )}
              </div>
              <span className="card-author-sub">{authorJob}</span>
            </div>
          </Link>
        </AuthorQuickPeekWrapper>

        {/* Render Tiêu đề hoặc Status Caption theo định dạng */}
        {postFormat === 'photo' ? (
          <div className="card-photo-caption-wrap" style={{ marginTop: '6px', marginBottom: '12px' }}>
            <Link to={`/post/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <p
                className="card-photo-caption"
                style={{
                  fontSize: '0.94rem',
                  lineHeight: '1.55',
                  color: 'inherit',
                  margin: 0,
                  whiteSpace: 'pre-line',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {post.content || post.summary || post.title}
              </p>
            </Link>
          </div>
        ) : postFormat === 'video' ? (
          <div className="card-video-caption-wrap" style={{ marginTop: '6px', marginBottom: '12px' }}>
            <Link to={`/post/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
                <IdleWeatherText>{post.title}</IdleWeatherText>
              </h3>
              {(post.content || post.summary) && (
                <p
                  className="card-summary"
                  style={{
                    fontSize: '0.88rem',
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {post.content || post.summary}
                </p>
              )}
            </Link>
          </div>
        ) : (
          <>
            <Link to={`/post/${post.slug}`}>
              <h3 className="card-title">
                <IdleWeatherText>{post.title}</IdleWeatherText>
              </h3>
            </Link>

            {post.summary && (
              <p className="card-summary">
                {post.summary}
              </p>
            )}
          </>
        )}

        <div className="card-footer">
          {/* Cụm thống kê gọn gàng, bấm vào để xem chi tiết bài viết */}
          <Link
            to={`/post/${post.slug}`}
            className="card-stats-pill"
            title="Bấm để xem chi tiết lượt đọc, cảm xúc & bình luận"
          >
            <span className="pill-stat">
              <i className="fa-solid fa-heart stat-icon" style={{ color: 'var(--pastel-rose)', marginRight: '4px' }}></i>
              <span className="stat-val">
                {post.showReactionCount !== false
                  ? (post.reactionCounts?.total || post.cheersCount || 0)
                  : 'Ẩn'}
              </span>
            </span>
            <span className="pill-divider">•</span>
            <span className="pill-stat">
              <i className="fa-regular fa-eye stat-icon" style={{ color: 'var(--pastel-sage)', marginRight: '4px' }}></i>
              <span className="stat-val">{post.views || 1}</span>
            </span>
            <span className="pill-divider">•</span>
            <span className="pill-stat" style={{ color: '#d97706', fontWeight: 600 }} title="Thời gian đọc ước tính">
              <span className="stat-val">{readingInfo.text}</span>
            </span>
            {post.sharesCount > 0 && (
              <>
                <span className="pill-divider">•</span>
                <span className="pill-stat">
                  <i className="fa-solid fa-share-nodes stat-icon" style={{ color: 'var(--pastel-amber)', marginRight: '4px' }}></i>
                  <span className="stat-val">{post.sharesCount}</span>
                </span>
              </>
            )}
          </Link>

          {/* Cụm nút hành động - Khóa cứng flexShrink và whiteSpace, tuyệt đối không bị chèn ép hay rớt dòng */}
          <div
            className="card-actions-group"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              gap: '6px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              minWidth: 'max-content',
            }}
          >
            <button
              type="button"
              className="card-share-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsShareOpen(true);
              }}
              title="Chia sẻ bài viết lên trang cá nhân hoặc mạng xã hội"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minWidth: 'max-content',
                wordBreak: 'keep-all',
              }}
            >
              <i className="fa-regular fa-paper-plane" style={{ color: 'var(--pastel-rose)', fontSize: '0.85rem' }}></i>
              <span style={{ whiteSpace: 'nowrap', display: 'inline', wordBreak: 'keep-all' }}>Chia{'\u00A0'}sẻ</span>
            </button>

            <Link
              to={`/post/${post.slug}`}
              className="card-read-action-btn"
              title="Đọc bài viết và trò chuyện"
              style={{
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>Đọc</span>
              <i className="fa-solid fa-arrow-right-long read-arrow"></i>
            </Link>
          </div>
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

        {/* Thanh công cụ dành riêng cho chính chủ tác giả (Xóa bài viết của mình) */}
        {isCurrentUserAuthor && user?.role !== 'admin' && (
          <div
            className="card-author-actions-bar"
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px dashed #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: '#0d9488', fontWeight: 700 }}>
              ✍️ Bài viết của bạn
            </span>
            <button
              type="button"
              disabled={deleting}
              onClick={handleAuthorDelete}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.color = '#dc2626';
              }}
              title="Xóa vĩnh viễn bài tâm sự này của bạn"
            >
              {deleting ? 'Đang xóa...' : '🗑️ Xóa bài'}
            </button>
          </div>
        )}
      </div>

      {/* Modal Chia Sẻ Bài Viết Đa Năng */}
      <SharePostModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        post={post}
        onShareSuccess={() => setLocalSharesCount((prev) => prev + 1)}
      />
    </article>
  );
};
