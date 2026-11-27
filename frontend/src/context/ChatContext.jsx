import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { chatService } from '../services/chatService';
import { createChatSseClient } from '../utils/chat-sse-client';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [myChatStatus, setMyChatStatus] = useState('online'); // 'online' | 'busy' | 'offline'
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' hoặc 'friends'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'alphabet' | 'frequency'
  const [activeConversation, setActiveConversation] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [allowStrangerNotifications, setAllowStrangerNotifications] = useState(true);
  const [friendsList, setFriendsList] = useState([]);
  const [newIncomingNotice, setNewIncomingNotice] = useState(null);
  const [sseStatus, setSseStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'reconnecting' | 'fallback' | 'disconnected'

  const userRef = useRef(user);
  userRef.current = user;
  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;
  const isWidgetOpenRef = useRef(isWidgetOpen);
  isWidgetOpenRef.current = isWidgetOpen;
  const allowStrangerRef = useRef(allowStrangerNotifications);
  allowStrangerRef.current = allowStrangerNotifications;

  useEffect(() => {
    if (user?.chatStatus) {
      setMyChatStatus(user.chatStatus);
    }
  }, [user]);

  const changeMyStatus = async (newStatus) => {
    setMyChatStatus(newStatus);
    try {
      await chatService.updateStatus(newStatus);
    } catch (err) {
      console.warn('Lỗi cập nhật trạng thái hoạt động:', err);
    }
  };

  // Lấy số lượng tin nhắn chưa đọc và cài đặt
  const fetchUnread = useCallback(() => {
    if (!isAuthenticated) return;
    chatService
      .getUnreadCount()
      .then((res) => {
        if (res.data) {
          setUnreadCount(res.data.unreadCount || 0);
          if (res.data.allowStrangerNotifications !== undefined) {
            setAllowStrangerNotifications(res.data.allowStrangerNotifications);
          }
        }
      })
      .catch((err) => console.warn('Lỗi kiểm tra tin nhắn:', err));
  }, [isAuthenticated]);

  // Lấy danh bạ bạn bè
  const fetchFriends = useCallback(() => {
    if (!isAuthenticated) return;
    chatService
      .getFriends({ sortBy: 'alphabet' })
      .then((res) => {
        setFriendsList(res.data || []);
      })
      .catch((err) => console.warn('Lỗi tải danh bạ:', err));
  }, [isAuthenticated]);

  // Kết nối Server-Sent Events (SSE) realtime cho Chat khi đã đăng nhập
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setActiveConversation(null);
      setIsWidgetOpen(false);
      setSseStatus('disconnected');
      return;
    }

    fetchUnread();
    fetchFriends();

    const sseClient = createChatSseClient({
      onStatusChange: (status) => {
        setSseStatus(status);
      },
      onReconnect: () => {
        fetchUnread();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('freedom_chat_sse_reconnected'));
        }
      },
      onEvent: (eventName, payload) => {
        if (eventName === 'new_message' && payload?.message) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('freedom_chat_sse_message', { detail: payload })
            );
          }

          const myId = String(userRef.current?._id || userRef.current?.id || '').trim();
          const senderId = String(payload.senderId || payload.message.sender?._id || '').trim();
          const convId = String(payload.conversationId || payload.message.conversation || '').trim();
          const activeConv = activeConversationRef.current;
          const activeOtherId = String(activeConv?.otherUser?._id || activeConv?.otherUser?.id || '').trim();

          const isViewingConversation = Boolean(
            isWidgetOpenRef.current &&
              activeConv &&
              (typeof document === 'undefined' || !document.hidden) &&
              (String(activeConv._id || '') === convId || (activeOtherId && activeOtherId === senderId))
          );

          if (senderId && senderId !== myId && !isViewingConversation) {
            const shouldNotify =
              payload.conversationStatus !== 'rejected' &&
              (!payload.isStranger || allowStrangerRef.current);
            if (shouldNotify) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        } else if (eventName === 'unread_sync') {
          fetchUnread();
        }
      },
    });

    return () => {
      sseClient.stop();
    };
  }, [isAuthenticated, fetchUnread, fetchFriends]);

  // Fallback polling nhẹ 15 giây CHỈ KHI SSE chưa ở trạng thái connected (tạm dừng khi tab ẩn)
  useEffect(() => {
    if (!isAuthenticated || sseStatus === 'connected') return;

    const fallbackInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchUnread();
    }, 15000);

    return () => clearInterval(fallbackInterval);
  }, [isAuthenticated, sseStatus, fetchUnread]);

  // Mở chat trực tiếp với một người dùng (từ bình luận, bài viết hoặc danh bạ)
  const openChatWithUser = async (targetUser) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để bắt đầu trò chuyện!');
      return;
    }

    try {
      const targetId = targetUser?._id || targetUser?.id || (typeof targetUser === 'string' ? targetUser : null);
      if (!targetId) {
        console.warn('Thiếu targetId khi mở chat:', targetUser);
        return;
      }
      const res = await chatService.findOrCreateConversation(targetId);
      if (res?.data) {
        setActiveConversation(res.data);
        setIsWidgetOpen(true); // Tự động mở cửa sổ mini chat
      }
    } catch (err) {
      console.warn('Lỗi mở cuộc trò chuyện:', err);
      alert(err.message || 'Không thể mở cuộc trò chuyện lúc này. Vui lòng thử lại!');
    }
  };

  const toggleWidget = () => {
    setIsWidgetOpen((prev) => !prev);
  };

  const closeWidget = () => {
    setIsWidgetOpen(false);
  };

  // Bật/tắt cài đặt nhận thông báo từ người lạ
  const toggleStrangerNotifications = async () => {
    const nextState = !allowStrangerNotifications;
    setAllowStrangerNotifications(nextState);
    try {
      await chatService.updateSettings(nextState);
      fetchUnread();
    } catch (err) {
      setAllowStrangerNotifications(!nextState);
      console.warn('Lỗi cập nhật cài đặt:', err);
    }
  };

  // Kết bạn trực tiếp
  const handleAddFriend = async (targetUserId) => {
    try {
      const res = await chatService.addFriend(targetUserId);
      fetchFriends();
      if (activeConversation && activeConversation.otherUser?._id === targetUserId) {
        setActiveConversation((prev) => ({
          ...prev,
          status: 'accepted',
          isStranger: false,
          otherUser: { ...prev.otherUser, isFriend: true },
        }));
      }
      return res;
    } catch (err) {
      throw err;
    }
  };

  // Hủy kết bạn
  const handleRemoveFriend = async (targetUserId) => {
    try {
      await chatService.removeFriend(targetUserId);
      fetchFriends();
      if (activeConversation && activeConversation.otherUser?._id === targetUserId) {
        setActiveConversation((prev) => ({
          ...prev,
          otherUser: { ...prev.otherUser, isFriend: false },
        }));
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isWidgetOpen,
        setIsWidgetOpen,
        toggleWidget,
        closeWidget,
        isDrawerOpen: isWidgetOpen,
        setIsDrawerOpen: setIsWidgetOpen,
        openDrawer: (tab = 'messages') => {
          setActiveTab(tab);
          setIsWidgetOpen(true);
        },
        closeDrawer: closeWidget,
        activeTab,
        setActiveTab,
        sortBy,
        setSortBy,
        activeConversation,
        setActiveConversation,
        openChatWithUser,
        closeChat: () => setActiveConversation(null),
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
        sseStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat phải được dùng bên trong ChatProvider');
  }
  return context;
};

