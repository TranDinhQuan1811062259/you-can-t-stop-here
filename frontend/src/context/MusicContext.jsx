import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getPlaylistBySlug, getAllPlaylists, getTrackAudioSrc, FAVORITES_THEME_BASE } from '../data/playlists';
import { usePersonalHub } from './PersonalHubContext';
import {
  startWeatherAmbient,
  duckAmbientForMusic,
  restoreAmbientFromMusic,
  resumeAmbientAudioContext,
  startEventAmbient,
  stopEventAmbient,
  setMelodicSeason,
  setMasterMute,
} from '../utils/ambientSoundEngine';
import { hasUserInteracted, onFirstUserGesture } from '../utils/audio-gesture-guard';
import { audioCoordinator } from '../utils/audioCoordinator';

const MusicContext = createContext(null);

/**
 * Tiện ích toàn cục phát lệnh tạm dừng nhạc nền hệ thống khi có nguồn phát nhạc cá nhân bên ngoài
 */
export const pauseSystemMusic = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('freedom_pause_system_music'));
  }
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

export const MusicProvider = ({ children }) => {
  const [themeSlug, setThemeSlug] = useState('winter');

  const personalHub = usePersonalHub();
  const likedTracks = personalHub?.likedTracks || [];

  const allCatalogTracks = useMemo(() => {
    const playlists = getAllPlaylists();
    const catalog = [];
    playlists.forEach((p) => {
      (p.tracks || []).forEach((t, index) => {
        catalog.push({
          ...t,
          themeSlug: p.slug,
          themeName: p.name,
          themeIcon: p.icon,
          catalogIndex: index,
        });
      });
    });
    return catalog;
  }, []);

  const favoriteTracks = useMemo(() => {
    if (!Array.isArray(likedTracks) || likedTracks.length === 0) return [];
    return allCatalogTracks.filter((t) => likedTracks.includes(t.id));
  }, [allCatalogTracks, likedTracks]);

  const favoritesTheme = useMemo(
    () => ({
      ...FAVORITES_THEME_BASE,
      tracks: favoriteTracks,
    }),
    [favoriteTracks]
  );

  const allThemes = useMemo(() => {
    const standard = getAllPlaylists();
    return [...standard, favoritesTheme];
  }, [favoritesTheme]);

  const currentTheme = themeSlug === 'favorites' ? favoritesTheme : getPlaylistBySlug(themeSlug);
  const tracks = currentTheme?.tracks || [];

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [loopMode, setLoopMode] = useState('all'); // 'all' | 'one' | 'none'
  const [isShuffle, setIsShuffle] = useState(false);

  // Dual-Source: Studio WAV Master (Lossless Hi-Fi) vs Fast Stream (4G)
  const [isWavMaster, setIsWavMaster] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_audio_quality_wav');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  // Âm lượng lưu trong localStorage (mặc định 45%, phòng thủ dữ liệu hỏng / NaN)
  const [volume, setVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_music_player_volume');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (Number.isFinite(val)) {
          return Math.max(0, Math.min(1, val));
        }
      }
      return 0.45;
    } catch (_) {
      return 0.45;
    }
  });

  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(volume);
  const [musicToast, setMusicToast] = useState({
    visible: false,
    type: 'mute',
    message: '',
    kbd: 'M',
    icon: 'fa-volume-xmark',
  });
  const musicToastTimerRef = useRef(null);

  // Kích hoạt toast phản hồi thao tác phím tắt (chống kẹt / chồng chéo timer)
  const triggerMusicToast = useCallback(({ type, message, kbd, icon }) => {
    if (musicToastTimerRef.current) {
      clearTimeout(musicToastTimerRef.current);
    }
    setMusicToast({
      visible: true,
      type,
      message,
      kbd,
      icon,
    });
    musicToastTimerRef.current = setTimeout(() => {
      setMusicToast((prev) => ({ ...prev, visible: false }));
    }, 1500);
  }, []);

  // Dọn dẹp timer toast khi unmount
  useEffect(() => {
    return () => {
      if (musicToastTimerRef.current) {
        clearTimeout(musicToastTimerRef.current);
      }
    };
  }, []);

  // Quản lý 4 mùa của bản thu âm Header
  const [selectedTrackSeason, setSelectedTrackSeason] = useState('winter');
  const [seasonalTracks, setSeasonalTracks] = useState(() => {
    const defaultWinter = tracks[0] || {
      title: 'Winter Song 1 (Gió Bấc & Tĩnh Lặng)',
      artist: 'Freedom Studio 🎙️',
      src: '/audio/winter/winter-song-1.wav',
      mood: 'Tĩnh lặng • Sâu lắng',
    };

    const initial = {
      spring: {
        id: 'spring',
        seasonId: 'spring',
        name: 'Mùa Xuân',
        icon: '🌸',
        title: 'Thì Thầm Mầm Non & Nắng Ấm',
        artist: 'Chính chủ Freedom 🎙️',
        desc: 'Khúc giao mùa đâm chồi, chuông phong linh & hy vọng',
        url: '',
        hasUserAudio: false,
      },
      summer: {
        id: 'summer',
        seasonId: 'summer',
        name: 'Mùa Hạ',
        icon: '☀️',
        title: 'Bản Tình Ca Biển Chiều',
        artist: 'Chính chủ Freedom 🎙️',
        desc: 'Hợp âm hoàng hôn ấm áp & tiếng sóng biển rì rào',
        url: '',
        hasUserAudio: false,
      },
      autumn: {
        id: 'autumn',
        seasonId: 'autumn',
        name: 'Mùa Thu',
        icon: '🍁',
        title: 'Giai Điệu Lá Vàng Lắng Đọng',
        artist: 'Chính chủ Freedom 🎙️',
        desc: 'Khúc acoustic guitar hoài niệm & êm đềm',
        url: '',
        hasUserAudio: false,
      },
      winter: {
        id: 'winter',
        seasonId: 'winter',
        name: 'Mùa Đông',
        icon: '❄️',
        title: defaultWinter.title,
        artist: defaultWinter.artist,
        desc: defaultWinter.mood || 'Không gian tĩnh lặng, trầm ấm & hoài niệm',
        url: defaultWinter.src,
        hasUserAudio: true,
      },
    };

    try {
      const saved = localStorage.getItem('freedom_seasonal_recordings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.winter && parsed.winter.url && parsed.winter.url.includes('midnight-river-song')) {
          parsed.winter = initial.winter;
          localStorage.setItem('freedom_seasonal_recordings', JSON.stringify(parsed));
        }
        return { ...initial, ...parsed };
      }
    } catch (_) {}
    return initial;
  });

  const audioRef = useRef(null);
  const userExplicitPausedRef = useRef(false);
  const isSwitchingTrackRef = useRef(false);
  const waitingTimeoutRef = useRef(null);
  const ttsDuckFactorRef = useRef(1);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const applyEffectiveMusicVolume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const raw = isMutedRef.current ? 0 : volumeRef.current * ttsDuckFactorRef.current;
    audio.volume = Math.max(0, Math.min(1, raw));
  }, []);

  // Dọn dẹp tài nguyên âm thanh khi unmount Provider (Quy tắc 3 GEMINI.md)
  useEffect(() => {
    return () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
          audio.src = '';
          audio.load();
        } catch (_) {}
      }
    };
  }, []);

  const currentTrack = tracks && tracks.length > 0 ? tracks[currentTrackIndex] || tracks[0] : null;

  // Refs lưu giữ trạng thái mới nhất cho các callback sự kiện Audio (Tránh re-bind listener liên tục)
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const currentTrackIndexRef = useRef(currentTrackIndex);
  currentTrackIndexRef.current = currentTrackIndex;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const loopModeRef = useRef(loopMode);
  loopModeRef.current = loopMode;
  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;
  const isWavMasterRef = useRef(isWavMaster);
  isWavMasterRef.current = isWavMaster;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Lấy URL nguồn âm thanh theo chất lượng (Dual-Source)
  const getTargetTrackSrc = useCallback((track, preferWav) => {
    if (!track) return '';
    const useWav = preferWav !== undefined ? preferWav : isWavMaster;
    return getTrackAudioSrc(track, useWav);
  }, [isWavMaster]);

  // Đồng bộ âm lượng vào audio element (tôn trọng hệ số Auto-Ducking khi TTS đang đọc)
  useEffect(() => {
    applyEffectiveMusicVolume();
  }, [volume, isMuted, applyEffectiveMusicVolume]);

  // Đồng bộ bài hát hiện tại từ audio.src nếu có sự thay đổi ngoại vi
  const syncActiveTrackFromAudio = useCallback((audioEl) => {
    const audio = audioEl || audioRef.current;
    if (!audio || !audio.src) return;
    const currentSrc = audio.src || '';

    if (selectedTrackSeason === 'winter' && tracks.length > 0) {
      const matchedIdx = tracks.findIndex((t) => {
        if (!t.src) return false;
        return currentSrc.endsWith(t.src) || currentSrc.includes(encodeURI(t.src));
      });
      if (matchedIdx !== -1 && matchedIdx !== currentTrackIndex) {
        setCurrentTrackIndex(matchedIdx);
      }
    }
  }, [selectedTrackSeason, tracks, currentTrackIndex]);

  // Hành động Play / Pause bọc try/catch an toàn (Quy tắc 4 GEMINI.md)
  const togglePlay = useCallback(async (options = {}) => {
    const showToast = options?.showToast === true;
    const audio = audioRef.current;
    if (!audio) return;

    const isCurrentlyPlaying = !audio.paused;

    if (isCurrentlyPlaying) {
      userExplicitPausedRef.current = true;
      try {
        sessionStorage.setItem('freedom_user_explicit_paused', 'true');
      } catch (_) {}

      try {
        audio.pause();
      } catch (err) {
        console.warn('[MusicContext] pause error:', err);
      }
      setIsPlaying(false);
      restoreAmbientFromMusic();

      if (showToast) {
        triggerMusicToast({
          type: 'pause',
          message: 'Đã tạm dừng',
          kbd: 'Space',
          icon: 'fa-pause',
        });
      }
    } else {
      userExplicitPausedRef.current = false;
      try {
        sessionStorage.removeItem('freedom_user_explicit_paused');
      } catch (_) {}

      audioCoordinator.activateSystemMusic('system-music');

      let targetSrc = '';
      if (selectedTrackSeason === 'winter') {
        const trk = tracks[currentTrackIndex] || tracks[0];
        targetSrc = getTargetTrackSrc(trk);
      } else {
        const sTrack = seasonalTracks[selectedTrackSeason];
        targetSrc = sTrack?.url || '';
      }

      if (targetSrc) {
        const needsLoad = !audio.src || !audio.src.endsWith(targetSrc);
        if (needsLoad) {
          isSwitchingTrackRef.current = true;
          audio.src = targetSrc;
          audio.load();
        }

        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            isSwitchingTrackRef.current = false;
            setIsPlaying(true);
            setIsAutoplayBlocked(false);
            duckAmbientForMusic();
            syncActiveTrackFromAudio(audio);

            if (showToast) {
              triggerMusicToast({
                type: 'play',
                message: 'Đang phát nhạc',
                kbd: 'Space',
                icon: 'fa-play',
              });
            }
          }
        } catch (err) {
          if (err?.name === 'AbortError') {
            return;
          }
          console.warn('[MusicContext] Play toggle blocked by policy:', err);
          isSwitchingTrackRef.current = false;
          setIsPlaying(false);
          if (err.name === 'NotAllowedError') {
            setIsAutoplayBlocked(true);
          }
          restoreAmbientFromMusic();
        }
      } else {
        startEventAmbient(selectedTrackSeason);
        setIsPlaying(true);

        if (showToast) {
          triggerMusicToast({
            type: 'play',
            message: 'Đang phát nhạc',
            kbd: 'Space',
            icon: 'fa-play',
          });
        }
      }
    }
  }, [tracks, currentTrackIndex, selectedTrackSeason, seasonalTracks, getTargetTrackSrc, syncActiveTrackFromAudio, triggerMusicToast]);

  // Chọn bài cụ thể trong playlist
  const playTrack = useCallback((index) => {
    if (!tracks || index < 0 || index >= tracks.length) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (index === currentTrackIndex && isPlaying) {
      togglePlay();
      return;
    }

    const nextTrack = tracks[index];
    setCurrentTrackIndex(index);
    setSelectedTrackSeason('winter');
    stopEventAmbient();
    audioCoordinator.activateSystemMusic('system-music');
    userExplicitPausedRef.current = false;
    try {
      sessionStorage.removeItem('freedom_user_explicit_paused');
    } catch (_) {}

    const targetSrc = getTargetTrackSrc(nextTrack);
    if (targetSrc) {
      setAudioError(null);
      setIsLoading(true);
      const currentSrc = audio.src || '';
      const isSameSrc = currentSrc.endsWith(targetSrc) || currentSrc.includes(encodeURI(targetSrc));
      if (!isSameSrc) {
        isSwitchingTrackRef.current = true;
        audio.src = targetSrc;
        audio.load();
      }

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              isSwitchingTrackRef.current = false;
              setIsPlaying(true);
              setIsAutoplayBlocked(false);
              duckAmbientForMusic();
            })
            .catch((err) => {
              if (err?.name === 'AbortError') {
                return;
              }
              console.warn('[MusicContext] playTrack error:', err);
              isSwitchingTrackRef.current = false;
              setIsPlaying(false);
              if (err.name === 'NotAllowedError') {
                setIsAutoplayBlocked(true);
              }
              restoreAmbientFromMusic();
            });
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
        console.warn('[MusicContext] playTrack exception:', err);
        isSwitchingTrackRef.current = false;
        setIsPlaying(false);
      }
    }
  }, [tracks, currentTrackIndex, isPlaying, getTargetTrackSrc, togglePlay]);

  // Ref callback cho nextTrack để handleEnded gọi ổn định
  const nextTrackRef = useRef(null);

  // Chuyển bài kế tiếp
  const nextTrack = useCallback(() => {
    const curTracks = tracksRef.current;
    if (!curTracks || curTracks.length === 0) return;
    const curIdx = currentTrackIndexRef.current;
    if (isShuffleRef.current && curTracks.length > 1) {
      let randomIndex = curIdx;
      while (randomIndex === curIdx) {
        randomIndex = Math.floor(Math.random() * curTracks.length);
      }
      playTrack(randomIndex);
    } else {
      const nextIdx = (curIdx + 1) % curTracks.length;
      playTrack(nextIdx);
    }
  }, [playTrack]);
  nextTrackRef.current = nextTrack;

  // Lùi về bài trước
  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (!tracks || tracks.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(prevIdx);
  }, [tracks, currentTrackIndex, playTrack]);

  // Tua thời lượng (phòng thủ NaN / Invalid number / audio crash / unready state)
  const seekTo = useCallback((seconds) => {
    const audio = audioRef.current;
    const num = Number(seconds);
    if (!audio || !Number.isFinite(num)) return;
    const maxDur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    if (maxDur <= 0) return; // Chưa nạp xong metadata bài hát thì không tua
    const clamped = Math.max(0, Math.min(num, maxDur));
    try {
      audio.currentTime = clamped;
    } catch (_) {}
    setCurrentTime(clamped);
  }, []);

  // Thay đổi âm lượng (phòng thủ NaN / Invalid input)
  const changeVolume = useCallback((newVolume) => {
    const num = Number(newVolume);
    const clamped = Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0.45;
    setVolumeState(clamped);
    const nextMuted = clamped === 0;
    setIsMuted(nextMuted);
    setMasterMute(nextMuted);
    try {
      localStorage.setItem('freedom_music_player_volume', String(clamped));
    } catch (_) {}
  }, []);

  // Bật / tắt Mute (Đồng bộ toàn diện cả bài nhạc lẫn âm thanh môi trường và hiển thị Toast phản hồi)
  const toggleMute = useCallback((options = {}) => {
    const showToast = options?.showToast !== false;

    if (isMuted) {
      setIsMuted(false);
      const restoredVol = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.45;
      setVolumeState(restoredVol);
      setMasterMute(false);

      if (showToast) {
        triggerMusicToast({
          type: 'unmute',
          message: 'Đã bật tiếng',
          kbd: 'M',
          icon: 'fa-volume-high',
        });
      }
    } else {
      prevVolumeRef.current = volume;
      setIsMuted(true);
      setMasterMute(true);

      if (showToast) {
        triggerMusicToast({
          type: 'mute',
          message: 'Đã tắt tiếng',
          kbd: 'M',
          icon: 'fa-volume-xmark',
        });
      }
    }
  }, [isMuted, volume, triggerMusicToast]);

  // =========================================================================
  // PHÍM TẮT TOÀN CỤC THÔNG MINH: 'M' (MUTE) & 'SPACE' (PLAY/PAUSE)
  // =========================================================================
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isKeyM = e.key === 'm' || e.key === 'M';
      const isKeySpace = e.code === 'Space' || e.key === ' ';

      // 1. Chỉ bắt phím M hoặc Space
      if (!isKeyM && !isKeySpace) return;

      // 2. Ràng buộc an toàn: Bỏ qua tuyệt đối nếu người dùng đang nhấn phím tổ hợp (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // 3. Ràng buộc an toàn UX: Bỏ qua tuyệt đối khi người dùng đang nhập văn bản hoặc trong editor
      const target = e.target;
      if (!target) return;

      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      const isEditable = target.isContentEditable || target.getAttribute?.('contenteditable') === 'true';
      const isInsideEditor = Boolean(
        target.closest?.(
          'input, textarea, select, [contenteditable="true"], .rich-editor, .ql-editor, .w-md-editor, [role="textbox"]'
        )
      );

      if (isInput || isEditable || isInsideEditor) {
        return;
      }

      // 4. Bật / tắt tiếng an toàn hoặc Play / Pause
      if (isKeySpace) {
        // Ngăn trình duyệt tự cuộn trang xuống khi nhấn Space
        e.preventDefault();
        togglePlay({ showToast: true });
      } else if (isKeyM) {
        e.preventDefault();
        toggleMute({ showToast: true });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [toggleMute, togglePlay]);

  // Vòng lặp Loop
  const cycleLoopMode = useCallback(() => {
    setLoopMode((prev) => (prev === 'all' ? 'one' : prev === 'one' ? 'none' : 'all'));
  }, []);

  // Bật / tắt Shuffle
  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  // Chuyển chất lượng âm thanh (Dual-Source)
  const toggleAudioQuality = useCallback(() => {
    setIsWavMaster((prev) => {
      const nextWav = !prev;
      try {
        localStorage.setItem('freedom_audio_quality_wav', String(nextWav));
      } catch (_) {}

      const audio = audioRef.current;
      if (audio && currentTrack) {
        const nextSrc = getTargetTrackSrc(currentTrack, nextWav);
        if (nextSrc && !audio.src.endsWith(nextSrc)) {
          setAudioError(null);
          setIsLoading(true);
          const savedTime = audio.currentTime || 0;
          const wasPlaying = !audio.paused;
          audio.src = nextSrc;
          audio.load();
          if (savedTime > 0) {
            const handleRestoreTime = () => {
              try {
                if (audio.duration && !isNaN(audio.duration)) {
                  audio.currentTime = Math.min(savedTime, audio.duration);
                } else {
                  audio.currentTime = savedTime;
                }
              } catch (_) {}
            };
            audio.addEventListener('loadedmetadata', handleRestoreTime, { once: true });
            try {
              audio.currentTime = savedTime;
            } catch (_) {}
          }
          if (wasPlaying) {
            audio.play().catch((err) => {
              if (err?.name === 'AbortError') return;
              console.warn('[MusicContext] Quality switch play error:', err);
            });
          }
        }
      }
      return nextWav;
    });
  }, [currentTrack, getTargetTrackSrc]);

  // Đổi chủ đề Playlist (Góc Nhạc) & hỗ trợ chọn track index trực tiếp
  const switchTheme = useCallback((newSlug, targetTrackIndex = 0, forcePlay = false) => {
    if (!newSlug) return;
    const isSameTheme = newSlug === themeSlug;
    if (isSameTheme) {
      if (typeof targetTrackIndex === 'number' && targetTrackIndex !== currentTrackIndex) {
        playTrack(targetTrackIndex);
      } else if (forcePlay) {
        const audio = audioRef.current;
        if (audio && audio.paused) {
          togglePlay();
        }
      }
      return;
    }
    setThemeSlug(newSlug);
    const newTheme = newSlug === 'favorites' ? favoritesTheme : getPlaylistBySlug(newSlug);
    if (newTheme?.tracks && newTheme.tracks.length > 0) {
      const safeIndex = Math.max(0, Math.min(targetTrackIndex || 0, newTheme.tracks.length - 1));
      setCurrentTrackIndex(safeIndex);
      setSelectedTrackSeason('winter');
      stopEventAmbient();
      setAudioError(null);
      const nextTrack = newTheme.tracks[safeIndex];
      const targetSrc = getTargetTrackSrc(nextTrack);
      const audio = audioRef.current;
      if (audio && targetSrc) {
        const currentSrc = audio.src || '';
        const isSameSrc = currentSrc.endsWith(targetSrc) || currentSrc.includes(encodeURI(targetSrc));
        const wasPlaying = (!audio.paused && !audio.ended) || forcePlay;
        if (wasPlaying) {
          setIsLoading(true);
        }
        if (!isSameSrc) {
          isSwitchingTrackRef.current = true;
          audio.src = targetSrc;
        }
        if (wasPlaying) {
          audioCoordinator.activateSystemMusic('system-music');
          userExplicitPausedRef.current = false;
          try {
            sessionStorage.removeItem('freedom_user_explicit_paused');
          } catch (_) {}
          audio.play().then(() => {
            isSwitchingTrackRef.current = false;
            setIsPlaying(true);
            setIsAutoplayBlocked(false);
            duckAmbientForMusic();
          }).catch((err) => {
            isSwitchingTrackRef.current = false;
            if (err?.name === 'AbortError') return;
            console.warn('[MusicContext] Theme switch play error:', err);
            setIsPlaying(false);
            if (err?.name === 'NotAllowedError') {
              setIsAutoplayBlocked(true);
            }
          });
        }
      }
    } else {
      // Chủ đề chưa có nhạc
      setCurrentTrackIndex(0);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (_) {}
      }
      setIsPlaying(false);
      restoreAmbientFromMusic();
    }
  }, [themeSlug, currentTrackIndex, playTrack, togglePlay, getTargetTrackSrc]);

  // Hành động kích hoạt phát nhanh một bài trong theme bất kỳ (Tự động chuyển theme và play)
  const playThemeTrack = useCallback((slug, trackIndex = 0) => {
    switchTheme(slug, trackIndex, true);
  }, [switchTheme]);

  // Điều khiển mùa cho bản thu âm Header (Xuân, Hạ, Thu, Đông)
  const selectRecordingSeason = useCallback((seasonId) => {
    setSelectedTrackSeason(seasonId);
    setMelodicSeason(seasonId);

    const audio = audioRef.current;
    const isCurrentlyPlaying = audio ? (!audio.paused && !audio.ended) : isPlaying;

    if (isCurrentlyPlaying) {
      let targetUrl = '';
      if (seasonId === 'winter') {
        const curWinter = tracks[currentTrackIndex] || tracks[0];
        targetUrl = getTargetTrackSrc(curWinter);
      } else {
        const nextTrack = seasonalTracks[seasonId];
        targetUrl = nextTrack?.url || '';
      }

      if (targetUrl) {
        audioCoordinator.activateSystemMusic('system-music');
        isSwitchingTrackRef.current = true;
        audio.src = targetUrl;
        audio.load();
        audio.play()
          .then(() => {
            isSwitchingTrackRef.current = false;
            setIsPlaying(true);
            duckAmbientForMusic();
          })
          .catch((err) => {
            if (err?.name === 'AbortError') return;
            isSwitchingTrackRef.current = false;
            setIsPlaying(false);
            restoreAmbientFromMusic();
          });
      } else {
        audioCoordinator.activateSystemMusic('system-music');
        if (audio) {
          try { audio.pause(); } catch (_) {}
        }
        startEventAmbient(seasonId);
        setIsPlaying(true);
      }
    }
  }, [tracks, currentTrackIndex, seasonalTracks, isPlaying, getTargetTrackSrc]);

  // Tải lên bản thu âm cá nhân 4 mùa
  const uploadCustomRecording = useCallback((file) => {
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');

    setSeasonalTracks((prev) => {
      const updated = {
        ...prev,
        [selectedTrackSeason]: {
          ...prev[selectedTrackSeason],
          title: cleanTitle || `Bản thu âm ${prev[selectedTrackSeason]?.name || ''}`,
          artist: 'Chính chủ thu âm 🎙️',
          url: fileUrl,
          hasUserAudio: true,
          desc: 'File thu âm do bạn tải lên từ thiết bị',
        },
      };
      try {
        localStorage.setItem('freedom_seasonal_recordings', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    const audio = audioRef.current;
    if (audio) {
      audioCoordinator.activateSystemMusic('system-music');
      isSwitchingTrackRef.current = true;
      audio.src = fileUrl;
      audio.load();
      audio.play()
        .then(() => {
          isSwitchingTrackRef.current = false;
          setIsPlaying(true);
          duckAmbientForMusic();
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          isSwitchingTrackRef.current = false;
          setIsPlaying(false);
        });
    }
    stopEventAmbient();
  }, [selectedTrackSeason]);

  // Bỏ chặn autoplay khi người dùng bấm tương tác
  const dismissAutoplayBlocked = useCallback(() => {
    setIsAutoplayBlocked(false);
    togglePlay();
  }, [togglePlay]);

  // 🎵 Preload metadata nhẹ cho bài kế tiếp (nextTrack) khi bài hiện tại đang phát (Singleton & Cleanup an toàn)
  const preloaderAudioRef = useRef(null);
  const lastPreloadedSrcRef = useRef('');

  useEffect(() => {
    if (!isPlaying || !tracks || tracks.length <= 1) return;
    try {
      const nextIdx = (currentTrackIndex + 1) % tracks.length;
      const nextTrackItem = tracks[nextIdx];
      if (nextTrackItem) {
        const nextSrc = getTargetTrackSrc(nextTrackItem);
        if (nextSrc && nextSrc !== lastPreloadedSrcRef.current && typeof Audio !== 'undefined') {
          lastPreloadedSrcRef.current = nextSrc;
          if (!preloaderAudioRef.current) {
            preloaderAudioRef.current = new Audio();
            preloaderAudioRef.current.preload = 'metadata';
          }
          preloaderAudioRef.current.src = nextSrc;
        }
      }
    } catch (_) {}

    return () => {
      // Dọn dẹp tài nguyên preloader khi unmount hoặc bài phát thay đổi (Quy tắc 3 GEMINI.md)
      if (preloaderAudioRef.current) {
        try {
          preloaderAudioRef.current.src = '';
          preloaderAudioRef.current.load();
        } catch (_) {}
      }
    };
  }, [isPlaying, tracks, currentTrackIndex, getTargetTrackSrc]);

  // Đăng ký toàn bộ sự kiện của Audio element (Chỉ 1 lần duy nhất trên toàn hệ thống)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
      setAudioError(null);
    };

    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      if (!audio.paused && !audio.ended && !isPlayingRef.current) {
        setIsPlaying(true);
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
      if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current);
      // Timeout 12s phòng ngừa mạng rớt hoàn toàn khiến spinner quay vô tận
      waitingTimeoutRef.current = setTimeout(() => {
        const audioEl = audioRef.current;
        if (audioEl && (audioEl.readyState < 2 || audioEl.paused)) {
          setIsLoading(false);
          setAudioError('Kết nối mạng gián đoạn khi nạp âm thanh. Bấm để thử lại.');
        }
      }, 12000);
    };

    const handleCanPlay = () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
      setAudioError(null);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsAutoplayBlocked(false);
      duckAmbientForMusic();
    };

    const handlePlaying = () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      isSwitchingTrackRef.current = false;
      setIsPlaying(true);
      setIsLoading(false);
      setAudioError(null);
      setIsAutoplayBlocked(false);
      duckAmbientForMusic();
    };

    const handleStalled = () => {
      // Khi stream dữ liệu bị gián đoạn hoặc đứng hình quá lâu
      if (audio && audio.readyState >= 2) {
        setIsLoading(false);
      } else if (audio && (audio.networkState === 3 || audio.networkState === 0)) {
        setIsLoading(false);
        setAudioError('Mạng chập chờn khi nạp âm thanh. Bấm để thử lại.');
      }
    };

    const handleAbort = () => {
      if (!isSwitchingTrackRef.current) {
        setIsLoading(false);
      }
    };

    const handleEmptied = () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      setCurrentTime(0);
    };

    const handlePause = () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      if (isSwitchingTrackRef.current) return;
      if (audio && !audio.paused) return;
      setIsPlaying(false);
      restoreAmbientFromMusic();
    };

    const handleEnded = () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      const mode = loopModeRef.current;
      const curIdx = currentTrackIndexRef.current;
      const curTracks = tracksRef.current;
      if (mode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (mode === 'none' && curIdx + 1 >= (curTracks?.length || 0)) {
        setIsPlaying(false);
        restoreAmbientFromMusic();
        return;
      }
      if (nextTrackRef.current) {
        nextTrackRef.current();
      }
    };

    const handleError = (e) => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      const currentSrc = audio?.src || '';
      const cTrack = currentTrackRef.current;
      const fallbackSrc = cTrack?.wavSrc || cTrack?.src;
      if (!isWavMasterRef.current && fallbackSrc && cTrack?.streamUrl && (currentSrc.includes('mp3') || currentSrc.includes(encodeURI(cTrack.streamUrl)))) {
        console.info('[MusicContext] Stream file unavailable, falling back to Studio WAV:', fallbackSrc);
        audio.src = fallbackSrc;
        audio.load();
        if (isPlayingRef.current) {
          audio.play().catch(() => {});
        }
        return;
      }

      const mediaErr = audio?.error;
      console.warn('[MusicContext] Audio playback error on:', cTrack?.src, mediaErr || e);
      isSwitchingTrackRef.current = false;
      setIsLoading(false);
      setIsPlaying(false);

      let errMsg = 'Không thể phát tệp âm thanh này. Bấm để thử lại.';
      if (mediaErr?.code === 4) {
        errMsg = 'Trình duyệt/Webview chưa hỗ trợ giải mã định dạng WAV 24-bit này.';
      } else if (mediaErr?.code === 2) {
        errMsg = 'Lỗi kết nối mạng khi tải bản thu âm.';
      }
      setAudioError(errMsg);
      restoreAmbientFromMusic();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('abort', handleAbort);
    audio.addEventListener('emptied', handleEmptied);

    return () => {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('abort', handleAbort);
      audio.removeEventListener('emptied', handleEmptied);
    };
  }, []);

  // =========================================================================
  // TỰ ĐỘNG KÍCH HOẠT HIỆU ỨNG MÙA ĐÔNG & NHẠC (SAFE AUTOPLAY POLICY)
  // =========================================================================
  useEffect(() => {
    const explicitlyPaused = sessionStorage.getItem('freedom_user_explicit_paused') === 'true';
    const initialTrack = tracks[0];
    const audio = audioRef.current;

    if (audio && initialTrack) {
      const targetSrc = getTargetTrackSrc(initialTrack);
      if (!audio.src || !audio.src.endsWith(targetSrc)) {
        audio.src = targetSrc;
      }
    }

    const startAudioWithGesture = async () => {
      // Đánh thức Web Audio Context của hiệu ứng môi trường mùa đông sau user gesture
      try {
        await resumeAmbientAudioContext();
        startWeatherAmbient('winter');
      } catch (_) {}

      // Phát nhạc nếu người dùng chưa bấm dừng thủ công
      if (!explicitlyPaused && !userExplicitPausedRef.current && sessionStorage.getItem('freedom_user_explicit_paused') !== 'true') {
        const audioEl = audioRef.current;
        if (audioEl && initialTrack && audioEl.paused) {
          try {
            const playPromise = audioEl.play();
            if (playPromise !== undefined) {
              await playPromise;
            }
            setIsPlaying(true);
            setIsAutoplayBlocked(false);
            duckAmbientForMusic();
          } catch (e) {
            if (e?.name === 'AbortError') return;
            setIsPlaying(false);
            setIsAutoplayBlocked(true);
          }
        }
      }
    };

    // QA & Autoplay Policy: Không tạo AudioContext hoặc audio.play() khi chưa có tương tác đầu tiên
    if (hasUserInteracted()) {
      startAudioWithGesture();
      return undefined;
    }

    setIsPlaying(false);
    if (!explicitlyPaused && !userExplicitPausedRef.current) {
      setIsAutoplayBlocked(true);
    }

    const unsubscribe = onFirstUserGesture(() => {
      startAudioWithGesture();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // =========================================================================
  // ĐỒNG BỘ MEDIA SESSION API (KHÓA MÀN HÌNH, TAI NGHE & THÔNG BÁO HỆ ĐIỀU HÀNH)
  // =========================================================================
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentTrack) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: currentTrack.title || 'Freedom Chill',
          artist: currentTrack.artist || 'Freedom Studio 🎙️',
          album: currentTheme?.title || 'Không Gian Nhạc Freedom',
          artwork: [
            {
              src: '/images/office-night.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
            },
          ],
        });
      } catch (_) {}
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlayingRef.current) togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlayingRef.current) togglePlay();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrack();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details?.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
    } catch (_) {}
  }, [currentTrack, currentTheme, togglePlay, prevTrack, nextTrack, seekTo]);

  // Cập nhật trạng thái PlaybackState của MediaSession
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (_) {}
  }, [isPlaying]);

  // =========================================================================
  // BẢO ĐẢM ÂM THANH MƯỢT MÀ KHI ĐỔI TAB ẨN / HIỆN (VISIBILITYCHANGE)
  // =========================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden && isPlayingRef.current) {
        resumeAmbientAudioContext();
        const audio = audioRef.current;
        if (audio && audio.paused && !userExplicitPausedRef.current) {
          audio.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // =========================================================================
  // ĐỒNG BỘ NGUỒN PHÁT QUA AUDIO COORDINATOR: AUTO-DUCK KHI ĐỌC AI (TTS) & EXCLUSIVE PLAYBACK
  // =========================================================================
  useEffect(() => {
    const pausePlayback = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        try {
          audio.pause();
        } catch (_) {}
      }
      stopEventAmbient();
      setIsPlaying(false);
      restoreAmbientFromMusic();
    };

    const unregister = audioCoordinator.registerChannel('system-music', {
      pause: pausePlayback,
      duck: (factor = 0.15) => {
        ttsDuckFactorRef.current = factor;
        applyEffectiveMusicVolume();
        duckAmbientForMusic();
      },
      restore: () => {
        ttsDuckFactorRef.current = 1;
        applyEffectiveMusicVolume();
        const audio = audioRef.current;
        if (!audio || audio.paused) {
          restoreAmbientFromMusic();
        }
      },
      isPlaying: () => Boolean(audioRef.current && !audioRef.current.paused),
    });

    window.addEventListener('freedom_pause_system_music', pausePlayback);
    return () => {
      unregister();
      window.removeEventListener('freedom_pause_system_music', pausePlayback);
    };
  }, [applyEffectiveMusicVolume]);

  const value = {
    // State
    themeSlug,
    currentTheme,
    allThemes,
    tracks,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    isLoading,
    audioError,
    isAutoplayBlocked,
    currentTime,
    duration,
    volume,
    isMuted,
    loopMode,
    isShuffle,
    isWavMaster,
    audioRef,
    selectedTrackSeason,
    seasonalTracks,

    // Actions
    togglePlay,
    playTrack,
    nextTrack,
    prevTrack,
    seekTo,
    changeVolume,
    toggleMute,
    cycleLoopMode,
    toggleShuffle,
    toggleAudioQuality,
    switchTheme,
    playThemeTrack,
    selectRecordingSeason,
    uploadCustomRecording,
    dismissAutoplayBlocked,
    pauseSystemMusic,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
      {/* Audio element duy nhất trên toàn ứng dụng: preload="metadata" để tối ưu hóa băng thông, không tải trước cả file WAV 34.6MB khi chưa phát */}
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
      {/* Toast phản hồi nhanh khi Thao Tác Phím Tắt (Mute / Unmute / Play / Pause) */}
      <div
        className="global-mute-toast-container"
        style={{
          opacity: musicToast.visible ? 1 : 0,
          transform: musicToast.visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(12px)',
          visibility: musicToast.visible ? 'visible' : 'hidden',
        }}
        aria-live="polite"
        role="status"
      >
        <div className={`global-mute-toast-pill is-${musicToast.type}`}>
          <span className="toast-icon">
            <i className={`fa-solid ${musicToast.icon}`} aria-hidden="true"></i>
          </span>
          <span>{musicToast.message}</span>
          <span className="toast-kbd">{musicToast.kbd}</span>
        </div>
      </div>
    </MusicContext.Provider>
  );
};
