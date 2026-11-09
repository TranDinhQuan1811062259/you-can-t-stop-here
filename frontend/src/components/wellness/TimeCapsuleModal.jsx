import React, { useState, useEffect, useRef } from 'react';
import { timeCapsuleService } from '../../services/timeCapsuleService';
import { playClickSound, playSingingBowlSound } from '../../utils/soundEffects';
import { AsmrKeyboardToggle } from '../common/AsmrKeyboardToggle';
import { triggerAsmrKeySound } from '../../utils/keyboardSoundEngine';
import { TimeCapsuleMusicPlayer } from './TimeCapsuleMusicPlayer';
import { TimeCapsuleGardenView } from './TimeCapsuleGardenView';

const PRESET_DURATIONS = [
  { label: '1 Tháng (30 ngày)', days: 30, icon: '🌱' },
  { label: '3 Tháng (90 ngày)', days: 90, icon: '🌿' },
  { label: '6 Tháng (Nửa năm)', days: 180, icon: '🍂' },
  { label: '1 Năm (365 ngày)', days: 365, icon: '🌟' },
];

const MOODS = [
  { id: 'heartbreak_love', label: 'Tâm Sự Tình Trường (Cô đơn, đơn phương, mất ai đó 🎶)', icon: '💔', color: '#f43f5e' },
  { id: 'hopeful', label: 'Tia Sáng Hy Vọng (Đầy năng lượng & Niềm tin 🎶)', icon: '✨', color: '#f59e0b' },
  { id: 'anxious', label: 'Đang Lo Âu & Áp Lực', icon: '🌧️', color: '#0ea5e9' },
  { id: 'tired', label: 'Mệt Mỏi Cần Ôm Ấp', icon: '🫂', color: '#ec4899' },
  { id: 'dreamer', label: 'Mơ Mộng & Hoài Bão', icon: '🌙', color: '#8b5cf6' },
  { id: 'peaceful', label: 'An Yên & Tĩnh Lặng', icon: '🍵', color: '#10b981' },
];

const ENVELOPES = [
  { id: 'rose', name: 'San Hô & Tim Vỡ', bg: 'linear-gradient(135deg, #e11d48, #be123c)', border: '#fda4af' },
  { id: 'twilight', name: 'Hoàng Hôn Tím', bg: 'linear-gradient(135deg, #7c3aed, #4c1d95)', border: '#c4b5fd' },
  { id: 'amber', name: 'Hoàng Kim', bg: 'linear-gradient(135deg, #d97706, #b45309)', border: '#fcd34d' },
  { id: 'emerald', name: 'Ngọc Bích', bg: 'linear-gradient(135deg, #059669, #047857)', border: '#6ee7b7' },
  { id: 'indigo', name: 'Huyền Bí', bg: 'linear-gradient(135deg, #4f46e5, #3730a3)', border: '#a5b4fc' },
  { id: 'slate', name: 'Tro Núi Lửa', bg: 'linear-gradient(135deg, #334155, #1e293b)', border: '#94a3b8' },
];

