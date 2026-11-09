import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { postService } from '../../services/postService';
import { ShareModal } from './ShareModal';

const REACTION_CONFIG = [
  {
    id: 'sympathy',
    label: 'Đồng Cảm',
    icon: '🫂',
    color: '#0284c7', // Sky Blue
    bg: '#e0f2fe',
    description: 'Khoác vai, đồng cảm cùng câu chuyện của bạn',
  },
  {
    id: 'stop',
    label: 'Stop',
    icon: '🛑',
    color: '#dc2626', // Red
    bg: '#fee2e2',
    description: 'Dừng lại suy nghĩ tiêu cực, hãy cho bản thân nghỉ ngơi',
  },
  {
    id: 'love',
    label: 'Yêu thích',
    icon: '❤️',
    color: '#e11d48', // Rose Red
    bg: '#ffe4e6',
    description: 'Yêu thích và trân trọng sự chân thành',
  },
  {
    id: 'encourage',
    label: 'Cố Lên',
    icon: '💪',
    color: '#d97706', // Amber Gold
    bg: '#fef3c7',
    description: 'Tiếp thêm sức mạnh và động lực vươn lên',
  },
  {
    id: 'hug',
    label: 'Cái Ôm',
    icon: '🤗',
    color: '#f43f5e', // Warm Rose Pink
    bg: '#ffe4e6',
    description: 'Gửi một cái ôm ấm áp vỗ về bạn',
  },
  {
    id: 'tea',
    label: 'Tách Trà',
    icon: '🍵',
    color: '#059669', // Emerald Matcha
    bg: '#d1fae5',
    description: 'Mời bạn một tách trà nóng, an yên thở sâu',
  },
  {
    id: 'coffee',
    label: 'Cà Phê',
    icon: '☕',
    color: '#b45309', // Warm Amber Coffee
    bg: '#fef3c7',
    description: 'Mời bạn một ly cà phê ấm, nạp lại năng lượng',
  },
  {
    id: 'goodnight',
    label: 'Ngủ Ngon',
    icon: '🌙',
    color: '#8b5cf6', // Soft Violet Night
    bg: '#ede9fe',
    description: 'Gác lại âu lo, chúc bạn có một giấc ngủ thật ngon',
  },
];

