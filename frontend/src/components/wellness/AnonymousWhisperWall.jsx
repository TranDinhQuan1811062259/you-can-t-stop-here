import React, { useState, useEffect, useRef } from 'react';
import { playClickSound, playSingingBowlSound, createRainAmbientNode } from '../../utils/soundEffects';

const INITIAL_WHISPERS = [
  { id: 'w1', icon: '🕊️', sender: 'Người lạ qua đường', text: 'Dù hôm nay có nhiều chuyện không như ý, bạn đã cố gắng hết sức rồi. Ngủ một giấc thật sâu nhé!', hearts: 42, color: '#38bdf8', isVoice: false },
  { id: 'w2', icon: '🎙️', sender: 'Giọng nói ấm áp', text: '“Bạn ơi... hôm nay vất vả rồi. Nhắm mắt lại và thả lỏng vai ra nhé. Bạn đang làm rất tốt rồi!”', hearts: 89, color: '#f43f5e', isVoice: true, duration: '10s', voiceNote: 'Lời nhắn âm thanh từ trái tim' },
  { id: 'w3', icon: '☕', sender: 'Góc quán quen', text: 'Gửi bạn một tách trà hoa cúc ấm. Đừng để deadline hay áp lực đè nặng lên trái tim bạn đêm nay.', hearts: 35, color: '#fbbf24', isVoice: false },
  { id: 'w4', icon: '🎙️', sender: 'Người cùng thức khuya', text: '“Đừng tự trách bản thân vì những điều chưa làm được ngày hôm nay. Ngày mai trời lại sáng thôi bạn nhé!”', hearts: 64, color: '#ec4899', isVoice: true, duration: '8s', voiceNote: 'Cái ôm âm thanh lúc 1h sáng' },
  { id: 'w5', icon: '🌱', sender: 'Đang học cách lớn', text: 'Chậm lại một chút cũng không sao đâu. Mỗi bông hoa đều có mùa nở riêng của chính nó.', hearts: 58, color: '#34d399', isVoice: false },
  { id: 'w6', icon: '🌙', sender: 'Cú đêm cô đơn', text: 'Nếu bạn đang khóc một mình trong phòng tối, mình gửi bạn một cái ôm thật chặt từ xa nhé.', hearts: 67, color: '#c084fc', isVoice: false },
  { id: 'w7', icon: '✨', sender: 'Tia sáng nhỏ', text: 'Bạn làm tốt hơn bạn nghĩ nhiều lắm. Đừng tự trách mình nữa, bạn tuyệt vời lắm rồi!', hearts: 51, color: '#fde047', isVoice: false },
  { id: 'w8', icon: '🍵', sender: 'Bình yên đêm muộn', text: 'Tắt đèn, hít một hơi thật sâu, thở ra nhẹ nhàng. Bạn an toàn ở đây rồi.', hearts: 44, color: '#2dd4bf', isVoice: false },
];

