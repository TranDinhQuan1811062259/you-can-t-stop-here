import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { PostCard } from '../components/blog/PostCard';
import { ProfileMusicPlayer } from '../components/profile/ProfileMusicPlayer';

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

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.getUserProfile(userId);
      setProfileData(res.data);
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
        <Link to="/" className="back-home-btn" style={{ marginTop: '20px', display: 'inline-block' }}>
          &larr; Về trang chủ
        </Link>
      </div>
    );
  }

  const { user, stats, friendshipStatus, posts } = profileData;

  // Xác định tình trạng bạn bè thực tế dựa trên danh bạ local và backend
  const isSelf =
    currentUser &&
    (currentUser._id === user._id ||
      currentUser.email === user.email ||
      friendshipStatus === 'self');

  const isFriend =
    !isSelf &&
    (friendshipStatus === 'friends' ||
      friendsList.some((f) => f._id === user._id || f.name === user.name));

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
          await handleRemoveFriend(user._id);
          await fetchProfile();
        }
      } else {
        await handleAddFriend(user._id);
        await fetchProfile();
      }
    } catch (err) {
      alert(err.message || 'Thao tác kết bạn thất bại. Vui lòng thử lại!');
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
              src={
                user.avatar && !user.avatar.includes('google_avatar')
                  ? user.avatar
                  : ((user.role === 'admin' || user.email === 'anthonyq012025@gmail.com')
                      ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg'
                      : '/images/man.jpg')
              }
              alt={user.name}
              onError={(e) => {
                e.target.src = '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
              }}
              className={`profile-avatar-img frame-${user.customLayout?.frameStyle || 'none'}`}
            />
            {user.role === 'admin' && (
              <span className="profile-admin-crown" title="Quản Trị Viên Hệ Thống">
                👑
              </span>
            )}
          </div>

          <div className="profile-main-meta">
            <div className="profile-name-row">
              <h1 className="profile-display-name">{user.name}</h1>
              {user.role === 'admin' && <span className="profile-badge-admin">ADMIN</span>}
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
                    <div className="friend-badge-wrap">
                      <span className="friend-badge-pill">✓ Bạn bè</span>
                      <button
                        type="button"
                        className="friend-unfriend-btn"
                        onClick={onToggleFriend}
                        disabled={friendActionLoading}
                        title="Hủy kết bạn"
                      >
                        Hủy kết bạn
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="friend-add-btn"
                      onClick={onToggleFriend}
                      disabled={friendActionLoading}
                      title="Thêm vào danh bạ bạn bè"
                    >
                      {friendActionLoading ? 'Đang xử lý...' : '+ Kết bạn'}
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
              </div>
            )}
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
        <div className="profile-posts-header">
          <h2 className="profile-section-title">
            <span>📖</span> Các Bài Tâm Sự Đã Đăng ({posts?.length || 0})
          </h2>
          <span className="profile-posts-subtitle">
            Những câu chuyện và trải nghiệm được chia sẻ bởi {user.name}
          </span>
        </div>

        {posts && posts.length > 0 ? (
          <div className="posts-grid">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
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
    </div>
  );
};

