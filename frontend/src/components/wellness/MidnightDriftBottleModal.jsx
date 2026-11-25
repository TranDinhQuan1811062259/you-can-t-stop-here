import React, { useState, useEffect, useRef } from 'react';
import { playClickSound, playSingingBowlSound } from '../../utils/soundEffects';
import { triggerAsmrKeySound } from '../../utils/keyboardSoundEngine';
import { hasUserInteracted } from '../../utils/audio-gesture-guard';

const INITIAL_DRIFT_BOTTLES = [
  {
    id: 'bottle_1',
    author: 'Cú Đêm 2h Sáng',
    city: 'Sài Gòn',
    time: '23:45 đêm qua',
    tag: '🌙 Đêm muộn cô đơn',
    content: 'Tăng ca vừa về tới phòng trọ, mì tôm nguội ngắt nhưng thấy lòng nhẹ nhõm lạ thường vì deadline dự án 3 tuần qua cuối cùng cũng đã xong. Nếu ai đó vớt được bức thư này, chúc bạn ngủ một giấc thật ngon và mơ một giấc mơ êm đẹp nhé.',
    hugs: 38,
    candles: 24,
    color: '#38bdf8',
  },
  {
    id: 'bottle_2',
    author: 'Bác Sĩ Thực Tập',
    city: 'Hà Nội',
    time: '01:15 sáng nay',
    tag: '💼 Áp lực công việc',
    content: 'Vừa hoàn thành ca trực đêm dài đằng đẵng. Đôi khi mệt mỏi muốn buông xuôi, nhưng nhìn bệnh nhân hồi phục lại có thêm động lực bước tiếp. Mọi người ở đây ai cũng có những cuộc chiến vô hình của riêng mình. Cùng nhau cố gắng nhé!',
    hugs: 54,
    candles: 41,
    color: '#f59e0b',
  },
  {
    id: 'bottle_3',
    author: 'Người Đang Chênh Vênh',
    city: 'Đà Nẵng',
    time: '00:30',
    tag: '🌧️ Lạc lõng',
    content: 'Tuổi 26 chẳng có gì trong tay ngoài sự hoang mang. Bạn bè đứa thì cưới, đứa thăng chức, còn mình vẫn loay hoay tìm kiếm ý nghĩa cuộc đời. Nhưng hôm nay mình tự cho phép bản thân nghỉ ngơi 1 buổi tối mà không tự phán xét.',
    hugs: 72,
    candles: 35,
    color: '#ec4899',
  },
  {
    id: 'bottle_4',
    author: 'Gã Lập Trình Lười',
    city: 'Đà Lạt',
    time: 'Hôm qua',
    tag: '🕯️ Tìm bình yên',
    content: 'Đêm nay Đà Lạt lạnh 14 độ, ngồi bên tách trà quế và tiếng mưa gõ nhẹ trên mái tôn. Tự nhiên nhận ra hạnh phúc đôi khi chỉ là được thở chậm lại sau những ngày quay cuồng vì cơm áo gạo tiền.',
    hugs: 63,
    candles: 50,
    color: '#10b981',
  },
];

