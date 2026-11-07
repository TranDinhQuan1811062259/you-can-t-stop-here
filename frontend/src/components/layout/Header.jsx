import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { AuthModal } from '../auth/AuthModal';
import { CreatePostModal } from '../blog/CreatePostModal';
import { EditProfileModal } from '../auth/EditProfileModal';
import { AdminModerationModal } from '../admin/AdminModerationModal';
import { FestiveEventManagerModal } from '../admin/FestiveEventManagerModal';
import { FestiveShowcaseModal } from '../common/FestiveShowcaseModal';
import { StressReliefModal } from '../wellness/StressReliefModal';
import { postService } from '../../services/postService';
import { eventService } from '../../services/eventService';
import { isSoundEnabled, toggleSound, playClickSound, playFestiveEventSound } from '../../utils/soundEffects';
import { getActiveSeason, setActiveSeason, SEASONS } from '../../utils/seasonUtils';
import { chatService } from '../../services/chatService';
import { formatDate } from '../../utils/formatDate';
import { getActiveTheme, toggleTheme, THEMES } from '../../utils/themeUtils';

const MOCK_RECENT_CONVERSATIONS = [
  {
    _id: 'conv_huong_ly',
    otherUser: {
      _id: 'user_huong_ly',
      name: 'Hương Ly',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      chatStatus: 'online',
      isFriend: false,
    },
    isStranger: true,
    status: 'pending',
    unreadCount: 1,
    lastMessage: {
      content: 'Chào anh Quân, em đọc bài viết burnout của anh thấy đồng cảm quá...',
      createdAt: '2026-11-05T15:20:00.000Z',
    },
  },
  {
    _id: 'conv_duc_huy',
    otherUser: {
      _id: '67c9c0000000000000000003',
      name: 'Đức Huy',
      avatar: '/images/man.jpg',
      chatStatus: 'online',
      isFriend: true,
    },
    isStranger: false,
    status: 'accepted',
    unreadCount: 0,
    lastMessage: {
      content: 'Dạ em cảm ơn anh Quân đã động viên và góp ý bài viết cho em nha!',
      createdAt: '2026-11-05T14:45:00.000Z',
    },
  },
  {
    _id: 'conv_thanh_nam',
    otherUser: {
      _id: '67c9c0000000000000000004',
      name: 'Thành Nam',
      avatar: '/images/man.jpg',
      chatStatus: 'online',
      isFriend: true,
    },
    isStranger: false,
    status: 'accepted',
    unreadCount: 0,
    lastMessage: {
      content: 'Cảm ơn Quân nhiều nhé, hôm nào rảnh anh em mình cafe tán gẫu tiếp.',
      createdAt: '2026-11-05T10:15:00.000Z',
    },
  },
];

