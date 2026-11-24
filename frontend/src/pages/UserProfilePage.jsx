import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { PostCard } from '../components/blog/PostCard';
import { ProfileMusicPlayer } from '../components/profile/ProfileMusicPlayer';
import { Pagination } from '../components/common/Pagination';
import { playClickSound } from '../utils/soundEffects';
import { getHighestBadge } from '../utils/badgeHelper';
import { ProfileQrModal } from '../components/profile/ProfileQrModal';
import { MutualMemoriesDrawer } from '../components/profile/MutualMemoriesDrawer';
import apiClient from '../services/apiClient';
export const DEFAULT_EMPTY_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 7.5a3 3 0 100 6 3 3 0 000-6zm-6.75 10.5a7.48 7.48 0 0113.5 0 8.22 8.22 0 01-13.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";

export const getProfileAvatarSrc = (targetUser) => {
  if (!targetUser) return DEFAULT_EMPTY_AVATAR;
  const isAdm = targetUser.role === 'admin' || targetUser.email === 'anthonyq012025@gmail.com';
  if (targetUser.avatar && !targetUser.avatar.includes('/images/man.jpg') && !targetUser.avatar.includes('google_avatar')) {
    return targetUser.avatar;
  }
  if (isAdm) {
    return '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
  }
  return DEFAULT_EMPTY_AVATAR;
};

/**
 * Phân tích và tạo liên kết cho các hashtag trong tiểu sử
 */
