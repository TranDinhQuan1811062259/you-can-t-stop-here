import { useMusic } from '../context/MusicContext';

/**
 * Hook kết nối với Unified Music Context của Freedom Web
 * - Đồng bộ 100% với Mini-Player trên Header, Popup 4 mùa và Trang Không Gian Nhạc (/music).
 * - Không làm ngắt nhạc khi chuyển qua lại giữa các trang (Non-destructive Routing).
 * - Bảo toàn API hợp đồng cho MusicPage và MusicPlayerCard.
 */
export const useMusicPlayer = () => {
  const music = useMusic();

  return {
    currentTrack: music.currentTrack,
    currentTrackIndex: music.currentTrackIndex,
    isPlaying: music.isPlaying,
    isLoading: music.isLoading,
    audioError: music.audioError,
    isAutoplayBlocked: music.isAutoplayBlocked,
    currentTime: music.currentTime,
    duration: music.duration,
    volume: music.volume,
    isMuted: music.isMuted,
    loopMode: music.loopMode,
    isShuffle: music.isShuffle,
    isWavMaster: music.isWavMaster,
    togglePlay: music.togglePlay,
    playTrack: music.playTrack,
    nextTrack: music.nextTrack,
    prevTrack: music.prevTrack,
    seekTo: music.seekTo,
    changeVolume: music.changeVolume,
    toggleMute: music.toggleMute,
    cycleLoopMode: music.cycleLoopMode,
    toggleShuffle: music.toggleShuffle,
    toggleAudioQuality: music.toggleAudioQuality,
    dismissAutoplayBlocked: music.dismissAutoplayBlocked,
    switchTheme: music.switchTheme,
    currentTheme: music.currentTheme,
    allThemes: music.allThemes,
  };
};
