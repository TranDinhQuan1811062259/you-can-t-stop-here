/**
 * =========================================================================
 * 🎼 AUDIO COORDINATOR ("NHẠC TRƯỞNG ÂM THANH" TOÀN HỆ THỐNG)
 * =========================================================================
 * 1. Quản lý duy nhất 1 Singleton AudioContext chia sẻ toàn ứng dụng, tránh
 *    chạm giới hạn 6 AudioContext phần cứng của trình duyệt.
 * 2. Điều phối Exclusive Playback & Auto-Ducking:
 *    - TTS đọc bài viết: Tự động hạ âm lượng nhạc nền MusicContext xuống 15%
 *      (auto-duck) và tạm dừng các nguồn modal cạnh tranh; khôi phục êm ái khi dừng/xong.
 *    - Mở hoặc phát nhạc từ GivingSomeEffortsSection / các Modal có âm thanh
 *      riêng (Chai Thư Nửa Đêm, Đài Radio Đêm Khuya, Hộp Thời Gian, Lò Đốt):
 *      Tự động tạm dừng nhạc nền Header/MusicContext và các kênh đang phát khác.
 */

import { hasUserInteracted } from './audio-gesture-guard';

let sharedAudioCtx = null;

/**
 * Lấy hoặc khởi tạo an toàn Singleton AudioContext duy nhất cho toàn bộ ứng dụng.
 */
export const getSharedAudioContext = ({ ignoreGestureGuard = false } = {}) => {
  if (typeof window === 'undefined') return null;
  if (!ignoreGestureGuard && !hasUserInteracted()) return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

/**
 * Đánh thức Singleton AudioContext sau tương tác đầu tiên của người dùng.
 */
export const resumeSharedAudioContext = async () => {
  if (!hasUserInteracted()) return null;
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (_) {}
  }
  return ctx;
};

// Tự động khôi phục Singleton AudioContext khi người dùng quay lại tab
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && hasUserInteracted() && sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
  });
}

class AudioCoordinator {
  constructor() {
    this.channels = new Map();
    this.isTtsDucking = false;
  }

  /**
   * Đăng ký bộ điều khiển của một nguồn âm thanh (system-music, tts, modal...)
   * Trả về hàm unregister để cleanup khi unmount.
   */
  registerChannel(channelId, controller) {
    if (!channelId || !controller) return () => {};
    this.channels.set(channelId, controller);

    // Nếu TTS đang phát mà system-music vừa mount/đăng ký, áp dụng ducking ngay
    if (channelId === 'system-music' && this.isTtsDucking && typeof controller.duck === 'function') {
      try {
        controller.duck(0.15);
      } catch (_) {}
    }

    return () => {
      if (this.channels.get(channelId) === controller) {
        this.channels.delete(channelId);
      }
    };
  }

  /**
   * Tạm dừng một kênh cụ thể nếu nó đang tồn tại.
   */
  pauseChannel(channelId) {
    const ctrl = this.channels.get(channelId);
    if (!ctrl) return;
    try {
      if (typeof ctrl.pause === 'function') {
        ctrl.pause();
      } else if (typeof ctrl.stop === 'function') {
        ctrl.stop();
      }
    } catch (_) {}
  }

  /**
   * Tạm dừng toàn bộ các modal âm thanh đang mở/phát (ngoại trừ exceptChannelId).
   */
  pauseAllModals(exceptChannelId = null) {
    const modalChannels = ['midnight-bottle', 'late-night-radio', 'time-capsule', 'rant-burn'];
    modalChannels.forEach((id) => {
      if (id !== exceptChannelId) {
        this.pauseChannel(id);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('freedom_pause_modal_audio', {
          detail: { except: exceptChannelId },
        })
      );
    }
  }

  /**
   * Tạm dừng nhạc nền hệ thống (MusicContext / Header) an toàn.
   */
  pauseSystemMusic() {
    const sysCtrl = this.channels.get('system-music');
    if (sysCtrl && typeof sysCtrl.pause === 'function') {
      try {
        sysCtrl.pause();
      } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('freedom_pause_system_music'));
    }
  }

  /**
   * Khi Bản đọc AI (TTS) bắt đầu/tiếp tục đọc:
   * - Duck nhạc nền hệ thống xuống 15%
   * - Tạm dừng các modal có âm thanh riêng đang phát để không chồng tiếng
   */
  beginTtsDucking() {
    this.isTtsDucking = true;
    const sysCtrl = this.channels.get('system-music');
    if (sysCtrl && typeof sysCtrl.duck === 'function') {
      try {
        sysCtrl.duck(0.15);
      } catch (_) {}
    }
    this.pauseAllModals(null);
  }

  /**
   * Khi Bản đọc AI (TTS) tạm dừng, dừng hẳn hoặc đọc xong:
   * - Khôi phục lại âm lượng nhạc nền hệ thống về mức ban đầu
   */
  endTtsDucking() {
    if (!this.isTtsDucking) return;
    this.isTtsDucking = false;
    const sysCtrl = this.channels.get('system-music');
    if (sysCtrl && typeof sysCtrl.restore === 'function') {
      try {
        sysCtrl.restore();
      } catch (_) {}
    }
  }

  /**
   * Khi người dùng mở Modal có âm thanh riêng hoặc bấm phát bên trong Modal:
   * - Dừng nhạc nền Header/MusicContext
   * - Tạm dừng TTS nếu đang đọc
   * - Dừng mọi modal âm thanh khác để đảm bảo chỉ 1 nguồn phát duy nhất
   */
  activateExclusiveModal(modalChannelId) {
    this.pauseSystemMusic();
    this.pauseChannel('tts');
    this.endTtsDucking();
    this.pauseAllModals(modalChannelId);
  }

  /**
   * Khi người dùng chủ động bật nhạc từ Header MusicContext hoặc GivingSomeEffortsSection:
   * - Tạm dừng các modal âm thanh đang phát
   * - Dừng TTS nếu đang đọc (vì người dùng chủ động bật nhạc nghe)
   */
  activateSystemMusic(source = 'system-music') {
    this.pauseAllModals(source);
    const ttsCtrl = this.channels.get('tts');
    if (ttsCtrl && typeof ttsCtrl.isPlaying === 'function' && ttsCtrl.isPlaying()) {
      this.pauseChannel('tts');
    }
    this.endTtsDucking();
  }
}

export const audioCoordinator = new AudioCoordinator();
export default audioCoordinator;
