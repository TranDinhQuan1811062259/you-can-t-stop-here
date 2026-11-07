import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { formatDate } from '../../utils/formatDate';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  getFabPos,
  saveFabPos,
  resolveAntiCollision,
  ensureInBounds,
  snapToNearestEdge,
} from '../../utils/floatingButtonManager';
import { maskSensitiveText } from '../../utils/sensitiveFilter';

const STATUS_OPTIONS = [
  { id: 'online', label: 'Đang onl', icon: '🟢', color: '#10b981', desc: 'Trực tuyến & Sẵn sàng trò chuyện' },
  { id: 'busy', label: 'Đang bận / Treo máy', icon: '🟡', color: '#f59e0b', desc: 'Đang bận việc hoặc treo máy' },
  { id: 'offline', label: 'Đang off', icon: '⚪', color: '#94a3b8', desc: 'Ngoại tuyến / Tạm ẩn' },
];

export const AssistiveChatWidget = () => {
  const {
    isWidgetOpen,
    toggleWidget,
    closeWidget,
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    activeConversation,
    setActiveConversation,
    openChatWithUser,
    closeChat,
    unreadCount,
    fetchUnread,
    allowStrangerNotifications,
    toggleStrangerNotifications,
    friendsList,
    fetchFriends,
    handleAddFriend,
    handleRemoveFriend,
    myChatStatus,
    changeMyStatus,
  } = useChat();

  const { user, isAuthenticated } = useAuth();

  // Danh sách hội thoại & tin nhắn
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Trạng thái trong phòng chat (active conversation)
  const [messages, setMessages] = useState([]);
  const [inputContent, setInputContent] = useState('');
  const [sending, setSending] = useState(false);
  const [convStatus, setConvStatus] = useState('accepted');
  const [isStranger, setIsStranger] = useState(false);
  const [isFriendState, setIsFriendState] = useState(false);

  const messagesEndRef = useRef(null);
  const statusMenuRef = useRef(null);
  const btnRef = useRef(null);
  const popupRef = useRef(null);

  // Vị trí nút nổi AssistiveTouch có thể kéo thả di dời tự do & chống va chạm
  const [btnPos, setBtnPos] = useState(() => {
    const raw = getFabPos('chat');
    return resolveAntiCollision('chat', raw, true);
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const hasMovedRef = useRef(false);

  // Giữ vị trí trong màn hình khi thay đổi kích thước cửa sổ
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        const bounded = ensureInBounds('chat', prev);
        const resolved = resolveAntiCollision('chat', bounded, true);
        saveFabPos('chat', resolved);
        return resolved;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lắng nghe sự kiện khi các nút khác (Viết tâm sự, Mascot lễ hội, Thanh Cài đặt App) di chuyển để tự động né tránh nếu bị đè
  useEffect(() => {
    const handleOtherMoved = (e) => {
      if (e.detail?.type !== 'chat') {
        setBtnPos((curr) => {
          const safe = resolveAntiCollision('chat', curr, true);
          if (safe.x !== curr.x || safe.y !== curr.y) {
            saveFabPos('chat', safe);
            return safe;
          }
          return curr;
        });
      }
    };
    window.addEventListener('freedom_fab_pos_changed', handleOtherMoved);
    return () => window.removeEventListener('freedom_fab_pos_changed', handleOtherMoved);
  }, []);

  // Kéo thả nút AssistiveTouch (Hỗ trợ cả Chuột và Cảm ứng điện thoại/máy tính bảng)
  const handleStartDrag = (clientX, clientY) => {
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      btnX: btnPos.x,
      btnY: btnPos.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      if (Math.hypot(dx, dy) > 5) {
        hasMovedRef.current = true;
      }

      const nextX = dragStartRef.current.btnX + dx;
      const nextY = dragStartRef.current.btnY + dy;
      setBtnPos(ensureInBounds('chat', { x: nextX, y: nextY }));
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragStartRef.current.mouseX;
        const dy = e.touches[0].clientY - dragStartRef.current.mouseY;

        if (Math.hypot(dx, dy) > 5) {
          hasMovedRef.current = true;
        }

        const nextX = dragStartRef.current.btnX + dx;
        const nextY = dragStartRef.current.btnY + dy;
        setBtnPos(ensureInBounds('chat', { x: nextX, y: nextY }));
      }
    };

    const handleEndDrag = () => {
      setIsDragging(false);

      if (hasMovedRef.current) {
        // Tự động hít (snap) về góc mép gần nhất & kiểm tra chống va chạm với nút Viết tâm sự
        setBtnPos((current) => {
          const snapped = snapToNearestEdge('chat', current);
          saveFabPos('chat', snapped);
          return snapped;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEndDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [isDragging]);

  // Click-outside: Đóng cửa sổ chat khi bấm ra ngoài bất kỳ đâu
  useEffect(() => {
    if (!isWidgetOpen) return;

    const handleOutsideClick = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        closeWidget();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isWidgetOpen, closeWidget]);

  const handleBtnClick = () => {
    // Nếu vừa kéo rê nút đi chỗ khác thì không kích hoạt mở/đóng
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    toggleWidget();
  };

  // Chỉ hiển thị khi đã đăng nhập
  if (!isAuthenticated) return null;

  // Lấy dữ liệu hội thoại & danh bạ
  const fetchConversationsData = () => {
    setLoadingList(true);
    chatService
      .getConversations({ sortBy, q: searchQuery })
      .then((res) => {
        setConversations(res.data || []);
      })
      .catch((err) => console.warn('Lỗi lấy hội thoại:', err))
      .finally(() => setLoadingList(false));
  };

  const fetchFriendsData = () => {
    setLoadingList(true);
    chatService
      .getFriends({ sortBy, q: searchQuery })
      .then((res) => {
        setFriends(res.data || []);
      })
      .catch((err) => console.warn('Lỗi lấy bạn bè:', err))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    if (isWidgetOpen && !activeConversation) {
      if (activeTab === 'messages') {
        fetchConversationsData();
      } else {
        fetchFriendsData();
      }
    }
  }, [isWidgetOpen, activeTab, sortBy, searchQuery, activeConversation]);

  // Lấy tin nhắn trong activeConversation
  const fetchActiveMessages = () => {
    if (!activeConversation?._id) return;
    chatService
      .getMessages(activeConversation._id)
      .then((res) => {
        if (res.data) {
          setMessages(res.data.messages || []);
          if (res.data.conversation) {
            setConvStatus(res.data.conversation.status || 'accepted');
            setIsStranger(Boolean(res.data.conversation.isStranger));
          }
          fetchUnread();
        }
      })
      .catch((err) => console.warn('Lỗi tin nhắn:', err));
  };

  useEffect(() => {
    if (activeConversation) {
      setConvStatus(activeConversation.status || 'accepted');
      setIsStranger(Boolean(activeConversation.isStranger));
      setIsFriendState(Boolean(activeConversation.otherUser?.isFriend));
      fetchActiveMessages();

      const timer = setInterval(() => {
        fetchActiveMessages();
      }, 3000);

      return () => clearInterval(timer);
    }
  }, [activeConversation]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (activeConversation && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConversation]);

  // Đóng menu trạng thái khi bấm ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
        setStatusMenuOpen(false);
      }
    };
    if (statusMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [statusMenuOpen]);

  // Gửi tin nhắn
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputContent.trim() || sending || !activeConversation) return;

    // Tự động làm sạch & chèn dấu chấm vào từ ngữ nhạy cảm
    const contentToSend = maskSensitiveText(inputContent.trim());
    setInputContent('');
    setSending(true);

    try {
      const res = await chatService.sendMessage({
        conversationId: activeConversation._id,
        receiverId: activeConversation.otherUser?._id,
        content: contentToSend,
      });

      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
        fetchUnread();
      }
    } catch (err) {
      alert('Không thể gửi tin nhắn lúc này. Vui lòng thử lại!');
    } finally {
      setSending(false);
    }
  };

  // Chấp nhận trò chuyện từ người lạ
  const handleAccept = async () => {
    if (!activeConversation) return;
    try {
      await chatService.acceptConversation(activeConversation._id);
      setConvStatus('accepted');
    } catch (err) {
      alert('Lỗi chấp nhận cuộc trò chuyện');
    }
  };

  // Kết bạn trong lúc chat
  const handleAddFriendInChat = async () => {
    if (!activeConversation?.otherUser?._id) return;
    try {
      await handleAddFriend(activeConversation.otherUser._id);
      setIsFriendState(true);
      setIsStranger(false);
      setConvStatus('accepted');
    } catch (err) {
      alert(err.message || 'Lỗi kết bạn');
    }
  };

  const currentStatusObj = STATUS_OPTIONS.find((s) => s.id === myChatStatus) || STATUS_OPTIONS[0];

  const getStatusBadge = (status) => {
    if (status === 'busy') return { icon: '🟡', label: 'Đang bận / Treo máy', color: '#f59e0b', className: 'status-busy' };
    if (status === 'offline') return { icon: '⚪', label: 'Đang off', color: '#94a3b8', className: 'status-offline' };
    return { icon: '🟢', label: 'Đang onl', color: '#10b981', className: 'status-online' };
  };

  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const isMobile = screenW < 520;
  const isLeft = btnPos.x < screenW / 2;
  const isTop = btnPos.y < screenH / 2;

  // Tính toán vị trí cửa sổ chat: Luôn né hoàn toàn khỏi nút nổi, không bị đè lên bất kỳ phần tử nào
  const popupStyle = {
    position: 'fixed',
    zIndex: 9998,
    width: isMobile ? 'calc(100vw - 24px)' : '375px',
    maxHeight: 'calc(100vh - 100px)',
  };

  if (isMobile) {
    popupStyle.left = '12px';
    popupStyle.right = '12px';
    popupStyle.bottom = '16px';
    popupStyle.top = 'auto';
  } else {
    // Chiều ngang: Đặt lệch hẳn sang một bên của nút (nút rộng 58px)
    if (isLeft) {
      const targetLeft = btnPos.x + 72;
      if (targetLeft + 380 > screenW) {
        popupStyle.left = `${Math.max(16, screenW - 390)}px`;
        popupStyle.right = 'auto';
      } else {
        popupStyle.left = `${targetLeft}px`;
        popupStyle.right = 'auto';
      }
    } else {
      const targetRight = screenW - btnPos.x + 16;
      if (targetRight + 380 > screenW) {
        popupStyle.right = `${Math.max(16, screenW - 390)}px`;
        popupStyle.left = 'auto';
      } else {
        popupStyle.right = `${targetRight}px`;
        popupStyle.left = 'auto';
      }
    }

    // Chiều dọc: Căn theo cao độ của nút
    if (isTop) {
      popupStyle.top = `${Math.min(Math.max(70, btnPos.y), Math.max(70, screenH - 560))}px`;
      popupStyle.bottom = 'auto';
    } else {
      popupStyle.bottom = `${Math.min(Math.max(20, screenH - btnPos.y - 58), Math.max(20, screenH - 560))}px`;
      popupStyle.top = 'auto';
    }
  }

  return (
    <>
      {/* ======================================================== */}
      {/* 1. NÚT NỔI ASSISTIVE TOUCH (IPHONE STYLE) DI DỜI TỰ DO & HÍT MÉP */}
      {/* ======================================================== */}
      <div
        ref={btnRef}
        className={`assistive-chat-touch-btn ${isWidgetOpen ? 'active' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{
          position: 'fixed',
          left: `${btnPos.x}px`,
          top: `${btnPos.y}px`,
          right: 'auto',
          bottom: 'auto',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging
            ? 'none'
            : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s, box-shadow 0.2s',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleBtnClick}
        title={isWidgetOpen ? "Đóng cửa sổ chat" : "Freedom Chat - Nhắn tin & Bạn bè (Giữ và kéo thả để di chuyển góc tùy thích)"}
      >
        <div className="assistive-touch-inner">
          <span className="assistive-touch-icon">{isWidgetOpen ? '✕' : '💬'}</span>

          {/* Dấu chấm trạng thái của bản thân */}
          {!isWidgetOpen && (
            <span
              className="assistive-my-status-dot"
              style={{ backgroundColor: currentStatusObj.color }}
              title={`Trạng thái của bạn: ${currentStatusObj.label}`}
            />
          )}

          {/* Huy hiệu đếm số lượng tin nhắn chưa đọc */}
          {!isWidgetOpen && unreadCount > 0 && (
            <span className="assistive-unread-counter">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CỬA SỔ POPUP MINI GỌN GÀNG (TỰ ĐỘNG ĐÓNG KHI BẤM RA NGOÀI) */}
      {/* ======================================================== */}
      {isWidgetOpen && (
        <div
          ref={popupRef}
          className="assistive-chat-popup-window"
          style={popupStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ========================================== */}
          {/* TRƯỜNG HỢP 1: ĐANG XEM DANH SÁCH TIN NHẮN / BẠN BÈ */}
          {/* ========================================== */}
          {!activeConversation ? (
            <div className="assistive-list-view">
              {/* Header Mini Popup */}
              <div className="assistive-popup-header">
                <div className="assistive-header-user-status" ref={statusMenuRef}>
                  <img
                    src={user?.avatar || '/images/man.jpg'}
                    alt={user?.name}
                    className="assistive-header-my-avatar"
                  />
                  {/* Status Picker Pill */}
                  <button
                    type="button"
                    className="assistive-status-selector-pill"
                    onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                    title="Bấm để đổi trạng thái hoạt động của bạn"
                  >
                    <span>{currentStatusObj.icon}</span>
                    <span className="status-pill-txt">{currentStatusObj.label}</span>
                    <span className="status-pill-arrow">▾</span>
                  </button>

                  {/* Status Dropdown Menu */}
                  {statusMenuOpen && (
                    <div className="assistive-status-dropdown-menu">
                      <div className="status-dropdown-title">Chọn trạng thái hiển thị:</div>
                      {STATUS_OPTIONS.map((st) => (
                        <div
                          key={st.id}
                          className={`status-option-item ${myChatStatus === st.id ? 'active' : ''}`}
                          onClick={() => {
                            changeMyStatus(st.id);
                            setStatusMenuOpen(false);
                          }}
                        >
                          <span className="status-opt-icon">{st.icon}</span>
                          <div>
                            <strong className="status-opt-name">{st.label}</strong>
                            <span className="status-opt-desc">{st.desc}</span>
                          </div>
                          {myChatStatus === st.id && <span className="status-opt-check">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right controls: Stranger notification toggle & Close */}
                <div className="assistive-header-controls">
                  <button
                    type="button"
                    className={`assistive-stranger-notif-btn ${allowStrangerNotifications ? 'on' : 'off'}`}
                    onClick={toggleStrangerNotifications}
                    title={
                      allowStrangerNotifications
                        ? 'Đang nhận thông báo người lạ (Bấm để tắt)'
                        : 'Đã tắt thông báo người lạ (Bấm để bật)'
                    }
                  >
                    {allowStrangerNotifications ? '🔔 Bật' : '🔕 Tắt'}
                  </button>

                  <button
                    type="button"
                    className="assistive-popup-close-btn"
                    onClick={closeWidget}
                    title="Đóng cửa sổ chat"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Segmented Navigation Tabs */}
              <div className="assistive-nav-tabs">
                <button
                  type="button"
                  className={`assistive-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
                  onClick={() => setActiveTab('messages')}
                >
                  💬 Tin nhắn
                  {unreadCount > 0 && <span className="tab-unread-dot">{unreadCount}</span>}
                </button>
                <button
                  type="button"
                  className={`assistive-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                  onClick={() => setActiveTab('friends')}
                >
                  👥 Bạn bè ({friendsList.length})
                </button>
              </div>

              {/* Search & Sort Filters */}
              <div className="assistive-filters-bar">
                <input
                  type="text"
                  className="assistive-search-input"
                  placeholder={activeTab === 'messages' ? 'Tìm tin nhắn...' : 'Tìm bạn bè theo tên...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <select
                  className="assistive-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  title="Sắp xếp danh sách"
                >
                  <option value="recent">🕒 Gần nhất</option>
                  <option value="alphabet">🔤 Tên A-Z</option>
                  <option value="frequency">💬 Nhiều tin</option>
                </select>
              </div>

              {/* Content List Area */}
              <div className="assistive-scrollable-body">
                {loadingList ? (
                  <div style={{ padding: '30px 0' }}>
                    <LoadingSpinner message="Đang tải..." />
                  </div>
                ) : activeTab === 'messages' ? (
                  /* TAB 1: DANH SÁCH CUỘC TRÒ CHUYỆN */
                  conversations.length === 0 ? (
                    <div className="assistive-empty-box">
                      <span>💌</span>
                      <p>Chưa có cuộc trò chuyện nào.</p>
                      <small>Nhắn tin với người khác từ bình luận hoặc danh bạ bạn bè nhé!</small>
                    </div>
                  ) : (
                    <div className="assistive-conv-list">
                      {conversations.map((c) => {
                        const other = c.otherUser || {};
                        const stBadge = getStatusBadge(other.chatStatus);
                        const isPendingStranger = c.isStranger && c.status === 'pending';

                        return (
                          <div
                            key={c._id}
                            className={`assistive-conv-item ${c.unreadCount > 0 ? 'unread' : ''}`}
                            onClick={() => openChatWithUser(other)}
                          >
                            <div className="assistive-conv-avatar-box">
                              <img
                                src={other.avatar || '/images/man.jpg'}
                                alt={other.name}
                                className="assistive-conv-avatar"
                              />
                              {/* Dấu chấm trạng thái của đối phương */}
                              <span
                                className={`assistive-status-dot-sub ${stBadge.className}`}
                                title={`${other.name}: ${stBadge.label}`}
                              />
                            </div>

                            <div className="assistive-conv-meta">
                              <div className="assistive-conv-title-row">
                                <strong className="assistive-conv-name">{other.name}</strong>
                                <span className="assistive-conv-time">
                                  {formatDate(c.lastMessage?.createdAt || c.updatedAt)}
                                </span>
                              </div>

                              <div className="assistive-conv-sub-row">
                                <span className="assistive-conv-snippet">
                                  {isPendingStranger
                                    ? '⚠️ Tin nhắn chờ từ người lạ...'
                                    : c.lastMessage?.content || 'Bắt đầu cuộc trò chuyện...'}
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {other.isFriend ? (
                                    <span className="assistive-friend-tag">Bạn bè</span>
                                  ) : (
                                    <span className="assistive-stranger-tag">Người lạ</span>
                                  )}
                                  {c.unreadCount > 0 && (
                                    <span className="assistive-unread-pill">{c.unreadCount}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* TAB 2: DANH BẠ BẠN BÈ */
                  friends.length === 0 ? (
                    <div className="assistive-empty-box">
                      <span>👥</span>
                      <p>Chưa có bạn bè trong danh bạ.</p>
                      <small>Bấm "Kết bạn" ở bài viết hoặc bình luận để thêm họ vào đây!</small>
                    </div>
                  ) : (
                    <div className="assistive-friends-list">
                      {friends.map((f) => {
                        const stBadge = getStatusBadge(f.chatStatus);

                        return (
                          <div key={f._id} className="assistive-friend-card">
                            <div className="assistive-friend-avatar-box">
                              <img
                                src={f.avatar || '/images/man.jpg'}
                                alt={f.name}
                                className="assistive-friend-avatar"
                              />
                              <span
                                className={`assistive-status-dot-sub ${stBadge.className}`}
                                title={`${f.name}: ${stBadge.label}`}
                              />
                            </div>

                            <div className="assistive-friend-info">
                              <strong className="assistive-friend-name">{f.name}</strong>
                              <span className="assistive-friend-status-desc" style={{ color: stBadge.color }}>
                                {stBadge.icon} {stBadge.label}
                              </span>
                              <span className="assistive-friend-job">{f.jobTitle || 'Thành viên'}</span>
                            </div>

                            <div className="assistive-friend-actions">
                              <button
                                type="button"
                                className="assistive-chat-action-btn"
                                onClick={() => openChatWithUser(f)}
                                title="Nhắn tin ngay"
                              >
                                💬 Chat
                              </button>
                              <Link
                                to={`/profile/${f._id}`}
                                className="assistive-profile-action-btn"
                                onClick={closeWidget}
                                title="Xem trang cá nhân"
                              >
                                👤
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            /* ========================================== */
            /* TRƯỜNG HỢP 2: ĐANG TRONG PHÒNG CHAT CỤ THỂ */
            /* ========================================== */
            <div className="assistive-chat-room-view">
              {/* Header Phòng Chat */}
              <div className="assistive-room-header">
                <button
                  type="button"
                  className="assistive-back-btn"
                  onClick={closeChat}
                  title="Quay lại danh sách tin nhắn"
                >
                  &larr;
                </button>

                <div className="assistive-room-user-meta">
                  <div className="assistive-room-avatar-box">
                    <img
                      src={activeConversation.otherUser?.avatar || '/images/man.jpg'}
                      alt={activeConversation.otherUser?.name}
                      className="assistive-room-avatar"
                    />
                    <span
                      className={`assistive-status-dot-sub ${
                        getStatusBadge(activeConversation.otherUser?.chatStatus).className
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="assistive-room-user-name">
                      {activeConversation.otherUser?.name}
                    </h4>
                    <span
                      className="assistive-room-status-txt"
                      style={{
                        color: getStatusBadge(activeConversation.otherUser?.chatStatus).color,
                      }}
                    >
                      {getStatusBadge(activeConversation.otherUser?.chatStatus).icon}{' '}
                      {getStatusBadge(activeConversation.otherUser?.chatStatus).label}
                    </span>
                  </div>
                </div>

                <div className="assistive-room-header-actions">
                  {!isFriendState && (
                    <button
                      type="button"
                      className="assistive-room-add-friend-btn"
                      onClick={handleAddFriendInChat}
                      title="Kết bạn để lưu vào danh bạ"
                    >
                      + Bạn
                    </button>
                  )}
                  <button
                    type="button"
                    className="assistive-popup-close-btn"
                    onClick={closeWidget}
                    title="Đóng chat"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Banner chấp nhận nếu là tin nhắn chờ từ người lạ */}
              {isStranger && convStatus === 'pending' && (
                <div className="assistive-stranger-banner">
                  <div className="assistive-stranger-banner-top">
                    <span className="assistive-stranger-badge">
                      <span className="badge-shield">🛡️</span> Tin nhắn người lạ
                    </span>
                    <span className="assistive-stranger-hint">Bảo vệ quyền riêng tư</span>
                  </div>
                  <p className="assistive-stranger-desc">
                    <span className="warning-animated-icon">⚠️</span>
                    <span>
                      <strong>{activeConversation.otherUser?.name || 'Người dùng'}</strong> chưa có trong danh bạ bạn bè. Bạn có muốn trò chuyện không?
                    </span>
                  </p>
                  <div className="assistive-stranger-actions">
                    <button
                      type="button"
                      className="assistive-accept-btn"
                      onClick={handleAccept}
                      title="Chấp nhận lời mời trò chuyện"
                    >
                      <span className="btn-icon">✓</span> Chấp nhận
                    </button>
                    <button
                      type="button"
                      className="assistive-decline-btn"
                      onClick={closeChat}
                      title="Bỏ qua và đóng cuộc trò chuyện"
                    >
                      <span className="btn-icon">✕</span> Bỏ qua
                    </button>
                  </div>
                </div>
              )}

              {/* Vùng hiển thị bong bóng tin nhắn */}
              <div className="assistive-messages-stream">
                {messages.length === 0 ? (
                  <div className="assistive-no-messages">
                    <span>👋</span>
                    <p>Hãy gửi lời chào đầu tiên tới {activeConversation.otherUser?.name}!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender?._id === user?._id || m.sender === user?._id;
                    const isPendingStrangerMsg = !isMe && isStranger && convStatus === 'pending';

                    return (
                      <div
                        key={m._id}
                        className={`assistive-message-row ${isMe ? 'my-msg' : 'other-msg'} ${
                          isPendingStrangerMsg ? 'stranger-pending-msg' : ''
                        }`}
                      >
                        {!isMe && (
                          <img
                            src={m.sender?.avatar || '/images/man.jpg'}
                            alt={m.sender?.name}
                            className="assistive-msg-bubble-avatar"
                          />
                        )}
                        <div className="assistive-bubble-wrap">
                          {isPendingStrangerMsg && (
                            <span className="stranger-msg-intro-tag">
                              ✨ Tin nhắn làm quen mới
                            </span>
                          )}
                          <div className="assistive-msg-bubble">
                            <span className="assistive-msg-bubble-text">{m.content}</span>
                          </div>
                          <span className="assistive-msg-time">{formatDate(m.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Footer Soạn & Gửi Tin Nhắn */}
              <form onSubmit={handleSendMessage} className="assistive-input-footer">
                <input
                  type="text"
                  className="assistive-msg-input"
                  placeholder="Nhập tin nhắn... (Enter gửi)"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  disabled={sending}
                  autoFocus
                />
                <button
                  type="submit"
                  className="assistive-send-btn"
                  disabled={!inputContent.trim() || sending}
                  title="Gửi tin nhắn"
                >
                  {sending ? '...' : '✈️'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
};