export const PostReactionsBar = ({ post, onPostUpdated }) => {
  const { user, setIsAuthModalOpen } = useAuth();

  // State cục bộ cho reactions
  const [reactionCounts, setReactionCounts] = useState(
    post?.reactionCounts || { sympathy: 0, stop: 0, love: 0, encourage: 0, hug: 0, tea: 0, coffee: 0, goodnight: 0, total: post?.cheersCount || 0 }
  );
  const [showCount, setShowCount] = useState(post?.showReactionCount !== false);
  const [sharesCount, setSharesCount] = useState(post?.sharesCount || 0);
  const [reactionsList, setReactionsList] = useState(post?.reactions || []);
  const [myReactions, setMyReactions] = useState([]);

  // Popover & Modals
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReactionListOpen, setIsReactionListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [alertMsg, setAlertMsg] = useState('');

  const pickerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const isAuthor =
    user &&
    ((post?.user?._id && String(user._id) === String(post.user._id)) ||
      (post?.user && String(user._id) === String(post.user)) ||
      (post?.author && user.name === post.author));

  // Xác định reactions của người dùng hiện tại
  useEffect(() => {
    if (post) {
      setReactionCounts(
        post.reactionCounts || { sympathy: 0, stop: 0, love: 0, encourage: 0, hug: 0, tea: 0, total: post.cheersCount || 0 }
      );
      setShowCount(post.showReactionCount !== false);
      setSharesCount(post.sharesCount || 0);
      setReactionsList(post.reactions || []);

      if (user && Array.isArray(post.reactions)) {
        const found = post.reactions.find(
          (r) =>
            (r.user && (r.user._id === user._id || r.user === user._id)) ||
            (r.userName && r.userName === user.name)
        );
        setMyReactions(found ? found.types || [] : []);
      } else {
        setMyReactions([]);
      }
    }
  }, [post, user]);

  // Xử lý hover mở reaction picker
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsPickerOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsPickerOpen(false);
    }, 400);
  };

  // Xử lý click chọn cảm xúc
  const handleSelectReaction = async (reactionType) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    // Kiểm tra quy tắc loại trừ Stop và Love
    if (reactionType === 'stop' && myReactions.includes('love')) {
      showAlert("⚠️ Cảm xúc 'Stop' 🛑 không thể kết hợp cùng 'Yêu thích' ❤️.");
      return;
    }
    if (reactionType === 'love' && myReactions.includes('stop')) {
      showAlert("⚠️ Cảm xúc 'Yêu thích' ❤️ không thể kết hợp cùng 'Stop' 🛑.");
      return;
    }

    // Kiểm tra tối đa 2 cảm xúc
    if (!myReactions.includes(reactionType) && myReactions.length >= 2) {
      showAlert('⚠️ Bạn chỉ có thể chọn tối đa 2 cảm xúc. Vui lòng bấm bỏ bớt 1 cảm xúc trước.');
      return;
    }

    try {
      const res = await postService.reactPost(post._id || post.slug, reactionType);
      if (res?.data) {
        setReactionCounts(res.data.reactionCounts);
        setMyReactions(res.data.myReactions);
        setReactionsList(res.data.reactions || []);
        setShowCount(res.data.showReactionCount);
        setIsPickerOpen(false);

        if (onPostUpdated) {
          onPostUpdated({
            ...post,
            reactionCounts: res.data.reactionCounts,
            reactions: res.data.reactions,
            cheersCount: res.data.cheersCount,
            showReactionCount: res.data.showReactionCount,
          });
        }
      }
    } catch (err) {
      showAlert(err.message || 'Không thể bày tỏ cảm xúc lúc này. Vui lòng thử lại!');
    }
  };

  // Tác giả bật/tắt hiển thị số lượng cảm xúc
  const handleToggleVisibility = async () => {
    try {
      const res = await postService.toggleReactionVisibility(post._id || post.slug, !showCount);
      if (res?.data) {
        setShowCount(res.data.showReactionCount);
        showAlert(
          res.data.showReactionCount
            ? '✓ Đã BẬT hiển thị số lượng cảm xúc bài viết'
            : '✓ Đã ẨN số lượng (chỉ hiển thị biểu tượng cảm xúc)'
        );
        if (onPostUpdated) {
          onPostUpdated({ ...post, showReactionCount: res.data.showReactionCount });
        }
      }
    } catch (err) {
      showAlert('Không thể thay đổi cài đặt ẩn/hiện lúc này.');
    }
  };

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => {
      setAlertMsg('');
    }, 4000);
  };

  // Lọc danh sách người dùng bày tỏ cảm xúc trong popup
  const filteredUsers = reactionsList.filter((r) => {
    if (activeTab === 'all') return true;
    return r.types && r.types.includes(activeTab);
  });

  // Tìm các icon nào đang có lượt phản hồi > 0 để hiển thị cụm icon
  const activeIconConfigs = REACTION_CONFIG.filter(
    (cfg) => (reactionCounts[cfg.id] || 0) > 0 || myReactions.includes(cfg.id)
  );

  return (
    <div className="post-reactions-container">
      {/* Thông báo nhắc nhở quy tắc */}
      {alertMsg && <div className="reaction-alert-toast">{alertMsg}</div>}

      {/* Dòng tóm tắt cảm xúc & chia sẻ (Phía trên thanh nút bấm) */}
      <div className="reactions-summary-bar">
        {/* Cụm icon và số lượng / trạng thái ẩn số lượng */}
        <div
          className="reactions-summary-left"
          onClick={() => reactionsList.length > 0 && setIsReactionListOpen(true)}
          style={{ cursor: reactionsList.length > 0 ? 'pointer' : 'default' }}
          title={reactionsList.length > 0 ? 'Bấm để xem danh sách người bày tỏ cảm xúc' : ''}
        >
          {activeIconConfigs.length > 0 ? (
            <div className="reactions-overlapping-icons">
              {activeIconConfigs.map((cfg) => (
                <span
                  key={cfg.id}
                  className="overlapping-icon"
                  style={{ backgroundColor: cfg.bg }}
                  title={`${cfg.label}: ${reactionCounts[cfg.id] || 0}`}
                >
                  {cfg.icon}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>💭</span>
          )}

          {showCount ? (
            <span className="reactions-count-text">
              {reactionCounts.total > 0
                ? `${reactionCounts.total} lượt bày tỏ cảm xúc`
                : 'Hãy là người đầu tiên bày tỏ cảm xúc!'}
            </span>
          ) : (
            <span className="reactions-count-text hidden-mode" title="Tác giả bài viết đã chọn ẩn số lượng cụ thể">
              {activeIconConfigs.length > 0
                ? 'Đã nhận cảm xúc (Tác giả ẩn số lượng)'
                : 'Chưa có cảm xúc'}
            </span>
          )}
        </div>

        {/* Lượt chia sẻ & Quyền cài đặt của tác giả */}
        <div className="reactions-summary-right">
          {sharesCount > 0 && (
            <span
              className="shares-count-badge"
              onClick={() => setIsShareModalOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              <i className="fa-solid fa-share-nodes" style={{ marginRight: '5px' }}></i>
              {sharesCount} lượt chia sẻ
            </span>
          )}

          {/* Nút tác giả ẩn / hiện số lượng */}
          {isAuthor && (
            <button
              type="button"
              className={`author-visibility-toggle-btn ${!showCount ? 'hidden-active' : ''}`}
              onClick={handleToggleVisibility}
              title={
                showCount
                  ? 'Bấm để ẩn số lượng (chỉ để lại icon cảm xúc)'
                  : 'Bấm để hiện lại số lượng cảm xúc'
              }
            >
              {showCount ? (
                <>
                  <i className="fa-regular fa-eye-slash" style={{ marginRight: '5px' }}></i> Ẩn số lượng
                </>
              ) : (
                <>
                  <i className="fa-regular fa-eye" style={{ marginRight: '5px' }}></i> Hiện số lượng
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Thanh nút bấm tương tác chính (Facebook style) */}
      <div className="reactions-action-buttons-row">
        {/* Nút Bày tỏ cảm xúc với Popover bay lên khi Hover/Click */}
        <div
          className="reaction-button-wrapper"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          ref={pickerRef}
        >
          {/* Facebook-style Reaction Floating Picker */}
          {isPickerOpen && (
            <div className="facebook-reaction-picker">
              {REACTION_CONFIG.map((cfg) => {
                const isSelected = myReactions.includes(cfg.id);
                const isConflicted =
                  (cfg.id === 'stop' && myReactions.includes('love')) ||
                  (cfg.id === 'love' && myReactions.includes('stop'));

                return (
                  <button
                    key={cfg.id}
                    type="button"
                    className={`fb-reaction-emoji-btn ${isSelected ? 'selected' : ''} ${isConflicted ? 'conflicted' : ''}`}
                    onClick={() => handleSelectReaction(cfg.id)}
                    title={
                      isConflicted
                        ? `Không thể dùng chung ${cfg.label} với ${cfg.id === 'stop' ? 'Yêu thích' : 'Stop'}`
                        : cfg.description
                    }
                  >
                    <span className="fb-emoji-symbol">{cfg.icon}</span>
                    <span className="fb-emoji-label">{cfg.label}</span>
                    {isSelected && <span className="fb-selected-dot">✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Nút chính */}
          <button
            type="button"
            className={`reaction-main-trigger-btn ${myReactions.length > 0 ? 'reacted' : ''}`}
            onClick={() => {
              if (myReactions.length === 0) {
                handleSelectReaction('sympathy');
              } else {
                setIsPickerOpen(!isPickerOpen);
              }
            }}
          >
            {myReactions.length === 0 ? (
              <>
                <span className="reaction-trigger-icon">🫂</span>
                <span className="reaction-trigger-text">Bày tỏ cảm xúc</span>
              </>
            ) : (
              <>
                <div className="my-active-icons-flex">
                  {myReactions.map((typeId) => {
                    const cfg = REACTION_CONFIG.find((c) => c.id === typeId);
                    return (
                      <span key={typeId} className="my-icon-badge" title={cfg?.label}>
                        {cfg?.icon} {cfg?.label}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </button>
        </div>

        {/* Nút Chia Sẻ */}
        <button
          type="button"
          className="reaction-share-trigger-btn"
          onClick={() => setIsShareModalOpen(true)}
          title="Chia sẻ tâm sự này lên mạng xã hội hoặc bạn bè"
        >
          <span className="share-trigger-icon">↗️</span>
          <span className="share-trigger-text">Chia sẻ</span>
        </button>
      </div>

      {/* Facebook-style Modal Danh Sách Người Bày Tỏ Cảm Xúc */}
      {isReactionListOpen && (
        <div className="modal-backdrop" onClick={() => setIsReactionListOpen(false)}>
          <div
            className="modal-box reactions-list-modal"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close-btn" onClick={() => setIsReactionListOpen(false)}>
              ✕
            </button>
            <h3 className="modal-heading">❤️ Những Người Đã Bày Tỏ Cảm Xúc</h3>

            {/* Filter Tabs */}
            <div className="reaction-tabs-bar">
              <button
                type="button"
                className={`reaction-tab-item ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                Tất cả ({reactionsList.length})
              </button>
              {REACTION_CONFIG.map((cfg) => {
                const count = reactionCounts[cfg.id] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={cfg.id}
                    type="button"
                    className={`reaction-tab-item ${activeTab === cfg.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(cfg.id)}
                  >
                    {cfg.icon} {showCount ? count : ''}
                  </button>
                );
              })}
            </div>

            {/* User List */}
            <div className="reaction-users-list">
              {filteredUsers.length === 0 ? (
                <p className="no-reactions-txt">Chưa có ai ở mục này.</p>
              ) : (
                filteredUsers.map((item, idx) => (
                  <Link
                    key={idx}
                    to={`/profile/${item.user?._id || item.user || encodeURIComponent(item.userName)}`}
                    className="reaction-user-row"
                    onClick={() => setIsReactionListOpen(false)}
                    style={{ textDecoration: 'none' }}
                    title={`Xem trang cá nhân của ${item.userName}`}
                  >
                    <img
                      src={item.userAvatar || '/images/man.jpg'}
                      alt={item.userName}
                      className="reaction-user-avatar"
                    />
                    <div className="reaction-user-info">
                      <span className="reaction-user-name">{item.userName}</span>
                      <div className="reaction-user-badges">
                        {(item.types || []).map((tId) => {
                          const cfg = REACTION_CONFIG.find((c) => c.id === tId);
                          return (
                            <span key={tId} className="user-mini-badge" title={cfg?.label}>
                              {cfg?.icon} {cfg?.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={post}
        onShareSuccess={(newCount) => setSharesCount(newCount)}
      />
    </div>
  );
};