export const Header = () => {
  const {
    user,
    isAuthenticated,
    logout,
    openLoginModal,
    openRegisterModal,
    isProfileModalOpen,
    openProfileModal,
    closeProfileModal,
  } = useAuth();
  const { openDrawer, openChatWithUser, unreadCount } = useChat();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [activeSeason, setLocalSeason] = useState(() => getActiveSeason());
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => getActiveTheme());
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [isEventManagerOpen, setIsEventManagerOpen] = useState(false);
  const [isShowcaseModalOpen, setIsShowcaseModalOpen] = useState(false);
  const [activeFestiveEvent, setActiveFestiveEvent] = useState(null);
  const [isWellnessOpen, setIsWellnessOpen] = useState(false);

  const fetchFestiveEvent = () => {
    eventService
      .getActiveEvent()
      .then((res) => setActiveFestiveEvent(res?.data || null))
      .catch(() => setActiveFestiveEvent(null));
  };

  // Quét số lượng bài viết bị gắn cờ nhạy cảm để báo cho Admin
  const checkFlaggedPosts = () => {
    if (user?.role === 'admin') {
      postService
        .getPosts({ limit: 50 })
        .then((res) => {
          const list = res.data?.posts || res.data || [];
          const count = list.filter((p) => p.isFlagged === true || p.moderationStatus === 'flagged').length;
          setFlaggedCount(count);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    checkFlaggedPosts();
    fetchFestiveEvent();

    const handleAuthChange = () => {
      checkFlaggedPosts();
      fetchFestiveEvent();
    };

    window.addEventListener('post_updated', checkFlaggedPosts);
    window.addEventListener('profile_updated', handleAuthChange);
    window.addEventListener('freedom_auth_changed', handleAuthChange);
    window.addEventListener('freedom_festive_event_changed', fetchFestiveEvent);

    const handleOpenMod = () => {
      if (user?.role === 'admin') {
        setIsModerationOpen(true);
      }
    };
    const handleOpenShowcase = (e) => {
      if (e?.detail) setActiveFestiveEvent(e.detail);
      setIsShowcaseModalOpen(true);
    };
    const handleOpenWellness = () => {
      setIsWellnessOpen(true);
    };

    window.addEventListener('freedom_open_moderation', handleOpenMod);
    window.addEventListener('freedom_open_festive_showcase', handleOpenShowcase);
    window.addEventListener('freedom_open_wellness', handleOpenWellness);

    return () => {
      window.removeEventListener('post_updated', checkFlaggedPosts);
      window.removeEventListener('profile_updated', handleAuthChange);
      window.removeEventListener('freedom_auth_changed', handleAuthChange);
      window.removeEventListener('freedom_festive_event_changed', fetchFestiveEvent);
      window.removeEventListener('freedom_open_moderation', handleOpenMod);
      window.removeEventListener('freedom_open_festive_showcase', handleOpenShowcase);
      window.removeEventListener('freedom_open_wellness', handleOpenWellness);
    };
  }, [user]);

  // Dropdown danh sách tin nhắn gần nhất từ nút Tin nhắn trên Header
  const [isMsgDropdownOpen, setIsMsgDropdownOpen] = useState(false);
  const [recentConvList, setRecentConvList] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  const seasonRef = useRef(null);
  const msgDropdownRef = useRef(null);
  const navigate = useNavigate();

  // Lắng nghe đổi theme Ngày / Đêm
  useEffect(() => {
    const handleThemeChange = (e) => {
      setCurrentTheme(e.detail || getActiveTheme());
    };
    window.addEventListener('freedom_theme_changed', handleThemeChange);
    return () => window.removeEventListener('freedom_theme_changed', handleThemeChange);
  }, []);

  // Lắng nghe toggle sound
  useEffect(() => {
    const handleSoundToggle = (e) => {
      setSoundOn(e.detail?.enabled ?? isSoundEnabled());
    };
    window.addEventListener('freedom_sound_toggled', handleSoundToggle);
    return () => window.removeEventListener('freedom_sound_toggled', handleSoundToggle);
  }, []);

  // Lắng nghe đổi mùa thời tiết
  useEffect(() => {
    const handleSeasonChange = (e) => {
      setLocalSeason(e.detail || getActiveSeason());
    };
    window.addEventListener('freedom_season_changed', handleSeasonChange);
    return () => window.removeEventListener('freedom_season_changed', handleSeasonChange);
  }, []);

  // Đóng dropdown mùa & dropdown tin nhắn khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (seasonRef.current && !seasonRef.current.contains(e.target)) {
        setIsSeasonOpen(false);
      }
      if (msgDropdownRef.current && !msgDropdownRef.current.contains(e.target)) {
        setIsMsgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mở/Đóng dropdown tin nhắn & Tải các cuộc trò chuyện gần nhất
  const handleToggleMsgDropdown = () => {
    const nextState = !isMsgDropdownOpen;
    setIsMsgDropdownOpen(nextState);

    if (nextState) {
      setLoadingConvs(true);
      chatService
        .getConversations({ sortBy: 'recent' })
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setRecentConvList(res.data);
          } else {
            setRecentConvList(MOCK_RECENT_CONVERSATIONS);
          }
        })
        .catch(() => {
          // Dự phòng an toàn nếu backend offline
          setRecentConvList(MOCK_RECENT_CONVERSATIONS);
        })
        .finally(() => setLoadingConvs(false));
    }
  };

  // Bấm vào 1 người trong list tin nhắn: Mở chi tiết cuộc trò chuyện ngay bên chatbox!
  const handleOpenConversation = (targetUser) => {
    setIsMsgDropdownOpen(false);
    closeNav();
    openChatWithUser(targetUser);
  };

  const toggleNav = () => setIsNavOpen((prev) => !prev);
  const closeNav = () => setIsNavOpen(false);

  const handlePostCreated = (newPost) => {
    navigate(`/post/${newPost.slug}`);
    window.location.reload();
  };

  const handleSeasonSelect = (seasonId) => {
    const nextSeason = setActiveSeason(seasonId);
    setLocalSeason(nextSeason);
    setIsSeasonOpen(false);
  };

  return (
    <>
      <header className={`site-header season-accent-${activeSeason.id}`}>
        <div className="container header-container">
          {/* Logo & Brand Name + Seasonal Weather Pill */}
          <div className="header-brand-wrap">
            <Link
              to="/"
              className={`logo-link seasonal-logo-wrap season-${activeSeason.id}`}
              onClick={closeNav}
              title={`YOU CAN'T STOP HERE - ${activeSeason.name}: ${activeSeason.quote}`}
            >
              <span className={`logo-icon seasonal-logo-icon season-${activeSeason.id}`}>
                {activeSeason.logoIcon || activeSeason.icon || '❤️'}
              </span>
              <span className={`logo-text seasonal-logo-text season-${activeSeason.id}`}>
                YOU CAN'T STOP HERE
              </span>
              <span className={`seasonal-logo-sparkle season-${activeSeason.id}`} aria-hidden="true">
                {activeSeason.titleAccent}
              </span>
            </Link>

            {/* Weather / Season Selector Pill (Thời tiết 4 mùa tự nhiên theo lịch) */}
            <div className="header-season-wrap" ref={seasonRef}>
              <button
                type="button"
                className={`header-season-pill season-${activeSeason.id} ${activeSeason.isCustom ? 'is-custom' : ''}`}
                onClick={() => setIsSeasonOpen((prev) => !prev)}
                title={`Thời tiết hiện tại: ${activeSeason.name} (${activeSeason.weatherDesc}). Bấm để chọn mùa bạn thích.`}
              >
                <span className="season-icon">{activeSeason.icon}</span>
                <span className="season-name">{activeSeason.shortName}</span>
                <span className="season-chevron">{isSeasonOpen ? '▴' : '▾'}</span>
              </button>

              {isSeasonOpen && (
                <div className="season-popover-dropdown">
                  <div className="season-popover-header">
                    <span className="season-popover-title">🌤️ Giao Diện Thời Tiết 4 Mùa</span>
                    <span className="season-popover-desc">
                      Tự động theo lịch dương hoặc chọn mùa bạn thích:
                    </span>
                  </div>

                  <div className="season-options-group">
                    <button
                      type="button"
                      className={`season-option-row ${!activeSeason.isCustom ? 'selected' : ''}`}
                      onClick={() => handleSeasonSelect('auto')}
                    >
                      <span className="opt-left">
                        <span className="opt-icon">🔄</span>
                        <span className="opt-label">Tự động theo lịch (Mùa Đông ❄️)</span>
                      </span>
                      {!activeSeason.isCustom && <span className="opt-check">✓</span>}
                    </button>

                    {Object.values(SEASONS).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`season-option-row ${activeSeason.isCustom && activeSeason.id === s.id ? 'selected' : ''}`}
                        onClick={() => handleSeasonSelect(s.id)}
                      >
                        <span className="opt-left">
                          <span className="opt-icon">{s.icon}</span>
                          <span className="opt-label">
                            <strong>{s.name}</strong> • <small>{s.weatherDesc.split('•')[0].trim()}</small>
                          </span>
                        </span>
                        {activeSeason.isCustom && activeSeason.id === s.id && <span className="opt-check">✓</span>}
                      </button>
                    ))}
                  </div>

                  <div className="season-popover-footer">
                    💡 Hiệu ứng hoa đào, tuyết rơi hay lá vàng sẽ tự động bay nhẹ nhàng theo mùa bạn chọn!
                  </div>
                </div>
              )}
            </div>

            {/* Festive Event Pill (Sự kiện lễ hội đặc biệt đang diễn ra - Rút gọn thông minh chống tràn Header) */}
            {activeFestiveEvent && (
              <div
                className="header-festive-event-pill"
                onClick={() => {
                  playClickSound();
                  playFestiveEventSound(activeFestiveEvent);
                  setIsShowcaseModalOpen(true);
                }}
                title={`${activeFestiveEvent.name} • ${activeFestiveEvent.bannerDesc || ''}. Bấm để xem không gian sự kiện đặc biệt!`}
              >
                <span className="festive-pill-icon">{activeFestiveEvent.icon || activeFestiveEvent.themeIcon || '🎊'}</span>
                <span className="festive-pill-name">
                  {activeFestiveEvent.shortName || (activeFestiveEvent.name.includes(':') ? activeFestiveEvent.name.split(':')[0].trim() : activeFestiveEvent.name)}
                </span>
                {user?.role === 'admin' && (
                  <span
                    className="festive-pill-badge"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEventManagerOpen(true);
                    }}
                    title="Cài đặt lịch sự kiện (Admin)"
                  >
                    ⚙️
                  </span>
                )}
              </div>
            )}

            {/* Nút Ngày / Đêm trên Header dạng icon tròn tinh gọn chống tràn */}
            <button
              type="button"
              className={`header-theme-toggle-btn theme-${currentTheme}`}
              onClick={() => {
                const next = toggleTheme();
                setCurrentTheme(next);
              }}
              title={
                currentTheme === 'light'
                  ? 'Chế độ Ngày (Ánh vàng ấm). Bấm để chuyển sang Chế độ Đêm 🌙'
                  : 'Chế độ Đêm (Màu tối dịu mắt). Bấm để chuyển sang Chế độ Ngày ☀️'
              }
              aria-label="Đổi chế độ Ngày/Đêm"
            >
              <span className="theme-toggle-icon">{currentTheme === 'light' ? '☀️' : '🌙'}</span>
            </button>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            className="mobile-menu-btn"
            onClick={toggleNav}
            aria-label="Toggle Navigation"
          >
            {isNavOpen ? '✕' : '☰'}
          </button>

          {/* Navigation Links & Action cluster (Spacious, beautifully aligned) */}
          <ul className={`nav-menu ${isNavOpen ? 'open' : ''}`}>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeNav}
                end
              >
                Trang Chủ
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/category/ap-luc-kiet-suc-burnout"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeNav}
              >
                Burnout
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/category/chuyen-nganh-bat-dau-lai-restart"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeNav}
              >
                Bắt Đầu Lại
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/category/nhung-tia-sang-dong-luc-small-wins"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeNav}
              >
                Small Wins
              </NavLink>
            </li>
            <li>
              <button
                type="button"
                className="nav-link header-wellness-btn"
                onClick={() => {
                  setIsWellnessOpen(true);
                  closeNav();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#0d9488',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                }}
                title="Trạm xả stress, máy xé giấy deadline & bài tập thở 4-7-8"
              >
                <span>🌿</span>
                <span>Xả Stress</span>
              </button>
            </li>

            {/* Auth Actions inside Nav (Spacious & Clean Layout) */}
            <li className="header-auth-group">
              {(isAuthenticated || !!user) ? (
                <div className="header-user-badge">
                  {/* Bấm vào avatar hoặc tên để xem trang cá nhân */}
                  <Link
                    to={`/profile/${user?._id}`}
                    className="header-profile-click"
                    onClick={closeNav}
                    title={user?.name}
                  >
                    <img
                      src={
                        user?.avatar && !user?.avatar.includes('google_avatar')
                          ? user?.avatar
                          : ((user?.role === 'admin' || user?.email === 'anthonyq012025@gmail.com')
                              ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg'
                              : '/images/man.jpg')
                      }
                      alt={user?.name}
                      onError={(e) => {
                        e.target.src = '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
                      }}
                      className="header-avatar"
                    />
                    <span className="header-username-text">
                      {user?.name?.split('(')[0]?.trim() || user?.name}
                    </span>
                    {user?.role === 'admin' && (
                      <span className="admin-badge-tag">
                        ADMIN
                      </span>
                    )}
                  </Link>

                  {/* Nút Tài khoản */}
                  <button
                    type="button"
                    className="header-account-btn"
                    onClick={() => {
                      openProfileModal();
                      closeNav();
                    }}
                    title="Cài đặt thông tin tài khoản, giao diện & nhạc nền"
                  >
                    <span className="btn-icon">⚙️</span>
                    <span>Tài khoản</span>
                  </button>

                  {/* Nút Quản lý Lễ Hội (Chỉ Admin) - Chỉ hiển thị khi chưa có sự kiện nào kích hoạt trên thanh để tránh trùng lặp */}
                  {user?.role === 'admin' && !activeFestiveEvent && (
                    <button
                      type="button"
                      className="header-festive-btn"
                      onClick={() => {
                        setIsEventManagerOpen(true);
                        closeNav();
                      }}
                      title="Quản lý sự kiện lễ hội trong năm (30/4, 2/9, 8/3, 1/6, Tết...)"
                      style={{ padding: '5px 8px', minWidth: '32px' }}
                    >
                      <span className="btn-icon">🎊</span>
                    </button>
                  )}

                  {/* Nút Tin nhắn kèm Dropdown Danh sách tin nhắn mới nhất */}
                  <div className="header-chat-dropdown-wrap" ref={msgDropdownRef}>
                    <button
                      type="button"
                      className={`header-chat-btn ${isMsgDropdownOpen ? 'active' : ''}`}
                      onClick={handleToggleMsgDropdown}
                      title="Bấm để xem danh sách tin nhắn gửi cuối cùng"
                    >
                      <span className="btn-icon">💬</span>
                      <span>Tin nhắn</span>
                      {unreadCount > 0 && <span className="header-chat-badge">{unreadCount}</span>}
                      <span className="header-chat-arrow">{isMsgDropdownOpen ? '▴' : '▾'}</span>
                    </button>

                    {/* Dropdown danh sách tin nhắn mới nhất */}
                    {isMsgDropdownOpen && (
                      <div className="header-msg-dropdown-popover">
                        <div className="header-msg-dropdown-header">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                              💬 Hộp Thư Tin Nhắn
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Gần đây</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                            Bấm vào để xem và nhắn tin chi tiết ngay trong chatbox
                          </span>
                        </div>

                        <div className="header-msg-dropdown-list">
                          {loadingConvs ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                              Đang tải danh sách tin nhắn...
                            </div>
                          ) : recentConvList.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                              Chưa có cuộc trò chuyện nào
                            </div>
                          ) : (
                            recentConvList.map((c) => {
                              const other = c.otherUser || {};
                              const isPendingStranger = c.isStranger && c.status === 'pending';

                              return (
                                <div
                                  key={c._id}
                                  className={`header-msg-conv-item ${c.unreadCount > 0 ? 'unread' : ''}`}
                                  onClick={() => handleOpenConversation(other)}
                                  title={`Xem chi tiết tin nhắn với ${other.name}`}
                                >
                                  <div className="header-msg-avatar-box">
                                    <img
                                      src={other.avatar || '/images/man.jpg'}
                                      alt={other.name}
                                      className="header-msg-avatar"
                                    />
                                    <span
                                      className={`header-msg-status-dot ${
                                        other.chatStatus === 'busy' ? 'busy' : other.chatStatus === 'offline' ? 'offline' : 'online'
                                      }`}
                                    />
                                  </div>

                                  <div className="header-msg-meta">
                                    <div className="header-msg-title-row">
                                      <strong className="header-msg-name">{other.name}</strong>
                                      <span className="header-msg-time">
                                        {formatDate(c.lastMessage?.createdAt || c.updatedAt)}
                                      </span>
                                    </div>
                                    <div className="header-msg-sub-row">
                                      <span className="header-msg-snippet">
                                        {isPendingStranger
                                          ? '⚠️ Tin nhắn chờ từ người lạ...'
                                          : c.lastMessage?.content || 'Bắt đầu cuộc trò chuyện...'}
                                      </span>
                                      {c.unreadCount > 0 && (
                                        <span className="header-msg-unread-pill">{c.unreadCount}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="header-msg-dropdown-footer">
                          <button
                            type="button"
                            className="header-msg-view-all-btn"
                            onClick={() => {
                              setIsMsgDropdownOpen(false);
                              openDrawer('messages');
                              closeNav();
                            }}
                          >
                            <span>Xem tất cả tin nhắn & Bạn bè</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nút Đăng xuất - Nổi bật, có icon, luôn luôn hiển thị rõ ràng */}
                  <button
                    type="button"
                    className="header-logout-btn"
                    onClick={() => {
                      logout();
                      closeNav();
                    }}
                    title="Đăng xuất khỏi tài khoản"
                  >
                    <span className="btn-icon">🚪</span>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <div className="header-guest-btns">
                  <button
                    type="button"
                    className="nav-btn-login"
                    onClick={() => {
                      openLoginModal();
                      closeNav();
                    }}
                  >
                    Đăng Nhập
                  </button>
                  <button
                    type="button"
                    className="nav-btn-register"
                    onClick={() => {
                      openRegisterModal();
                      closeNav();
                    }}
                  >
                    Đăng Ký
                  </button>
                </div>
              )}
            </li>
          </ul>
        </div>
      </header>

      {/* Auth Modal (Login / Register Popup) */}
      <AuthModal />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />

      {/* Admin Moderation Modal (Kiểm duyệt bài viết nhạy cảm Chính Trị) */}
      {user?.role === 'admin' && (
        <AdminModerationModal
          isOpen={isModerationOpen}
          onClose={() => setIsModerationOpen(false)}
        />
      )}

      {/* Festive Showcase Modal (Không gian chào mừng sự kiện 30/4, 2/9, 8/3 với đồ họa bay dẻo dẻo) */}
      <FestiveShowcaseModal
        isOpen={isShowcaseModalOpen}
        onClose={() => setIsShowcaseModalOpen(false)}
        event={activeFestiveEvent}
        onOpenAdminManager={() => setIsEventManagerOpen(true)}
        user={user}
      />

      {/* Admin Festive Event Manager Modal (Quản lý các sự kiện lễ hội 30/4, 2/9, 8/3, 1/6, Tết...) */}
      {user?.role === 'admin' && (
        <FestiveEventManagerModal
          isOpen={isEventManagerOpen}
          onClose={() => setIsEventManagerOpen(false)}
          onEventUpdated={fetchFestiveEvent}
        />
      )}

      {/* Trạm Xả Stress & Máy Xé Giấy Deadline & Bài Tập Thở 4-7-8 */}
      <StressReliefModal
        isOpen={isWellnessOpen}
        onClose={() => setIsWellnessOpen(false)}
      />
    </>
  );
};
