import React, { useState, useEffect, useRef } from 'react';
import { timeCapsuleService } from '../../services/timeCapsuleService';
import { playClickSound, playSingingBowlSound } from '../../utils/soundEffects';
import { AsmrKeyboardToggle } from '../common/AsmrKeyboardToggle';
import { triggerAsmrKeySound } from '../../utils/keyboardSoundEngine';
import { TimeCapsuleMusicPlayer } from './TimeCapsuleMusicPlayer';
import { TimeCapsuleGardenView } from './TimeCapsuleGardenView';
import { useAuth } from '../../context/AuthContext';

const PRESET_DURATIONS = [
  { label: '1 Tháng (30 ngày)', days: 30, icon: '🌱' },
  { label: '3 Tháng (90 ngày)', days: 90, icon: '🌿' },
  { label: '6 Tháng (Nửa năm)', days: 180, icon: '🍂' },
  { label: '1 Năm (365 ngày)', days: 365, icon: '🌟' },
];

export const PAPERS = [
  {
    id: 'kraft',
    name: 'Giấy Kraft Nâu Cổ Điển',
    desc: 'Thô mộc, ấm áp & chân phương',
    bg: '#d2b48c',
    textColor: '#3b220c',
    borderColor: '#b8905b',
    texture: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.06) 100%)',
  },
  {
    id: 'parchment',
    name: 'Giấy Da Bò Ngả Vàng',
    desc: 'Cổ kính & hoài niệm thời gian',
    bg: '#fef3c7',
    textColor: '#1e293b',
    borderColor: '#fde68a',
    texture: 'radial-gradient(circle at 20% 20%, rgba(217,119,6,0.06) 0%, rgba(0,0,0,0.04) 100%)',
  },
  {
    id: 'grid',
    name: 'Ô Ly Tập Vở Học Trò',
    desc: 'Trang giấy ngây ngô thời đi học',
    bg: '#f8fafc',
    textColor: '#0f172a',
    borderColor: '#cbd5e1',
    gridPattern: 'linear-gradient(rgba(147, 197, 253, 0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(147, 197, 253, 0.35) 1px, transparent 1px)',
  },
];

export const STAMPS = [
  { id: 'dandelion', icon: '🌼', name: 'Bồ Công Anh', quote: 'Bay theo gió ước mơ', color: '#f59e0b' },
  { id: 'coffee', icon: '☕', name: 'Cà Phê Sáng', quote: 'Góc quán chiều mưa', color: '#b45309' },
  { id: 'maple', icon: '🍁', name: 'Lá Phong Thu', quote: 'Ký ức hoài niệm', color: '#e11d48' },
  { id: 'train', icon: '🚂', name: 'Chuyến Tàu Đêm', quote: 'Hành trình trưởng thành', color: '#6366f1' },
];

export const WAX_SEALS = [
  { id: 'royal_red', name: 'Đỏ Hoàng Gia', color: '#dc2626', border: '#991b1b', glow: 'rgba(220, 38, 38, 0.5)' },
  { id: 'antique_gold', name: 'Vàng Đồng Cổ', color: '#d97706', border: '#92400e', glow: 'rgba(217, 119, 6, 0.5)' },
  { id: 'forest_emerald', name: 'Xanh Lục Bảo', color: '#059669', border: '#065f46', glow: 'rgba(5, 150, 105, 0.5)' },
  { id: 'midnight_navy', name: 'Xanh Chàm Đêm', color: '#4338ca', border: '#312e81', glow: 'rgba(67, 56, 202, 0.5)' },
];