export const AnonymousWhisperWall = ({ isOpen, onClose }) => {
  const STORAGE_KEY = 'freedom_anonymous_whispers';

  const [whispers, setWhispers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_WHISPERS;
  });

  const [activeWhisper, setActiveWhisper] = useState(null);
  const [newText, setNewText] = useState('');
  const [likedIds, setLikedIds] = useState({});

  // Voice recording state (10-Second Voice Hug)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState(null);

  // Whisper Audio Playback & Ambient Rain Engine
  const [playingWhisperId, setPlayingWhisperId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRainEnabled, setIsRainEnabled] = useState(true);
  const [rainVolume, setRainVolume] = useState(0.12); // Âm lượng 12% êm dịu, không làm chìm giọng

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const previewPlayerRef = useRef(null);
  const playbackAudioRef = useRef(null);
  const rainAmbientNodeRef = useRef(null);

  // Lưu danh sách lời thì thầm vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(whispers));
    } catch (_) {}
  }, [whispers]);

  // Khởi động / Dừng tiếng mưa nền
  const stopRainSound = () => {
    if (rainAmbientNodeRef.current) {
      try {
        rainAmbientNodeRef.current.stop();
      } catch (_) {}
      rainAmbientNodeRef.current = null;
    }
  };

  const startRainSound = () => {
    if (!isRainEnabled) return;
    stopRainSound();
    try {
      rainAmbientNodeRef.current = createRainAmbientNode(rainVolume);
    } catch (e) {
      console.warn('Rain ambient error:', e);
    }
  };

  // Cập nhật âm lượng tiếng mưa khi thay đổi slider
  const handleRainVolumeChange = (newVol) => {
    setRainVolume(newVol);
    if (rainAmbientNodeRef.current) {
      rainAmbientNodeRef.current.setVolume(newVol);
    }
  };

  // Dừng thu âm
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
  };

  // Dừng phát mọi giọng nói & âm thanh
  const stopAllPlayback = () => {
    if (playbackAudioRef.current) {
      try {
        playbackAudioRef.current.pause();
        playbackAudioRef.current.currentTime = 0;
        playbackAudioRef.current.src = '';
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    stopRainSound();
    setPlayingWhisperId(null);
    setIsPlaying(false);
  };

  // Dọn dẹp toàn bộ khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      if (isRecording) stopRecording();
      stopAllPlayback();
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Fallback đọc bằng Web Speech API
  const playWebSpeechFallback = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      stopAllPlayback();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.82; // Chậm rãi, thì thầm
    utterance.pitch = 0.95;
    utterance.onend = () => {
      stopAllPlayback();
    };
    utterance.onerror = () => {
      stopAllPlayback();
    };
    window.speechSynthesis.speak(utterance);
  };

  // Gọi A.I đọc thì thầm (Backend Edge TTS hoặc Fallback Web Speech Synthesis)
  const playWithVoiceAI = (rawText) => {
    const cleanText = (rawText || '').replace(/^["“]|["”]$/g, '').trim();
    if (!cleanText) {
      stopAllPlayback();
      return;
    }

    if (playbackAudioRef.current) {
      // Gọi TTS backend với giọng nữ trầm ấm, nhẹ nhàng thì thầm
      const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&lang=vi&gender=female&mood=melancholic&speed=0.85`;
      playbackAudioRef.current.src = ttsUrl;
      playbackAudioRef.current.volume = 1.0;

      const playPromise = playbackAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback sang Web Speech tiếng Việt nếu server chậm/offline
          playWebSpeechFallback(cleanText);
        });
      }
    } else {
      playWebSpeechFallback(cleanText);
    }
  };

  // Xử lý bật / tạm dừng phát một lời thì thầm (Voice Hug hoặc Đọc bằng A.I)
  const handleTogglePlayWhisper = (w, e) => {
    if (e) e.stopPropagation();
    playClickSound();

    // Nếu đang phát chính card này -> bấm để dừng
    if (playingWhisperId === w.id && isPlaying) {
      stopAllPlayback();
      return;
    }

    // Dừng âm thanh đang chạy trước
    stopAllPlayback();

    setPlayingWhisperId(w.id);
    setIsPlaying(true);
    setActiveWhisper(w);

    // Kích hoạt tiếng mưa rào nhẹ nhàng ngầm (không lấn át giọng nói)
    startRainSound();

    // 1. Trường hợp card có file voice thực tế (do người dùng thu âm lưu lại)
    if (w.audioSrc) {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.src = w.audioSrc;
        playbackAudioRef.current.volume = 1.0;
        playbackAudioRef.current
          .play()
          .catch((err) => {
            console.warn('Playback audioSrc failed:', err);
            // Fallback đọc text nếu file audio bị lỗi
            playWithVoiceAI(w.text);
          });
      }
      return;
    }

    // 2. Trường hợp card mẫu hoặc lời thì thầm bằng chữ: Dùng giọng A.I thì thầm vỗ về
    playWithVoiceAI(w.text);
  };

  const handleAudioEnded = () => {
    stopAllPlayback();
  };

  const handleAudioError = () => {
    if (activeWhisper) {
      const cleanText = (activeWhisper.text || '').replace(/^["“]|["”]$/g, '').trim();
      playWebSpeechFallback(cleanText);
    } else {
      stopAllPlayback();
    }
  };

  const handleLike = (wId, e) => {
    e.stopPropagation();
    playClickSound();
    if (likedIds[wId]) return;

    setLikedIds((prev) => ({ ...prev, [wId]: true }));
    setWhispers((prev) =>
      prev.map((item) =>
        item.id === wId ? { ...item, hearts: item.hearts + 1 } : item
      )
    );

    if (activeWhisper && activeWhisper.id === wId) {
      setActiveWhisper((prev) => ({ ...prev, hearts: prev.hearts + 1 }));
    }
  };

  // Bắt đầu thu âm giọng nói 10 giây (Voice Hug)
  const startRecording = async () => {
    playClickSound();
    stopAllPlayback();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(url);

        // Chuyển sang Base64 Data URL để lưu vĩnh viễn vào localStorage không bị mất khi F5
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudioBase64(reader.result);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 9) {
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      alert('Freedom cần quyền truy cập Micro để bạn gửi lời thì thầm âm thanh. Bạn vui lòng cấp quyền cho trình duyệt nhé!');
    }
  };

  // Gửi lời thì thầm bằng chữ
  const handleSendTextWhisper = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;

    playSingingBowlSound();
    const newWhisper = {
      id: `w_${Date.now()}`,
      icon: '✨',
      sender: 'Người bạn giấu tên',
      text: newText.trim(),
      hearts: 1,
      color: '#38bdf8',
      isVoice: false,
    };

    setWhispers([newWhisper, ...whispers]);
    setNewText('');
  };

  // Gửi lời thì thầm âm thanh (Voice Hug)
  const handleSendVoiceHug = () => {
    if (!recordedAudioUrl && !recordedAudioBase64) return;
    playSingingBowlSound();

    const persistentAudio = recordedAudioBase64 || recordedAudioUrl;

    const newWhisper = {
      id: `w_${Date.now()}`,
      icon: '🎙️',
      sender: 'Lời Thì Thầm Của Bạn',
      text: '“Gửi bạn một cái ôm âm thanh 10 giây được ghi âm từ trái tim của một người bạn phương xa.”',
      hearts: 1,
      color: '#f43f5e',
      isVoice: true,
      duration: `${recordingSeconds || 10}s`,
      voiceNote: 'Bản thu âm trực tiếp của bạn',
      audioSrc: persistentAudio,
    };

    setWhispers([newWhisper, ...whispers]);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordedAudioBase64(null);
    setRecordingSeconds(0);
    setActiveWhisper(newWhisper);

    // Phát lại ngay giọng của mình để kiểm tra
    setTimeout(() => {
      handleTogglePlayWhisper(newWhisper);
    }, 200);
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
        background: 'rgba(6, 10, 20, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Audio element ẩn dùng để phát Voice Hug và A.I TTS */}
      <audio
        ref={playbackAudioRef}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        style={{ display: 'none' }}
      />

      <div
        className="whisper-wall-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '840px',
          maxHeight: '92vh',
          borderRadius: '26px',
          background: 'linear-gradient(165deg, #0b1120 0%, #171d33 50%, #080c18 100%)',
          border: '1.5px solid rgba(129, 140, 248, 0.45)',
          color: '#ffffff',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.95), 0 0 50px rgba(129, 140, 248, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header Bức Tường Thì Thầm & Voice Hugs */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(129, 140, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(8, 12, 22, 0.98))',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 8px rgba(129, 140, 248, 0.5))' }}>
              🎙️
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#c7d2fe', fontWeight: 900 }}>
                Bức Tường Thì Thầm & Cái Ôm 10 Giây (Voice Hugs)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                Lắng nghe những giọng nói thì thầm ấm áp ẩn danh hoặc thu âm một lời động viên gửi lên bầu trời sao.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Thanh điều khiển tiếng mưa đêm nhẹ nhàng */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '0.74rem',
              }}
              title="Tiếng mưa rơi nhẹ nhàng ngoài ô cửa sổ, không làm chìm giọng nói"
            >
              <button
                type="button"
                onClick={() => {
                  const nextState = !isRainEnabled;
                  setIsRainEnabled(nextState);
                  if (!nextState) {
                    stopRainSound();
                  } else if (isPlaying) {
                    startRainSound();
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isRainEnabled ? '#38bdf8' : '#64748b',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                <span>{isRainEnabled ? '🌧️ Mưa Đêm:' : '🔇 Tắt Mưa:'}</span>
                <span style={{ color: isRainEnabled ? '#a5f3fc' : '#94a3b8' }}>
                  {isRainEnabled ? 'Bật (12%)' : 'Tắt'}
                </span>
              </button>
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
                color: '#c7d2fe',
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
        </div>

        {/* Thanh trạng thái phát giọng thì thầm hiện tại (khi đang nghe) */}
        {isPlaying && activeWhisper && (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.25) 0%, rgba(244, 63, 94, 0.25) 100%)',
              borderBottom: '1px solid rgba(129, 140, 248, 0.35)',
              padding: '8px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#e0e7ff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span style={{ fontSize: '1.1rem' }}>🎧</span>
              <span style={{ fontWeight: 700, color: '#f43f5e' }}>Đang phát:</span>
              <span style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '380px' }}>
                {activeWhisper.sender} — {activeWhisper.text}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="whisper-equalizer" style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '14px' }}>
                <span className="eq-bar eq-bar-1"></span>
                <span className="eq-bar eq-bar-2"></span>
                <span className="eq-bar eq-bar-3"></span>
                <span className="eq-bar eq-bar-4"></span>
              </div>
              <button
                type="button"
                onClick={stopAllPlayback}
                style={{
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⏹ Dừng nghe
              </button>
            </div>
          </div>
        )}

        {/* Thân cửa sổ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* 1. BÀN THU ÂM CÁI ÔM 10 GIÂY */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1.5px solid rgba(244, 63, 94, 0.4)',
              borderRadius: '20px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎙️</span>
                <strong style={{ fontSize: '0.95rem', color: '#fda4af' }}>
                  Thu Âm Cái Ôm 10 Giây (Voice Hug):
                </strong>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
                Nói một câu động viên ngắn ngủi (tối đa 10s) gửi tới ai đó đang buồn đêm nay.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!isRecording && !recordedAudioUrl && (
                <button
                  type="button"
                  onClick={startRecording}
                  style={{
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '8px 20px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(225, 29, 72, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🔴</span>
                  <span>Bấm Để Thu Âm 10s</span>
                </button>
              )}

              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontWeight: 800, fontSize: '0.88rem' }}>
                    <span style={{ animation: 'blinkDot 1s infinite' }}>🔴</span>
                    <span>Đang thu: {recordingSeconds}s / 10s</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '6px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Xong
                  </button>
                </div>
              )}

              {recordedAudioUrl && !isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <audio ref={previewPlayerRef} src={recordedAudioUrl} controls style={{ height: '32px', maxWidth: '170px' }} />
                  <button
                    type="button"
                    onClick={handleSendVoiceHug}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Thả Lên Bầu Trời ✨
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordedAudioUrl(null);
                      setRecordedAudioBlob(null);
                      setRecordedAudioBase64(null);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. BẦU TRỜI SAO VÀ CÁC ĐỐM THÌ THẦM */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {whispers.map((w) => {
              const isLiked = likedIds[w.id];
              const isCurrentPlaying = playingWhisperId === w.id && isPlaying;
              const isSelected = activeWhisper?.id === w.id;

              return (
                <div
                  key={w.id}
                  onClick={(e) => handleTogglePlayWhisper(w, e)}
                  style={{
                    borderRadius: '18px',
                    padding: '14px',
                    background: isCurrentPlaying
                      ? `linear-gradient(145deg, ${w.color}55 0%, rgba(30, 41, 59, 0.98) 100%)`
                      : isSelected
                      ? `linear-gradient(145deg, ${w.color}35 0%, rgba(15, 23, 42, 0.95) 100%)`
                      : `linear-gradient(145deg, ${w.color}15 0%, rgba(15, 23, 42, 0.75) 100%)`,
                    border: isCurrentPlaying
                      ? `2px solid #f43f5e`
                      : isSelected
                      ? `2px solid ${w.color}`
                      : `1.5px solid ${w.color}45`,
                    boxShadow: isCurrentPlaying
                      ? `0 0 25px rgba(244, 63, 94, 0.6)`
                      : isSelected
                      ? `0 0 22px ${w.color}60`
                      : `0 4px 16px rgba(0, 0, 0, 0.3)`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '135px',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{w.icon}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {w.audioSrc ? (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                            🎙️ {w.duration || 'Bản thu'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(244, 63, 94, 0.25)', color: '#fda4af', border: '1px solid #f43f5e', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                            ✨ A.I Thì Thầm
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: w.color, fontWeight: 800, marginBottom: '4px' }}>
                      {w.sender}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#f1f5f9', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {w.text}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                      type="button"
                      onClick={(e) => handleTogglePlayWhisper(w, e)}
                      style={{
                        background: isCurrentPlaying ? 'linear-gradient(135deg, #ef4444, #e11d48)' : 'rgba(255, 255, 255, 0.12)',
                        border: isCurrentPlaying ? '1px solid #fda4af' : '1px solid rgba(255, 255, 255, 0.2)',
                        color: isCurrentPlaying ? '#ffffff' : '#cbd5e1',
                        borderRadius: '999px',
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{isCurrentPlaying ? '⏸ Tạm dừng' : '▶ Bấm để nghe'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleLike(w.id, e)}
                      style={{
                        background: isLiked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        border: isLiked ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                        color: isLiked ? '#f87171' : '#cbd5e1',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>❤️</span>
                      <span>{w.hearts}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ô nhập lời thì thầm bằng chữ */}
          <form noValidate onSubmit={handleSendTextWhisper} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Gửi một lời động viên bằng chữ ẩn danh lên bầu trời sao..."
              maxLength={120}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1.5px solid rgba(129, 140, 248, 0.3)',
                borderRadius: '12px',
                padding: '10px 16px',
                color: '#ffffff',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!newText.trim()}
              style={{
                background: newText.trim() ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.1)',
                color: newText.trim() ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: newText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Thả Lên Sao ✨
            </button>
          </form>
        </div>

        <style>{`
          @keyframes blinkDot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .whisper-equalizer .eq-bar {
            display: inline-block;
            width: 3px;
            background: #fda4af;
            border-radius: 2px;
            animation: eqBounce 0.8s ease-in-out infinite alternate;
          }
          .whisper-equalizer .eq-bar-1 { height: 6px; animation-delay: 0s; }
          .whisper-equalizer .eq-bar-2 { height: 12px; animation-delay: 0.2s; }
          .whisper-equalizer .eq-bar-3 { height: 8px; animation-delay: 0.4s; }
          .whisper-equalizer .eq-bar-4 { height: 14px; animation-delay: 0.1s; }
          @keyframes eqBounce {
            0% { transform: scaleY(0.4); }
            100% { transform: scaleY(1.2); }
          }
        `}</style>
      </div>
    </div>
  );
};
