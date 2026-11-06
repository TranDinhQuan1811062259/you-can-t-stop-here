import React, { useState, useEffect, useRef } from 'react';
import { playClickSound } from '../../utils/soundEffects';

export const MediaCameraCaptureModal = ({ isOpen, onClose, onMediaCaptured }) => {
  const [activeTab, setActiveTab] = useState('photo'); // 'photo' | 'video'
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' (trước) | 'environment' (sau)

  // Trạng thái chụp ảnh
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  // Trạng thái quay video
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const fallbackInputRef = useRef(null);

  // Khởi động Camera / Webcam khi mở Modal
  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setCameraError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt của bạn chưa hỗ trợ truy cập trực tiếp Camera/Webcam. Vui lòng sử dụng file đính kèm.');
      }

      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: activeTab === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('Video play warning:', err));
      }
    } catch (err) {
      console.warn('Lỗi mở Camera/Webcam:', err);
      let msg = 'Không thể mở Camera/Webcam. Vui lòng cho phép quyền truy cập Camera trên trình duyệt của bạn!';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Bạn đã từ chối quyền truy cập Camera/Webcam. Vui lòng bấm vào biểu tượng ổ khóa trên thanh địa chỉ để cấp quyền.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Không tìm thấy thiết bị Camera hoặc Webcam trên máy tính/điện thoại của bạn.';
      }
      setCameraError(msg);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setRecordedVideoBlob(null);
      setRecordedVideoUrl(null);
      setIsRecording(false);
      setRecordingSeconds(0);
      startCamera(facingMode);
    } else {
      stopCamera();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      stopCamera();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, activeTab, facingMode]);

  if (!isOpen) return null;

  // Đổi Camera Trước / Sau (cho điện thoại)
  const handleToggleFacingMode = () => {
    playClickSound();
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // ==========================================
  // XỬ LÝ CHỤP ẢNH (TAKE PHOTO)
  // ==========================================
  const handleCapturePhoto = () => {
    playClickSound();
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Nếu là camera trước (selfie), lật gương để ảnh tự nhiên
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPhoto(dataUrl);
    }
  };

  const handleRetakePhoto = () => {
    playClickSound();
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  const handleConfirmInsertPhoto = () => {
    playClickSound();
    if (!capturedPhoto) return;

    if (onMediaCaptured) {
      onMediaCaptured({
        type: 'image',
        dataUrl: capturedPhoto,
        source: 'camera',
      });
    }
    onClose();
  };

  // ==========================================
  // XỬ LÝ QUAY VIDEO (RECORD VIDEO)
  // ==========================================
  const handleStartRecording = () => {
    playClickSound();
    if (!cameraStream) return;

    recordedChunksRef.current = [];
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);

    try {
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      let recorder;
      try {
        recorder = new MediaRecorder(cameraStream, options);
      } catch (e) {
        recorder = new MediaRecorder(cameraStream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(url);
      };

      recorder.start(500); // chunk every 500ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      // Đếm thời gian quay
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) {
            // Tối đa 3 phút
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      alert('Không thể bắt đầu quay video: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    playClickSound();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRetakeVideo = () => {
    playClickSound();
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    startCamera(facingMode);
  };

  const handleConfirmInsertVideo = () => {
    playClickSound();
    if (!recordedVideoBlob && !recordedVideoUrl) return;

    // Chuyển đổi sang base64 dataUrl hoặc truyền URL blob
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result;
      if (onMediaCaptured) {
        onMediaCaptured({
          type: 'video',
          dataUrl: base64Url,
          blobUrl: recordedVideoUrl,
          source: 'camera',
        });
      }
      onClose();
    };
    reader.readAsDataURL(recordedVideoBlob);
  };

  // Fallback tải file trực tiếp từ camera qua HTML5 file input
  const handleFallbackFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    const reader = new FileReader();
    reader.onload = () => {
      if (onMediaCaptured) {
        onMediaCaptured({
          type: isVid ? 'video' : 'image',
          dataUrl: reader.result,
          source: 'camera_fallback',
        });
      }
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-backdrop media-capture-backdrop" onClick={onClose}>
      <div
        className="modal-box media-capture-modal"
        style={{ maxWidth: '680px', width: '95%', padding: '20px 24px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close-btn" onClick={onClose} title="Đóng">
          ✕
        </button>

        {/* Tiêu đề & Chọn Chế Độ Chụp Ảnh / Quay Video */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem' }}>{activeTab === 'photo' ? '📸' : '🎥'}</span>
            <h3 className="modal-heading" style={{ margin: 0, fontSize: '1.25rem' }}>
              {activeTab === 'photo' ? 'Chụp Ảnh Từ Camera / Webcam' : 'Quay Video Từ Camera / Webcam'}
            </h3>
          </div>

          {/* Tab chuyển đổi Chụp Ảnh / Quay Video */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '3px' }}>
            <button
              type="button"
              className={`toolbar-btn ${activeTab === 'photo' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('photo');
                setCapturedPhoto(null);
                setRecordedVideoBlob(null);
              }}
              style={{ padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              📸 Chụp Ảnh
            </button>
            <button
              type="button"
              className={`toolbar-btn ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('video');
                setCapturedPhoto(null);
                setRecordedVideoBlob(null);
              }}
              style={{ padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              🎥 Quay Video
            </button>
          </div>
        </div>

        {/* Khung Hiển Thị Camera / Preview */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '360px',
            background: '#090d16',
            borderRadius: '14px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isRecording ? '3px solid #ef4444' : '2px solid rgba(45, 212, 191, 0.35)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          {cameraError ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#f87171' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
              <p style={{ margin: '0 0 14px', fontSize: '0.88rem' }}>{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="page-btn"
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                🔄 Thử lại kết nối Camera
              </button>
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  style={{
                    background: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📱 Mở Camera Di Động Trực Tiếp
                </button>
                <input
                  ref={fallbackInputRef}
                  type="file"
                  accept={activeTab === 'photo' ? 'image/*' : 'video/*'}
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFallbackFileSelect}
                />
              </div>
            </div>
          ) : capturedPhoto ? (
            /* Xem Lại Ảnh Vừa Chụp */
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <img
                src={capturedPhoto}
                alt="Ảnh vừa chụp"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(16, 185, 129, 0.85)',
                  color: '#ffffff',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                }}
              >
                ✓ Đã chụp ảnh thành công
              </div>
            </div>
          ) : recordedVideoUrl ? (
            /* Xem Lại Video Vừa Quay */
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <video
                src={recordedVideoUrl}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(16, 185, 129, 0.85)',
                  color: '#ffffff',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                }}
              >
                ✓ Đã quay video ({formatSeconds(recordingSeconds)})
              </div>
            </div>
          ) : (
            /* Live Stream Video Trực Tiếp Từ Camera/Webcam */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />

              {/* Lưới căn chỉnh (Grid lines) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gridTemplateRows: '1fr 1fr 1fr',
                }}
              >
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.15)', borderBottom: '1px dashed rgba(255, 255, 255, 0.15)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.15)', borderBottom: '1px dashed rgba(255, 255, 255, 0.15)' }} />
                <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.15)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.15)', borderBottom: '1px dashed rgba(255, 255, 255, 0.15)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.15)', borderBottom: '1px dashed rgba(255, 255, 255, 0.15)' }} />
                <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.15)' }} />
              </div>

              {/* Nút Đổi Camera Trước/Sau (cho Điện Thoại) */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Đổi camera trước hoặc sau"
              >
                <span>🔄</span>
                <span>{facingMode === 'user' ? 'Cam Trước' : 'Cam Sau'}</span>
              </button>

              {/* Đồng Hồ Đếm Thời Gian Khi Đang Quay Video */}
              {isRecording && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'monospace',
                    animation: 'pulseGlow 1.5s infinite',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />
                  <span>REC {formatSeconds(recordingSeconds)} / 03:00</span>
                </div>
              )}
            </>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Thanh Điều Khiển Chụp / Quay / Chèn */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {capturedPhoto ? (
            /* Các nút khi ĐÃ CHỤP ẢNH */
            <>
              <button
                type="button"
                className="page-btn"
                onClick={handleRetakePhoto}
                style={{ flex: 1, padding: '10px 16px', fontSize: '0.88rem' }}
              >
                🔄 Chụp Lại
              </button>
              <button
                type="button"
                className="modal-submit-btn"
                onClick={handleConfirmInsertPhoto}
                style={{ flex: 2, margin: 0, padding: '10px 18px', fontSize: '0.92rem' }}
              >
                ✓ Chèn Ảnh Này Vào Bài Viết
              </button>
            </>
          ) : recordedVideoUrl ? (
            /* Các nút khi ĐÃ QUAY XONG VIDEO */
            <>
              <button
                type="button"
                className="page-btn"
                onClick={handleRetakeVideo}
                style={{ flex: 1, padding: '10px 16px', fontSize: '0.88rem' }}
              >
                🔄 Quay Lại
              </button>
              <button
                type="button"
                className="modal-submit-btn"
                onClick={handleConfirmInsertVideo}
                style={{ flex: 2, margin: 0, padding: '10px 18px', fontSize: '0.92rem' }}
              >
                ✓ Chèn Video Này Vào Bài Viết
              </button>
            </>
          ) : activeTab === 'photo' ? (
            /* Nút Chụp Ảnh Trực Tiếp */
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="page-btn"
                onClick={onClose}
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={Boolean(cameraError)}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0d9488, #059669)',
                  border: '4px solid #ffffff',
                  boxShadow: '0 6px 20px rgba(13, 148, 136, 0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  color: '#ffffff',
                  transition: 'transform 0.15s ease',
                }}
                title="Bấm để chụp ảnh"
              >
                📸
              </button>

              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Bấm nút tròn để chụp
              </span>
            </div>
          ) : (
            /* Nút Quay Video Trực Tiếp */
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="page-btn"
                onClick={onClose}
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                Hủy
              </button>

              {isRecording ? (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '999px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  <span>⏹</span>
                  <span>Dừng Quay & Xem Lại</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={Boolean(cameraError)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    border: '4px solid #ffffff',
                    boxShadow: '0 6px 20px rgba(239, 68, 68, 0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    color: '#ffffff',
                    transition: 'transform 0.15s ease',
                  }}
                  title="Bấm để bắt đầu quay video"
                >
                  🔴
                </button>
              )}

              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {isRecording ? 'Đang quay video...' : 'Bấm nút đỏ để quay'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
