import { useState, useEffect, useRef, useCallback } from 'react';
import { duckAmbientForMusic, restoreAmbientFromMusic } from '../utils/ambientSoundEngine';

/**
 * Hook quản lý phát nhạc cho Freedom Web Playlist Engine
 * Tuân thủ nghiêm ngặt 4 quy tắc GEMINI.md:
 * - Bảo toàn âm thanh môi trường (ducking/restore)
 * - Bọc try/catch chống chặn autoplay
 * - Dọn dẹp tài nguyên triệt để khi unmount
 */
export const useMusicPlayer = (tracks = []) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [loopMode, setLoopMode] = useState('all'); // 'all' | 'one' | 'none'
  const [isShuffle, setIsShuffle] = useState(false);

  // Kiến trúc Dual-Source: Studio WAV Master (Lossless Hi-Fi) vs Fast Stream (4G / Nhẹ máy)
  const [isWavMaster, setIsWavMaster] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_audio_quality_wav');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  // Lưu âm lượng an toàn trong localStorage (mặc định 45%)
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_music_player_volume');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.45;
    } catch (_) {
      return 0.45;
    }
  });

  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(volume);

  const audioRef = useRef(null);
  const currentTrack = tracks && tracks.length > 0 ? tracks[currentTrackIndex] || tracks[0] : null;

  // Lấy đường dẫn nguồn âm thanh mục tiêu theo tùy chọn chất lượng (Dual-Source)
  const getTargetTrackSrc = useCallback((track, preferWav) => {
    if (!track) return '';
    const useWav = preferWav !== undefined ? preferWav : isWavMaster;
    if (useWav) {
      return track.wavSrc || track.src || '';
    }
    return track.streamUrl || track.wavSrc || track.src || '';
  }, [isWavMaster]);

  // Khởi tạo đối tượng Audio một lần duy nhất
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }
    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : volume;

    // Dọn dẹp triệt để khi unmount (Quy tắc 3 GEMINI.md)
    return () => {
      try {
        audio.pause();
        audio.src = '';
        audio.removeAttribute('src');
        restoreAmbientFromMusic();
      } catch (err) {
        console.warn('[useMusicPlayer] Cleanup audio instance error:', err);
      }
    };
  }, []);

  // Cập nhật âm lượng cho audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Nạp bài hát khi đổi track hoặc đổi chất lượng
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || !currentTrack.src) {
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    setAudioError(null);
    setIsLoading(true);

    const targetSrc = getTargetTrackSrc(currentTrack);
    const prevSrc = audio.getAttribute('src');
    const needsLoad = !prevSrc || !audio.src || !audio.src.endsWith(targetSrc);
    if (needsLoad) {
      audio.src = targetSrc;
      audio.load();
    }

    const isCurrentlyPlaying = !audio.paused || isPlaying;
    if (isCurrentlyPlaying) {
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsAutoplayBlocked(false);
              duckAmbientForMusic();
            })
            .catch((err) => {
              console.warn('[useMusicPlayer] Autoplay was restricted by browser policy:', err);
              setIsPlaying(false);
              if (err.name === 'NotAllowedError') {
                setIsAutoplayBlocked(true);
              }
            });
        }
      } catch (err) {
        console.warn('[useMusicPlayer] Audio play exception:', err);
        setIsPlaying(false);
      }
    }
  }, [currentTrackIndex, currentTrack]);

  // Đăng ký các sự kiện audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (!audio.paused && !isPlaying) {
        setIsPlaying(true);
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsAutoplayBlocked(false);
      duckAmbientForMusic();
    };

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsAutoplayBlocked(false);
      duckAmbientForMusic();
    };

    const handlePause = () => {
      // Chỉ set false khi audio thực tế paused (tránh race condition khi load src mới)
      if (audio && !audio.paused) return;
      setIsPlaying(false);
      restoreAmbientFromMusic();
    };

    const handleEnded = () => {
      if (loopMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      handleNextTrack();
    };

    const handleError = (e) => {
      // Cơ chế Auto-Fallback cho Dual-Source:
      // Nếu đang thử phát streamUrl (.mp3) mà gặp lỗi (chưa có file nén trên host), tự động fallback về .wav gốc!
      const currentSrc = audio?.src || '';
      const fallbackSrc = currentTrack?.wavSrc || currentTrack?.src;
      if (!isWavMaster && fallbackSrc && currentTrack?.streamUrl && (currentSrc.includes('mp3') || currentSrc.includes(encodeURI(currentTrack.streamUrl)))) {
        console.info('[useMusicPlayer] Stream file unavailable, smoothly falling back to Studio WAV:', fallbackSrc);
        audio.src = fallbackSrc;
        audio.load();
        if (isPlaying) {
          audio.play().catch(() => {});
        }
        return;
      }

      console.warn('[useMusicPlayer] Audio playback error on:', currentTrack?.src, e);
      setIsLoading(false);
      setIsPlaying(false);
      setAudioError('Không thể phát tệp âm thanh này hoặc định dạng chưa được hỗ trợ.');
      restoreAmbientFromMusic();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [tracks, currentTrackIndex, loopMode, isShuffle]);

  // Hành động Play / Pause bọc try/catch an toàn (Quy tắc 4 GEMINI.md)
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Kiểm tra trực tiếp audio.paused theo sự kiện thực tế của audio
    const isCurrentlyPlaying = !audio.paused;

    if (isCurrentlyPlaying) {
      try {
        audio.pause();
      } catch (err) {
        console.warn('[useMusicPlayer] pause error:', err);
      }
      setIsPlaying(false);
      restoreAmbientFromMusic();
    } else {
      try {
        const targetSrc = getTargetTrackSrc(currentTrack);
        const needsLoad = !audio.src || !audio.src.endsWith(targetSrc);
        if (needsLoad) {
          audio.src = targetSrc;
          audio.load();
        }
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          setIsAutoplayBlocked(false);
          duckAmbientForMusic();
        }
      } catch (err) {
        console.warn('[useMusicPlayer] Play toggle prevented by policy:', err);
        setIsPlaying(false);
        if (err.name === 'NotAllowedError') {
          setIsAutoplayBlocked(true);
        }
      }
    }
  }, [currentTrack]);

  // Chọn bài cụ thể (nếu đang phát chính bài đó thì bấm lại để tạm dừng)
  const playTrack = useCallback((index) => {
    if (!tracks || index < 0 || index >= tracks.length) return;
    const audio = audioRef.current;

    if (index === currentTrackIndex) {
      togglePlay();
      return;
    }

    const nextTrack = tracks[index];
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setIsAutoplayBlocked(false);

    if (audio && nextTrack?.src) {
      try {
        const targetSrc = getTargetTrackSrc(nextTrack);
        const needsLoad = !audio.src || !audio.src.endsWith(targetSrc);
        if (needsLoad) {
          audio.src = targetSrc;
          audio.load();
        }
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsAutoplayBlocked(false);
              duckAmbientForMusic();
            })
            .catch((err) => {
              console.warn('[useMusicPlayer] playTrack play error:', err);
              setIsPlaying(false);
              if (err.name === 'NotAllowedError') {
                setIsAutoplayBlocked(true);
              }
            });
        }
      } catch (err) {
        console.warn('[useMusicPlayer] playTrack exception:', err);
        setIsPlaying(false);
      }
    }
  }, [tracks, currentTrackIndex, togglePlay]);

  // Chuyển bài kế tiếp
  const handleNextTrack = useCallback(() => {
    if (!tracks || tracks.length === 0) return;

    if (isShuffle && tracks.length > 1) {
      let randomIndex = currentTrackIndex;
      while (randomIndex === currentTrackIndex) {
        randomIndex = Math.floor(Math.random() * tracks.length);
      }
      setCurrentTrackIndex(randomIndex);
    } else {
      if (currentTrackIndex + 1 < tracks.length) {
        setCurrentTrackIndex((prev) => prev + 1);
      } else if (loopMode === 'all') {
        setCurrentTrackIndex(0);
      } else {
        setIsPlaying(false);
        restoreAmbientFromMusic();
      }
    }
  }, [tracks, currentTrackIndex, isShuffle, loopMode]);

  // Lùi về bài trước hoặc về đầu bài hiện tại
  const handlePrevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (!tracks || tracks.length === 0) return;

    if (isShuffle && tracks.length > 1) {
      let randomIndex = currentTrackIndex;
      while (randomIndex === currentTrackIndex) {
        randomIndex = Math.floor(Math.random() * tracks.length);
      }
      setCurrentTrackIndex(randomIndex);
    } else {
      setCurrentTrackIndex((prev) => (prev > 0 ? prev - 1 : tracks.length - 1));
    }
  }, [tracks, currentTrackIndex, isShuffle]);

  // Tua thời gian (Seek)
  const seekTo = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(seconds)) return;
    const clamped = Math.max(0, Math.min(seconds, audio.duration || 0));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  // Thay đổi âm lượng an toàn
  const changeVolume = useCallback((newVolume) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    try {
      localStorage.setItem('freedom_music_player_volume', String(clamped));
    } catch (_) {}
  }, []);

  // Bật / tắt Mute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.45);
    } else {
      prevVolumeRef.current = volume;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Chuyển chế độ lặp lại ('all' -> 'one' -> 'none')
  const cycleLoopMode = useCallback(() => {
    setLoopMode((prev) => (prev === 'all' ? 'one' : prev === 'one' ? 'none' : 'all'));
  }, []);

  // Bật / tắt chế độ ngẫu nhiên
  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  // Chuyển đổi chất lượng âm thanh (Dual-Source: Studio WAV Master vs Fast Stream)
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
            audio.play().catch((err) => console.warn('[useMusicPlayer] Quality switch play error:', err));
          }
        }
      }
      return nextWav;
    });
  }, [currentTrack, getTargetTrackSrc]);

  // Bỏ chặn autoplay khi người dùng bấm tương tác
  const dismissAutoplayBlocked = useCallback(() => {
    setIsAutoplayBlocked(false);
    togglePlay();
  }, [togglePlay]);

  return {
    currentTrack,
    currentTrackIndex,
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
    togglePlay,
    playTrack,
    nextTrack: handleNextTrack,
    prevTrack: handlePrevTrack,
    seekTo,
    changeVolume,
    toggleMute,
    cycleLoopMode,
    toggleShuffle,
    toggleAudioQuality,
    dismissAutoplayBlocked,
  };
};