export const MidnightDriftBottleModal = ({ isOpen, onClose }) => {
  const STORAGE_KEY = 'freedom_drift_bottles';

  const [activeTab, setActiveTab] = useState('typewriter'); // 'typewriter' | 'river'
  const [bottles, setBottles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_DRIFT_BOTTLES;
  });

  // Typewriter state
  const [typedLetter, setTypedLetter] = useState('');
  const [authorName, setAuthorName] = useState('Người lạ giấu tên');
  const [selectedTag, setSelectedTag] = useState('🌙 Đêm muộn cô đơn');
  const [isCastingBottle, setIsCastingBottle] = useState(false);
  const [castSuccess, setCastSuccess] = useState(false);

  // River view state
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [interactedBottles, setInteractedBottles] = useState({});

  // Background Music & Audio De-noising DSP State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(42); // 42% êm đềm, hòa quyện ASMR
  const [isDenoised, setIsDenoised] = useState(true); // Bộ lọc tạp âm DSP (Highpass + Lowpass + Peaking + Compression)
  const [showVideoModal, setShowVideoModal] = useState(false);

  const typewriterRef = useRef(null);
  const audioElRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const isAudioGraphConnectedRef = useRef(false);
  const filtersRef = useRef({});

  // Lưu trữ danh sách chai thư
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bottles));
    } catch (_) {}
  }, [bottles]);

  // Thiết lập Web Audio DSP Graph để lọc tạp âm từ video gốc
  const initDeNoiseAudioGraph = () => {
    if (isAudioGraphConnectedRef.current || !audioElRef.current || !hasUserInteracted()) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audioElRef.current);

      // 1. High-Pass Filter: Cắt bỏ hoàn toàn tiếng ù rù, tiếng rung chấn mic tần số thấp < 95Hz
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(95, ctx.currentTime);
      hpFilter.Q.setValueAtTime(0.7, ctx.currentTime);

      // 2. Low-Pass Filter: Cắt bỏ tiếng xì rè (mic hiss / static noise) tần số cao > 9200Hz
      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(9200, ctx.currentTime);
      lpFilter.Q.setValueAtTime(0.7, ctx.currentTime);

      // 3. Peaking Notch Filter: Giảm 3.5dB tại vùng tạp âm chói gắt 4500Hz
      const notchFilter = ctx.createBiquadFilter();
      notchFilter.type = 'peaking';
      notchFilter.frequency.setValueAtTime(4500, ctx.currentTime);
      notchFilter.gain.setValueAtTime(-3.5, ctx.currentTime);
      notchFilter.Q.setValueAtTime(1.2, ctx.currentTime);

      // 4. Studio Dynamics Compressor: Nén dải động, làm mượt âm lượng, giảm rè chói
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);

      // 5. Gain Node: Điều khiển âm lượng mượt mà
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(musicVolume / 100, ctx.currentTime);
      gainNodeRef.current = gainNode;

      // Lưu lại các filters để toggle bypass khi cần
      filtersRef.current = { hpFilter, lpFilter, notchFilter, compressor };

      // Kết nối chuỗi xử lý tín hiệu số (DSP chain)
      source.connect(hpFilter);
      hpFilter.connect(lpFilter);
      lpFilter.connect(notchFilter);
      notchFilter.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(ctx.destination);

      isAudioGraphConnectedRef.current = true;
    } catch (err) {
      console.warn('Web Audio DSP initialization bypassed:', err);
    }
  };

  // Toggle bật / tạm dừng phát nhạc nền
  const handleTogglePlayMusic = () => {
    playClickSound();

    if (!audioElRef.current) return;

    if (isMusicPlaying) {
      audioElRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      initDeNoiseAudioGraph();

      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      audioElRef.current
        .play()
        .then(() => {
          setIsMusicPlaying(true);
        })
        .catch((err) => {
          console.warn('Audio play error:', err);
        });
    }
  };

  // Thay đổi âm lượng nhạc nền
  const handleVolumeChange = (newVol) => {
    setMusicVolume(newVol);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(newVol / 100, audioCtxRef.current.currentTime);
    } else if (audioElRef.current) {
      audioElRef.current.volume = newVol / 100;
    }
  };

  // Bật / tắt bộ lọc tạp âm DSP
  const handleToggleDenoise = () => {
    playClickSound();
    const nextState = !isDenoised;
    setIsDenoised(nextState);

    const { hpFilter, lpFilter, notchFilter } = filtersRef.current;
    if (hpFilter && lpFilter && notchFilter && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      if (nextState) {
        // Bật lọc tạp âm
        hpFilter.frequency.setValueAtTime(95, now);
        lpFilter.frequency.setValueAtTime(9200, now);
        notchFilter.gain.setValueAtTime(-3.5, now);
      } else {
        // Tắt lọc (flat bypass)
        hpFilter.frequency.setValueAtTime(10, now);
        lpFilter.frequency.setValueAtTime(22000, now);
        notchFilter.gain.setValueAtTime(0, now);
      }
    }
  };

  // Dọn dẹp an toàn khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      if (audioElRef.current) {
        try {
          audioElRef.current.pause();
          audioElRef.current.currentTime = 0;
        } catch (_) {}
      }
      setIsMusicPlaying(false);
      setShowVideoModal(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý gõ phím máy đánh chữ (Phát âm thanh ASMR cạch cạch cơ học)
  const handleKeyDown = (e) => {
    triggerAsmrKeySound(e, 'typewriter');
  };

  // Thả chai thư ra sông
  const handleCastBottle = () => {
    if (!typedLetter.trim()) return;
    playClickSound();
    setIsCastingBottle(true);

    setTimeout(() => {
      const newBottle = {
        id: `bottle_${Date.now()}`,
        author: authorName.trim() || 'Người lạ giấu tên',
        city: 'Phương Xa',
        time: 'Vừa mới thả',
        tag: selectedTag,
        content: typedLetter.trim(),
        hugs: 1,
        candles: 0,
        color: '#38bdf8',
      };

      setBottles((prev) => [newBottle, ...prev]);
      setTypedLetter('');
      setIsCastingBottle(false);
      setCastSuccess(true);
      playSingingBowlSound();

      setTimeout(() => {
        setCastSuccess(false);
        setActiveTab('river');
        setSelectedBottle(newBottle);
      }, 1600);
    }, 1200);
  };

  // Vớt một chiếc chai ngẫu nhiên
  const handleFishRandomBottle = () => {
    playClickSound();
    if (bottles.length === 0) return;
    const randomIndex = Math.floor(Math.random() * bottles.length);
    setSelectedBottle(bottles[randomIndex]);
  };

  // Gửi cái ôm / nến cho người viết chai thư
  const handleSendWarmth = (bottleId, type) => {
    playClickSound();
    const key = `${bottleId}_${type}`;
    if (interactedBottles[key]) return;

    setInteractedBottles((prev) => ({ ...prev, [key]: true }));
    setBottles((prev) =>
      prev.map((b) => {
        if (b.id === bottleId) {
          return {
            ...b,
            hugs: type === 'hug' ? b.hugs + 1 : b.hugs,
            candles: type === 'candle' ? b.candles + 1 : b.candles,
          };
        }
        return b;
      })
    );

    if (selectedBottle && selectedBottle.id === bottleId) {
      setSelectedBottle((prev) => ({
        ...prev,
        hugs: type === 'hug' ? prev.hugs + 1 : prev.hugs,
        candles: type === 'candle' ? prev.candles + 1 : prev.candles,
      }));
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(7, 10, 19, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Audio element phát bài nhạc từ video người dùng gửi (loop vô tận) */}
      <audio
        ref={audioElRef}
        src="/audio/midnight-river-song.mp4"
        loop
        preload="auto"
        style={{ display: 'none' }}
      />

      <div
        className="drift-bottle-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '820px',
          maxHeight: '92vh',
          borderRadius: '26px',
          background: 'linear-gradient(165deg, #18120c 0%, #24170d 45%, #0f0a06 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
          color: '#fef3c7',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.95), 0 0 50px rgba(245, 158, 11, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header Chiếc Máy Đánh Chữ & Dòng Sông Đêm */}
        <div
          style={{
            padding: '16px 24px 12px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(38, 24, 14, 0.95), rgba(20, 12, 7, 0.95))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.5))' }}>
              📜
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fde68a', fontWeight: 900, letterSpacing: '0.3px' }}>
                Chiếc Máy Đánh Chữ & Thư Thả Trôi Sông
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#fed7aa', fontWeight: 500 }}>
                Gõ những dòng tâm sự mộc mạc ASMR, bỏ vào chai thủy tinh và thả trôi giữa dòng sông đêm.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#fde68a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* THANH PHÁT NHẠC NỀN NỬA ĐÊM & LỌC TẠP ÂM (DSP STUDIO AUDIO) */}
        <div
          style={{
            padding: '10px 22px',
            background: 'linear-gradient(90deg, rgba(43, 24, 13, 0.95) 0%, rgba(24, 14, 8, 0.98) 100%)',
            borderBottom: '1.5px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Thông tin bài nhạc & Icon quay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '1.4rem',
                display: 'inline-block',
                animation: isMusicPlaying ? 'spinSlow 4s linear infinite' : 'none',
              }}
            >
              📼
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '0.84rem', color: '#fde68a' }}>
                  Giai Điệu Thả Trôi Sông
                </strong>
                <span
                  style={{
                    fontSize: '0.66rem',
                    background: '#ea580c',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontWeight: 800,
                  }}
                >
                  Nhạc của Bạn ✨
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#fed7aa' }}>
                Âm hưởng hoài niệm • Hòa quyện cùng tiếng gõ phím cạch cạch ASMR
              </p>
            </div>
          </div>

          {/* Cụm điều khiển Play / Lọc tạp âm / Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Nút Play / Pause */}
            <button
              type="button"
              onClick={handleTogglePlayMusic}
              style={{
                background: isMusicPlaying
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: isMusicPlaying ? '#ffffff' : '#18120c',
                border: 'none',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isMusicPlaying
                  ? '0 3px 10px rgba(239, 68, 68, 0.4)'
                  : '0 3px 10px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{isMusicPlaying ? '⏸ Tạm Dừng' : '▶ Bật Nhạc Đêm'}</span>
            </button>

            {/* Sóng âm Equalizer khi phát */}
            {isMusicPlaying && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  height: '14px',
                  padding: '0 4px',
                }}
              >
                <span className="retro-eq-bar retro-eq-1"></span>
                <span className="retro-eq-bar retro-eq-2"></span>
                <span className="retro-eq-bar retro-eq-3"></span>
                <span className="retro-eq-bar retro-eq-4"></span>
              </div>
            )}

            {/* Nút Lọc Tạp Âm DSP */}
            <button
              type="button"
              onClick={handleToggleDenoise}
              title={isDenoised ? 'Bộ lọc DSP đang triệt tiêu tiếng ù rù và tiếng xì rè của micro' : 'Bấm để bật lọc tạp âm'}
              style={{
                background: isDenoised ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                border: isDenoised ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.2)',
                color: isDenoised ? '#6ee7b7' : '#94a3b8',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{isDenoised ? '✨ Đã Lọc Tạp Âm' : '⚠️ Âm Gốc (Chưa Lọc)'}</span>
            </button>

            {/* Nút Xem Video Gốc */}
            <button
              type="button"
              onClick={() => setShowVideoModal((prev) => !prev)}
              style={{
                background: showVideoModal ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fde68a',
                borderRadius: '8px',
                padding: '4px 9px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showVideoModal ? '✕ Ẩn Video' : '🎬 Video Gốc'}
            </button>

            {/* Thanh chỉnh âm lượng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#fed7aa' }}>🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                style={{ width: '65px', accentColor: '#f59e0b', cursor: 'pointer' }}
                title={`Âm lượng nhạc nền: ${musicVolume}%`}
              />
            </div>
          </div>
        </div>

        {/* Khung video gốc thu nhỏ (nếu bấm Xem Video) */}
        {showVideoModal && (
          <div
            style={{
              padding: '12px 20px',
              background: 'rgba(0, 0, 0, 0.85)',
              borderBottom: '1.5px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative', maxWidth: '320px', maxHeight: '200px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
              <video
                src="/audio/midnight-river-song.mp4"
                controls
                muted={isMusicPlaying}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
              Video nguồn của bạn đã được trích xuất và lọc tạp âm làm nhạc nền cho máy đánh chữ.
            </p>
          </div>
        )}

        {/* Tab chuyển đổi: Máy đánh chữ vs Dòng sông trôi dạt */}
        <div
          style={{
            padding: '10px 24px',
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            gap: '10px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
          }}
        >
          <button
            type="button"
            onClick={() => { playClickSound(); setActiveTab('typewriter'); }}
            style={{
              background: activeTab === 'typewriter' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: activeTab === 'typewriter' ? '#18120c' : '#fde68a',
              border: activeTab === 'typewriter' ? 'none' : '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '999px',
              padding: '6px 18px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ⌨️ Máy Đánh Chữ Nửa Đêm
          </button>

          <button
            type="button"
            onClick={() => { playClickSound(); setActiveTab('river'); }}
            style={{
              background: activeTab === 'river' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
              color: activeTab === 'river' ? '#ffffff' : '#93c5fd',
              border: activeTab === 'river' ? 'none' : '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '999px',
              padding: '6px 18px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🌊 Vớt Chai Thư Trôi Sông ({bottles.length})
          </button>
        </div>

        {/* Body content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* ========================================================
              TAB 1: MÁY ĐÁNH CHỮ NỬA ĐÊM (TYPEWRITER SIMULATOR)
             ======================================================== */}
          {activeTab === 'typewriter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Thẻ tâm trạng */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#fed7aa', fontWeight: 700 }}>Tâm trạng hôm nay:</span>
                {['🌙 Đêm muộn cô đơn', '💼 Áp lực công việc', '🌧️ Lạc lõng', '🕯️ Tìm bình yên', '🌱 Khởi đầu mới'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { playClickSound(); setSelectedTag(t); }}
                    style={{
                      background: selectedTag === t ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 0, 0, 0.4)',
                      border: selectedTag === t ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: selectedTag === t ? '#fde68a' : '#d1d5db',
                      borderRadius: '999px',
                      padding: '4px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Bàn Gỗ & Con Lăn Máy Đánh Chữ Cơ */}
              <div
                style={{
                  position: 'relative',
                  background: 'linear-gradient(180deg, #3a2213 0%, #2b180d 100%)',
                  borderRadius: '18px',
                  padding: '24px 20px',
                  border: '2px solid rgba(245, 158, 11, 0.4)',
                  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.6), 0 10px 25px rgba(0,0,0,0.5)',
                }}
              >
                {/* Trục cuốn giấy máy đánh chữ (Platen Roller) */}
                <div
                  style={{
                    height: '14px',
                    background: 'linear-gradient(90deg, #111827 0%, #374151 50%, #111827 100%)',
                    borderRadius: '7px',
                    marginBottom: '-7px',
                    position: 'relative',
                    zIndex: 2,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.7)',
                  }}
                />

                {/* Tờ Giấy Đánh Chữ Cổ Điển Ngả Vàng (Vintage Typewriter Paper) */}
                <div
                  style={{
                    background: '#fefce8',
                    color: '#1f2937',
                    borderRadius: '8px 8px 4px 4px',
                    padding: '20px 24px',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45), inset 0 0 15px rgba(217, 119, 6, 0.1)',
                    position: 'relative',
                    border: '1px solid #fef08a',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #d97706', paddingBottom: '8px', marginBottom: '14px', fontSize: '0.78rem', color: '#92400e', fontFamily: "'Courier New', Courier, monospace", fontWeight: 700 }}>
                    <span>THE MIDNIGHT TYPEWRITER • THƯ THẢ TRÔI SÔNG</span>
                    <span>{selectedTag}</span>
                  </div>

                  <textarea
                    ref={typewriterRef}
                    value={typedLetter}
                    onChange={(e) => setTypedLetter(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Gõ tâm sự của bạn vào đây... Mỗi phím bạn gõ sẽ phát ra âm thanh cạch cạch cơ học của máy đánh chữ xưa. (Tối đa 250 từ)"
                    maxLength={1000}
                    rows={7}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: '0.98rem',
                      lineHeight: '1.7',
                      color: '#18181b',
                      resize: 'none',
                      letterSpacing: '0.2px',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.74rem', color: '#78350f', fontFamily: "'Courier New', Courier, monospace" }}>
                    <span>Ký tên: <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Người lạ giấu tên"
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #b45309', outline: 'none', color: '#78350f', fontWeight: 700, width: '130px' }}
                    /></span>
                    <span>{typedLetter.length} ký tự</span>
                  </div>
                </div>
              </div>

              {/* Thông báo thành công */}
              {castSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.25)', border: '1.5px solid #10b981', color: '#a7f3d0', padding: '10px 16px', borderRadius: '12px', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', animation: 'fadeIn 0.3s ease' }}>
                  🍾✨ Bức thư đã được cuộn tròn, niêm phong vào chiếc chai thủy tinh và đang trôi lững lờ trên dòng sông đêm!
                </div>
              )}

              {/* Nút bấm thả chai thư */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleCastBottle}
                  disabled={isCastingBottle || !typedLetter.trim()}
                  style={{
                    background: typedLetter.trim() ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' : 'rgba(255, 255, 255, 0.1)',
                    color: typedLetter.trim() ? '#ffffff' : '#9ca3af',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '12px 28px',
                    fontSize: '0.92rem',
                    fontWeight: 900,
                    cursor: typedLetter.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: typedLetter.trim() ? '0 6px 20px rgba(245, 158, 11, 0.45)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>🍾</span>
                  <span>{isCastingBottle ? 'Đang niêm phong chai...' : 'Bỏ Vào Chai & Thả Trôi Sông'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: DÒNG SÔNG ĐÊM & VỚT CHAI THƯ (DRIFT BOTTLE RIVER)
             ======================================================== */}
          {activeTab === 'river' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#bae6fd', fontWeight: 800 }}>
                    Dòng Sông Đêm & Những Chai Thư Từ Phương Xa
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#93c5fd' }}>
                    Nhấp vào một chiếc chai đang trôi trên sông hoặc bấm nút để vớt ngẫu nhiên 1 chiếc chai.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFishRandomBottle}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '8px 18px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  }}
                >
                  🎣 Vớt Ngẫu Nhiên 1 Chai Thư
                </button>
              </div>

              {/* Lưới các chiếc chai đang trôi lững lờ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {bottles.map((b) => {
                  const isSelected = selectedBottle?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => { playClickSound(); setSelectedBottle(b); }}
                      style={{
                        background: isSelected ? 'rgba(56, 189, 248, 0.22)' : 'rgba(15, 23, 42, 0.65)',
                        border: isSelected ? '1.5px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '16px',
                        padding: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 18px rgba(56, 189, 248, 0.35)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}>🍾</span>
                        <span style={{ fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.1)', padding: '2px 8px', borderRadius: '999px', color: '#bae6fd' }}>
                          {b.tag}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f0f9ff' }}>
                        {b.author}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '3px 0 8px' }}>
                        {b.city} • {b.time}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {b.content}
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, display: 'flex', gap: '10px' }}>
                        <span>🫂 {b.hugs}</span>
                        <span>🕯️ {b.candles}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chi tiết bức thư trong chai đang mở */}
              {selectedBottle && (
                <div
                  style={{
                    marginTop: '12px',
                    background: '#fefce8',
                    color: '#1f2937',
                    borderRadius: '16px',
                    padding: '22px',
                    border: '2px solid #fde047',
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #ca8a04', paddingBottom: '10px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.4rem' }}>📜</span>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: '#854d0e' }}>
                          Bức thư của {selectedBottle.author} ({selectedBottle.city})
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: '#a16207' }}>
                          Gửi gắm lúc {selectedBottle.time} • {selectedBottle.tag}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBottle(null)}
                      style={{ background: 'transparent', border: 'none', color: '#854d0e', cursor: 'pointer', fontSize: '1rem', fontWeight: 800 }}
                    >
                      ✕
                    </button>
                  </div>

                  <p style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '0.96rem', lineHeight: '1.7', color: '#1c1917', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {selectedBottle.content}
                  </p>

                  {/* Hành động gửi lại ấm áp */}
                  <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px dashed #ca8a04', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#78350f', fontWeight: 700 }}>
                      Gửi lại năng lượng chữa lành cho người lạ này:
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleSendWarmth(selectedBottle.id, 'hug')}
                        style={{
                          background: interactedBottles[`${selectedBottle.id}_hug`] ? '#dcfce7' : '#ffedd5',
                          border: '1px solid #f97316',
                          color: '#9a3412',
                          padding: '6px 14px',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        🫂 Gửi Cái Ôm Ấm Áp ({selectedBottle.hugs})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWarmth(selectedBottle.id, 'candle')}
                        style={{
                          background: interactedBottles[`${selectedBottle.id}_candle`] ? '#fef9c3' : '#fef3c7',
                          border: '1px solid #eab308',
                          color: '#854d0e',
                          padding: '6px 14px',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        🕯️ Thắp Ngọn Nến Bình An ({selectedBottle.candles})
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CSS Animation sóng âm & xoay cassette */}
        <style>{`
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .retro-eq-bar {
            display: inline-block;
            width: 3px;
            background: #f59e0b;
            border-radius: 2px;
            animation: retroEqBounce 0.75s ease-in-out infinite alternate;
          }
          .retro-eq-1 { height: 5px; animation-delay: 0s; }
          .retro-eq-2 { height: 13px; animation-delay: 0.25s; }
          .retro-eq-3 { height: 8px; animation-delay: 0.4s; }
          .retro-eq-4 { height: 14px; animation-delay: 0.15s; }
          @keyframes retroEqBounce {
            0% { transform: scaleY(0.35); }
            100% { transform: scaleY(1.3); }
          }
        `}</style>
      </div>
    </div>
  );
};
