import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { postService, getCachedPosts, removeVietnameseTones } from '../../services/postService';
import { eventService } from '../../services/eventService';
import { isSoundEnabled, toggleSound, playClickSound, playFestiveEventSound } from '../../utils/soundEffects';
import { getActiveSeason, setActiveSeason, SEASONS } from '../../utils/seasonUtils';
import { formatDate } from '../../utils/formatDate';
import { getPlaylistBySlug } from '../../data/playlists';
import { IdleWeatherText } from '../common/IdleWeatherText';
import { NotificationDropdown } from './NotificationDropdown';
import { HeaderAudioVisualizer } from '../common/HeaderAudioVisualizer';
import { useMusic } from '../../context/MusicContext';

// =============================================================================
// TỐI ƯU CODE-SPLITTING: LAZY LOAD CÁC MODAL LỚN ĐỂ GIẢM KÍCH THƯỚC BUNDLE CHÍNH
// =============================================================================
const AuthModal = lazy(() => import('../auth/AuthModal').then((m) => ({ default: m.AuthModal || m.default })));
const CreatePostModal = lazy(() => import('../blog/CreatePostModal').then((m) => ({ default: m.CreatePostModal || m.default })));
const EditProfileModal = lazy(() => import('../auth/EditProfileModal').then((m) => ({ default: m.EditProfileModal || m.default })));
const AdminModerationModal = lazy(() => import('../admin/AdminModerationModal').then((m) => ({ default: m.AdminModerationModal || m.default })));
const FestiveEventManagerModal = lazy(() => import('../admin/FestiveEventManagerModal').then((m) => ({ default: m.FestiveEventManagerModal || m.default })));
const FestiveShowcaseModal = lazy(() => import('../common/FestiveShowcaseModal').then((m) => ({ default: m.FestiveShowcaseModal || m.default })));
const StressReliefModal = lazy(() => import('../wellness/StressReliefModal').then((m) => ({ default: m.StressReliefModal || m.default })));
const TimeCapsuleModal = lazy(() => import('../wellness/TimeCapsuleModal').then((m) => ({ default: m.TimeCapsuleModal || m.default })));
const LateNightRadioModal = lazy(() => import('../wellness/LateNightRadioModal').then((m) => ({ default: m.LateNightRadioModal || m.default })));
const GratitudeJarModal = lazy(() => import('../wellness/GratitudeJarModal').then((m) => ({ default: m.GratitudeJarModal || m.default })));
const StickyNoteWallModal = lazy(() => import('../wellness/StickyNoteWallModal').then((m) => ({ default: m.StickyNoteWallModal || m.default })));
const EmergencyCalmModal = lazy(() => import('../wellness/EmergencyCalmModal').then((m) => ({ default: m.EmergencyCalmModal || m.default })));
const CozyWorkCafeModal = lazy(() => import('../wellness/CozyWorkCafeModal').then((m) => ({ default: m.CozyWorkCafeModal || m.default })));
const MoodPixelTrackerModal = lazy(() => import('../wellness/MoodPixelTrackerModal').then((m) => ({ default: m.MoodPixelTrackerModal || m.default })));
const RantAndBurnModal = lazy(() => import('../wellness/RantAndBurnModal').then((m) => ({ default: m.RantAndBurnModal || m.default })));
const MidnightDriftBottleModal = lazy(() => import('../wellness/MidnightDriftBottleModal').then((m) => ({ default: m.MidnightDriftBottleModal || m.default })));
const WorkplaceMoodRadarModal = lazy(() => import('../wellness/WorkplaceMoodRadarModal').then((m) => ({ default: m.WorkplaceMoodRadarModal || m.default })));
const AnonymousWhisperWall = lazy(() => import('../wellness/AnonymousWhisperWall').then((m) => ({ default: m.AnonymousWhisperWall || m.default })));
const MentalFirstAidModal = lazy(() => import('../wellness/MentalFirstAidModal').then((m) => ({ default: m.MentalFirstAidModal || m.default })));
const LateNightTeaLoungeModal = lazy(() => import('../wellness/LateNightTeaLoungeModal').then((m) => ({ default: m.LateNightTeaLoungeModal || m.default })));
const BrainDumpDeclutterModal = lazy(() => import('../wellness/BrainDumpDeclutterModal').then((m) => ({ default: m.BrainDumpDeclutterModal || m.default })));
const MoodWeatherForecastModal = lazy(() => import('../wellness/MoodWeatherForecastModal').then((m) => ({ default: m.MoodWeatherForecastModal || m.default })));
const FocusSleepCocoonModal = lazy(() => import('../wellness/FocusSleepCocoonModal').then((m) => ({ default: m.FocusSleepCocoonModal || m.default })));
const TrackStoryModal = lazy(() => import('../music/TrackStoryModal').then((m) => ({ default: m.TrackStoryModal || m.default })));

// Fallback spinner siêu nhẹ khi tải chunk modal
const ModalLoadingFallback = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10, 15, 30, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      pointerEvents: 'none',
      animation: 'fadeIn 0.15s ease',
    }}
    aria-hidden="true"
  >
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '3px solid rgba(255, 255, 255, 0.12)',
        borderTopColor: '#38bdf8',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  </div>
);
import { notificationService } from '../../services/notificationService';
import {
  startWeatherAmbient,
  stopWeatherAmbient,
  startEventAmbient,
  stopEventAmbient,
  getAmbientState,
  setMelodicSeason,
  MELODIC_SEASONS,
} from '../../utils/ambientSoundEngine';