const renderBioWithHashtags = (bioText) => {
  if (!bioText) return null;
  const parts = bioText.split(/(#[a-zA-Z0-9_\u00C0-\u1EF9]+)/gu);

  return parts.map((part, idx) => {
    if (part.startsWith('#')) {
      const cleanTag = part.slice(1);
      return (
        <Link
          key={idx}
          to={`/?tag=${encodeURIComponent(cleanTag)}`}
          className="bio-hashtag-link"
          title={`Bấm để tìm bài viết về #${cleanTag}`}
        >
          {part}
        </Link>
      );
    }
    return part;
  });
};

/**
 * Trích xuất danh sách hashtag riêng biệt từ tiểu sử
 */
const extractHashtags = (bioText) => {
  if (!bioText) return [];
  const matches = bioText.match(/#[a-zA-Z0-9_\u00C0-\u1EF9]+/gu);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1))));
};

export const UserProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser, openProfileModal, setIsProfileModalOpen, setIsAuthModalOpen } = useAuth();
  const { friendsList, handleAddFriend, handleRemoveFriend, openChatWithUser } = useChat();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [profilePostsPage, setProfilePostsPage] = useState(1);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [mutualBondData, setMutualBondData] = useState(null);
  const [isMemoriesDrawerOpen, setIsMemoriesDrawerOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.getUserProfile(userId);
      setProfileData(res.data);

      // Tải điểm gắn kết 2 chiều (Mutual Bond) nếu đã đăng nhập và đang xem profile người khác
      if (currentUser && userId && String(currentUser._id) !== String(userId)) {
        try {
          const bondRes = await apiClient.get(`/user/bonds/${userId}`);
          setMutualBondData(bondRes?.data?.data || null);
        } catch (_) {}
      }
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin trang cá nhân này.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  // Lắng nghe sự kiện cập nhật profile để tự làm mới
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchProfile();
    };
    window.addEventListener('profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('profile_updated', handleProfileUpdate);
  }, [userId]);

  if (loading) return <LoadingSpinner message="Đang tải trang cá nhân..." />;
  if (error || !profileData) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <ErrorMessage message={error || 'Không tìm thấy người dùng này.'} />
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              fetchProfile();
            }}
            className="post-copy-link-btn"
            style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '0.9rem' }}
          >
            <i className="fa-solid fa-rotate-right" style={{ marginRight: '6px' }}></i>
            Thử tải lại
          </button>
          <Link to="/" className="back-home-btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
            &larr; Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const { user, stats, friendshipStatus, pendingNotificationId, posts } = profileData;
  const POSTS_PER_PAGE = 6;
  const totalUserPosts = posts?.length || 0;
  const totalUserPostPages = Math.ceil(totalUserPosts / POSTS_PER_PAGE) || 1;
  const paginatedUserPosts = (posts || []).slice(
    (profilePostsPage - 1) * POSTS_PER_PAGE,
    profilePostsPage * POSTS_PER_PAGE
  );

  // Xác định tình trạng bạn bè thực tế dựa trên danh bạ local và backend
  const isSelf =
    currentUser &&
    (String(currentUser._id || currentUser.id) === String(user._id || user.id) ||
      (currentUser.email && user.email && currentUser.email.toLowerCase() === user.email.toLowerCase()) ||
      friendshipStatus === 'self');

  const isFriend =
    !isSelf &&
    (friendshipStatus === 'friends' ||
      friendsList.some(
        (f) => String(f._id || f.id) === String(user._id || user.id)
      ));

  const isSentPending = !isSelf && !isFriend && friendshipStatus === 'sent_pending';
  const isReceivedPending = !isSelf && !isFriend && friendshipStatus === 'received_pending';

  const hashtagsInBio = extractHashtags(user.bio);
  const social = user.socialLinks || {};
  const hasSocial =
    social.facebook ||
    social.instagram ||
    social.tiktok ||
    social.x ||
    social.linkedin ||
    social.github ||
    social.website;

  // Xử lý Thêm bạn / Hủy bạn
  const onToggleFriend = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setFriendActionLoading(true);
      if (isFriend) {
        if (window.confirm(`Bạn có chắc chắn muốn hủy kết bạn với ${user.name}?`)) {
          await handleRemoveFriend(user._id || user.id);
          await fetchProfile();
        }
      } else {
        await handleAddFriend(user._id || user.id);
        await fetchProfile();
      }
    } catch (err) {
      alert(err.message || 'Thao tác kết bạn thất bại. Vui lòng thử lại!');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Hủy lời mời kết bạn đã gửi
  const onCancelPendingRequest = async () => {
    try {
      setFriendActionLoading(true);
      await handleRemoveFriend(user._id || user.id);
      await fetchProfile();
    } catch (err) {
      alert(err.message || 'Hủy lời mời thất bại. Vui lòng thử lại!');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Đồng ý lời mời kết bạn
  const onAcceptFriend = async () => {
    try {
      setFriendActionLoading(true);
      if (pendingNotificationId) {
        await notificationService.respondToFriendRequest(pendingNotificationId, 'accept');
      } else {
        await handleAddFriend(user._id || user.id);
      }
      if (typeof fetchFriends === 'function') fetchFriends();
      await fetchProfile();
    } catch (err) {
      alert(err.message || 'Lỗi chấp nhận kết bạn');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Từ chối lời mời kết bạn
  const onDeclineFriend = async () => {
    try {
      setFriendActionLoading(true);
      if (pendingNotificationId) {
        await notificationService.respondToFriendRequest(pendingNotificationId, 'decline');
      } else {
        await handleRemoveFriend(user._id || user.id);
      }
      await fetchProfile();
    } catch (err) {
      alert(err.message || 'Lỗi từ chối kết bạn');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const onOpenChat = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    openChatWithUser(user);
  };

  const hasProfileBgImage = Boolean(user.customLayout?.bgImage);
  const profileContainerStyle = hasProfileBgImage
    ? {
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.86)), url(${user.customLayout.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        borderRadius: '16px',
        padding: '20px',
      }
    : user.customLayout?.theme === 'custom' && user.customLayout?.bgColor
    ? { background: user.customLayout.bgColor, borderRadius: '16px', padding: '16px' }
    : {};

  return (
    <div
      className={`user-profile-page container profile-theme-${user.customLayout?.theme || 'default'} ${hasProfileBgImage ? 'has-custom-wallpaper' : ''}`}
      style={profileContainerStyle}
    >
      {/* Profile Cover & Header Card */}
      <div className="profile-header-card">
        <div
          className="profile-cover-banner"
          style={
            user.coverImage
              ? {
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4)), url(${user.coverImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {}
          }
        ></div>

        <div className="profile-header-content">
          <div className="profile-avatar-wrap">
            <img
              src={getProfileAvatarSrc(user)}
              alt={user.name}
              onError={(e) => {
                e.target.src = DEFAULT_EMPTY_AVATAR;
              }}
              className={`profile-avatar-img frame-${user.customLayout?.frameStyle || 'none'}`}
            />
            {isSelf && (
              <button
                type="button"
                onClick={() => openProfileModal('info')}
                title="Bấm để cài đặt ảnh đại diện của bạn"
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1.5px solid #ffffff',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                📷
              </button>
            )}
            {user.role === 'admin' && (
              <span className="profile-admin-crown" title="Quản Trị Viên Hệ Thống">
                👑
              </span>
            )}
          </div>

          <div className="profile-main-meta">
            <div className="profile-name-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="profile-display-name">{user.name}</h1>
              {user.role === 'admin' && <span className="profile-badge-admin">ADMIN</span>}
              {(() => {
                const honorBadge = getHighestBadge(user?.streakCount);
                if (!honorBadge) return null;
                return (
                  <span
                    style={{
                      background: honorBadge.bg,
                      color: honorBadge.color,
                      border: `1px solid ${honorBadge.border}`,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: `0 0 12px ${honorBadge.bg}`,
                    }}
                    title={`Chuỗi ${user?.streakCount || 0} ngày giữ lửa: ${honorBadge.desc}`}
                  >
                    <span>{honorBadge.icon}</span>
                    <span>{honorBadge.name}</span>
                    <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>({user?.streakCount || 0}d)</span>
                  </span>
                );
              })()}

              {/* Badge Cấp Bậc Thân Thiết 2 Chiều (Mutual Bond Tier) */}
              {mutualBondData && mutualBondData.mutualScore > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsMemoriesDrawerOpen(true);
                  }}
                  style={{
                    background: mutualBondData.tierInfo?.bg || 'rgba(56, 189, 248, 0.15)',
                    color: mutualBondData.tierInfo?.color || '#38bdf8',
                    border: `1px solid ${mutualBondData.tierInfo?.border || 'rgba(56, 189, 248, 0.35)'}`,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    boxShadow: `0 0 10px ${mutualBondData.tierInfo?.bg || 'transparent'}`,
                    transition: 'all 0.15s ease',
                  }}
                  title={`Bấm để mở Nhật Ký Tri Kỷ với ${user.name}`}
                >
                  <span>{mutualBondData.tierInfo?.name}</span>
                  <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>({mutualBondData.mutualScore}đ)</span>
                  <span style={{ fontSize: '0.7rem' }}>📖</span>
                </button>
              )}

              {isSelf ? (
                <span
                  style={{
                    background: 'rgba(13, 148, 136, 0.15)',
                    color: '#0d9488',
                    border: '1px solid rgba(13, 148, 136, 0.35)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Đây là hồ sơ cá nhân của chính bạn"
                >
                  👤 Bạn (Chủ tài khoản)
                </span>
              ) : isFriend ? (
                <span
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#16a34a',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Hai người đã kết bạn và kết nối với nhau trên hệ thống"
                >
                  👥 Bạn bè (Đã kết nối ✓)
                </span>
              ) : isSentPending ? (
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Bạn đã gửi lời mời kết bạn, đang chờ đối phương đồng ý"
                >
                  ⏳ Đã gửi lời mời (Chờ đồng ý)
                </span>
              ) : isReceivedPending ? (
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Người này đã gửi lời mời kết bạn tới bạn"
                >
                  👥 Đã gửi lời mời kết bạn tới bạn
                </span>
              ) : (
                <span
                  style={{
                    background: 'rgba(100, 116, 139, 0.15)',
                    color: '#64748b',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Bạn và người này chưa kết bạn trên Freedom"
                >
                  🌐 Người lạ (Chưa kết bạn)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <p className="profile-job-title" style={{ margin: 0 }}>{user.jobTitle || 'Thành viên cộng đồng'}</p>
              {user.phone && (isSelf || currentUser?.role === 'admin') && (
                <span style={{ fontSize: '0.82rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                  📱 {user.phone}
                </span>
              )}
            </div>

            {/* Dòng Tiểu sử ngắn gọn có gắn Hashtag */}
            <div className="profile-bio-box">
              <p className="profile-bio-text">{renderBioWithHashtags(user.bio)}</p>

              {/* Danh sách thẻ hashtag gắn kèm */}
              {hashtagsInBio.length > 0 && (
                <div className="profile-bio-hashtags-list">
                  <span className="hashtags-prefix">🏷️ Thẻ quan tâm:</span>
                  {hashtagsInBio.map((tag, idx) => (
                    <Link
                      key={idx}
                      to={`/?tag=${encodeURIComponent(tag)}`}
                      className="bio-chip-tag"
                      title={`Xem các tâm sự về #${tag}`}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Mạng Xã Hội */}
            {hasSocial && (
              <div className="profile-social-links-wrap">
                <span className="social-links-heading">Kết nối mạng xã hội:</span>
                <div className="profile-social-badges">
                  {social.facebook && (
                    <a
                      href={social.facebook.startsWith('http') ? social.facebook : `https://${social.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-badge-btn fb"
                      title="Facebook cá nhân"
                    >
                      📘 Facebook
                    </a>
                  )}
                  {social.instagram && (
                    <a
                      href={social.instagram.startsWith('http') ? social.instagram : `https://${social.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-badge-btn insta"
                      title="Instagram"
                    >
                      📸 Instagram
                    </a>
                  )}
                  {social.tiktok && (
                    <a
                      href={social.tiktok.startsWith('http') ? social.tiktok : `https://${social.tiktok}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-badge-btn tiktok"
                      title="TikTok"
                    >
                      🎵 TikTok
                    </a>
                  )}
                  {social.x && (
                    <a
                      href={social.x.startsWith('http') ? social.x : `https://${social.x}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-badge-btn x-twitter"
                      title="X (Twitter)"
                    >
                      𝕏 Twitter
                    </a>
                  )}
                  {social.linkedin && (
                    <a
                      href={social.linkedin.startsWith('http') ? social.linkedin : `https://${social.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-badge-btn linkedin"
                      title="LinkedIn"
                    >
                      💼 LinkedIn
                    </a>
                  )}
                  {social.github && (
                    <a
                      href={social.github.startsWith('http') ? social.github : `https://${social.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-badge-btn github"
                      title="GitHub"
                    >
                      🐱 GitHub
                    </a>
                  )}
                  {social.website && (
                    <a
                      href={social.website.startsWith('http') ? social.website : `https://${social.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-badge-btn web"
                      title="Website cá nhân"
                    >
                      🌐 Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cụm nút tương tác & Tình trạng kết bạn */}
          <div className="profile-actions-column">
            {isSelf ? (
              <div className="profile-self-actions">
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => openProfileModal('info')}
                  title="Cập nhật họ tên, tiểu sử, chức danh và mạng xã hội"
                >
                  ⚙️ Chỉnh sửa thông tin
                </button>
                <button
                  type="button"
                  className="profile-edit-btn"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #0d9488)', color: '#ffffff', border: 'none', marginTop: '6px' }}
                  onClick={() => openProfileModal('layout')}
                  title="Thay đổi màu nền giao diện và khung đại diện"
                >
                  🎨 Đổi Màu Nền & Khung
                </button>
                <button
                  type="button"
                  className="profile-edit-btn"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#ffffff', border: 'none', marginTop: '6px' }}
                  onClick={() => openProfileModal('music')}
                  title="Chọn nhạc nền trang cá nhân từ đề xuất hoặc link YouTube/SoundCloud"
                >
                  🎵 Cài Đặt Nhạc Nền
                </button>
                <span className="profile-self-label">👤 Trang cá nhân của bạn</span>
              </div>
            ) : (
              <div className="profile-other-actions">
                {/* Tình trạng kết bạn */}
                <div className="profile-friend-status-box">
                  {isFriend ? (
                    <div className="friend-badge-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="friend-badge-pill" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 700, padding: '6px 14px', borderRadius: '8px' }}>
                        ✓ Bạn bè
                      </span>
                      <button
                        type="button"
                        className="friend-unfriend-btn"
                        onClick={onToggleFriend}
                        disabled={friendActionLoading}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Hủy kết bạn với người này"
                      >
                        {friendActionLoading ? 'Đang hủy...' : 'Hủy kết bạn'}
                      </button>
                    </div>
                  ) : isSentPending ? (
                    <div className="friend-badge-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="friend-badge-pill" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 700, padding: '6px 14px', borderRadius: '8px' }}>
                        ⏳ Chờ đối phương đồng ý
                      </span>
                      <button
                        type="button"
                        className="friend-unfriend-btn"
                        onClick={onCancelPendingRequest}
                        disabled={friendActionLoading}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Hủy lời mời kết bạn đã gửi"
                      >
                        {friendActionLoading ? 'Đang hủy...' : 'Hủy lời mời'}
                      </button>
                    </div>
                  ) : isReceivedPending ? (
                    <div className="friend-badge-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="friend-add-btn"
                        onClick={onAcceptFriend}
                        disabled={friendActionLoading}
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 3px 8px rgba(22, 163, 74, 0.35)',
                        }}
                        title="Đồng ý lời mời kết bạn từ người này"
                      >
                        {friendActionLoading ? 'Đang xử lý...' : '✓ Đồng ý kết bạn'}
                      </button>
                      <button
                        type="button"
                        className="friend-unfriend-btn"
                        onClick={onDeclineFriend}
                        disabled={friendActionLoading}
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Từ chối lời mời"
                      >
                        ✕ Bỏ qua
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="friend-add-btn"
                      onClick={onToggleFriend}
                      disabled={friendActionLoading}
                      style={{
                        background: 'linear-gradient(135deg, #0d9488, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        boxShadow: '0 3px 8px rgba(13, 148, 136, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                      title="Gửi lời mời kết bạn và thêm vào danh bạ bạn bè"
                    >
                      {friendActionLoading ? 'Đang gửi lời mời...' : '➕ Thêm Bạn Bè'}
                    </button>
                  )}
                </div>

                {/* Nút Nhắn tin */}
                <button
                  type="button"
                  className="profile-chat-btn"
                  onClick={onOpenChat}
                  title={`Nhắn tin với ${user.name}`}
                >
                  ✉️ Nhắn tin
                </button>

                {/* Nút Xem Nhật Ký Tri Kỷ */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsMemoriesDrawerOpen(true);
                  }}
                  style={{
                    marginTop: '8px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#d97706',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    transition: 'all 0.2s ease',
                  }}
                  title={`Xem dòng thời gian và nhật ký tương tác tri kỷ với ${user.name}`}
                >
                  <span>📖</span>
                  <span>Nhật Ký Tri Kỷ</span>
                </button>
              </div>
            )}

            {/* Nút Mở Mã QR Hồ Sơ Scan-to-Profile */}
            <button
              type="button"
              className="profile-share-qr-btn"
              onClick={() => {
                playClickSound();
                setIsQrModalOpen(true);
              }}
              style={{
                marginTop: '10px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              title="Quét hoặc chia sẻ mã QR trang cá nhân này"
            >
              <span>📱</span>
              <span>Mã QR & Chia Sẻ Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* Widget Nhạc Nền Trang Cá Nhân */}
      <ProfileMusicPlayer
        musicConfig={user.profileMusic}
        authorName={user.name}
        isSelf={isSelf}
        onOpenSettings={() => openProfileModal('music')}
      />

      {/* Thống kê người dùng (User Stats Cards) */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <span className="stat-card-icon">📝</span>
          <div className="stat-card-info">
            <strong className="stat-card-number">{stats?.postsCount || 0}</strong>
            <span className="stat-card-label">Bài viết đã đăng</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <span className="stat-card-icon">❤️</span>
          <div className="stat-card-info">
            <strong className="stat-card-number">{stats?.totalCheersReceived || 0}</strong>
            <span className="stat-card-label">Lượt cảm xúc nhận được</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <span className="stat-card-icon">👁️</span>
          <div className="stat-card-info">
            <strong className="stat-card-number">{stats?.totalViews || 0}</strong>
            <span className="stat-card-label">Tổng lượt đọc</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <span className="stat-card-icon">👥</span>
          <div className="stat-card-info">
            <strong className="stat-card-number">{stats?.friendsCount || 0}</strong>
            <span className="stat-card-label">Bạn bè kết nối</span>
          </div>
        </div>
      </div>

      {/* Danh Sách Bài Viết Đã Chia Sẻ */}
      <div className="profile-posts-section">
        <div className="profile-posts-header" style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span className="hero-tag-pill">📖 Hồ sơ tác giả</span>
          <h2 className="hero-title" style={{ fontSize: '1.9rem', marginBottom: '10px' }}>
            Các Bài Tâm Sự Của {user.name} ({posts?.length || 0})
          </h2>
          <div style={{ marginTop: '8px' }}>
            <Link to="/" className="hero-back-link">
              &larr; Xem tất cả các câu chuyện khác
            </Link>
          </div>
        </div>

        {posts && posts.length > 0 ? (
          <>
            <div className="posts-grid">
              {paginatedUserPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
            {totalUserPostPages > 1 && (
              <Pagination
                pagination={{
                  page: profilePostsPage,
                  totalPages: totalUserPostPages,
                  total: totalUserPosts,
                  limit: POSTS_PER_PAGE,
                  hasPrevPage: profilePostsPage > 1,
                  hasNextPage: profilePostsPage < totalUserPostPages,
                }}
                onPageChange={(newPage) => {
                  setProfilePostsPage(newPage);
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
              />
            )}
          </>
        ) : (
          <div className="profile-empty-posts">
            <span className="empty-icon">📭</span>
            <h3>Chưa có bài tâm sự nào</h3>
            <p>Người dùng này chưa chia sẻ câu chuyện nào trên hệ thống.</p>
            {isSelf && (
              <Link to="/" className="page-btn" style={{ marginTop: '16px', display: 'inline-block' }}>
                ✍️ Trút bầu tâm sự ngay
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Modal Quét Mã QR & Chia Sẻ Hồ Sơ (Scan-To-Profile) */}
      <ProfileQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        user={user}
      />

      {/* Drawer Nhật Ký Tri Kỷ */}
      <MutualMemoriesDrawer
        isOpen={isMemoriesDrawerOpen}
        onClose={() => setIsMemoriesDrawerOpen(false)}
        targetUserId={user._id || user.id}
        partnerName={user.name}
        partnerAvatar={getProfileAvatarSrc(user)}
      />
    </div>
  );
};

