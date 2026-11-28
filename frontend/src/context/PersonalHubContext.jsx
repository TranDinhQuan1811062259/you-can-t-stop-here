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
  const { user, token, isAuthenticated, openLoginModal, updateUserProfile } = useAuth();

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

  // Nạp dữ liệu Hub từ server (hỗ trợ cả response đã unwrap từ apiClient lẫn response thô)
  const loadHubData = useCallback(async () => {
    try {
      if (isAuthenticated && token) {
        setIsLoading(true);
        const res = await userService.getUserHub();
        const hubPayload = res?.data?.data || res?.data;
        if (hubPayload) {
          const {
            streakCount: sCount,
            lastCheckInDate: lDate,
            hasCheckedInToday: checkedToday,
            likedTracks: lTracks,
            personalNotes: pNotes,
            trackLikesMap: tLikesMap,
          } = hubPayload;

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
        const likesPayload = res?.data?.data || res?.data;
        if (likesPayload?.trackLikesMap) {
          setTrackLikesMap(likesPayload.trackLikesMap);
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
      const checkInData = res?.data?.data || res?.data;
      if (checkInData) {
        const { streakCount: newStreak, lastCheckInDate: newDate, alreadyCheckedIn } = checkInData;
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
          message: res?.message || res?.data?.message,
        };
      }
      return {
        success: false,
        message: res?.message || 'Không thể điểm danh lúc này',
      };
    } catch (err) {
      console.error('[PersonalHub] Lỗi điểm danh:', err);
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || 'Không thể điểm danh lúc này',
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
        const likeData = res?.data?.data || res?.data;
        if (likeData) {
          const { likedTracks: serverLikedTracks, likesCount } = likeData;
          if (Array.isArray(serverLikedTracks)) {
            setLikedTracks(serverLikedTracks);
          }
          if (likesCount !== undefined) {
            setTrackLikesMap((prev) => ({
              ...prev,
              [cleanTrackId]: likesCount,
            }));
          }

          notifyOtherTabs({
            type: 'HUB_TRACK_LIKE_UPDATED',
            trackId: cleanTrackId,
            likedTracks: Array.isArray(serverLikedTracks) ? serverLikedTracks : nextLikedTracks,
            likesCount: likesCount ?? nextCount,
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
        const noteData = res?.data?.data || res?.data;
        if (noteData?.personalNotes) {
          const { personalNotes: updatedNotes, newNote } = noteData;
          setPersonalNotes(updatedNotes);

          notifyOtherTabs({
            type: 'HUB_NOTES_UPDATED',
            personalNotes: updatedNotes,
          });

          return { success: true, newNote };
        }
        return { success: false, message: res?.message || 'Không thể thêm mục tiêu' };
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Không thể thêm mục tiêu';
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
        const noteData = res?.data?.data || res?.data;
        if (noteData?.personalNotes) {
          setPersonalNotes(noteData.personalNotes);
          notifyOtherTabs({
            type: 'HUB_NOTES_UPDATED',
            personalNotes: noteData.personalNotes,
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
        const noteData = res?.data?.data || res?.data;
        if (noteData?.personalNotes) {
          setPersonalNotes(noteData.personalNotes);
          notifyOtherTabs({
            type: 'HUB_NOTES_UPDATED',
            personalNotes: noteData.personalNotes,
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
      if (!isAuthenticated) {
        return { success: false, message: 'Vui lòng đăng nhập để cập nhật hồ sơ' };
      }
      try {
        const res = await userService.updateProfile(profileData);
        // Chuẩn hóa đọc cả res.data?.user, res.user và res.data?.data?.user
        const updatedUser = res?.data?.user || res?.user || res?.data?.data?.user;

        if (res?.success || updatedUser) {
          const nextProfile = updatedUser || profileData;
          try {
            if (typeof updateUserProfile === 'function') {
              updateUserProfile(nextProfile);
            }
          } catch (_) {}
          return { success: true, user: nextProfile };
        }

        return {
          success: false,
          message: res?.message || 'Không thể cập nhật hồ sơ',
        };
      } catch (err) {
        return {
          success: false,
          message: err?.response?.data?.message || err?.message || 'Không thể cập nhật hồ sơ',
        };
      }
    },
    [isAuthenticated, updateUserProfile]
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
