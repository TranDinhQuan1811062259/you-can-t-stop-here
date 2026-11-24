import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePersonalHub } from '../../context/PersonalHubContext';
import { useMusic } from '../../context/MusicContext';
import { getAllPlaylists } from '../../data/playlists';
import { playClickSound } from '../../utils/soundEffects';
import { FlameSparksEffect } from '../common/FlameSparksEffect';
import { getHighestBadge, checkNewlyUnlockedMilestone } from '../../utils/badgeHelper';
import {
  playCampfireSound,
  isCampfireSoundEnabled,
  setCampfireSoundEnabled,
} from '../../utils/campfireAudio';
import { triggerHaptic } from '../../utils/haptics';
import { HonorCardModal } from './HonorCardModal';
import { ProfileQrModal } from '../profile/ProfileQrModal';
import apiClient from '../../services/apiClient';
import '../../styles/personalHub.css';

const DEFAULT_EMPTY_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 7.5a3 3 0 100 6 3 3 0 000-6zm-6.75 10.5a7.48 7.48 0 0113.5 0 8.22 8.22 0 01-13.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";

export const PersonalHubModal = () => {
  const { user } = useAuth();
  const {
    isHubOpen,
    activeTab,
    setActiveTab,
    closeHub,
    streakCount,
    hasCheckedInToday,
    lastCheckInDate,
    checkInToday,
    likedTracks,
    toggleTrackLike,
    personalNotes,
    addNote,
    toggleNote,
    deleteNote,
    updateProfile,
  } = usePersonalHub();

  const { playThemeTrack, currentTrack, isPlaying } = useMusic();

  // Local state cho tab Focus Notes
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  // Local state cho tab Profile form
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Local state phản hồi check-in
  const [checkInFeedback, setCheckInFeedback] = useState(null);
  const [showSparks, setShowSparks] = useState(false);
  const [sparksOrigin, setSparksOrigin] = useState(null);
  const [milestoneCelebration, setMilestoneCelebration] = useState(null);
  const [campfireSoundOn, setCampfireSoundOn] = useState(() => isCampfireSoundEnabled());
  const [isHonorCardOpen, setIsHonorCardOpen] = useState(false);
  const [isProfileQrOpen, setIsProfileQrOpen] = useState(false);
  const [topBonds, setTopBonds] = useState([]);
  const [activeTooltipDay, setActiveTooltipDay] = useState(null);
  const checkInButtonRef = useRef(null);

  const highestBadge = useMemo(() => getHighestBadge(streakCount), [streakCount]);

  const toggleCampfireSound = () => {
    playClickSound();
    const next = !campfireSoundOn;
    setCampfireSoundOn(next);
    setCampfireSoundEnabled(next);
  };

  // Tính toán 7 ngày trong tuần hiện tại theo giờ Việt Nam
  const weeklyTrackerDays = useMemo(() => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const todayStr = formatter.format(now);

      const nowVN = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      const currentDayIdx = (nowVN.getDay() + 6) % 7; // 0 = T2, ..., 6 = CN

      const mondayVN = new Date(nowVN);
      mondayVN.setDate(nowVN.getDate() - currentDayIdx);

      const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const days = [];

      const streakLength = streakCount || 0;
      const streakEndDate = new Date(nowVN);
      if (!hasCheckedInToday) {
        streakEndDate.setDate(streakEndDate.getDate() - 1);
      }
      const streakStartDate = new Date(streakEndDate);
      if (streakLength > 0) {
        streakStartDate.setDate(streakStartDate.getDate() - (streakLength - 1));
      }

      const formatDateOnly = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const streakStartStr = streakLength > 0 ? formatDateOnly(streakStartDate) : null;
      const streakEndStr = streakLength > 0 ? formatDateOnly(streakEndDate) : null;

      for (let i = 0; i < 7; i++) {
        const d = new Date(mondayVN);
        d.setDate(mondayVN.getDate() + i);
        const dateStr = formatDateOnly(d);
        const dateNum = d.getDate();

        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        const isUpcoming = dateStr > todayStr;

        let isCheckedIn = false;
        if (isToday) {
          isCheckedIn = Boolean(hasCheckedInToday);
        } else if (streakLength > 0 && streakStartStr && streakEndStr) {
          isCheckedIn = dateStr >= streakStartStr && dateStr <= streakEndStr;
        }

        days.push({
          label: dayLabels[i],
          dateNum,
          dateStr,
          isToday,
          isCheckedIn,
          isPast,
          isUpcoming,
        });
      }

      return days;
    } catch (err) {
      console.warn('[WeeklyStreak] Lỗi tính tuần:', err);
      return [];
    }
  }, [hasCheckedInToday, streakCount]);

  // Tính toán lưới 30 ngày gần nhất (30-Day Streak Heatmap) theo múi giờ Asia/Ho_Chi_Minh
  const streakHeatmapDays = useMemo(() => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const todayStr = formatter.format(now);

      const nowVN = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

      const streakLength = streakCount || 0;
      const streakEndDate = new Date(nowVN);
      if (!hasCheckedInToday) {
        streakEndDate.setDate(streakEndDate.getDate() - 1);
      }
      const streakStartDate = new Date(streakEndDate);
      if (streakLength > 0) {
        streakStartDate.setDate(streakStartDate.getDate() - (streakLength - 1));
      }

      const formatDateOnly = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const streakStartStr = streakLength > 0 ? formatDateOnly(streakStartDate) : null;
      const streakEndStr = streakLength > 0 ? formatDateOnly(streakEndDate) : null;

      const days = [];
      // 30 ngày gần nhất: từ 29 ngày trước đến hôm nay
      for (let i = 29; i >= 0; i--) {
        const d = new Date(nowVN);
        d.setDate(nowVN.getDate() - i);
        const dateStr = formatDateOnly(d);
        const dayNum = d.getDate();
        const monthNum = d.getMonth() + 1;
        const displayDate = `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}`;

        const isToday = dateStr === todayStr;
        let isCheckedIn = false;
        if (isToday) {
          isCheckedIn = Boolean(hasCheckedInToday);
        } else if (streakLength > 0 && streakStartStr && streakEndStr) {
          isCheckedIn = dateStr >= streakStartStr && dateStr <= streakEndStr;
        }

        // Cấp độ cường độ sắc ấm của ô nhiệt (0 - 4)
        let intensity = 0;
        if (isCheckedIn) {
          if (streakLength >= 30) intensity = 4;
          else if (streakLength >= 14) intensity = 3;
          else if (streakLength >= 7) intensity = 2;
          else intensity = 1;
        }

        days.push({
          dateStr,
          displayDate,
          dayNum,
          isToday,
          isCheckedIn,
          intensity,
        });
      }

      return days;
    } catch (err) {
      console.warn('[StreakHeatmap] Lỗi tính lưới 30 ngày:', err);
      return [];
    }
  }, [hasCheckedInToday, streakCount]);

  // Đồng bộ profile state khi user thay đổi
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileBio(user.bio || '');
    }
  }, [user]);

  // Tải danh sách kết nối thân thiết 2 chiều khi mở tab Hồ sơ
  useEffect(() => {
    if (!isHubOpen || activeTab !== 'favorites') return;
    let isMounted = true;
    apiClient
      .get('/user/bonds')
      .then((res) => {
        if (isMounted) {
          const list = res?.data?.data || [];
          setTopBonds(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isHubOpen, activeTab]);

  // Đóng khi bấm phím Escape (Quy tắc 3 GEMINI.md)
  useEffect(() => {
    if (!isHubOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeHub();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHubOpen, closeHub]);

  // Danh mục tất cả bài hát từ các playlist để ánh xạ các bài user đã like
  const allTracksCatalog = useMemo(() => {
    const playlists = getAllPlaylists();
    const catalog = [];
    playlists.forEach((p) => {
      (p.tracks || []).forEach((t, index) => {
        catalog.push({
          ...t,
          themeSlug: p.slug,
          themeName: p.name,
          themeIcon: p.icon,
          trackIndex: index,
        });
      });
    });
    return catalog;
  }, []);

  // Danh sách các bài hát người dùng đã like
  const favoriteTracksList = useMemo(() => {
    if (!Array.isArray(likedTracks) || likedTracks.length === 0) return [];
    return allTracksCatalog.filter((t) => likedTracks.includes(t.id));
  }, [allTracksCatalog, likedTracks]);

  if (!isHubOpen) return null;

  // Xử lý Check-in
  const handleCheckInClick = async () => {
    if (hasCheckedInToday) return;
    playClickSound();
    const prevStreak = streakCount || 0;

    if (checkInButtonRef.current) {
      const rect = checkInButtonRef.current.getBoundingClientRect();
      setSparksOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }

    const result = await checkInToday();
    if (result?.success) {
      triggerHaptic([20, 35, 20]);
      if (campfireSoundOn) {
        playCampfireSound({ volume: 0.5 });
      }
      setShowSparks(true);
      const newlyUnlocked = checkNewlyUnlockedMilestone(prevStreak, result.streakCount);
      if (newlyUnlocked) {
        setMilestoneCelebration(newlyUnlocked);
      }
      setCheckInFeedback({
        type: 'success',
        text: `Tuyệt vời! Bạn đã giữ lửa ngày thứ ${result.streakCount} liên tục! 🔥`,
      });
    } else if (result?.alreadyCheckedIn) {
      setCheckInFeedback({
        type: 'info',
        text: 'Hôm nay bạn đã giữ lửa rồi, hãy nghỉ ngơi nhé!',
      });
    }
  };

  // Xử lý thêm Note
  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    const content = newNoteContent.trim();
    if (!content) return;

    if (personalNotes.length >= 20) {
      setNoteError('Bạn đã đạt giới hạn tối đa 20 mục tiêu. Hãy xóa bớt mục tiêu cũ nhé!');
      return;
    }

    setIsAddingNote(true);
    setNoteError('');
    const res = await addNote(content);
    setIsAddingNote(false);

    if (res?.success) {
      setNewNoteContent('');
    } else {
      setNoteError(res?.message || 'Không thể thêm mục tiêu');
    }
  };

  // Xử lý cập nhật Profile
  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    setIsUpdatingProfile(true);
    setProfileMessage(null);

    const res = await updateProfile({
      name: profileName.trim(),
      bio: profileBio.trim(),
    });

    setIsUpdatingProfile(false);
    if (res?.success) {
      setProfileMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } else {
      setProfileMessage({ type: 'error', text: res?.message || 'Không thể cập nhật hồ sơ' });
    }
  };

  const userAvatar =
    user?.avatar && !user.avatar.includes('google_avatar') && !user.avatar.includes('man.jpg')
      ? user.avatar
      : DEFAULT_EMPTY_AVATAR;

  return (
    <div className="personal-hub-overlay" onClick={closeHub}>
      <div
        className="personal-hub-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Personal Motivation Hub"
      >
        {/* Header Drawer */}
        <div className="hub-header">
          <div className="hub-user-summary">
            <div className="hub-avatar-wrap">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={user?.name || 'User'}
                  className="hub-avatar-img"
                  onError={(e) => {
                    e.target.src = DEFAULT_EMPTY_AVATAR;
                  }}
                />
              ) : (
                <div className="hub-avatar-initial">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <div className="hub-user-meta">
              <h3 className="hub-user-name" title={user?.name}>
                {user?.name || 'Thành viên Freedom'}
              </h3>
              <div className="hub-user-role-badge">
                <span className="hub-role-chip">
                  {user?.role === 'admin' ? 'Quản Trị Viên' : (user?.jobTitle || 'Thành viên')}
                </span>
                {highestBadge && (
                  <span
                    className="hub-role-chip"
                    style={{
                      background: highestBadge.bg,
                      color: highestBadge.color,
                      borderColor: highestBadge.border,
                      fontWeight: 700,
                    }}
                    title={highestBadge.desc}
                  >
                    {highestBadge.icon} {highestBadge.name}
                  </span>
                )}
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>🔥 {streakCount} ngày</span>
              </div>
            </div>
          </div>

          <div className="hub-header-actions">
            <button
              type="button"
              className="hub-close-btn"
              onClick={closeHub}
              title="Đóng (ESC)"
              aria-label="Đóng bảng điều khiển cá nhân"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hub-nav-tabs">
          <button
            type="button"
            className={`hub-tab-btn fire-tab ${activeTab === 'streak' ? 'active' : ''}`}
            onClick={() => {
              playClickSound();
              setActiveTab('streak');
            }}
          >
            <span>🔥 Giữ Lửa</span>
          </button>

          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => {
              playClickSound();
              setActiveTab('notes');
            }}
          >
            <span>🎯 Focus Notes</span>
            {personalNotes.length > 0 && (
              <span className="hub-tab-badge">{personalNotes.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => {
              playClickSound();
              setActiveTab('favorites');
            }}
          >
            <span>❤️ Nhạc &amp; Hồ Sơ</span>
            {favoriteTracksList.length > 0 && (
              <span className="hub-tab-badge">{favoriteTracksList.length}</span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="hub-content-body">
          {/* ===================================================================
              TAB 1: HÀNH TRÌNH & GIỮ LỬA (STREAK & JOURNEY)
              =================================================================== */}
          {activeTab === 'streak' && (
            <>
              <div className="streak-hero-card">
                <span className="streak-flame-icon-large">🔥</span>
                <div className="streak-hero-count">{streakCount}</div>
                <div className="streak-hero-label">Ngày Giữ Lửa Liên Tục</div>
                <p className="streak-hero-desc">
                  “Dù chặng đường phía trước còn xa, mỗi ngày kiên trì một chút chính là ngọn lửa đưa bạn tới thành công.”
                </p>

                {/* Nút Điểm Danh */}
                <button
                  ref={checkInButtonRef}
                  type="button"
                  className={`checkin-action-btn ${hasCheckedInToday ? 'already-checked' : 'can-checkin'} ${showSparks ? 'button-spark-pulse' : ''}`}
                  onClick={handleCheckInClick}
                  disabled={hasCheckedInToday}
                  title={hasCheckedInToday ? 'Bạn đã điểm danh giữ lửa hôm nay rồi' : 'Bấm để điểm danh giữ lửa hôm nay'}
                >
                  {hasCheckedInToday ? (
                    <>
                      <i className="fa-solid fa-circle-check"></i>
                      <span>Đã Giữ Lửa Hôm Nay ✓</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-fire"></i>
                      <span>Thắp Lửa Hôm Nay (Điểm Danh)</span>
                    </>
                  )}
                </button>

                {milestoneCelebration && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: milestoneCelebration.bg,
                      border: `1px solid ${milestoneCelebration.border}`,
                      color: milestoneCelebration.color,
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      animation: 'heartPop 0.4s ease',
                      boxShadow: `0 0 20px ${milestoneCelebration.bg}`,
                    }}
                  >
                    <span>🎉 CỘT MỐC MỚI:</span>
                    <span>{milestoneCelebration.icon} {milestoneCelebration.name}</span>
                  </div>
                )}

                {checkInFeedback && (
                  <p
                    style={{
                      marginTop: '12px',
                      fontSize: '0.82rem',
                      color: checkInFeedback.type === 'success' ? '#4ade80' : '#fde047',
                      animation: 'fadeIn 0.2s ease',
                    }}
                  >
                    {checkInFeedback.text}
                  </p>
                )}

                {/* Nút Bật/Tắt Âm Thanh Bùng Lửa & Nút Chia Sẻ Danh Dự */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="streak-sfx-toggle-btn"
                    onClick={toggleCampfireSound}
                    title={campfireSoundOn ? 'Tắt hiệu ứng tiếng củi lửa khi điểm danh' : 'Bật hiệu ứng tiếng củi lửa khi điểm danh'}
                  >
                    <i className={`fa-solid ${campfireSoundOn ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
                    <span>SFX Lửa: {campfireSoundOn ? 'BẬT' : 'TẮT'}</span>
                  </button>

                  <button
                    type="button"
                    className="streak-share-card-btn"
                    onClick={() => {
                      playClickSound();
                      setIsHonorCardOpen(true);
                    }}
                    title="Mở thẻ danh dự kiên trì để tải ảnh PNG hoặc sao chép chia sẻ"
                  >
                    <i className="fa-solid fa-award"></i>
                    <span>Chia Sẻ Thẻ Danh Dự 🏆</span>
                  </button>
                </div>
              </div>

              {/* Widget Lịch Điểm Danh 7 Ngày Trong Tuần */}
              <div className="weekly-streak-card">
                <div className="weekly-streak-header">
                  <div className="weekly-streak-title">
                    <i className="fa-solid fa-calendar-week" style={{ color: '#f59e0b' }}></i>
                    <span>Tuần Này (Asia/Ho_Chi_Minh)</span>
                  </div>
                  <span className="weekly-streak-stats">
                    {weeklyTrackerDays.filter((d) => d.isCheckedIn).length}/7 ngày giữ lửa
                  </span>
                </div>

                <div className="weekly-days-grid">
                  {weeklyTrackerDays.map((day) => (
                    <div
                      key={day.dateStr}
                      className={`weekly-day-box ${day.isToday ? 'is-today' : ''} ${day.isCheckedIn ? 'is-checked' : ''} ${day.isUpcoming ? 'is-upcoming' : ''} ${day.isPast && !day.isCheckedIn ? 'is-missed' : ''}`}
                      title={`${day.label} (${day.dateStr}): ${day.isCheckedIn ? 'Đã giữ lửa 🔥' : day.isToday ? 'Hôm nay - Chưa điểm danh' : day.isUpcoming ? 'Sắp tới' : 'Chưa điểm danh'}`}
                    >
                      <span className="weekly-day-label">{day.label}</span>
                      <div className="weekly-day-badge">
                        {day.isCheckedIn ? (
                          <span className="weekly-day-flame">🔥</span>
                        ) : day.isToday ? (
                          <span className="weekly-day-today-dot">•</span>
                        ) : (
                          <span className="weekly-day-num">{day.dateNum}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Widget Lưới Đốm Nhiệt Giữ Lửa 30 Ngày (30-Day Streak Heatmap) */}
              <div className="streak-heatmap-card">
                <div className="streak-heatmap-header">
                  <div className="streak-heatmap-title">
                    <i className="fa-solid fa-chart-simple" style={{ color: '#f59e0b' }}></i>
                    <span>Lưới Đốm Nhiệt 30 Ngày (Asia/Ho_Chi_Minh)</span>
                  </div>
                  <span className="streak-heatmap-legend-count">
                    {streakHeatmapDays.filter((d) => d.isCheckedIn).length}/30 ngày giữ lửa
                  </span>
                </div>

                <div className="streak-heatmap-grid">
                  {streakHeatmapDays.map((day) => (
                    <div
                      key={day.dateStr}
                      className={`heatmap-cell intensity-${day.intensity} ${day.isToday ? 'is-today' : ''} ${day.isCheckedIn ? 'is-checked' : ''} ${activeTooltipDay === day.dateStr ? 'active-tap' : ''}`}
                      onClick={() => setActiveTooltipDay(activeTooltipDay === day.dateStr ? null : day.dateStr)}
                      title={`${day.displayDate} (${day.dateStr}): ${day.isCheckedIn ? `Đã giữ lửa 🔥 (Mức ${day.intensity})` : day.isToday ? 'Hôm nay - Chưa điểm danh' : 'Không điểm danh'}`}
                    >
                      {day.isToday && <span className="heatmap-today-indicator">•</span>}
                    </div>
                  ))}
                </div>

                {/* Tooltip phản hồi trực quan khi chạm vào ô (Tối ưu cho Mobile Touch / Tap) */}
                {activeTooltipDay && (() => {
                  const targetDay = streakHeatmapDays.find((d) => d.dateStr === activeTooltipDay);
                  if (!targetDay) return null;
                  return (
                    <div className="heatmap-touch-tooltip-banner">
                      <span className="tooltip-date">📅 {targetDay.displayDate}:</span>
                      <span className="tooltip-status">
                        {targetDay.isCheckedIn
                          ? `Đã giữ lửa liên tục 🔥 (Cấp ${targetDay.intensity})`
                          : targetDay.isToday
                          ? 'Hôm nay (Chưa điểm danh)'
                          : 'Chưa điểm danh ngày này'}
                      </span>
                      <button
                        type="button"
                        className="tooltip-close-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTooltipDay(null);
                        }}
                        title="Đóng chi tiết ngày"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })()}

                {/* Heatmap Legend */}
                <div className="streak-heatmap-footer">
                  <span className="heatmap-legend-text">Ít</span>
                  <div className="heatmap-legend-dots">
                    <span className="heatmap-cell legend-dot intensity-0" title="Chưa giữ lửa"></span>
                    <span className="heatmap-cell legend-dot intensity-1" title="Cấp 1 (1-3 ngày)"></span>
                    <span className="heatmap-cell legend-dot intensity-2" title="Cấp 2 (4-7 ngày)"></span>
                    <span className="heatmap-cell legend-dot intensity-3" title="Cấp 3 (8-14 ngày)"></span>
                    <span className="heatmap-cell legend-dot intensity-4" title="Cấp 4 (15+ ngày)"></span>
                  </div>
                  <span className="heatmap-legend-text">Nhiều 🔥</span>
                </div>
              </div>

              {/* Thống kê cột mốc lửa */}
              <div className="streak-milestones-card">
                <h4 className="milestones-title">
                  <i className="fa-solid fa-medal" style={{ color: '#f59e0b' }}></i>
                  Cột Mốc Kiên Trì
                </h4>

                <div className="milestones-grid">
                  <div className={`milestone-pill ${streakCount >= 3 ? 'achieved' : ''}`}>
                    <span>🌱</span>
                    <span className="milestone-days">3 Ngày</span>
                    <span className="milestone-badge-name">Mầm Sống</span>
                  </div>

                  <div className={`milestone-pill ${streakCount >= 7 ? 'achieved' : ''}`}>
                    <span>🔥</span>
                    <span className="milestone-days">7 Ngày</span>
                    <span className="milestone-badge-name">Đốm Lửa</span>
                  </div>

                  <div className={`milestone-pill ${streakCount >= 14 ? 'achieved' : ''}`}>
                    <span>🏮</span>
                    <span className="milestone-days">14 Ngày</span>
                    <span className="milestone-badge-name">Ngọn Đuốc</span>
                  </div>

                  <div className={`milestone-pill ${streakCount >= 30 ? 'achieved' : ''}`}>
                    <span>💡</span>
                    <span className="milestone-days">30 Ngày</span>
                    <span className="milestone-badge-name">Hải Đăng</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===================================================================
              TAB 2: GHI CHÚ MỤC TIÊU (FOCUS NOTES)
              =================================================================== */}
          {activeTab === 'notes' && (
            <>
              {/* Form thêm nhanh mục tiêu */}
              <form onSubmit={handleAddNoteSubmit} className="notes-input-bar">
                <input
                  type="text"
                  className="notes-text-input"
                  placeholder="Viết mục tiêu hôm nay cần hoàn thành..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  maxLength={300}
                  disabled={isAddingNote}
                />
                <button
                  type="submit"
                  className="notes-add-btn"
                  disabled={!newNoteContent.trim() || isAddingNote}
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>Thêm</span>
                </button>
              </form>

              {noteError && (
                <div style={{ color: '#f87171', fontSize: '0.78rem', padding: '0 4px' }}>
                  {noteError}
                </div>
              )}

              <div className="notes-header-meta">
                <span>Mục tiêu của bạn</span>
                <span>{personalNotes.length}/20 mục tiêu</span>
              </div>

              {/* Danh sách mục tiêu */}
              {personalNotes.length === 0 ? (
                <div className="notes-empty-state">
                  <div className="notes-empty-icon">🎯</div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
                    Chưa có mục tiêu nào hôm nay.
                  </p>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Hãy đặt một việc nhỏ cần hoàn thành để giữ vững nhịp tiến bước!
                  </span>
                </div>
              ) : (
                <div className="notes-list">
                  {personalNotes.map((note) => {
                    const isDone = Boolean(note.completed);
                    return (
                      <div
                        key={note._id}
                        className={`note-item-card ${isDone ? 'is-completed' : ''}`}
                      >
                        <button
                          type="button"
                          className="note-checkbox-btn"
                          onClick={() => toggleNote(note._id)}
                          title={isDone ? 'Mở lại mục tiêu' : 'Đánh dấu đã hoàn thành'}
                        >
                          <i className={`fa-${isDone ? 'solid fa-circle-check' : 'regular fa-circle'}`}></i>
                        </button>

                        <span className="note-content-text">{note.content}</span>

                        <button
                          type="button"
                          className="note-delete-btn"
                          onClick={() => deleteNote(note._id)}
                          title="Xóa mục tiêu"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ===================================================================
              TAB 3: NHẠC YÊU THÍCH & HỒ SƠ (FAVORITES & PROFILE)
              =================================================================== */}
          {activeTab === 'favorites' && (
            <>
              {/* Danh sách nhạc yêu thích */}
              <div>
                <h4 className="hub-section-title">
                  <span>
                    <i className="fa-solid fa-heart" style={{ color: '#f43f5e', marginRight: '6px' }}></i>
                    Bản Nhạc Đã Thả Tim ({favoriteTracksList.length})
                  </span>
                </h4>

                {favoriteTracksList.length === 0 ? (
                  <div className="hub-tracks-empty">
                    <p style={{ margin: 0 }}>Bạn chưa thả tim bản nhạc nào.</p>
                    <Link
                      to="/music"
                      onClick={closeHub}
                      className="hub-tracks-empty-btn"
                      style={{ display: 'inline-block', textDecoration: 'none' }}
                    >
                      <i className="fa-solid fa-headphones"></i> Khám Phá Góc Nhạc Mùa Đông
                    </Link>
                  </div>
                ) : (
                  <div className="hub-tracks-list">
                    {favoriteTracksList.map((track) => {
                      const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;

                      return (
                        <div key={track.id} className="hub-track-item">
                          <button
                            type="button"
                            className="hub-track-play-btn"
                            onClick={() => {
                              playClickSound();
                              playThemeTrack(track.themeSlug, track.trackIndex);
                            }}
                            title={isCurrentPlaying ? 'Tạm dừng' : 'Phát bản nhạc này'}
                          >
                            <i className={`fa-solid ${isCurrentPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                          </button>

                          <div className="hub-track-info">
                            <div className="hub-track-title">{track.title}</div>
                            <div className="hub-track-artist">
                              {track.themeIcon} {track.artist || 'Freedom Studio'} • {track.themeName}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="hub-track-like-btn"
                            onClick={() => toggleTrackLike(track.id)}
                            title="Bỏ thích bản nhạc này"
                          >
                            <i className="fa-solid fa-heart"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Danh sách kết nối thân thiết 2 chiều (Mutual Bonds) */}
              <div>
                <h4 className="hub-section-title">
                  <span>
                    <i className="fa-solid fa-users-rays" style={{ color: '#38bdf8', marginRight: '6px' }}></i>
                    Kết Nối Thân Thiết 2 Chiều
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{topBonds.length} kết nối</span>
                </h4>

                {topBonds.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                    Tương tác qua lại (thả tim, bình luận) cùng bạn bè để cùng xây dựng điểm gắn kết tri kỷ!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {topBonds.map((bond) => {
                      const partner = bond.partner;
                      const partnerAvatar = partner?.avatar || DEFAULT_EMPTY_AVATAR;
                      return (
                        <Link
                          key={bond._id}
                          to={`/profile/${partner?._id}`}
                          onClick={closeHub}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'rgba(30, 41, 59, 0.45)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            color: '#f8fafc',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <img
                              src={partnerAvatar}
                              alt={partner?.name}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.src = DEFAULT_EMPTY_AVATAR;
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.84rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {partner?.name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {partner?.jobTitle || 'Thành viên'}
                              </div>
                            </div>
                          </div>

                          <span
                            style={{
                              background: bond.tierInfo?.bg || 'rgba(56, 189, 248, 0.15)',
                              color: bond.tierInfo?.color || '#38bdf8',
                              border: `1px solid ${bond.tierInfo?.border || 'rgba(56, 189, 248, 0.35)'}`,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {bond.tierInfo?.name} ({bond.mutualScore}đ)
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form cập nhật hồ sơ cá nhân nhanh */}
              <div>
                <h4 className="hub-section-title">
                  <span>
                    <i className="fa-solid fa-user-pen" style={{ color: '#38bdf8', marginRight: '6px' }}></i>
                    Cập Nhật Hồ Sơ Nhanh
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setIsProfileQrOpen(true);
                      }}
                      style={{
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      title="Xem và chia sẻ mã QR trang cá nhân của bạn"
                    >
                      <i className="fa-solid fa-qrcode"></i>
                      <span>Mã QR Hồ Sơ</span>
                    </button>
                    <Link
                      to={`/profile/${user?._id}`}
                      onClick={closeHub}
                      style={{ fontSize: '0.74rem', color: '#38bdf8', textDecoration: 'none' }}
                    >
                      Xem chi tiết →
                    </Link>
                  </div>
                </h4>

                <form onSubmit={handleUpdateProfileSubmit} className="hub-profile-form">
                  <div className="hub-form-group">
                    <label className="hub-form-label">Tên hiển thị / Biệt danh</label>
                    <input
                      type="text"
                      className="hub-form-input"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      maxLength={60}
                      required
                    />
                  </div>

                  <div className="hub-form-group">
                    <label className="hub-form-label">Giới thiệu ngắn (Bio)</label>
                    <textarea
                      className="hub-form-textarea"
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      maxLength={200}
                      placeholder="Một câu châm ngôn hoặc điều bạn đang theo đuổi..."
                    />
                  </div>

                  {profileMessage && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: profileMessage.type === 'success' ? '#4ade80' : '#f87171',
                      }}
                    >
                      {profileMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="hub-form-submit-btn"
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      {showSparks && (
        <FlameSparksEffect
          origin={sparksOrigin}
          onComplete={() => setShowSparks(false)}
        />
      )}
      <HonorCardModal
        isOpen={isHonorCardOpen}
        onClose={() => setIsHonorCardOpen(false)}
        streakCount={streakCount}
      />
      <ProfileQrModal
        isOpen={isProfileQrOpen}
        onClose={() => setIsProfileQrOpen(false)}
        user={user}
      />
    </div>
  );
};

export default PersonalHubModal;