const MOODS = [
  { id: 'heartbreak_love', label: 'Sự Tiếc Nuối (Hoài niệm & Ký ức xưa 🎶)', icon: '🥀', color: '#f43f5e' },
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'vault'
  const [capsules, setCapsules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creatorName, setCreatorName] = useState(() => user?.name || '');
  const [notifyEmail, setNotifyEmail] = useState(() => user?.email || '');
  const [selectedDurationDays, setSelectedDurationDays] = useState(90);
  const [customDate, setCustomDate] = useState('');
  const [selectedMood, setSelectedMood] = useState('heartbreak_love');
  const [selectedEnvelope, setSelectedEnvelope] = useState('rose');
  const [selectedPaper, setSelectedPaper] = useState('kraft');
  const [selectedStamp, setSelectedStamp] = useState('dandelion');
  const [selectedWax, setSelectedWax] = useState('royal_red');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaxMelting, setIsWaxMelting] = useState(false);

  // Tự động đồng bộ email & tên khi người dùng đăng nhập
  useEffect(() => {
    if (user?.email && !notifyEmail) {
      setNotifyEmail(user.email);
    }
    if (user?.name && !creatorName) {
      setCreatorName(user.name);
    }
  }, [user]);

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
      setIsWaxMelting(true);
      playSingingBowlSound();

      // Hiệu ứng nung sáp và dập con dấu 3D trong 1.3 giây
      await new Promise((r) => setTimeout(r, 1300));

      const unlockDate = calculateUnlockDate();
      const emailToNotify = notifyEmail.trim();
      const createdRes = await timeCapsuleService.createCapsule({
        title: title.trim(),
        content: content.trim(),
        creatorName: creatorName.trim() || user?.name || 'Tôi của ngày hôm nay',
        notifyEmail: emailToNotify,
        unlockDate,
        mood: selectedMood,
        envelopeColor: selectedEnvelope,
        paperType: selectedPaper,
        stampType: selectedStamp,
        waxColor: selectedWax,
      });

      if (emailToNotify) {
        setAlertMsg('✨ Con dấu sáp đã được đóng chặt! Freedom đã gửi email xác nhận và sẽ gửi lại bức thư vào ngày mở khóa.');
      } else {
        setAlertMsg('✨ Con dấu sáp đã được dập niêm phong và cất giữ an toàn vào dòng thời gian!');
      }
      setTitle('');
      setContent('');

      if (createdRes?.data) {
        setCapsules((prev) => [createdRes.data, ...prev.filter((c) => c._id !== createdRes.data._id)]);
      }

      await fetchCapsules();
      setTimeout(() => {
        setIsWaxMelting(false);
        setActiveTab('vault');
        setAlertMsg('');
      }, 700);
    } catch (err) {
      setIsWaxMelting(false);
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
          width: '95%',
          maxWidth: '920px',
          maxHeight: '92vh',
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

        {/* Nhạc nền Hộp Thời Gian: Luôn duy trì phát nhạc liên tục khi chuyển đổi giữa Viết Thư và Kho Hộp */}
        <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
          <TimeCapsuleMusicPlayer
            autoPlay={true}
            currentMood={selectedMood}
            onMoodChange={setSelectedMood}
          />
        </div>

        {/* Body Content - Không gian rộng rãi, thanh cuộn mượt mà */}
        <div
          className="custom-capsule-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '18px 28px 24px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(245, 158, 11, 0.45) rgba(15, 23, 42, 0.4)',
          }}
        >
          {/* TAB 1: VIẾT THƯ MỚI */}
          {activeTab === 'write' && (
            <form noValidate onSubmit={handleCreateCapsule} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#fcd34d', marginBottom: '8px' }}>
                  Tiêu đề bức thư *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gửi tôi của ngày 30 tuổi, khi đã vượt qua kỳ thi và vững bước hơn..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={triggerAsmrKeySound}
                  maxLength={120}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    fontSize: '0.96rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>

              {/* Bộ Chọn Chất Liệu Giấy Thư Hoài Niệm (Craft Paper) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#fcd34d', marginBottom: '8px' }}>
                  📜 Chọn chất liệu giấy thư thủ công:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {PAPERS.map((paper) => {
                    const isSelected = selectedPaper === paper.id;
                    return (
                      <button
                        key={paper.id}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSelectedPaper(paper.id);
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: isSelected ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                          border: isSelected ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '38px',
                            borderRadius: '4px',
                            background: paper.bg,
                            border: `1.5px solid ${paper.borderColor}`,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            flexShrink: 0,
                            backgroundImage: paper.gridPattern || paper.texture || 'none',
                            backgroundSize: paper.gridPattern ? '8px 8px' : 'auto',
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: isSelected ? '#fef3c7' : '#e2e8f0' }}>
                            {paper.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{paper.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fcd34d' }}>
                    Tâm tư gửi gắm vào tương lai *
                  </label>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    <i className="fa-solid fa-keyboard" style={{ marginRight: '5px', color: '#f59e0b' }}></i>
                    Bật ASMR để gõ phím êm tai
                  </span>
                </div>
                {/* Khung Soạn Thảo Giả Lập Giấy Thật */}
                {(() => {
                  const currentPaper = PAPERS.find((p) => p.id === selectedPaper) || PAPERS[0];
                  return (
                    <div
                      style={{
                        borderRadius: '16px',
                        padding: '6px',
                        background: currentPaper.bg,
                        border: `2px solid ${currentPaper.borderColor}`,
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <textarea
                        rows={8}
                        placeholder="Hôm nay bạn đang cảm thấy thế nào? Bạn muốn nhắn nhủ điều gì cho bạn của tương lai? Những khó khăn hiện tại là gì? Hãy viết thật chân thật..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={triggerAsmrKeySound}
                        required
                        style={{
                          width: '100%',
                          minHeight: '200px',
                          padding: '16px 18px',
                          borderRadius: '12px',
                          background: currentPaper.bg,
                          backgroundImage: currentPaper.gridPattern || currentPaper.texture || 'none',
                          backgroundSize: currentPaper.gridPattern ? '16px 16px' : 'auto',
                          border: 'none',
                          color: currentPaper.textColor,
                          fontSize: '1rem',
                          lineHeight: '1.8',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: selectedPaper === 'grid' ? 'var(--font-sans, sans-serif)' : 'Georgia, "Times New Roman", serif',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Tem Bưu Chính & Con Dấu Sáp Niêm Phong */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Bộ Chọn Con Tem Bưu Chính */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    padding: '14px',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#fcd34d', marginBottom: '8px' }}>
                    📬 Dán con tem bưu chính hoài niệm:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {STAMPS.map((stamp) => {
                      const isSelected = selectedStamp === stamp.id;
                      return (
                        <button
                          key={stamp.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setSelectedStamp(stamp.id);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(0, 0, 0, 0.25)',
                            border: isSelected ? `2px dashed ${stamp.color}` : '1.5px dashed rgba(255, 255, 255, 0.2)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: '1.3rem' }}>{stamp.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#fef3c7' : '#cbd5e1' }}>
                              {stamp.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{stamp.quote}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bộ Chọn Màu Sáp Niêm Phong */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    padding: '14px',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#fcd34d', marginBottom: '8px' }}>
                    🕯️ Màu con dấu sáp niêm phong:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {WAX_SEALS.map((wax) => {
                      const isSelected = selectedWax === wax.id;
                      return (
                        <button
                          key={wax.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setSelectedWax(wax.id);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.25)',
                            border: isSelected ? `2px solid ${wax.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: isSelected ? `0 0 12px ${wax.glow}` : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: wax.color,
                              border: `2px solid ${wax.border}`,
                              boxShadow: `0 2px 6px ${wax.glow}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              color: '#fff',
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            ⚜️
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#fef3c7' : '#cbd5e1' }}>
                            {wax.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                      <span>🥀</span>
                      <span>Đang hòa cùng giai điệu vỗ về sự tiếc nuối & hoài niệm (lặp vô tận ♾️)</span>
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

              {/* Nhận thư & thông báo qua Email khi đến hạn mở khóa */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)',
                  border: '1.5px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <label
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#fcd34d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: 0,
                    }}
                  >
                    <i className="fa-solid fa-envelope" style={{ color: '#f59e0b', fontSize: '1rem' }}></i>
                    Gửi thư qua Email nhắc nhở khi đến ngày mở khóa
                  </label>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <i className="fa-solid fa-bell" style={{ marginRight: '4px' }}></i>
                    Nhắc nhở tự động
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '5px' }}>
                      Địa chỉ Email nhận thư:
                    </span>
                    <input
                      type="email"
                      placeholder="Nhập email của bạn (ví dụ: ban@gmail.com)..."
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '5px' }}>
                      Ký tên dưới lá thư (Tùy chọn):
                    </span>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tôi của ngày hôm nay, Tuổi 23..."
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: '1.5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-sparkles" style={{ color: '#f59e0b' }}></i>
                  <span>Freedom sẽ gửi email xác nhận ngay khi bạn khóa thư, và tự động gửi lại toàn bộ bức thư này về hòm thư của bạn khi đến ngày mở khóa!</span>
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
              {readingCapsule ? (() => {
                const readPaper = PAPERS.find((p) => p.id === (readingCapsule.paperType || 'kraft')) || PAPERS[0];
                const readStamp = STAMPS.find((s) => s.id === (readingCapsule.stampType || 'dandelion')) || STAMPS[0];
                const readWax = WAX_SEALS.find((w) => w.id === (readingCapsule.waxColor || 'royal_red')) || WAX_SEALS[0];

                return (
                  <div
                    style={{
                      background: readPaper.bg,
                      backgroundImage: readPaper.gridPattern || readPaper.texture || 'none',
                      backgroundSize: readPaper.gridPattern ? '16px 16px' : 'auto',
                      border: `3px solid ${readPaper.borderColor}`,
                      borderRadius: '20px',
                      padding: '28px 24px',
                      position: 'relative',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 2px 10px rgba(0,0,0,0.1)',
                      color: readPaper.textColor,
                      animation: 'fadeInUp 0.3s ease',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Tem bưu chính & Dấu nhật ấn bưu điện ở góc trên bên phải */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '20px',
                        right: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      {/* Dấu Mộc Tròn Bưu Điện Cổ Điển */}
                      <div
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          border: '2px solid rgba(180, 83, 9, 0.55)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: 'rotate(-15deg)',
                          color: 'rgba(180, 83, 9, 0.7)',
                          fontSize: '0.55rem',
                          fontWeight: 800,
                          textAlign: 'center',
                          lineHeight: '1.2',
                          textTransform: 'uppercase',
                          userSelect: 'none',
                        }}
                      >
                        <span>FREEDOM</span>
                        <span>POST</span>
                        <span style={{ fontSize: '0.5rem', fontWeight: 600 }}>
                          {new Date(readingCapsule.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      {/* Tem Bưu Chính Hoài Niệm */}
                      <div
                        style={{
                          width: '58px',
                          height: '72px',
                          background: '#fff',
                          border: `2px dashed ${readStamp.color}`,
                          borderRadius: '4px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{readStamp.icon}</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                          {readStamp.name}
                        </span>
                        <span style={{ fontSize: '0.5rem', color: '#64748b' }}>VIETNAM</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', maxWidth: 'calc(100% - 150px)' }}>
                      <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 800 }}>
                        ✨ BỨC THƯ TỪ QUÁ KHỨ ĐÃ MỞ NIÊM PHONG
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReadingCapsule(null)}
                      style={{
                        marginBottom: '16px',
                        background: 'rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                        borderRadius: '8px',
                        color: readPaper.textColor,
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ← Quay lại danh sách
                    </button>

                    <h3 style={{ margin: '0 0 10px', fontSize: '1.4rem', color: readPaper.textColor, fontWeight: 900 }}>
                      {readingCapsule.title}
                    </h3>

                    <div style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.6)', marginBottom: '20px' }}>
                      Ký tên: <strong>{readingCapsule.creatorName || 'Tôi của ngày trước'}</strong> • Niêm phong lúc:{' '}
                      {new Date(readingCapsule.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                    </div>

                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.65)',
                        padding: '22px',
                        borderRadius: '12px',
                        color: readPaper.textColor,
                        fontSize: '1.02rem',
                        lineHeight: '1.85',
                        whiteSpace: 'pre-wrap',
                        fontFamily: readingCapsule.paperType === 'grid' ? 'var(--font-sans, sans-serif)' : 'Georgia, "Times New Roman", serif',
                        borderLeft: `4px solid ${readWax.color}`,
                        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)',
                      }}
                    >
                      {readingCapsule.content}
                    </div>

                    {/* Vết Sáp Niêm Phong Đã Mở & Lời Chúc */}
                    <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ color: '#92400e', fontSize: '0.88rem', fontStyle: 'italic', maxWidth: '420px' }}>
                        "Hôm nay, bạn đã đi xa hơn ngày hôm qua một đoạn rất dài rồi đấy! Chúc mừng bạn đã luôn kiên trì 🌿✨"
                      </div>

                      {/* Huy hiệu dấu sáp 3D */}
                      <div
                        title={`Con dấu sáp niêm phong màu ${readWax.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(0, 0, 0, 0.06)',
                          padding: '6px 14px',
                          borderRadius: '999px',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: readWax.color,
                            border: `2.5px solid ${readWax.border}`,
                            boxShadow: `0 3px 8px ${readWax.glow}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 900,
                          }}
                        >
                          ⚜️
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: readPaper.textColor }}>
                          Niêm phong sáp: {readWax.name}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })() : capsules.length === 0 ? (
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

        {/* ========================================================
            HOẠT HỌA NUNG CHẢY SÁP & DẬP CON DẤU 3D (WAX SEAL STAMP ANIMATION)
           ======================================================== */}
        {isWaxMelting && (() => {
          const currentWax = WAX_SEALS.find((w) => w.id === selectedWax) || WAX_SEALS[0];
          return (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(10px)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '120px',
                  height: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Giọt sáp nóng chảy lan rộng */}
                <div
                  style={{
                    position: 'absolute',
                    width: '90px',
                    height: '90px',
                    borderRadius: '45% 55% 52% 48% / 48% 46% 54% 52%',
                    background: currentWax.color,
                    boxShadow: `0 0 35px ${currentWax.glow}, inset 0 2px 6px rgba(255,255,255,0.4)`,
                    animation: 'waxSpread 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  }}
                />

                {/* Con dấu đồng dập sầm xuống */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    fontSize: '2.8rem',
                    color: '#fff',
                    animation: 'stampPress 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                  }}
                >
                  ⚜️
                </div>
              </div>

              <div
                style={{
                  marginTop: '20px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: '#fef3c7',
                  textAlign: 'center',
                  letterSpacing: '0.3px',
                }}
              >
                Đang nung sáp &amp; dập ấn niêm phong...
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                Khóa chặt tâm tư gửi vào dòng thời gian tương lai 💌
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