export const TimeCapsuleModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'vault'
  const [capsules, setCapsules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [selectedDurationDays, setSelectedDurationDays] = useState(90);
  const [customDate, setCustomDate] = useState('');
  const [selectedMood, setSelectedMood] = useState('heartbreak_love');
  const [selectedEnvelope, setSelectedEnvelope] = useState('rose');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chế độ xem Kho Hộp: 'garden' (Khu vườn hạt mầm sinh động) | 'list' (Danh sách cổ điển)
  const [vaultViewMode, setVaultViewMode] = useState('garden');

  // Viewing Opened Capsule
  const [readingCapsule, setReadingCapsule] = useState(null);

  // Timer refresh ticker for countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCapsules = async () => {
    try {
      setIsLoading(true);
      const res = await timeCapsuleService.getMyCapsules();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setCapsules(list);
    } catch (err) {
      console.warn('Lỗi lấy danh sách hộp thời gian:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCapsules();
      setReadingCapsule(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPresetDuration = (days) => {
    playClickSound();
    setSelectedDurationDays(days);
    setCustomDate('');
  };

  const calculateUnlockDate = () => {
    if (customDate) {
      return new Date(customDate).toISOString();
    }
    const d = new Date();
    d.setDate(d.getDate() + selectedDurationDays);
    return d.toISOString();
  };

  const handleCreateCapsule = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setAlertMsg('⚠️ Vui lòng viết tiêu đề và lời nhắn gửi tương lai');
      return;
    }

    try {
      setIsSubmitting(true);
      const unlockDate = calculateUnlockDate();
      const createdRes = await timeCapsuleService.createCapsule({
        title: title.trim(),
        content: content.trim(),
        creatorName: creatorName.trim() || 'Tôi của ngày hôm nay',
        unlockDate,
        mood: selectedMood,
        envelopeColor: selectedEnvelope,
      });

      playSingingBowlSound();
      setAlertMsg('✨ Chiếc hộp thời gian đã được niêm phong và cất giữ an toàn!');
      setTitle('');
      setContent('');

      if (createdRes?.data) {
        setCapsules((prev) => [createdRes.data, ...prev.filter((c) => c._id !== createdRes.data._id)]);
      }

      await fetchCapsules();
      setTimeout(() => {
        setActiveTab('vault');
        setAlertMsg('');
      }, 1200);
    } catch (err) {
      setAlertMsg(err.message || 'Không thể tạo hộp thời gian lúc này');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCapsule = async (cap) => {
    try {
      playSingingBowlSound();
      const res = await timeCapsuleService.openCapsule(cap._id);
      if (res?.data) {
        setReadingCapsule(res.data);
        fetchCapsules();
      }
    } catch (err) {
      setAlertMsg(err.message || 'Chưa đến thời điểm mở khóa chiếc hộp này');
    }
  };

  const handleDeleteCapsule = async (capId, e) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn hủy chiếc hộp thời gian này?')) return;
    try {
      playClickSound();
      await timeCapsuleService.deleteCapsule(capId);
      setCapsules((prev) => prev.filter((c) => c._id !== capId));
      if (readingCapsule && readingCapsule._id === capId) {
        setReadingCapsule(null);
      }
    } catch (err) {
      setAlertMsg('Không thể xóa hộp thời gian');
    }
  };

  const formatCountdown = (unlockDateStr) => {
    const diff = new Date(unlockDateStr).getTime() - currentTime;
    if (diff <= 0) return { canOpen: true, text: 'Đã đến ngày mở khóa!' };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return {
      canOpen: false,
      text: `${days} ngày ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    };
  };

  return (
    <div
      className="time-capsule-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
    >
      <div
        className="time-capsule-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          background: 'linear-gradient(165deg, #0f172a 0%, #1e1b4b 100%)',
          border: '1.5px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(245, 158, 11, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
          position: 'relative',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="healing-icon-pill healing-icon-amber" style={{ width: '40px', height: '40px', fontSize: '1.15rem' }}>
              <i className="fa-solid fa-hourglass-half"></i>
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fef3c7', letterSpacing: '0.3px' }}>
                Chiếc Hộp Thời Gian
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Viết một lá thư gửi cho chính bạn trong tương lai
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AsmrKeyboardToggle variant="pill" />
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            padding: '8px 24px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('write');
              setReadingCapsule(null);
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: activeTab === 'write' ? '1.5px solid #f59e0b' : '1px solid transparent',
              background: activeTab === 'write' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'write' ? '#fcd34d' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>💌</span>
            <span>Cất Giữ Thư Mới</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('vault');
              fetchCapsules();
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: activeTab === 'vault' ? '1.5px solid #f59e0b' : '1px solid transparent',
              background: activeTab === 'vault' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'vault' ? '#fcd34d' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🔒</span>
            <span>Kho Hộp Của Tôi ({capsules.length})</span>
          </button>
        </div>

        {/* Alert Notification */}
        {alertMsg && (
          <div
            style={{
              margin: '12px 24px 0',
              padding: '10px 16px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fef3c7',
              fontSize: '0.86rem',
              textAlign: 'center',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {alertMsg}
          </div>
        )}

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* TAB 1: VIẾT THƯ MỚI */}
          {activeTab === 'write' && (
            <form onSubmit={handleCreateCapsule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Nhạc nền Tia Sáng Hy Vọng: Lightning Moment (Harp Version) - TypeD */}
              <TimeCapsuleMusicPlayer
                autoPlay={true}
                currentMood={selectedMood}
                onMoodChange={setSelectedMood}
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Tiêu đề bức thư *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gửi tôi của ngày 30 tuổi, khi đã vượt qua kỳ thi..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={triggerAsmrKeySound}
                  maxLength={120}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1' }}>
                    Tâm tư gửi gắm vào tương lai *
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Bật ASMR để gõ êm tai</span>
                </div>
                <textarea
                  rows={6}
                  placeholder="Hôm nay bạn đang cảm thấy thế nào? Bạn muốn nhắn nhủ điều gì cho bạn của tương lai? Những khó khăn hiện tại là gì? Hãy viết thật chân thật..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={triggerAsmrKeySound}
                  required
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f1f5f9',
                    fontSize: '0.94rem',
                    lineHeight: '1.6',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Hẹn ngày mở khóa */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#fcd34d', marginBottom: '8px' }}>
                  ⏰ Thời gian mở khóa chiếc hộp:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {PRESET_DURATIONS.map((dur) => {
                    const isSelected = selectedDurationDays === dur.days && !customDate;
                    return (
                      <button
                        key={dur.days}
                        type="button"
                        onClick={() => handleSelectPresetDuration(dur.days)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          border: isSelected ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                          background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#fde68a' : '#94a3b8',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{dur.icon}</span>
                        <span>{dur.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Chọn ngày tùy chỉnh */}
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Hoặc chọn ngày cụ thể:</span>
                  <input
                    type="date"
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setSelectedDurationDays(0);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#f8fafc',
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Tâm trạng & Phong bì */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Tâm trạng hôm nay:
                  </label>
                  <select
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  >
                    {MOODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.icon} {m.label}
                      </option>
                    ))}
                  </select>
                  {selectedMood === 'heartbreak_love' && (
                    <div style={{ marginTop: '5px', fontSize: '0.72rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>💔</span>
                      <span>Đang hòa cùng giai điệu vỗ về nỗi đau tình trường & cô đơn (lặp vô tận ♾️)</span>
                    </div>
                  )}
                  {selectedMood === 'hopeful' && (
                    <div style={{ marginTop: '5px', fontSize: '0.72rem', color: '#fde68a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✨</span>
                      <span>Đang hòa cùng giai điệu Tia Sáng Hy Vọng (lặp vô tận ♾️)</span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Sắc màu phong bì:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                    {ENVELOPES.map((env) => (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSelectedEnvelope(env.id);
                        }}
                        title={env.name}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: env.bg,
                          border: selectedEnvelope === env.id ? `2.5px solid ${env.border}` : '1.5px solid transparent',
                          boxShadow: selectedEnvelope === env.id ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Nút Niêm Phong */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '10px',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>🔒</span>
                <span>{isSubmitting ? 'Đang niêm phong...' : 'Niêm Phong & Cất Giữ Vào Tương Lai'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: KHO HỘP THỜI GIAN */}
          {activeTab === 'vault' && (
            <div>
              {/* Đang đọc 1 bức thư đã mở */}
              {readingCapsule ? (
                <div
                  style={{
                    background: 'linear-gradient(180deg, rgba(254, 243, 199, 0.08), rgba(254, 243, 199, 0.02))',
                    border: '1.5px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: '18px',
                    padding: '24px',
                    position: 'relative',
                    animation: 'fadeInUp 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                      ✨ BỨC THƯ TỪ QUÁ KHỨ ĐÃ MỞ KHÓA
                    </span>
                    <button
                      type="button"
                      onClick={() => setReadingCapsule(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#cbd5e1',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      ← Quay lại danh sách
                    </button>
                  </div>

                  <h3 style={{ margin: '0 0 10px', fontSize: '1.3rem', color: '#fef3c7', fontWeight: 800 }}>
                    {readingCapsule.title}
                  </h3>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
                    Viết bởi: <strong>{readingCapsule.creatorName || 'Tôi của ngày trước'}</strong> • Mở khóa lúc:{' '}
                    {new Date(readingCapsule.unlockDate).toLocaleDateString('vi-VN')}
                  </div>

                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '18px',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '0.98rem',
                      lineHeight: '1.8',
                      whiteSpace: 'pre-wrap',
                      borderLeft: '4px solid #f59e0b',
                    }}
                  >
                    {readingCapsule.content}
                  </div>

                  <div style={{ marginTop: '20px', textAlign: 'center', color: '#fcd34d', fontSize: '0.88rem', fontStyle: 'italic' }}>
                    "Hôm nay, bạn đã đi xa hơn ngày hôm qua một đoạn rất dài rồi đấy! Chúc mừng bạn đã luôn kiên trì 🌿✨"
                  </div>
                </div>
              ) : capsules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📦</div>
                  <h4 style={{ margin: '0 0 6px', color: '#f1f5f9' }}>Bạn chưa có chiếc hộp thời gian nào</h4>
                  <p style={{ margin: 0, fontSize: '0.84rem' }}>
                    Hãy viết một bức thư để gửi tặng chính mình của tương lai nhé!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('write')}
                    style={{
                      marginTop: '16px',
                      padding: '8px 18px',
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      color: '#fde68a',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Viết thư ngay 💌
                  </button>
                </div>
              ) : (
                <div>
                  {/* Thanh Chuyển Chế Độ Xem Kho Hộp: Khu Vườn vs Danh Sách */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
                      Không gian lưu giữ kỷ niệm:
                    </span>
                    <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '3px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setVaultViewMode('garden');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: vaultViewMode === 'garden' ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                          color: vaultViewMode === 'garden' ? '#6ee7b7' : '#94a3b8',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>🪴</span>
                        <span>Khu Vườn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setVaultViewMode('list');
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: vaultViewMode === 'list' ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
                          color: vaultViewMode === 'list' ? '#fcd34d' : '#94a3b8',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>📋</span>
                        <span>Danh Sách</span>
                      </button>
                    </div>
                  </div>

                  {/* Render theo chế độ đã chọn */}
                  {vaultViewMode === 'garden' ? (
                    <TimeCapsuleGardenView
                      capsules={capsules}
                      currentTime={currentTime}
                      onOpenCapsule={handleOpenCapsule}
                      onDeleteCapsule={handleDeleteCapsule}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {capsules.map((cap) => {
                        const countdown = formatCountdown(cap.unlockDate);
                        const canOpen = countdown.canOpen || cap.canOpen || cap.isOpened;

                        return (
                          <div
                            key={cap._id}
                            onClick={() => canOpen && handleOpenCapsule(cap)}
                            style={{
                              padding: '16px 20px',
                              borderRadius: '16px',
                              background: canOpen
                                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.8))'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: canOpen
                                ? '1.5px solid rgba(245, 158, 11, 0.5)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                              cursor: canOpen ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '14px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                              <div
                                style={{
                                  width: '46px',
                                  height: '46px',
                                  borderRadius: '14px',
                                  background: canOpen ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.4rem',
                                  flexShrink: 0,
                                }}
                              >
                                {canOpen ? '✨' : '🔒'}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h4
                                  style={{
                                    margin: '0 0 4px',
                                    fontSize: '0.96rem',
                                    fontWeight: 700,
                                    color: canOpen ? '#fef3c7' : '#e2e8f0',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {cap.title}
                                </h4>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span>Từ: {cap.creatorName || 'Tôi'}</span>
                                  <span>•</span>
                                  <span style={{ color: canOpen ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
                                    {canOpen ? '🔓 Sẵn sàng mở khóa' : `⏳ ${countdown.text}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {canOpen ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCapsule(cap)}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    border: 'none',
                                    color: '#0f172a',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                                  }}
                                >
                                  Mở Thư Ngay
                                </button>
                              ) : (
                                <span
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#94a3b8',
                                    fontSize: '0.76rem',
                                  }}
                                >
                                  Đang Khóa
                                </span>
                              )}

                              {cap._id !== 'capsule_welcome_demo' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCapsule(cap._id, e)}
                                  title="Xóa hộp này"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    padding: '4px',
                                  }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
