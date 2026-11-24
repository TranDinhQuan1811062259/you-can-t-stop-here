import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { userService } from '../services/userService';
import { playClickSound } from '../utils/soundEffects';

const PersonalHubContext = createContext(null);

// BroadcastChannel đồng bộ trạng thái Hub (check-in, thả tim, notes) tức thì giữa các tab
const hubBroadcastChannel =
  typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('freedom_hub_sync_channel')
    : null;

export const usePersonalHub = () => {
  const context = useContext(PersonalHubContext);
  if (!context) {
    throw new Error('usePersonalHub must be used within a PersonalHubProvider');
  }
  return context;
};

export const PersonalHubProvider = ({ children }) => {
  const { user, token, isAuthenticated, openLoginModal } = useAuth();

  const [isHubOpen, setIsHubOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('streak'); // 'streak' | 'notes' | 'favorites'
  const [streakCount, setStreakCount] = useState(() => user?.streakCount || 0);
  const [lastCheckInDate, setLastCheckInDate] = useState(() => user?.lastCheckInDate || null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [likedTracks, setLikedTracks] = useState([]);
  const [trackLikesMap, setTrackLikesMap] = useState({});
  const [personalNotes, setPersonalNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Tham chiếu lưu trạng thái likedTracks trước đó để rollback khi gặp sự cố mạng (Optimistic UI)
  const prevLikedTracksRef = useRef(likedTracks);
  const prevTrackLikesMapRef = useRef(trackLikesMap);

  // Nạp dữ liệu Hub từ server
  const loadHubData = useCallback(async () => {
    try {
      if (isAuthenticated && token) {
        setIsLoading(true);
        const res = await userService.getUserHub();
        if (res?.data?.data) {
          const {
            streakCount: sCount,
            lastCheckInDate: lDate,
            hasCheckedInToday: checkedToday,
            likedTracks: lTracks,
            personalNotes: pNotes,
            trackLikesMap: tLikesMap,
          } = res.data.data;

          setStreakCount(sCount || 0);
          setLastCheckInDate(lDate || null);
          setHasCheckedInToday(Boolean(checkedToday));
          setLikedTracks(Array.isArray(lTracks) ? lTracks : []);
          setPersonalNotes(Array.isArray(pNotes) ? pNotes : []);
          if (tLikesMap && typeof tLikesMap === 'object') {
            setTrackLikesMap(tLikesMap);
          }
        }
      } else {
        // Nếu là khách chưa đăng nhập: Nạp thống kê lượt like bài hát công khai
        const res = await userService.getTrackLikes();
        if (res?.data?.data?.trackLikesMap) {
          setTrackLikesMap(res.data.data.trackLikesMap);
        }
        setLikedTracks([]);
        setPersonalNotes([]);
      }
    } catch (err) {
      console.warn('[PersonalHub] Lỗi khi nạp dữ liệu hub:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  // Kích hoạt nạp dữ liệu khi user thay đổi trạng thái đăng nhập
  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  // Đồng bộ đa tab qua BroadcastChannel & Storage Event
  useEffect(() => {
    const handleBroadcastMessage = (event) => {
      const data = event?.data;
      if (!data) return;

      if (data.type === 'HUB_CHECKIN_UPDATED') {
        setStreakCount(data.streakCount);
        setHasCheckedInToday(true);
        setLastCheckInDate(data.lastCheckInDate);
      } else if (data.type === 'HUB_TRACK_LIKE_UPDATED') {
        setLikedTracks(data.likedTracks);
        if (data.trackId && data.likesCount !== undefined) {
          setTrackLikesMap((prev) => ({
            ...prev,
            [data.trackId]: data.likesCount,
          }));
        }
      } else if (data.type === 'HUB_NOTES_UPDATED') {
        setPersonalNotes(data.personalNotes);
      } else if (data.type === 'HUB_REFRESH_REQUEST') {
        loadHubData();
      }
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'freedom_hub_last_sync') {
        loadHubData();
      }
    };

    if (hubBroadcastChannel) {
      hubBroadcastChannel.addEventListener('message', handleBroadcastMessage);
    }
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (hubBroadcastChannel) {
        hubBroadcastChannel.removeEventListener('message', handleBroadcastMessage);
      }
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [loadHubData]);

  const notifyOtherTabs = (payload) => {
    try {
      if (hubBroadcastChannel) {
        hubBroadcastChannel.postMessage(payload);
      }
      localStorage.setItem('freedom_hub_last_sync', Date.now().toString());
    } catch (_) {}
  };

  const openHub = useCallback((tab = 'streak') => {
    playClickSound();
    setActiveTab(tab);
    setIsHubOpen(true);
  }, []);

  const closeHub = useCallback(() => {
    playClickSound();
    setIsHubOpen(false);
  }, []);

  // 1. Điểm danh giữ lửa hôm nay
  const checkInToday = useCallback(async () => {
    if (!isAuthenticated) {
      openLoginModal();
      return { success: false, requireAuth: true };
    }

    try {
      const res = await userService.checkIn();
      if (res?.data?.data) {
        const { streakCount: newStreak, lastCheckInDate: newDate, alreadyCheckedIn } = res.data.data;
        setStreakCount(newStreak);
        setHasCheckedInToday(true);
        setLastCheckInDate(newDate);

        notifyOtherTabs({
          type: 'HUB_CHECKIN_UPDATED',
          streakCount: newStreak,
          lastCheckInDate: newDate,
        });

        return {
          success: true,
          streakCount: newStreak,
          alreadyCheckedIn,
          message: res.data.message,
        };
      }
    } catch (err) {
      console.error('[PersonalHub] Lỗi điểm danh:', err);
      return {
        success: false,
        message: err?.response?.data?.message || 'Không thể điểm danh lúc này',
      };
    }
  }, [isAuthenticated, openLoginModal]);

  // 2. Thả tim / bỏ tim bản nhạc với Optimistic UI & Rollback
  const toggleTrackLike = useCallback(
    async (trackId) => {
      if (!trackId) return;

      if (!isAuthenticated) {
        openLoginModal();
        return;
      }

      playClickSound();
      const cleanTrackId = String(trackId).trim();
      const isCurrentlyLiked = likedTracks.includes(cleanTrackId);

      // Lưu snapshot để rollback nếu API lỗi
      prevLikedTracksRef.current = likedTracks;
      prevTrackLikesMapRef.current = trackLikesMap;

      // Optimistic update: Cập nhật giao diện ngay lập tức
      const nextLikedTracks = isCurrentlyLiked
        ? likedTracks.filter((id) => id !== cleanTrackId)
        : [...likedTracks, cleanTrackId];

      const currentCount = trackLikesMap[cleanTrackId] || 0;
      const nextCount = isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

      setLikedTracks(nextLikedTracks);
      setTrackLikesMap((prev) => ({
        ...prev,
        [cleanTrackId]: nextCount,
      }));

      try {
        const res = await userService.toggleTrackLike(cleanTrackId);
        if (res?.data?.data) {
          const { isLiked, likedTracks: serverLikedTracks, likesCount } = res.data.data;
          setLikedTracks(serverLikedTracks);
          setTrackLikesMap((prev) => ({
            ...prev,
            [cleanTrackId]: likesCount,
          }));

          notifyOtherTabs({
            type: 'HUB_TRACK_LIKE_UPDATED',
            trackId: cleanTrackId,
            likedTracks: serverLikedTracks,
            likesCount,
          });
        }
      } catch (err) {
        console.warn('[PersonalHub] Lỗi toggleTrackLike, đang rollback:', err);
        // Rollback giao diện
        setLikedTracks(prevLikedTracksRef.current);
        setTrackLikesMap(prevTrackLikesMapRef.current);
      }
    },
    [isAuthenticated, likedTracks, openLoginModal, trackLikesMap]
  );

  // 3. Thêm ghi chú mục tiêu
  const addNote = useCallback(
    async (content) => {
      if (!isAuthenticated) {
        openLoginModal();
        return { success: false, requireAuth: true };
      }

      try {
        const res = await userService.addNote(content);
        if (res?.data?.data) {
          const { personalNotes: updatedNotes, newNote } = res.data.data;
          setPersonalNotes(updatedNotes);

          notifyOtherTabs({
            type: 'HUB_NOTES_UPDATED',
            personalNotes: updatedNotes,
          });

          return { success: true, newNote };
        }
      } catch (err) {
        const msg = err?.response?.data?.message || 'Không thể thêm mục tiêu';
        return { success: false, message: msg };
      }
    },
    [isAuthenticated, openLoginModal]
  );

  // 4. Toggle hoàn thành ghi chú
  const toggleNote = useCallback(
    async (noteId) => {
      if (!isAuthenticated || !noteId) return;

      playClickSound();
      // Optimistic update
      setPersonalNotes((prev) =>
        prev.map((n) => (String(n._id) === String(noteId) ? { ...n, completed: !n.completed } : n))
      );

      try {
        const res = await userService.toggleNote(noteId);
        if (res?.data?.data?.personalNotes) {
          setPersonalNotes(res.data.data.personalNotes);
          notifyOtherTabs({
            type: 'HUB_NOTES_UPDATED',
            personalNotes: res.data.data.personalNotes,
          });
        }
      } catch (err) {
        console.warn('[PersonalHub] Lỗi toggleNote:', err);
        loadHubData(); // Khôi phục từ server
      }
    },
    [isAuthenticated, loadHubData]
  );

  // 5. Xóa ghi chú mục tiêu
  const deleteNote = useCallback(
    async (noteId) => {
      if (!isAuthenticated || !noteId) return;

      playClickSound();
      // Optimistic delete
      setPersonalNotes((prev) => prev.filter((n) => String(n._id) !== String(noteId)));

      try {
        const res = await userService.deleteNote(noteId);
        if (res?.data?.data?.personalNotes) {
          setPersonalNotes(res.data.data.personalNotes);
          notifyOtherTabs({
            type: 'HUB_NOTES_UPDATED',
            personalNotes: res.data.data.personalNotes,
          });
        }
      } catch (err) {
        console.warn('[PersonalHub] Lỗi deleteNote:', err);
        loadHubData();
      }
    },
    [isAuthenticated, loadHubData]
  );

  // 6. Cập nhật hồ sơ cá nhân nhanh (tên hiển thị, bio)
  const updateProfile = useCallback(
    async (profileData) => {
      if (!isAuthenticated) return { success: false };
      try {
        const res = await userService.updateProfile(profileData);
        if (res?.data?.data?.user) {
          // Lưu lại localStorage user
          try {
            const currentSaved = JSON.parse(localStorage.getItem('user') || '{}');
            const merged = { ...currentSaved, ...res.data.data.user };
            localStorage.setItem('user', JSON.stringify(merged));
            localStorage.setItem('freedom_persisted_profile', JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent('freedom_auth_changed'));
          } catch (_) {}
          return { success: true, user: res.data.data.user };
        }
      } catch (err) {
        return {
          success: false,
          message: err?.response?.data?.message || 'Không thể cập nhật hồ sơ',
        };
      }
    },
    [isAuthenticated]
  );

  const value = {
    isHubOpen,
    activeTab,
    setActiveTab,
    openHub,
    closeHub,
    streakCount,
    lastCheckInDate,
    hasCheckedInToday,
    likedTracks,
    trackLikesMap,
    personalNotes,
    isLoading,
    checkInToday,
    toggleTrackLike,
    addNote,
    toggleNote,
    deleteNote,
    updateProfile,
    refreshHub: loadHubData,
  };

  return <PersonalHubContext.Provider value={value}>{children}</PersonalHubContext.Provider>;
};
