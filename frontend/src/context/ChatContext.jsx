import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { chatService } from '../services/chatService';

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnread();
      fetchFriends();

      // Polling kiểm tra tin nhắn mới mỗi 5 giây
      const interval = setInterval(() => {
        fetchUnread();
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
      setActiveConversation(null);
      setIsWidgetOpen(false);
    }
  }, [isAuthenticated, fetchUnread, fetchFriends]);

  // Mở chat trực tiếp với một người dùng (từ bình luận, bài viết hoặc danh bạ)
  const openChatWithUser = async (targetUser) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để bắt đầu trò chuyện!');
      return;
    }

    try {
      const res = await chatService.findOrCreateConversation(targetUser._id);
      if (res.data) {
        setActiveConversation(res.data);
        setIsWidgetOpen(true); // Tự động mở cửa sổ mini chat
      }
    } catch (err) {
      console.warn('Lỗi mở cuộc trò chuyện:', err);
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