const DEFAULT_EMPTY_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 7.5a3 3 0 100 6 3 3 0 000-6zm-6.75 10.5a7.48 7.48 0 0113.5 0 8.22 8.22 0 01-13.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";

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
    isAuthModalOpen,
  } = useAuth();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [activeSeason, setLocalSeason] = useState(() => getActiveSeason());
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [isEventManagerOpen, setIsEventManagerOpen] = useState(false);
  const [isShowcaseModalOpen, setIsShowcaseModalOpen] = useState(false);
  const [activeFestiveEvent, setActiveFestiveEvent] = useState(null);
  const [isWellnessOpen, setIsWellnessOpen] = useState(false);
  const [isTimeCapsuleOpen, setIsTimeCapsuleOpen] = useState(false);
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [hasLoadedRadio, setHasLoadedRadio] = useState(false);

  // Kích hoạt nạp chunk Radio khi mở lần đầu, giữ nguyên khi thu nhỏ mini mode
  useEffect(() => {
    if (isRadioOpen) {
      setHasLoadedRadio(true);
    }
  }, [isRadioOpen]);
  const [isGratitudeJarOpen, setIsGratitudeJarOpen] = useState(false);
  const [isStickyWallOpen, setIsStickyWallOpen] = useState(false);
  const [isEmergencyCalmOpen, setIsEmergencyCalmOpen] = useState(false);
  const [isCozyCafeOpen, setIsCozyCafeOpen] = useState(false);
  const [isMoodPixelOpen, setIsMoodPixelOpen] = useState(false);
  const [isRantAndBurnOpen, setIsRantAndBurnOpen] = useState(false);
  const [isDriftBottleOpen, setIsDriftBottleOpen] = useState(false);
  const [isMoodRadarOpen, setIsMoodRadarOpen] = useState(false);
  const [isWhisperWallOpen, setIsWhisperWallOpen] = useState(false);
  const [isMentalFirstAidOpen, setIsMentalFirstAidOpen] = useState(false);
  const [isTeaLoungeOpen, setIsTeaLoungeOpen] = useState(false);
  const [isDeclutterOpen, setIsDeclutterOpen] = useState(false);
  const [isMoodWeatherOpen, setIsMoodWeatherOpen] = useState(false);
  const [isFocusCocoonOpen, setIsFocusCocoonOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isWellnessDropdownOpen, setIsWellnessDropdownOpen] = useState(false);
  const [wellnessCategoryTab, setWellnessCategoryTab] = useState('vent'); // 'vent' | 'cozy' | 'heal' (chia nhỏ theo phân loại, không gôm tất cả)
  const wellnessDropdownRef = useRef(null);

  // States cho Âm Thanh Môi Trường Duy Trì (Ambient Soundscape Engine)
  const [ambientState, setAmbientState] = useState(() => getAmbientState());
  const [isAmbientMenuOpen, setIsAmbientMenuOpen] = useState(false);
  const ambientMenuRef = useRef(null);

  // Kết nối Unified Music Context (đồng bộ 100% với Góc Nhạc & Mini-Player)
  const music = useMusic();
  const winterOfficialTracks = music.tracks || [];
  const winterTrackIndex = music.currentTrackIndex;
  const isPlayingRecording = music.isPlaying;
  const recordingAudioRef = music.audioRef;
  const selectedTrackSeason = music.selectedTrackSeason;
  const seasonalTracks = music.seasonalTracks;
  const recordingVolume = music.volume;
  const isRecordingMuted = music.isMuted;
  const recordingCurrentTime = music.currentTime;
  const recordingDuration = music.duration;
  const recordingFileInputRef = useRef(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  // State tự động chuyển bài cho playlist mùa đông (đồng bộ với Loop Mode)
  const isAutoNext = music.loopMode !== 'none';
  const handleToggleAutoNext = () => {
    playClickSound();
    music.cycleLoopMode();
  };

  // Định dạng mm:ss cho Mini-Scrubber Header
  const formatRecordingTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Xử lý tua thời lượng bài thu trong Header
  const handleRecordingSeek = (e) => {
    const val = parseFloat(e.target.value);
    music.seekTo(val);
  };

  // Xử lý thay đổi âm lượng bài thu trong Header
  const handleRecordingVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    music.changeVolume(val);
  };

  // Bật / tắt tiếng bài thu trong Header
  const handleToggleRecordingMute = () => {
    playClickSound();
    music.toggleMute();
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [liveResults, setLiveResults] = useState([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  // Gợi ý tìm kiếm trực tiếp ngay khi gõ từ khóa (Live Search Suggestions)
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setLiveResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingLive(true);
      postService
        .getPosts({ q: trimmed, limit: 5 })
        .then((res) => {
          const raw = res.data?.posts || res.data || [];
          setLiveResults(Array.isArray(raw) ? raw.slice(0, 5) : []);
        })
        .catch(() => {
          try {
            const cached = getCachedPosts();
            const cleanQ = removeVietnameseTones(trimmed.toLowerCase());
            const matched = cached.filter((p) => {
              const title = (p.title || '').toLowerCase();
              const summary = (p.summary || '').toLowerCase();
              return (
                title.includes(trimmed.toLowerCase()) ||
                summary.includes(trimmed.toLowerCase()) ||
                removeVietnameseTones(title).includes(cleanQ) ||
                removeVietnameseTones(summary).includes(cleanQ)
              );
            });
            setLiveResults(matched.slice(0, 5));
          } catch (_) {
            setLiveResults([]);
          }
        })
        .finally(() => setIsSearchingLive(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Đóng hộp gợi ý tìm kiếm khi click chuột ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    playClickSound();
    setIsSearchFocused(false);
    if (searchTerm.trim()) {
      navigate(`/?q=${encodeURIComponent(searchTerm.trim())}`);
      setTimeout(() => {
        const postsEl = document.getElementById('posts-section');
        if (postsEl) {
          postsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      navigate('/');
    }
  };

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
    const handleOpenTimeCapsule = () => {
      setIsTimeCapsuleOpen(true);
    };
    const handleOpenRadio = () => {
      setIsRadioOpen(true);
    };
    const handleOpenGratitudeJar = () => {
      setIsGratitudeJarOpen(true);
    };
    const handleOpenStickyWall = () => {
      setIsStickyWallOpen(true);
    };
    const handleOpenEmergencyCalm = () => {
      setIsEmergencyCalmOpen(true);
    };
    const handleOpenCozyCafe = () => {
      setIsCozyCafeOpen(true);
    };
    const handleOpenMoodPixel = () => {
      setIsMoodPixelOpen(true);
    };

    window.addEventListener('freedom_open_moderation', handleOpenMod);
    window.addEventListener('freedom_open_festive_showcase', handleOpenShowcase);
    window.addEventListener('freedom_open_wellness', handleOpenWellness);
    window.addEventListener('freedom_open_time_capsule', handleOpenTimeCapsule);
    window.addEventListener('freedom_open_radio', handleOpenRadio);
    window.addEventListener('freedom_open_gratitude_jar', handleOpenGratitudeJar);
    window.addEventListener('freedom_open_sticky_wall', handleOpenStickyWall);
    window.addEventListener('freedom_open_sos_calm', handleOpenEmergencyCalm);
    window.addEventListener('freedom_open_cozy_cafe', handleOpenCozyCafe);
    window.addEventListener('freedom_open_mood_pixel', handleOpenMoodPixel);

    return () => {
      window.removeEventListener('post_updated', checkFlaggedPosts);
      window.removeEventListener('profile_updated', handleAuthChange);
      window.removeEventListener('freedom_auth_changed', handleAuthChange);
      window.removeEventListener('freedom_festive_event_changed', fetchFestiveEvent);
      window.removeEventListener('freedom_open_moderation', handleOpenMod);
      window.removeEventListener('freedom_open_festive_showcase', handleOpenShowcase);
      window.removeEventListener('freedom_open_wellness', handleOpenWellness);
      window.removeEventListener('freedom_open_time_capsule', handleOpenTimeCapsule);
      window.removeEventListener('freedom_open_radio', handleOpenRadio);
      window.removeEventListener('freedom_open_gratitude_jar', handleOpenGratitudeJar);
      window.removeEventListener('freedom_open_sticky_wall', handleOpenStickyWall);
      window.removeEventListener('freedom_open_sos_calm', handleOpenEmergencyCalm);
      window.removeEventListener('freedom_open_cozy_cafe', handleOpenCozyCafe);
      window.removeEventListener('freedom_open_mood_pixel', handleOpenMoodPixel);
    };
  }, [user]);

  const seasonRef = useRef(null);

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

  // Lắng nghe thay đổi âm thanh môi trường duy trì
  useEffect(() => {
    const handleAmbientChange = (e) => {
      setAmbientState(e.detail || getAmbientState());
    };
    window.addEventListener('freedom_ambient_sound_changed', handleAmbientChange);
    return () => window.removeEventListener('freedom_ambient_sound_changed', handleAmbientChange);
  }, []);

  // Polling liên tục số lượng thông báo mới (Lời mời kết bạn, tin nhắn, tương tác)
  useEffect(() => {
    if (!isAuthenticated && !user) return;
    const fetchNotifCount = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        if (res?.data?.unreadCount !== undefined) {
          setNotifUnreadCount(res.data.unreadCount);
        }
      } catch (_) {}
    };
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 4000);
    window.addEventListener('notification_updated', fetchNotifCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notification_updated', fetchNotifCount);
    };
  }, [isAuthenticated, user]);

  // Đóng dropdown mùa, âm thanh môi trường & trạm chữa lành khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (seasonRef.current && !seasonRef.current.contains(e.target)) {
        setIsSeasonOpen(false);
      }
      if (ambientMenuRef.current && !ambientMenuRef.current.contains(e.target)) {
        setIsAmbientMenuOpen(false);
      }
      if (wellnessDropdownRef.current && !wellnessDropdownRef.current.contains(e.target)) {
        setIsWellnessDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tự động đóng dropdown trạm chữa lành khi chuyển trang
  useEffect(() => {
    setIsWellnessDropdownOpen(false);
  }, [location?.pathname]);

  // Lắng nghe sự kiện mở Lò Đốt Muộn Phiền từ bất kỳ đâu (Banner, Pet, Chat, Phím tắt)
  useEffect(() => {
    const handleOpenRant = () => {
      setIsRantAndBurnOpen(true);
      setIsWellnessDropdownOpen(false);
    };
    const handleOpenDrift = () => {
      setIsDriftBottleOpen(true);
      setIsWellnessDropdownOpen(false);
    };
    const handleOpenRadar = () => {
      setIsMoodRadarOpen(true);
      setIsWellnessDropdownOpen(false);
    };
    const handleOpenWhisper = () => {
      setIsWhisperWallOpen(true);
      setIsWellnessDropdownOpen(false);
    };

    window.addEventListener('freedom_open_rant_and_burn', handleOpenRant);
    window.addEventListener('freedom_open_drift_bottle', handleOpenDrift);
    window.addEventListener('freedom_open_mood_radar', handleOpenRadar);
    window.addEventListener('freedom_open_whisper_wall', handleOpenWhisper);

    return () => {
      window.removeEventListener('freedom_open_rant_and_burn', handleOpenRant);
      window.removeEventListener('freedom_open_drift_bottle', handleOpenDrift);
      window.removeEventListener('freedom_open_mood_radar', handleOpenRadar);
      window.removeEventListener('freedom_open_whisper_wall', handleOpenWhisper);
    };
  }, []);

  // Thông báo bảo mật nổi (Toast) khi thu hồi phiên hoặc đăng xuất tất cả thiết bị
  const [securityNotice, setSecurityNotice] = useState(null);

  useEffect(() => {
    let timerId = null;
    const showNotice = (msg) => {
      setSecurityNotice(msg);
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => setSecurityNotice(null), 5000);
    };

    const handleNoticeEvent = (e) => {
      showNotice(e.detail || '✓ Đã thu hồi toàn bộ phiên đăng nhập trên tất cả thiết bị thành công!');
    };

    try {
      const stored = sessionStorage.getItem('freedom_logout_notice');
      if (stored) {
        sessionStorage.removeItem('freedom_logout_notice');
        showNotice(stored);
      }
    } catch (_) {}

    window.addEventListener('freedom_logout_notice', handleNoticeEvent);
    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('freedom_logout_notice', handleNoticeEvent);
    };
  }, []);

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
    if (ambientState.isWeatherSoundActive) {
      startWeatherAmbient(nextSeason.id);
    }
    // Tự động đồng bộ tab mùa của playlist thu âm theo ô thời tiết bên cạnh!
    setSelectedTrackSeason(nextSeason.id);
    setMelodicSeason(nextSeason.id);
  };

  const handleToggleWeatherAmbient = () => {
    playClickSound();
    if (ambientState.isWeatherSoundActive) {
      stopWeatherAmbient();
    } else {
      startWeatherAmbient(activeSeason.id);
    }
  };

  // Đồng bộ class mở popover âm thanh lên body để ẩn hiệu ứng chuyển trang 3D & bảng 20/11
  useEffect(() => {
    if (isAmbientMenuOpen) {
      document.body.classList.add('has-ambient-menu-open');
    } else {
      document.body.classList.remove('has-ambient-menu-open');
    }
    return () => {
      document.body.classList.remove('has-ambient-menu-open');
    };
  }, [isAmbientMenuOpen]);

  // Điều khiển phát bản thu âm 4 mùa chính chủ qua Unified Music Context
  const handleSelectRecordingSeason = (seasonId) => {
    playClickSound();
    music.selectRecordingSeason(seasonId);
  };

  const handleTogglePlayRecording = () => {
    playClickSound();
    music.togglePlay();
  };

  // Chọn và phát một bài hát cụ thể trong danh sách mùa đông
  const handlePlayWinterTrack = (index) => {
    playClickSound();
    music.playTrack(index);
  };

  const handleNextWinterTrack = () => {
    playClickSound();
    music.nextTrack();
  };

  const handlePrevWinterTrack = () => {
    playClickSound();
    music.prevTrack();
  };

  const handleUploadCustomRecording = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClickSound();
    music.uploadCustomRecording(file);
  };

  const audioEl = recordingAudioRef.current;
  const isAudioActuallyPlaying = audioEl ? (!audioEl.paused && !audioEl.ended) : false;
  const isEffectivePlaying = isAudioActuallyPlaying || isPlayingRecording;

  const currentWinterTrack = winterOfficialTracks[winterTrackIndex] || winterOfficialTracks[0];
  const currentTrackMeta = selectedTrackSeason === 'winter' && currentWinterTrack
    ? {
        id: 'winter',
        seasonId: 'winter',
        name: 'Mùa Đông',
        icon: '❄️',
        title: currentWinterTrack.title,
        artist: currentWinterTrack.artist,
        desc: currentWinterTrack.mood || 'Không gian tĩnh lặng, trầm ấm & hoài niệm',
        url: currentWinterTrack.src,
        hasUserAudio: true,
      }
    : (seasonalTracks[selectedTrackSeason] || seasonalTracks.winter);

  return (
    <>
      {securityNotice && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#ffffff',
            padding: '10px 22px',
            borderRadius: '999px',
            fontSize: '0.86rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.4), 0 0 16px rgba(239, 68, 68, 0.25)',
            border: '1.5px solid rgba(239, 68, 68, 0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.22s ease',
          }}
        >
          <span style={{ fontSize: '1.05rem', color: '#f87171' }}>⚡</span>
          <span>{securityNotice}</span>
          <button
            type="button"
            onClick={() => setSecurityNotice(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: '0 0 0 8px',
              lineHeight: 1,
            }}
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
      <header className={`site-header season-accent-${activeSeason.id}`}>
        <div className="container header-container">
          {/* Logo & Brand Name + Seasonal Weather Pill */}
          <div className="header-brand-wrap">
            <Link
              to="/"
              className={`logo-link seasonal-logo-wrap season-${activeSeason.id}`}
              onClick={closeNav}
              title="You Can't Stop Here - Về trang chủ"
            >
              <span className="healing-icon-pill healing-icon-sage" style={{ width: '34px', height: '34px' }}>
                <i className="fa-solid fa-seedling"></i>
              </span>
              <span
                className={`logo-text seasonal-logo-text season-${activeSeason.id}`}
                style={{
                  display: 'inline-block',
                  visibility: 'visible',
                  opacity: 1,
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  letterSpacing: '0.5px',
                  color: activeSeason.id === 'spring' ? '#db2777' : activeSeason.id === 'summer' ? '#d97706' : activeSeason.id === 'autumn' ? '#c2410c' : '#0284c7',
                }}
              >
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
                <span className="season-chevron">
                  <i className={`fa-solid fa-chevron-${isSeasonOpen ? 'up' : 'down'}`} style={{ fontSize: '0.68rem', marginLeft: '2px' }}></i>
                </span>
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

            {/* Cụm Điều Khiển Âm Thanh Môi Trường Duy Trì (Ambient Soundscape Engine) */}
            <div className="header-ambient-sound-wrap" ref={ambientMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Mini Waveform Pill trực tiếp trên Header khi đang phát nhạc */}
              {isEffectivePlaying && (
                <div
                  className="header-live-waveform-pill"
                  onClick={() => {
                    playClickSound();
                    setIsAmbientMenuOpen((prev) => !prev);
                  }}
                  title={`Đang phát: ${currentTrackMeta.title} (Bấm để mở trình phát)`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    height: '28px',
                    padding: '0 8px 0 10px',
                    borderRadius: '999px',
                    background: 'rgba(13, 148, 136, 0.2)',
                    border: '1px solid rgba(45, 212, 191, 0.45)',
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                    animation: 'fadeIn 0.25s ease',
                    transition: 'all 0.2s ease',
                  }}
                  role="button"
                  aria-label={`Đang phát nhạc: ${currentTrackMeta.title}`}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#2dd4bf',
                      letterSpacing: '0.3px',
                      maxWidth: '90px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentTrackMeta.title}
                  </span>
                  <HeaderAudioVisualizer
                    audioRef={recordingAudioRef}
                    isPlaying={isEffectivePlaying}
                    barCount={5}
                    height={13}
                    barWidth={2}
                    barGap={1.5}
                    activeColor="#2dd4bf"
                  />
                </div>
              )}

              <button
                type="button"
                className={`header-ambient-btn ${ambientState.isWeatherSoundActive || ambientState.isEventSoundActive || isEffectivePlaying ? 'is-active' : ''}`}
                onClick={() => {
                  playClickSound();
                  setIsAmbientMenuOpen((prev) => !prev);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: ambientState.isWeatherSoundActive || ambientState.isEventSoundActive || isEffectivePlaying
                    ? 'linear-gradient(135deg, #0d9488, #059669)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: ambientState.isWeatherSoundActive || ambientState.isEventSoundActive || isEffectivePlaying
                    ? '1.5px solid #2dd4bf'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: ambientState.isWeatherSoundActive || ambientState.isEventSoundActive || isEffectivePlaying
                    ? '0 2px 10px rgba(13, 148, 136, 0.4)'
                    : 'none',
                }}
                title={
                  isEffectivePlaying
                    ? `Đang phát bản nhạc: ${currentTrackMeta.title}`
                    : ambientState.isCombined
                    ? 'Đang phát Hòa âm Kết hợp (Thời tiết 4 mùa + Sự kiện lễ hội)'
                    : ambientState.isWeatherSoundActive
                    ? `Đang phát Âm thanh Thời tiết ${activeSeason.name}`
                    : ambientState.isEventSoundActive
                    ? 'Đang phát Âm thanh Sự kiện Lễ hội'
                    : 'Cài đặt âm thanh môi trường duy trì (Gió mùa đông, sóng biển, tiếng chim hót...)'
                }
                aria-label="Âm thanh môi trường duy trì"
              >
                <span>
                  {ambientState.isCombined ? '🎶' : ambientState.isWeatherSoundActive ? activeSeason.icon : ambientState.isEventSoundActive ? '🎊' : isEffectivePlaying ? '🎧' : '🔈'}
                </span>
                {(ambientState.isWeatherSoundActive || ambientState.isEventSoundActive || isEffectivePlaying) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '-1px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4ade80',
                      border: '1.5px solid #ffffff',
                      animation: 'pulseDot 1.2s infinite alternate',
                    }}
                  />
                )}
              </button>

              {/* Popover Tùy Chọn Âm Thanh Môi Trường & Playlist Thu Âm 4 Mùa */}
              {isAmbientMenuOpen && (
                <div className="header-ambient-dropdown">
                  <div className="ambient-dropdown-header">
                    <div className="ambient-dropdown-title-wrap">
                      <span className="ambient-title-icon">🎧</span>
                      <strong className="ambient-title-text">
                        Âm Thanh & Bản Thu 4 Mùa
                      </strong>
                    </div>
                    <span className="ambient-season-live-badge" title="Tự động đồng bộ theo ô thời tiết bên cạnh">
                      {activeSeason.icon} {activeSeason.shortName}
                    </span>
                  </div>

                  {/* Mục 1: Âm thanh môi trường nền (Gọn gàng, tự động theo ô thời tiết) */}
                  <div className={`ambient-weather-compact-card ${ambientState.isWeatherSoundActive ? 'is-active' : ''}`}>
                    <div className="ambient-weather-compact-left">
                      <span className="ambient-weather-pill-icon">{activeSeason.icon}</span>
                      <div className="ambient-weather-compact-texts">
                        <strong className="ambient-weather-compact-title">
                          Âm thanh nền: {activeSeason.name}
                        </strong>
                        <span className="ambient-weather-compact-desc">
                          {activeSeason.id === 'winter'
                            ? 'Gió bấc rít êm & lò sưởi ấm'
                            : activeSeason.id === 'summer'
                            ? 'Sóng biển rì rào & ve sầu'
                            : activeSeason.id === 'spring'
                            ? 'Gió xuân & chim hót líu lo'
                            : 'Lá xào xạc & mưa phùn'}
                          <span className="ambient-sync-text"> (Tự đổi theo ô thời tiết)</span>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleWeatherAmbient}
                      className={`ambient-weather-toggle-btn ${ambientState.isWeatherSoundActive ? 'is-on' : 'is-off'}`}
                      title={ambientState.isWeatherSoundActive ? 'Bấm để tắt âm thanh môi trường' : 'Bấm để bật âm thanh môi trường'}
                    >
                      {ambientState.isWeatherSoundActive ? '🔊 ĐANG BẬT' : '🔇 BẬT'}
                    </button>
                  </div>

                  {/* Mục 2: KHU VỰC SPOTLIGHT DÀNH RIÊNG CHO CÁC BẢN THU ÂM CHÍNH CHỦ CỦA BẠN */}
                  <div className="ambient-recording-playlist-box">
                    <div className="ambient-playlist-head">
                      <div className="ambient-playlist-title-wrap">
                        <span className="playlist-head-icon">🎙️</span>
                        <strong className="playlist-head-title">Bản Thu Âm 4 Mùa Của Bạn</strong>
                      </div>
                      <span className="playlist-head-badge">100% Chính Chủ</span>
                    </div>

                    {/* Hàng Tab chọn mùa cho bản thu */}
                    <div className="ambient-playlist-tabs">
                      {[
                        { id: 'spring', icon: '🌸', name: 'Xuân' },
                        { id: 'summer', icon: '☀️', name: 'Hạ' },
                        { id: 'autumn', icon: '🍁', name: 'Thu' },
                        { id: 'winter', icon: '❄️', name: 'Đông' },
                      ].map((s) => {
                        const isCurrentTab = selectedTrackSeason === s.id;
                        const hasAudio = s.id === 'winter' ? winterOfficialTracks.length > 0 : Boolean(seasonalTracks[s.id]?.hasUserAudio);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`ambient-season-tab ${isCurrentTab ? 'is-selected' : ''}`}
                            onClick={() => handleSelectRecordingSeason(s.id)}
                            title={`Bản thu âm ${s.name}`}
                          >
                            <span>{s.icon}</span>
                            <span>{s.name}</span>
                            {hasAudio && <span className="tab-audio-dot" title="Đã có file thu âm" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Thẻ Chi Tiết & Mini Player Của Mùa Đang Chọn */}
                    <div className={`ambient-track-card ${isEffectivePlaying ? 'is-playing' : ''}`}>
                      <div className="ambient-track-main-row">
                        <div className="track-card-visual">
                          <div className={`track-disc ${isEffectivePlaying ? 'spinning' : ''}`}>
                            <span>{currentTrackMeta.icon}</span>
                          </div>
                          {isEffectivePlaying && (
                            <div className="track-sound-waves" style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', padding: '2px 3px' }}>
                              <HeaderAudioVisualizer
                                audioRef={recordingAudioRef}
                                isPlaying={isEffectivePlaying}
                                barCount={4}
                                height={12}
                                barWidth={2.5}
                                barGap={1.5}
                                activeColor="#6366f1"
                              />
                            </div>
                          )}
                        </div>

                        <div className="track-card-info">
                          <div className="track-title-row">
                            <strong className="track-title" title={currentTrackMeta.title}>
                              {currentTrackMeta.title}
                            </strong>
                          </div>
                          <span className="track-artist">{currentTrackMeta.artist}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                            <span className={`track-status-tag ${currentTrackMeta.hasUserAudio ? 'ready' : 'pending'}`}>
                              {currentTrackMeta.hasUserAudio ? '✓ Đã có bản thu' : '⏳ Chờ bản thu'}
                            </span>
                            {selectedTrackSeason === 'winter' && (winterOfficialTracks[winterTrackIndex] || winterOfficialTracks[0])?.storyNote && (
                              <button
                                type="button"
                                className="ambient-story-pill-btn"
                                onClick={() => {
                                  playClickSound();
                                  setIsStoryModalOpen(true);
                                }}
                                title="Đọc tâm sự mộc mạc của tác giả khi thu âm bản nhạc này"
                              >
                                💌 Tâm sự
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="track-card-controls-cluster">
                          {selectedTrackSeason === 'winter' && winterOfficialTracks.length > 1 && (
                            <button
                              type="button"
                              onClick={handlePrevWinterTrack}
                              className="track-nav-mini-btn"
                              title="Bài trước"
                              aria-label="Bài trước"
                            >
                              ⏮
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleTogglePlayRecording}
                            className={`track-play-btn ${isEffectivePlaying ? 'is-playing-btn' : ''}`}
                            title={isEffectivePlaying ? 'Tạm dừng bản nhạc (Pause)' : 'Phát bản nhạc mùa này (Play)'}
                            aria-label={isEffectivePlaying ? 'Tạm dừng' : 'Phát'}
                          >
                            {isEffectivePlaying ? (
                              <i className="fa-solid fa-pause" style={{ fontSize: '0.92rem' }}></i>
                            ) : (
                              <i className="fa-solid fa-play" style={{ marginLeft: '2px', fontSize: '0.88rem' }}></i>
                            )}
                          </button>
                          {selectedTrackSeason === 'winter' && winterOfficialTracks.length > 1 && (
                            <button
                              type="button"
                              onClick={handleNextWinterTrack}
                              className="track-nav-mini-btn"
                              title="Bài tiếp theo"
                              aria-label="Bài tiếp theo"
                            >
                              ⏭
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mini Scrubber & Volume Suite (Hạng mục 2: Tinh gọn, thẩm mỹ) */}
                      {currentTrackMeta.hasUserAudio && (
                        <div className="ambient-mini-player-suite">
                          {/* Dải Sóng Âm Phổ Tần Số Web Audio API Trực Tiếp */}
                          <div
                            className="ambient-mini-spectrum-row"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '2px 4px 6px 4px',
                            }}
                          >
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.5px' }}>
                              AUDIO SPECTRUM
                            </span>
                            <HeaderAudioVisualizer
                              audioRef={recordingAudioRef}
                              isPlaying={isEffectivePlaying}
                              barCount={16}
                              height={16}
                              barWidth={2.5}
                              barGap={2}
                              activeColor="#38bdf8"
                              idleColor="rgba(255, 255, 255, 0.15)"
                            />
                            <span style={{ fontSize: '0.68rem', color: isEffectivePlaying ? '#4ade80' : '#94a3b8', fontWeight: 700 }}>
                              {isEffectivePlaying ? 'LIVE ●' : 'PAUSED'}
                            </span>
                          </div>

                          {/* Dòng 1: Mini Scrubber (mm:ss hiện tại / slider / mm:ss tổng) */}
                          <div className="ambient-mini-scrubber-row">
                            <span className="mini-scrubber-time">{formatRecordingTime(recordingCurrentTime)}</span>
                            <div className="mini-scrubber-bar-wrap">
                              <input
                                type="range"
                                min={0}
                                max={recordingDuration || 100}
                                step={0.5}
                                value={recordingCurrentTime}
                                onClick={(e) => e.stopPropagation()}
                                onChange={handleRecordingSeek}
                                className="mini-scrubber-input"
                                aria-label="Tua thời lượng bản thu"
                              />
                              <div
                                className="mini-scrubber-fill"
                                style={{
                                  width: `${recordingDuration > 0 ? (recordingCurrentTime / recordingDuration) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="mini-scrubber-time total">{formatRecordingTime(recordingDuration)}</span>
                          </div>

                          {/* Dòng 2: Thanh âm lượng gọn gàng */}
                          <div className="ambient-mini-volume-row">
                            <button
                              type="button"
                              className="mini-volume-mute-btn"
                              onClick={handleToggleRecordingMute}
                              title={isRecordingMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                            >
                              <i
                                className={`fa-solid ${
                                  isRecordingMuted || recordingVolume === 0
                                    ? 'fa-volume-xmark'
                                    : recordingVolume < 0.5
                                    ? 'fa-volume-low'
                                    : 'fa-volume-high'
                                }`}
                              ></i>
                            </button>
                            <div className="mini-volume-slider-wrap">
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.02}
                                value={isRecordingMuted ? 0 : recordingVolume}
                                onClick={(e) => e.stopPropagation()}
                                onChange={handleRecordingVolumeChange}
                                className="mini-volume-slider-input"
                                aria-label="Chỉnh âm lượng bản thu"
                              />
                              <div
                                className="mini-volume-slider-fill"
                                style={{ width: `${(isRecordingMuted ? 0 : recordingVolume) * 100}%` }}
                              />
                            </div>
                            <span className="mini-volume-val-text">
                              {isRecordingMuted ? '0%' : `${Math.round(recordingVolume * 100)}%`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Danh Sách Bản Thu Âm Mùa Đông Chính Thức Từ playlists.js */}
                    {selectedTrackSeason === 'winter' && (
                      <div className="ambient-winter-tracklist">
                        <div className="ambient-winter-track-head">
                          <span className="ambient-winter-track-badge">
                            ❄️ Danh Sách Bản Thu Mùa Đông ({winterOfficialTracks.length} bài)
                          </span>
                          <button
                            type="button"
                            onClick={handleToggleAutoNext}
                            className={`ambient-auto-next-toggle ${isAutoNext ? 'is-active' : ''}`}
                            title={isAutoNext ? 'Tự động chuyển bài: Đang BẬT (Hết bài tự chuyển sang bài kế tiếp). Bấm để tắt.' : 'Tự động chuyển bài: Đang TẮT (Hết bài sẽ dừng lại). Bấm để bật.'}
                            aria-label={isAutoNext ? 'Tự động chuyển bài đang Bật' : 'Tự động chuyển bài đang Tắt'}
                          >
                            <span className="auto-next-indicator">
                              <i className={`fa-solid ${isAutoNext ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                            </span>
                            <span className="auto-next-text">Tự chuyển bài: <strong>{isAutoNext ? 'Bật' : 'Tắt'}</strong></span>
                          </button>
                        </div>

                        {winterOfficialTracks.map((trk, idx) => {
                          const isThisTrackActive = selectedTrackSeason === 'winter' && winterTrackIndex === idx;
                          const isThisTrackPlaying = isThisTrackActive && isEffectivePlaying;

                          return (
                            <div
                              key={trk.id || idx}
                              onClick={() => handlePlayWinterTrack(idx)}
                              className={`ambient-winter-track-row ${isThisTrackActive ? 'is-active' : ''}`}
                              title={`Bấm để nghe: ${trk.title}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                <span className="track-row-index">
                                  {isThisTrackPlaying ? '♫' : (idx + 1)}
                                </span>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div className="track-row-title">
                                    {trk.title}
                                  </div>
                                  <div className="track-row-mood">
                                    {trk.mood || trk.badge || 'HQ WAV'}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayWinterTrack(idx);
                                }}
                                className={`track-row-play-btn ${isThisTrackPlaying ? 'is-active-btn' : ''}`}
                                title={isThisTrackPlaying ? 'Tạm dừng (Pause)' : 'Phát bài này (Play)'}
                                aria-label={isThisTrackPlaying ? 'Tạm dừng' : 'Phát'}
                              >
                                {isThisTrackPlaying ? (
                                  <i className="fa-solid fa-pause" style={{ fontSize: '0.68rem' }}></i>
                                ) : (
                                  <i className="fa-solid fa-play" style={{ marginLeft: '1px', fontSize: '0.68rem' }}></i>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Nút Tải Lên / Gửi File Thu Âm (Cho các mùa khác) */}
                    {selectedTrackSeason !== 'winter' && (
                      <>
                        <div className="ambient-upload-action-row">
                          <input
                            type="file"
                            ref={recordingFileInputRef}
                            accept="audio/*,.mp4"
                            style={{ display: 'none' }}
                            onChange={handleUploadCustomRecording}
                          />
                          <button
                            type="button"
                            className="ambient-upload-btn"
                            onClick={() => recordingFileInputRef.current?.click()}
                            title="Chọn file thu âm của bạn từ máy tính để phát cho mùa này"
                          >
                            <span className="upload-btn-icon">📂</span>
                            <span>Tải lên bản thu cho {currentTrackMeta.name}</span>
                          </button>
                        </div>

                        <div className="ambient-recording-note">
                          🎙️ <em>Bạn cứ gửi file thu âm qua chat cho tui, tui sẽ gắn chuẩn vào từng mùa nhé!</em>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Ghi chú Audio Ducking */}
                  <div className="ambient-ducking-tip">
                    💡 <em>Khi bạn mở nhạc cá nhân, âm thanh môi trường sẽ tự động chìm nhẹ để nhường chỗ cho bài hát!</em>
                  </div>

                  {/* Link Spotlight Không Gian Nhạc Mùa Đông */}
                  <Link
                    to="/music/winter"
                    className="ambient-lounge-spotlight-btn"
                    onClick={() => {
                      playClickSound();
                      setIsAmbientMenuOpen(false);
                    }}
                    title="Mở Không Gian Nhạc Mùa Đông (Winter Chill Lounge)"
                  >
                    <span>❄️ Không Gian Nhạc Mùa Đông (Chill Lounge)</span>
                    <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.75rem' }}></i>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Cụm Giữa Hàng 1: Thanh Tìm Kiếm Thông Minh & Khẩu Hiệu (Lấp đầy khoảng trống trung tâm) */}
          <div className="header-top-center">
            <div ref={searchContainerRef} className="header-search-wrapper">
              <form className="header-search-form" onSubmit={handleSearchSubmit}>
                {/* Nút Tìm Kiếm (Kính lúp tương tác có thể click trực tiếp) */}
                <button
                  type="submit"
                  className="header-search-icon-btn"
                  title="Bấm để tìm kiếm tâm sự"
                  aria-label="Tìm kiếm"
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                </button>

                <input
                  type="text"
                  placeholder="Tìm kiếm tâm sự, lời khuyên, bài viết..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSearchFocused(false);
                  }}
                  className="header-search-input"
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="header-search-clear"
                    onClick={() => {
                      setSearchTerm('');
                      navigate('/');
                    }}
                    title="Xóa từ khóa"
                    aria-label="Xóa từ khóa"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}

                {/* Nút Tìm Kiếm Nổi Bật (Primary Action Search Button) */}
                <button
                  type="submit"
                  className={`header-search-submit-btn ${searchTerm.trim() ? 'is-active' : ''}`}
                  title="Tìm kiếm ngay"
                >
                  <span>Tìm</span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.65rem' }}></i>
                </button>
              </form>

              {/* Hộp Gợi Ý Tìm Kiếm Trực Tiếp (Live Search Suggestions Dropdown) */}
              {isSearchFocused && searchTerm.trim().length >= 2 && (
                <div className="header-search-dropdown">
                  <div className="header-search-dropdown-header">
                    <span>
                      <i className="fa-solid fa-bolt" style={{ color: '#facc15', marginRight: '6px' }}></i>
                      {isSearchingLive ? 'Đang tìm kiếm bài viết...' : 'Kết quả gợi ý nhanh:'}
                    </span>
                    <span className="search-hint-esc">Esc để đóng</span>
                  </div>

                  {liveResults.length > 0 ? (
                    <div className="header-search-results-list">
                      {liveResults.map((p) => (
                        <div
                          key={p._id || p.slug}
                          className="header-search-result-item"
                          onClick={() => {
                            playClickSound();
                            navigate(`/posts/${p.slug}`);
                            setIsSearchFocused(false);
                          }}
                        >
                          <div className="search-result-icon">
                            <span>{p.category?.icon || '📝'}</span>
                          </div>
                          <div className="search-result-info">
                            <strong className="search-result-title">{p.title}</strong>
                            <div className="search-result-meta">
                              <span className="search-result-cat">{p.category?.name || 'Tâm sự'}</span>
                              <span>•</span>
                              <span>{p.author || 'Tác giả'}</span>
                              {p.views > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{p.views} lượt xem</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Nút Xem Tất Cả Kết Quả */}
                      <button
                        type="button"
                        className="header-search-view-all-btn"
                        onClick={handleSearchSubmit}
                      >
                        <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '6px' }}></i>
                        Xem toàn bộ kết quả cho "{searchTerm.trim()}"
                      </button>
                    </div>
                  ) : !isSearchingLive ? (
                    <div className="header-search-empty">
                      <span>Không tìm thấy bài viết nào khớp với "{searchTerm.trim()}"</span>
                      <button
                        type="button"
                        className="header-search-try-all"
                        onClick={handleSearchSubmit}
                      >
                        Tìm kiếm trên toàn bộ hệ thống &rarr;
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="header-daily-quote-pill" title="Slogan truyền động lực cộng đồng Freedom">
              <span className="quote-sparkle" style={{ color: 'var(--pastel-amber)' }}>
                <i className="fa-solid fa-feather-pointed"></i>
              </span>
              <span className="quote-text">Chậm lại để nghỉ ngơi, đừng dừng lại!</span>
            </div>
          </div>

          {/* User Profile / Admin / Auth actions (Cực kỳ thoáng đãng ở góc phải hàng 1) */}
          <div className="header-user-wrap">
            {(isAuthenticated || !!user) ? (
              <div className="header-user-badge">
                {/* Chuông Thông Báo (Lời mời kết bạn, tin nhắn, tương tác bài viết) */}
                <div className="header-notif-bell-container" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`header-notif-bell-btn ${isNotifOpen ? 'active' : ''}`}
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    title={notifUnreadCount > 0 ? `Bạn có ${notifUnreadCount} thông báo mới (Lời mời kết bạn, tin nhắn, tương tác)` : 'Thông báo hệ thống (Lời mời kết bạn, tin nhắn, tương tác)'}
                  >
                    <span className="bell-icon" style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔔</span>
                    {notifUnreadCount > 0 && (
                      <span className="header-notif-badge">
                        {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                      </span>
                    )}
                  </button>

                  <NotificationDropdown
                    isOpen={isNotifOpen}
                    onClose={() => setIsNotifOpen(false)}
                    unreadCount={notifUnreadCount}
                    onUnreadChange={setNotifUnreadCount}
                  />
                </div>

                <Link
                  to={`/profile/${user?._id}`}
                  className="header-profile-click"
                  title={`Xem hồ sơ cá nhân: ${user?.name}`}
                >
                  <img
                    src={
                      user?.avatar && !user?.avatar.includes('google_avatar') && !user?.avatar.includes('man.jpg')
                        ? user.avatar
                        : ((user?.role === 'admin' || user?.email === 'anthonyq012025@gmail.com')
                            ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg'
                            : DEFAULT_EMPTY_AVATAR)
                    }
                    alt={user?.name}
                    onError={(e) => {
                      e.target.src = (user?.role === 'admin' || user?.email === 'anthonyq012025@gmail.com')
                        ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg'
                        : DEFAULT_EMPTY_AVATAR;
                    }}
                    className="header-avatar"
                  />
                  <span className="header-username-text">
                    {user?.name?.split('(')[0]?.trim() || user?.name}
                  </span>
                  {user?.role === 'admin' && (
                    <span className="admin-badge-tag">ADMIN</span>
                  )}
                </Link>

                {/* Nút Cài đặt tài khoản & hồ sơ */}
                <button
                  type="button"
                  className="header-account-btn"
                  onClick={openProfileModal}
                  title="Cài đặt thông tin tài khoản, giao diện & nhạc nền"
                >
                  <span className="btn-icon">
                    <i className="fa-solid fa-gear"></i>
                  </span>
                  <span>Cài đặt</span>
                </button>

                {/* Nút Quản lý Lễ Hội (Chỉ Admin) */}
                {user?.role === 'admin' && !activeFestiveEvent && (
                  <button
                    type="button"
                    className="header-festive-btn"
                    onClick={() => setIsEventManagerOpen(true)}
                    title="Quản lý sự kiện lễ hội trong năm (30/4, 2/9, 8/3, 1/6, Tết...)"
                    style={{ padding: '5px 8px', minWidth: '32px' }}
                  >
                    <span className="btn-icon">🎊</span>
                  </button>
                )}

                {/* Nút Đăng xuất an toàn */}
                <button
                  type="button"
                  className="header-logout-btn"
                  onClick={() => {
                    playClickSound();
                    setIsLogoutConfirmOpen(true);
                  }}
                  title="Đăng xuất khỏi tài khoản"
                >
                  <span className="btn-icon">
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                  </span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="header-guest-btns">
                <button
                  type="button"
                  className="nav-btn-login"
                  onClick={openLoginModal}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  className="nav-btn-register"
                  onClick={openRegisterModal}
                >
                  Đăng Ký
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            HÀNG 2: DEDICATED DASHBOARD NAVIGATION BAR (THANH DASHBOARD 3D RIÊNG)
            4 Dashboard chính + Trạm xả stress với hiệu ứng bóng mờ & 3D nổi khối
           ======================================================== */}
        <nav className="header-dashboard-bar" aria-label="Dashboard Navigation">
          <div className="dashboard-bar-container">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `dashboard-3d-item tab-home ${isActive ? 'active' : ''}`}
              title="Dashboard: Trang Chủ Tổng Hợp"
            >
              <span className="healing-icon-pill healing-icon-sage" style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-house"></i>
              </span>
              <span className="item-label">Trang Chủ</span>
            </NavLink>

            <NavLink
              to="/category/ap-luc-kiet-suc-burnout"
              className={({ isActive }) => `dashboard-3d-item tab-burnout ${isActive ? 'active' : ''}`}
              title="Dashboard: Áp Lực & Kiệt Sức (Burnout)"
            >
              <span className="healing-icon-pill healing-icon-rose" style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-heart-pulse"></i>
              </span>
              <span className="item-label">Burnout</span>
            </NavLink>

            <NavLink
              to="/category/chuyen-nganh-bat-dau-lai-restart"
              className={({ isActive }) => `dashboard-3d-item tab-restart ${isActive ? 'active' : ''}`}
              title="Dashboard: Chuyển Ngành & Bắt Đầu Lại (Restart)"
            >
              <span className="healing-icon-pill healing-icon-sage" style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-seedling"></i>
              </span>
              <span className="item-label">Bắt Đầu Lại</span>
            </NavLink>

            <NavLink
              to="/category/nhung-tia-sang-dong-luc-small-wins"
              className={({ isActive }) => `dashboard-3d-item tab-wins ${isActive ? 'active' : ''}`}
              title="Dashboard: Những Tia Sáng & Động Lực (Small Wins)"
            >
              <span className="healing-icon-pill healing-icon-amber" style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-sun"></i>
              </span>
              <span className="item-label">Small Wins</span>
            </NavLink>

            {/* Tab Không Gian Nhạc & Playlist Đa Mùa */}
            <NavLink
              to="/music"
              className={({ isActive }) => `dashboard-3d-item tab-music ${isActive ? 'active' : ''}`}
              title="Dashboard: Không Gian Nhạc & Playlist Mùa Đông (Winter Chill)"
            >
              <span className="healing-icon-pill healing-icon-cyan" style={{ width: '28px', height: '28px', fontSize: '0.82rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <i className="fa-solid fa-compact-disc"></i>
              </span>
              <span className="item-label">Góc Nhạc</span>
            </NavLink>

            {/* Cụm Trạm Chữa Lành Dropdown - Gom gọn 12 công cụ xả áp lực & chăm sóc tâm lý */}
            <div className="header-wellness-dropdown-wrapper" ref={wellnessDropdownRef}>
              <button
                type="button"
                className={`dashboard-3d-item tab-wellness-hub ${isWellnessDropdownOpen || isWellnessOpen || isTimeCapsuleOpen || isRadioOpen || isGratitudeJarOpen || isStickyWallOpen || isEmergencyCalmOpen || isCozyCafeOpen || isMoodPixelOpen || isRantAndBurnOpen || isDriftBottleOpen || isMoodRadarOpen || isWhisperWallOpen || isMentalFirstAidOpen || isTeaLoungeOpen || isDeclutterOpen || isMoodWeatherOpen || isFocusCocoonOpen ? 'active' : ''}`}
                onClick={() => {
                  playClickSound();
                  setIsWellnessDropdownOpen((prev) => !prev);
                }}
                title="Trạm Chữa Lành & Chăm Sóc Tâm Trí: Bấm để mở bảng 17 công cụ xả áp lực"
                aria-expanded={isWellnessDropdownOpen}
              >
                <span className="healing-icon-pill healing-icon-sage" style={{ width: '28px', height: '28px', fontSize: '0.85rem' }}>
                  🌿
                </span>
                <span className="item-label">Trạm Chữa Lành</span>
                <span className="wellness-hub-badge">17</span>
                <i
                  className={`fa-solid fa-chevron-${isWellnessDropdownOpen ? 'up' : 'down'}`}
                  style={{ fontSize: '0.68rem', opacity: 0.8, marginLeft: '2px', transition: 'transform 0.2s' }}
                ></i>
              </button>

              {/* Bảng Mega-Dropdown Danh Sách Công Cụ Chữa Lành Đã Phân Mục Rõ Ràng */}
              {isWellnessDropdownOpen && (() => {
                const WELLNESS_TOOLS = [
                  // NHÓM 1: XẢ STRESS & CỨU TRỢ (vent)
                  {
                    id: 'burn',
                    category: 'vent',
                    title: 'Lò Đốt Muộn Phiền',
                    desc: 'Gõ hết ức chế & thiêu rụi thành tro bụi vĩnh viễn',
                    icon: '🔥',
                    iconBg: 'rgba(234, 88, 12, 0.22)',
                    iconColor: '#ea580c',
                    tag: 'Hot 🔥',
                    tagBg: '#ea580c',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.12) 0%, rgba(153, 27, 27, 0.08) 100%)',
                      border: '1.5px solid rgba(249, 115, 22, 0.5)',
                    },
                    action: () => setIsRantAndBurnOpen(true),
                  },
                  {
                    id: 'radar',
                    category: 'vent',
                    title: 'Radar Cảm Xúc Công Sở',
                    desc: '1 chạm đo nhiệt độ deadline, cà phê & trút giận ẩn danh',
                    icon: '📡',
                    iconBg: 'rgba(16, 185, 129, 0.22)',
                    iconColor: '#10b981',
                    tag: '1-Tap Pulse',
                    tagBg: '#059669',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.1) 100%)',
                      border: '1.5px solid rgba(16, 185, 129, 0.45)',
                    },
                    action: () => setIsMoodRadarOpen(true),
                  },
                  {
                    id: 'stress',
                    category: 'vent',
                    title: 'Xả Áp Lực & Đập Đĩa',
                    desc: 'Phòng đập phá ảo, máy xé giấy & nhịp thở 4-7-8',
                    icon: '💥',
                    iconBg: 'rgba(239, 68, 68, 0.15)',
                    iconColor: '#ef4444',
                    tag: 'Giải tỏa',
                    tagBg: 'rgba(239, 68, 68, 0.2)',
                    tagColor: '#ef4444',
                    action: () => setIsWellnessOpen(true),
                  },
                  {
                    id: 'emergency',
                    category: 'vent',
                    title: 'Cứu Trợ Định Tâm (SOS)',
                    desc: 'Bài tập nối đất 5-4-3-2-1 cắt cơn hoảng loạn tức thì',
                    icon: '🆘',
                    iconBg: 'rgba(220, 38, 38, 0.2)',
                    iconColor: '#dc2626',
                    tag: 'Khẩn cấp',
                    tagBg: 'rgba(220, 38, 38, 0.25)',
                    tagColor: '#ef4444',
                    action: () => setIsEmergencyCalmOpen(true),
                  },
                  {
                    id: 'firstaid',
                    category: 'vent',
                    title: 'Thuốc Cứu Thương Tâm Trí',
                    desc: 'Toa thuốc tâm lý cho sếp mắng, deadline & kiệt sức',
                    icon: '💊',
                    iconBg: 'rgba(236, 72, 153, 0.22)',
                    iconColor: '#ec4899',
                    tag: 'Cấp cứu',
                    tagBg: '#db2777',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(131, 24, 67, 0.08) 100%)',
                      border: '1.5px solid rgba(236, 72, 153, 0.5)',
                    },
                    action: () => setIsMentalFirstAidOpen(true),
                  },
                  {
                    id: 'declutter',
                    category: 'vent',
                    title: 'Bàn Tháo Gỡ Cuộn Rối',
                    desc: 'Brain dump xả hết âu lo, phân loại & thả bay mất',
                    icon: '🧶',
                    iconBg: 'rgba(139, 92, 246, 0.22)',
                    iconColor: '#8b5cf6',
                    tag: 'Gỡ rối',
                    tagBg: '#7c3aed',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(76, 29, 149, 0.08) 100%)',
                      border: '1.5px solid rgba(139, 92, 246, 0.5)',
                    },
                    action: () => setIsDeclutterOpen(true),
                  },

                  // NHÓM 2: THƯ GIÃN & ĐÊM MUỘN (cozy)
                  {
                    id: 'cafe',
                    category: 'cozy',
                    title: 'Tiệm Cà Phê Mưa',
                    desc: 'Pomodoro 25/5 & bản phối mưa rơi, lò sưởi ấm áp',
                    icon: '☕',
                    iconBg: 'rgba(217, 119, 6, 0.2)',
                    iconColor: '#d97706',
                    tag: 'Tập trung',
                    tagBg: 'rgba(217, 119, 6, 0.25)',
                    tagColor: '#d97706',
                    action: () => setIsCozyCafeOpen(true),
                  },
                  {
                    id: 'radio',
                    category: 'cozy',
                    title: 'Trạm Radio Đêm Muộn',
                    desc: 'Giai điệu Lo-Fi Jazz & hòm thư thì thầm ẩn danh',
                    icon: '📻',
                    iconBg: 'rgba(244, 63, 94, 0.15)',
                    iconColor: '#f43f5e',
                    tag: '24/7',
                    tagBg: 'rgba(244, 63, 94, 0.25)',
                    tagColor: '#f43f5e',
                    action: () => setIsRadioOpen(true),
                  },
                  {
                    id: 'drift',
                    category: 'cozy',
                    title: 'Chai Thư Nửa Đêm',
                    desc: 'Gõ máy đánh chữ cơ ASMR & thả trôi dòng sông đêm',
                    icon: '🌊',
                    iconBg: 'rgba(56, 189, 248, 0.22)',
                    iconColor: '#38bdf8',
                    tag: 'Thơ mộng',
                    tagBg: '#0284c7',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(30, 58, 138, 0.1) 100%)',
                      border: '1.5px solid rgba(56, 189, 248, 0.45)',
                    },
                    action: () => setIsDriftBottleOpen(true),
                  },
                  {
                    id: 'tealounge',
                    category: 'cozy',
                    title: 'Quán Trà Nửa Đêm',
                    desc: 'Cùng thức bên khung cửa sổ mưa đêm & rót trà ấm',
                    icon: '🍵',
                    iconBg: 'rgba(217, 119, 6, 0.22)',
                    iconColor: '#d97706',
                    tag: 'Cùng thức',
                    tagBg: '#b45309',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(120, 53, 15, 0.08) 100%)',
                      border: '1.5px solid rgba(217, 119, 6, 0.5)',
                    },
                    action: () => setIsTeaLoungeOpen(true),
                  },
                  {
                    id: 'cocoon',
                    category: 'cozy',
                    title: 'Kén Tập Trung & Ngủ Sâu',
                    desc: 'Pomodoro 25p sóng Alpha 10Hz, hẹn giờ tắt & ươm mầm',
                    icon: '🎧',
                    iconBg: 'rgba(20, 184, 166, 0.22)',
                    iconColor: '#14b8a6',
                    tag: 'Zen Flow',
                    tagBg: '#0f766e',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.12) 0%, rgba(19, 78, 74, 0.08) 100%)',
                      border: '1.5px solid rgba(20, 184, 166, 0.5)',
                    },
                    action: () => setIsFocusCocoonOpen(true),
                  },

                  // NHÓM 3: CHỮA LÀNH & GỬI GẮM (heal)
                  {
                    id: 'whisper',
                    category: 'heal',
                    title: 'Thì Thầm & Voice Hugs',
                    desc: 'Thu âm 10s gửi cái ôm âm thanh ấm áp lúc nửa đêm',
                    icon: '🎙️',
                    iconBg: 'rgba(236, 72, 153, 0.22)',
                    iconColor: '#ec4899',
                    tag: 'Voice Hugs',
                    tagBg: '#db2777',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(131, 24, 67, 0.1) 100%)',
                      border: '1.5px solid rgba(236, 72, 153, 0.45)',
                    },
                    action: () => setIsWhisperWallOpen(true),
                  },
                  {
                    id: 'capsule',
                    category: 'heal',
                    title: 'Chiếc Hộp Thời Gian',
                    desc: 'Viết thư gửi tương lai, tem cổ điển & niêm phong sáp 3D',
                    icon: '📜',
                    iconBg: 'rgba(245, 158, 11, 0.18)',
                    iconColor: '#f59e0b',
                    tag: 'Tương lai',
                    tagBg: 'rgba(245, 158, 11, 0.25)',
                    tagColor: '#f59e0b',
                    action: () => setIsTimeCapsuleOpen(true),
                  },
                  {
                    id: 'sticky',
                    category: 'heal',
                    title: 'Bảng Giấy Nhớ Yêu Thương',
                    desc: 'Dán note dặn dò, trao gửi cái ôm ấm áp vô danh',
                    icon: '💌',
                    iconBg: 'rgba(234, 179, 8, 0.2)',
                    iconColor: '#eab308',
                    tag: 'Chia sẻ',
                    tagBg: 'rgba(234, 179, 8, 0.25)',
                    tagColor: '#eab308',
                    action: () => setIsStickyWallOpen(true),
                  },
                  {
                    id: 'gratitude',
                    category: 'heal',
                    title: 'Chiếc Lọ Biết Ơn',
                    desc: 'Gấp sao lưu giữ 3 điều may mắn, dễ thương hôm nay',
                    icon: '⭐',
                    iconBg: 'rgba(234, 179, 8, 0.18)',
                    iconColor: '#eab308',
                    tag: 'Tích cực',
                    tagBg: 'rgba(234, 179, 8, 0.25)',
                    tagColor: '#eab308',
                    action: () => setIsGratitudeJarOpen(true),
                  },
                  {
                    id: 'pixel',
                    category: 'heal',
                    title: 'Nhật Ký Cảm Xúc 365 Ngày',
                    desc: 'Tô màu từng ô pixel theo biểu đồ tâm trạng cả năm',
                    icon: '🗓️',
                    iconBg: 'rgba(99, 102, 241, 0.18)',
                    iconColor: '#6366f1',
                    tag: 'Pixel',
                    tagBg: 'rgba(99, 102, 241, 0.25)',
                    tagColor: '#6366f1',
                    action: () => setIsMoodPixelOpen(true),
                  },
                  {
                    id: 'weather',
                    category: 'heal',
                    title: 'Thời Tiết Nội Tâm',
                    desc: 'Check-in cảm xúc đầu ngày, nhận dự báo & toa đồ uống',
                    icon: '⛅',
                    iconBg: 'rgba(56, 189, 248, 0.22)',
                    iconColor: '#38bdf8',
                    tag: 'Daily Mood',
                    tagBg: '#0284c7',
                    tagColor: '#ffffff',
                    cardStyle: {
                      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(12, 74, 110, 0.08) 100%)',
                      border: '1.5px solid rgba(56, 189, 248, 0.5)',
                    },
                    action: () => setIsMoodWeatherOpen(true),
                  },
                ];

                const currentTab = wellnessCategoryTab || 'vent';
                const filteredTools = WELLNESS_TOOLS.filter((t) => t.category === currentTab);

                return (
                  <div className="wellness-hub-mega-dropdown">
                    {/* Header Dropdown */}
                    <div className="wellness-hub-header">
                      <div className="hub-title-row">
                        <span className="hub-header-icon">🌿</span>
                        <div>
                          <h4 className="hub-title">Trạm Chữa Lành &amp; Không Gian Tâm Lý</h4>
                          <p className="hub-subtitle">
                            Chọn phân loại bạn cần — Gọn gàng, vừa vặn &amp; không còn phải cuộn tìm kiếm
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Thanh Tabs Phân Loại Danh Mục (Đã bỏ tab Tất Cả gôm chung) */}
                    <div className="wellness-hub-tabs">
                      <button
                        type="button"
                        className={`wellness-tab-pill ${currentTab === 'vent' ? 'active' : ''}`}
                        onClick={() => {
                          playClickSound();
                          setWellnessCategoryTab('vent');
                        }}
                      >
                        <span>🔥</span>
                        <span>Xả Stress &amp; SOS ({WELLNESS_TOOLS.filter((t) => t.category === 'vent').length})</span>
                      </button>

                      <button
                        type="button"
                        className={`wellness-tab-pill ${currentTab === 'cozy' ? 'active' : ''}`}
                        onClick={() => {
                          playClickSound();
                          setWellnessCategoryTab('cozy');
                        }}
                      >
                        <span>☕</span>
                        <span>Thư Giãn &amp; Đêm Muộn ({WELLNESS_TOOLS.filter((t) => t.category === 'cozy').length})</span>
                      </button>

                      <button
                        type="button"
                        className={`wellness-tab-pill ${currentTab === 'heal' ? 'active' : ''}`}
                        onClick={() => {
                          playClickSound();
                          setWellnessCategoryTab('heal');
                        }}
                      >
                        <span>💌</span>
                        <span>Chữa Lành &amp; Gửi Gắm ({WELLNESS_TOOLS.filter((t) => t.category === 'heal').length})</span>
                      </button>
                    </div>

                    {/* Lưới Danh Sách Các Thẻ Công Cụ - Rộng rãi & Tiêu Đề Rõ Ràng */}
                    <div className="wellness-hub-grid">
                      {filteredTools.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          className={`wellness-hub-card card-${tool.id}`}
                          onClick={() => {
                            playClickSound();
                            setIsWellnessDropdownOpen(false);
                            tool.action();
                          }}
                          title={`Mở ${tool.title}: ${tool.desc}`}
                          style={tool.cardStyle || {}}
                        >
                          <div className="hub-card-icon-wrap" style={{ background: tool.iconBg, color: tool.iconColor }}>
                            {tool.icon}
                          </div>
                          <div className="hub-card-text">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span className="hub-card-title">{tool.title}</span>
                              {tool.tag && (
                                <span
                                  className="hub-card-tag"
                                  style={{
                                    background: tool.tagBg,
                                    color: tool.tagColor,
                                  }}
                                >
                                  {tool.tag}
                                </span>
                              )}
                            </div>
                            <span className="hub-card-desc">{tool.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="wellness-hub-footer">
                      <span>💡 <em>Mỗi ngày dành 5 phút chăm sóc sức khỏe tinh thần bạn nhé!</em></span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </nav>
      </header>

      {/* Auth Modal (Login / Register Popup) */}
      {isAuthModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AuthModal />
        </Suspense>
      )}

      {/* Create Post Modal */}
      {isCreateOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <CreatePostModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onPostCreated={handlePostCreated}
          />
        </Suspense>
      )}

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <EditProfileModal
            isOpen={isProfileModalOpen}
            onClose={closeProfileModal}
          />
        </Suspense>
      )}

      {/* Admin Moderation Modal (Kiểm duyệt bài viết nhạy cảm Chính Trị) */}
      {user?.role === 'admin' && isModerationOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AdminModerationModal
            isOpen={isModerationOpen}
            onClose={() => setIsModerationOpen(false)}
          />
        </Suspense>
      )}

      {/* Festive Showcase Modal (Không gian chào mừng sự kiện 30/4, 2/9, 8/3 với đồ họa bay dẻo dẻo) */}
      {isShowcaseModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <FestiveShowcaseModal
            isOpen={isShowcaseModalOpen}
            onClose={() => setIsShowcaseModalOpen(false)}
            event={activeFestiveEvent}
            onOpenAdminManager={() => setIsEventManagerOpen(true)}
            user={user}
          />
        </Suspense>
      )}

      {/* Admin Festive Event Manager Modal (Quản lý các sự kiện lễ hội 30/4, 2/9, 8/3, 1/6, Tết...) */}
      {user?.role === 'admin' && isEventManagerOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <FestiveEventManagerModal
            isOpen={isEventManagerOpen}
            onClose={() => setIsEventManagerOpen(false)}
            onEventUpdated={fetchFestiveEvent}
          />
        </Suspense>
      )}

      {/* Trạm Xả Stress & Máy Xé Giấy Deadline & Bài Tập Thở 4-7-8 */}
      {isWellnessOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StressReliefModal
            isOpen={isWellnessOpen}
            onClose={() => setIsWellnessOpen(false)}
          />
        </Suspense>
      )}

      {/* Chiếc Hộp Thời Gian (Capsule of Tomorrow) */}
      {isTimeCapsuleOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TimeCapsuleModal
            isOpen={isTimeCapsuleOpen}
            onClose={() => setIsTimeCapsuleOpen(false)}
          />
        </Suspense>
      )}

      {/* Trạm Radio Đêm Muộn Lo-Fi 24/7 (Late Night Lo-Fi Room) */}
      {hasLoadedRadio && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <LateNightRadioModal
            isOpen={isRadioOpen}
            onClose={() => setIsRadioOpen(false)}
          />
        </Suspense>
      )}

      {/* Chiếc Lọ Biết Ơn Cuối Ngày (Daily Gratitude Jar) */}
      {isGratitudeJarOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <GratitudeJarModal
            isOpen={isGratitudeJarOpen}
            onClose={() => setIsGratitudeJarOpen(false)}
          />
        </Suspense>
      )}

      {/* Trạm Gửi Gắm Yêu Thương Ẩn Danh (The Sticky-Note Wall) */}
      {isStickyWallOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <StickyNoteWallModal
            isOpen={isStickyWallOpen}
            onClose={() => setIsStickyWallOpen(false)}
          />
        </Suspense>
      )}

      {/* Nút Cứu Trợ Khẩn Cấp "Cần Bình Tĩnh Ngay" (Grounding 5-4-3-2-1) */}
      {isEmergencyCalmOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <EmergencyCalmModal
            isOpen={isEmergencyCalmOpen}
            onClose={() => setIsEmergencyCalmOpen(false)}
          />
        </Suspense>
      )}

      {/* Tiệm Cà Phê Mưa & Pomodoro Tập Trung (Cozy Cafe & Rainy Desk) */}
      {isCozyCafeOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <CozyWorkCafeModal
            isOpen={isCozyCafeOpen}
            onClose={() => setIsCozyCafeOpen(false)}
          />
        </Suspense>
      )}

      {/* Nhật Ký Cảm Xúc 365 Ngày (Emotional Pixel Tracker) */}
      {isMoodPixelOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <MoodPixelTrackerModal
            isOpen={isMoodPixelOpen}
            onClose={() => setIsMoodPixelOpen(false)}
          />
        </Suspense>
      )}

      {/* Lò Đốt Muộn Phiền (Rant & Burn - Sọt rác cảm xúc kỹ thuật số) */}
      {isRantAndBurnOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <RantAndBurnModal
            isOpen={isRantAndBurnOpen}
            onClose={() => setIsRantAndBurnOpen(false)}
            onOpenCafe={() => setIsCozyCafeOpen(true)}
          />
        </Suspense>
      )}

      {/* Chiếc Máy Đánh Chữ Nửa Đêm & Chai Thư Trôi Sông */}
      {isDriftBottleOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <MidnightDriftBottleModal
            isOpen={isDriftBottleOpen}
            onClose={() => setIsDriftBottleOpen(false)}
          />
        </Suspense>
      )}

      {/* Radar Bản Đồ Cảm Xúc Công Sở Thời Gian Thực */}
      {isMoodRadarOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <WorkplaceMoodRadarModal
            isOpen={isMoodRadarOpen}
            onClose={() => setIsMoodRadarOpen(false)}
          />
        </Suspense>
      )}

      {/* Bức Tường Thì Thầm 10 Giây & Voice Hugs */}
      {isWhisperWallOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AnonymousWhisperWall
            isOpen={isWhisperWallOpen}
            onClose={() => setIsWhisperWallOpen(false)}
          />
        </Suspense>
      )}

      {/* Hộp Thuốc Cứu Thương Cho Tâm Trí */}
      {isMentalFirstAidOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <MentalFirstAidModal
            isOpen={isMentalFirstAidOpen}
            onClose={() => setIsMentalFirstAidOpen(false)}
          />
        </Suspense>
      )}

      {/* Quán Trà Nửa Đêm Ẩn Danh */}
      {isTeaLoungeOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <LateNightTeaLoungeModal
            isOpen={isTeaLoungeOpen}
            onClose={() => setIsTeaLoungeOpen(false)}
          />
        </Suspense>
      )}

      {/* Chiếc Bàn Tháo Gỡ Cuộn Rối */}
      {isDeclutterOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <BrainDumpDeclutterModal
            isOpen={isDeclutterOpen}
            onClose={() => setIsDeclutterOpen(false)}
          />
        </Suspense>
      )}

      {/* Bản Tin Thời Tiết Nội Tâm Đầu Ngày */}
      {isMoodWeatherOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <MoodWeatherForecastModal
            isOpen={isMoodWeatherOpen}
            onClose={() => setIsMoodWeatherOpen(false)}
          />
        </Suspense>
      )}

      {/* Kén Tập Trung & Ngủ Sâu */}
      {isFocusCocoonOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <FocusSleepCocoonModal
            isOpen={isFocusCocoonOpen}
            onClose={() => setIsFocusCocoonOpen(false)}
          />
        </Suspense>
      )}

      {/* Modal Bưu Thiếp Tâm Sự Sau Bản Thu Mùa Đông */}
      {isStoryModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TrackStoryModal
            isOpen={isStoryModalOpen}
            onClose={() => setIsStoryModalOpen(false)}
            track={winterOfficialTracks[winterTrackIndex] || winterOfficialTracks[0]}
          />
        </Suspense>
      )}

      {/* Modal Xác Nhận Đăng Xuất An Toàn & Tinh Tế (Thay thế hoàn toàn window.confirm) */}
      {isLogoutConfirmOpen && (
        <div
          className="modal-backdrop logout-confirm-backdrop"
          onClick={() => setIsLogoutConfirmOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="logout-confirm-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
              border: '1.5px solid rgba(248, 113, 113, 0.45)',
              borderRadius: '20px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(239, 68, 68, 0.25)',
              textAlign: 'center',
              animation: 'popupSlideUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.2)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '1.6rem',
              }}
            >
              👋
            </div>

            <h3
              style={{
                color: '#f8fafc',
                fontSize: '1.25rem',
                fontWeight: 800,
                marginBottom: '8px',
                fontFamily: 'var(--font-serif)',
              }}
            >
              Bạn muốn đăng xuất khỏi tài khoản?
            </h3>

            <p
              style={{
                color: '#cbd5e1',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                marginBottom: '22px',
              }}
            >
              You Can't Stop Here sẽ luôn ở đây chờ bạn quay lại bất cứ khi nào bạn cần một nơi yên bình để nghỉ chân và trút bỏ những áp lực cuộc sống.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                Ở lại cùng mọi người
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  logout();
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(239, 68, 68, 0.55)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.4)';
                }}
              >
                Đăng xuất an toàn
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
