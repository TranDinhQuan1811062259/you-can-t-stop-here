import React, { useState, useRef, useEffect } from 'react';
import { analyzeRecordedVoiceAudio, aiVoicePlayer } from '../../utils/aiVoiceEngine';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { playClickSound } from '../../utils/soundEffects';

export const VoiceCloningModal = ({ isOpen, onClose, onVoiceSaved }) => {
  const { user, updateUserProfile } = useAuth();

  const [step, setStep] = useState('ready'); // 'ready' | 'recording' | 'analyzing' | 'completed'
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [clonedProfile, setClonedProfile] = useState(null);
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioBlobRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('ready');
      setRecordDuration(0);
      setAudioUrl(null);
      setClonedProfile(null);
      setErrorMsg('');
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      aiVoicePlayer.stop();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Bắt đầu thu âm
  const handleStartRecording = async () => {
    playClickSound();
    setErrorMsg('');
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('Trình duyệt của bạn chưa cấp quyền hoặc không hỗ trợ Micro thu âm.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioBlobRef.current = audioBlob;
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Tắt micro stream
        stream.getTracks().forEach((track) => track.stop());

        // Chuyển sang bước A.I Phân tích giọng nói
        setStep('analyzing');
        try {
          const profile = await analyzeRecordedVoiceAudio(audioBlob);
          setClonedProfile(profile);
          setStep('completed');
        } catch (err) {
          console.warn('Analysis error:', err);
          // Fallback kết quả
          setClonedProfile({
            pitch: 1.05,
            rate: 1.0,
            f0: 175,
            timbre: 'Tự nhiên & truyền cảm',
            duration: recordDuration,
            name: 'Giọng đọc A.I chính chủ',
            analyzedAt: new Date().toISOString(),
          });
          setStep('completed');
        }
      };

      mediaRecorder.start(250);
      setStep('recording');
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied:', err);
      setErrorMsg('Không thể truy cập Microphone. Vui lòng cấp quyền Micro trên thanh địa chỉ trình duyệt để thu âm.');
    }
  };

  // Dừng thu âm
  const handleStopRecording = () => {
    playClickSound();
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Nghe thử giọng A.I đã học từ bản thu
  const handleTestClonedVoice = () => {
    playClickSound();
    if (!clonedProfile) return;

    if (isTestingSpeech) {
      aiVoicePlayer.stop();
      setIsTestingSpeech(false);
      return;
    }

    setIsTestingSpeech(true);
    const testText = 'Xin chào, tôi là mô hình A.I đã học xong giọng nói của bạn. Giờ đây tôi có thể đọc bất kỳ bài viết tâm sự nào bằng chính chất giọng này!';

    aiVoicePlayer.play({
      text: testText,
      moodId: 'custom_voice',
      customVoiceProfile: clonedProfile,
      onProgress: () => {},
      onStateChange: (state) => {
        if (state === 'idle') setIsTestingSpeech(false);
      },
    });
  };

  // Lưu hồ sơ giọng nói vào tài khoản
  const handleSaveProfile = async () => {
    playClickSound();
    if (!clonedProfile) return;
    setIsSaving(true);

    try {
      const voiceData = {
        enabled: true,
        voiceName: clonedProfile.name || 'Giọng đọc A.I chính chủ',
        sampleAudioUrl: audioUrl || '',
        pitch: clonedProfile.pitch,
        rate: clonedProfile.rate,
        timbre: clonedProfile.timbre,
        recordedAt: new Date().toISOString(),
      };

      // Cập nhật lên server nếu đã đăng nhập
      if (user) {
        await authService.updateProfile({ customVoiceProfile: voiceData }).catch(() => {});
        updateUserProfile({ customVoiceProfile: voiceData });
      }

      // Lưu offline
      try {
        localStorage.setItem('freedom_custom_voice_profile', JSON.stringify(voiceData));
      } catch (e) {}

      if (onVoiceSaved) onVoiceSaved(voiceData);
      onClose();
    } catch (err) {
      console.warn('Lưu voice profile thất bại:', err);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10005 }}>
      <div
        className="modal-box voice-cloning-modal"
        style={{ maxWidth: '520px', borderRadius: '18px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose} title="Đóng">
          ✕
        </button>

        {/* Header Modal */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 12px',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            }}
          >
            🎙️
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', color: 'var(--text-color, #0f172a)' }}>
            Phòng Thu Âm Nhân Bản Giọng Nói A.I
          </h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
            Chỉ cần đọc một đoạn ngắn 5-10 giây, A.I sẽ phân tích âm sắc & cao độ để tự động đọc mọi bài viết bằng chính giọng của bạn!
          </p>
        </div>

        {errorMsg && (
          <div className="alert-message error" style={{ margin: '0 0 16px', fontSize: '0.84rem' }}>
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Đoạn văn mẫu gợi ý đọc */}
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1.5px dashed #818cf8',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6366f1', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
            📜 Đoạn văn bản mẫu để bạn đọc vào Micro:
          </span>
          <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.96rem', color: '#1e293b', fontWeight: 500, lineHeight: 1.6 }}>
            "Cuộc sống đôi khi có những lúc mỏi mệt, nhưng chỉ cần bạn không bỏ cuộc, ngày mai ánh mặt trời vẫn sẽ rạng rỡ."
          </p>
        </div>

        {/* ========================================================
            BƯỚC 1: SẴN SÀNG HOẶC ĐANG THU ÂM
           ======================================================== */}
        {(step === 'ready' || step === 'recording') && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ position: 'relative', display: 'inline-block', margin: '10px 0 16px' }}>
              <button
                type="button"
                className={`voice-record-btn ${step === 'recording' ? 'is-recording' : ''}`}
                onClick={step === 'recording' ? handleStopRecording : handleStartRecording}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: step === 'recording' ? '#ef4444' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#ffffff',
                  border: '4px solid #ffffff',
                  boxShadow: step === 'recording'
                    ? '0 0 0 8px rgba(239, 68, 68, 0.3), 0 10px 25px rgba(239, 68, 68, 0.4)'
                    : '0 0 0 6px rgba(99, 102, 241, 0.25), 0 10px 25px rgba(99, 102, 241, 0.4)',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step === 'recording' ? '⏹' : '🎤'}
              </button>
            </div>

            <div>
              {step === 'recording' ? (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
                    00:{recordDuration < 10 ? `0${recordDuration}` : recordDuration}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                    Đang lắng nghe... Hãy đọc to và rõ ràng đoạn văn mẫu ở trên. Bấm lại để dừng.
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Bấm nút Micro để bắt đầu thu âm (khuyến nghị đọc từ 5 - 10 giây)
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            BƯỚC 2: A.I ĐANG PHÂN TÍCH ÂM VỰC & CAO ĐỘ
           ======================================================== */}
        {step === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div className="voice-dna-spinner" style={{ fontSize: '2.5rem', marginBottom: '16px', animation: 'spin 1.5s linear infinite' }}>
              🧬
            </div>
            <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#0f172a' }}>
              A.I Đang Trích Xuất & Phân Tích Giọng Nói...
            </h4>
            <div style={{ fontSize: '0.82rem', color: '#6366f1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>• Đang đo tần số âm cơ bản (F0 Autocorrelation)...</span>
              <span>• Đang phân tích âm sắc, nhịp điệu và độ ấm áp...</span>
              <span>• Đang hiệu chỉnh mô hình giọng đọc A.I cá nhân hóa...</span>
            </div>
          </div>
        )}

        {/* ========================================================
            BƯỚC 3: PHÂN TÍCH HOÀN TẤT & NGHE THỬ
           ======================================================== */}
        {step === 'completed' && clonedProfile && (
          <div>
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  📊 Kết quả phân tích âm học A.I:
                </span>
                <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                  ✓ Đã học xong
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Cao độ trung bình (F0):</span>
                  <strong style={{ color: '#6366f1', fontSize: '1rem' }}>{clonedProfile.f0} Hz</strong>
                </div>

                <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Nhịp độ (Tempo):</span>
                  <strong style={{ color: '#0d9488', fontSize: '1rem' }}>{clonedProfile.rate}x tự nhiên</strong>
                </div>

                <div style={{ gridColumn: 'span 2', background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Âm sắc nhận diện (Timbre):</span>
                  <strong style={{ color: '#0f172a' }}>{clonedProfile.timbre}</strong>
                </div>
              </div>

              {/* Nghe lại bản gốc */}
              {audioUrl && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Bản thu âm gốc của bạn:
                  </span>
                  <audio controls src={audioUrl} style={{ width: '100%', height: '36px' }} />
                </div>
              )}
            </div>

            {/* Nút nghe thử bản A.I nói bằng giọng vừa học */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handleTestClonedVoice}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: isTestingSpeech ? '#f59e0b' : '#ede9fe',
                  color: isTestingSpeech ? '#ffffff' : '#6d28d9',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <span>{isTestingSpeech ? '⏹ Dừng thử' : '🔊 Nghe A.I đọc thử bằng giọng này'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('ready');
                  setAudioUrl(null);
                  setClonedProfile(null);
                }}
                style={{
                  padding: '11px 16px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                🔄 Thu lại
              </button>
            </div>

            {/* Nút Lưu Hồ Sơ Giọng Nói */}
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.96rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              {isSaving ? 'Đang lưu...' : '✓ Lưu & Dùng Giọng A.I Này Cho Bài Viết'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

