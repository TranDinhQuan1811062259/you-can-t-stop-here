import React, { useState, useEffect, useRef } from 'react';
import {
  playPaperShredSound,
  playSingingBowlSound,
  playClickSound,
  playCeramicShatterSound,
  playBubblePopSound,
} from '../../utils/soundEffects';
import { AsmrKeyboardToggle } from '../common/AsmrKeyboardToggle';

const MOOD_LIST = [
  { id: 'burnout', icon: '😫', label: 'Kiệt sức', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', transformed: { icon: '🥰', label: 'Bình yên & Thư thái' } },
  { id: 'angry', icon: '😡', label: 'Bực bội', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', transformed: { icon: '🧘', label: 'Tĩnh tâm & An nhiên' } },
  { id: 'anxious', icon: '😰', label: 'Lo âu', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', transformed: { icon: '💪', label: 'Tự tin & Vững lòng' } },
  { id: 'overwhelmed', icon: '🤯', label: 'Quá tải', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', transformed: { icon: '✨', label: 'Thông suốt & Nhẹ nhõm' } },
  { id: 'sad', icon: '🥺', label: 'Tủi thân', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', transformed: { icon: '🫂', label: 'Được che chở & Yêu thương' } },
  { id: 'hopeless', icon: '🫠', label: 'Bất lực', color: '#d97706', bg: '#fffbeb', border: '#fde68a', transformed: { icon: '🌱', label: 'Tái sinh & Tràn năng lượng' } },
  { id: 'empty', icon: '😐', label: 'Trống rỗng', color: '#475569', bg: '#f8fafc', border: '#e2e8f0', transformed: { icon: '☀️', label: 'Lạc quan & Tươi vui' } },
];

const QUICK_EMOJIS = [
  '🔥', '💣', '💢', '⚡', '😤', '😭', '💔', '🤦', '🥀', '🌪️', '🥊', '🆘', '💤', '🤮', '🥱', '🩹', '☕', '🌿', '✨'
];

const PRESET_STRESS_TAGS = [
  '🔥 Deadline dí ngộp thở',
  '😤 Khách hàng đòi sửa lần thứ 15',
  '⏰ Sếp thông báo họp lúc 17h55',
  '💤 Kiệt sức, cạn kiệt năng lượng',
  '📑 Đống báo cáo chưa viết xong',
  '👥 Áp lực đồng nghiệp & so sánh',
];

const INITIAL_SMASH_ITEMS = [
  { id: 1, name: 'KPI Vô Lý', type: 'plate', icon: '🍽️', color: '#f43f5e', smashed: false },
  { id: 2, name: 'Họp Lúc 17h55', type: 'mug', icon: '☕', color: '#f59e0b', smashed: false },
  { id: 3, name: 'Sửa Lần Thứ 18', type: 'vase', icon: '🏺', color: '#8b5cf6', smashed: false },
  { id: 4, name: 'Deadline 23h59', type: 'plate', icon: '🍽️', color: '#ef4444', smashed: false },
  { id: 5, name: 'OT Không Lương', type: 'mug', icon: '☕', color: '#06b6d4', smashed: false },
  { id: 6, name: 'Bug Không Rõ Nguồn', type: 'vase', icon: '🏺', color: '#10b981', smashed: false },
];

export const StressReliefModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('shredder'); // 'shredder' | 'smash' | 'bubble' | 'breathing'

  // State cho Máy Xé Giấy (Stress Shredder)
  const [stressText, setStressText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [shredStyle, setShredStyle] = useState('shred'); // 'shred' | 'burn' | 'flowers'
  const [isShredding, setIsShredding] = useState(false);
  const [shreddedCount, setShreddedCount] = useState(() => {
    return parseInt(localStorage.getItem('freedom_shredded_count') || '0', 10);
  });
  const [showShredResult, setShowShredResult] = useState(false);
  const textareaRef = useRef(null);

  // State cho Phòng Đập Phá Ảo (Virtual Rage Room)
  const [smashItems, setSmashItems] = useState(INITIAL_SMASH_ITEMS);
  const [smashedTotal, setSmashedTotal] = useState(() => {
    return parseInt(localStorage.getItem('freedom_smashed_count') || '0', 10);
  });
  const [activeSmashEffect, setActiveSmashEffect] = useState(null);

  // State cho Bóng Xốp Vô Tận (Bubble Wrap Popper)
  const [bubbles, setBubbles] = useState(() =>
    Array.from({ length: 32 }, (_, i) => ({ id: i, popped: false }))
  );
  const [poppedTotal, setPoppedTotal] = useState(() => {
    return parseInt(localStorage.getItem('freedom_popped_bubbles') || '0', 10);
  });

  // State cho Bài Tập Thở 4-7-8 & Tan Ca
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('ready'); // 'ready' | 'inhale' | 'hold' | 'exhale'
  const [breathSeconds, setBreathSeconds] = useState(4);
  const [breathCycles, setBreathCycles] = useState(0);
  const breathTimerRef = useRef(null);

  // Giờ hiện tại để hiển thị thông điệp tan ca
  const now = new Date();
  const currentHour = now.getHours();
  const isClockOutTime = currentHour >= 17 && currentHour <= 21;

  useEffect(() => {
    if (!isOpen) {
      setIsShredding(false);
      setShowShredResult(false);
      stopBreathing();
    }
  }, [isOpen]);

  // Chèn Emoji vào ô nội dung áp lực tại vị trí con trỏ
  const handleInsertEmoji = (emoji) => {
    playClickSound();
    const textarea = textareaRef.current;
    if (!textarea) {
      setStressText((prev) => (prev ? prev + emoji : emoji));
      return;
    }
    const start = textarea.selectionStart ?? stressText.length;
    const end = textarea.selectionEnd ?? stressText.length;
    const nextText = stressText.substring(0, start) + emoji + stressText.substring(end);
    setStressText(nextText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  };

  // =========================================================================
  // XỬ LÝ MÁY XÉ GIẤY DEADLINE (STRESS SHREDDER)
  // =========================================================================
  const handleStartShred = () => {
    if (!stressText.trim() || isShredding) return;

    setIsShredding(true);
    playPaperShredSound();

    setTimeout(() => {
      setIsShredding(false);
      setShowShredResult(true);
      const newTotal = shreddedCount + 1;
      setShreddedCount(newTotal);
      localStorage.setItem('freedom_shredded_count', String(newTotal));
    }, 1800);
  };

  const handleResetShredder = () => {
    playClickSound();
    setStressText('');
    setSelectedMood(null);
    setShowShredResult(false);
    setIsShredding(false);
  };

  // =========================================================================
  // XỬ LÝ PHÒNG ĐẬP PHÁ ẢO (VIRTUAL RAGE ROOM / SMASH THERAPY)
  // =========================================================================
  const handleSmashItem = (item) => {
    if (item.smashed) return;
    playCeramicShatterSound();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 25, 60]);
    }

    setSmashItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, smashed: true } : it))
    );

    const newTotal = smashedTotal + 1;
    setSmashedTotal(newTotal);
    localStorage.setItem('freedom_smashed_count', String(newTotal));

    // Kích hoạt hiệu ứng mảnh vỡ nổ tung
    setActiveSmashEffect({
      id: item.id,
      name: item.name,
      color: item.color,
      time: Date.now(),
    });
    setTimeout(() => {
      setActiveSmashEffect((curr) => (curr?.id === item.id ? null : curr));
    }, 1200);
  };

  const handleResetSmash = () => {
    playClickSound();
    setSmashItems(INITIAL_SMASH_ITEMS);
    setActiveSmashEffect(null);
  };

  // =========================================================================
  // XỬ LÝ BÓNG XỐP VÔ TẬN (BUBBLE WRAP POPPER)
  // =========================================================================
  const handlePopBubble = (id) => {
    const target = bubbles.find((b) => b.id === id);
    if (!target || target.popped) return;

    playBubblePopSound(0.85 + (id % 8) * 0.05);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }

    setBubbles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, popped: true } : b))
    );

    const newTotal = poppedTotal + 1;
    setPoppedTotal(newTotal);
    localStorage.setItem('freedom_popped_bubbles', String(newTotal));
  };

  const handleResetBubbles = () => {
    playClickSound();
    setBubbles(Array.from({ length: 32 }, (_, i) => ({ id: i, popped: false })));
  };

  // =========================================================================
  // XỬ LÝ BÀI TẬP THỞ 4-7-8 (BOX BREATHING)
  // =========================================================================
  const startBreathing = () => {
    playClickSound();
    playSingingBowlSound();
    setIsBreathingActive(true);
    setBreathCycles(0);
    runPhase('inhale', 4);
  };

  const stopBreathing = () => {
    if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    setIsBreathingActive(false);
    setBreathPhase('ready');
    setBreathSeconds(4);
  };

  const runPhase = (phase, seconds) => {
    setBreathPhase(phase);
    setBreathSeconds(seconds);

    let remaining = seconds;
    if (breathTimerRef.current) clearInterval(breathTimerRef.current);

    breathTimerRef.current = setInterval(() => {
      remaining -= 1;
      setBreathSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(breathTimerRef.current);

        if (phase === 'inhale') {
          playClickSound();
          runPhase('hold', 7);
        } else if (phase === 'hold') {
          playClickSound();
          runPhase('exhale', 8);
        } else if (phase === 'exhale') {
          playSingingBowlSound();
          setBreathCycles((prev) => prev + 1);
          runPhase('inhale', 4);
        }
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999, padding: '16px 0', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="modal-box stress-relief-modal-box"
        style={{
          maxWidth: '680px',
          width: '94%',
          maxHeight: 'min(92vh, 720px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '16px 20px 14px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          border: '1.5px solid #e2e8f0',
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng modal */}
        <button
          className="modal-close-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Tiêu đề Modal */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#059669',
              marginBottom: '6px',
            }}
          >
            <i className="fa-solid fa-spa"></i>
            <span>Trạm Sạc Năng Lượng & Xả Áp Lực Công Sở</span>
          </span>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
            YOU CAN'T STOP HERE &bull; WELLNESS
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Nơi bạn có thể trút bỏ hoàn toàn gánh nặng deadline, thở một hơi thật sâu và lấy lại bình yên.
          </p>
        </div>

        {/* Tab Chuyển đổi giữa 4 liệu pháp xả stress */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '14px',
            marginBottom: '12px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('shredder');
            }}
            style={{
              padding: '8px 6px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'shredder' ? '#ffffff' : 'transparent',
              color: activeTab === 'shredder' ? '#0f766e' : '#64748b',
              boxShadow: activeTab === 'shredder' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fa-regular fa-file-lines"></i>
            <span>Xé Giấy</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('smash');
            }}
            style={{
              padding: '8px 6px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'smash' ? '#ffffff' : 'transparent',
              color: activeTab === 'smash' ? '#e11d48' : '#64748b',
              boxShadow: activeTab === 'smash' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fa-solid fa-burst"></i>
            <span>Đập Đĩa Ảo</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('bubble');
            }}
            style={{
              padding: '8px 6px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'bubble' ? '#ffffff' : 'transparent',
              color: activeTab === 'bubble' ? '#2563eb' : '#64748b',
              boxShadow: activeTab === 'bubble' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fa-solid fa-circle-dot"></i>
            <span>Bóng Xốp</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('breathing');
            }}
            style={{
              padding: '8px 6px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'breathing' ? '#ffffff' : 'transparent',
              color: activeTab === 'breathing' ? '#0f766e' : '#64748b',
              boxShadow: activeTab === 'breathing' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fa-solid fa-person-praying"></i>
            <span>Thở 4-7-8</span>
          </button>
        </div>

        {/* Thanh tiện ích nhanh: ASMR Phím cơ & Lối tắt sang Hộp thời gian / Radio */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
                window.dispatchEvent(new CustomEvent('freedom_open_time_capsule'));
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#b45309',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-hourglass-half"></i> Hộp Thời Gian
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
                window.dispatchEvent(new CustomEvent('freedom_open_radio'));
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#4338ca',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-radio"></i> Radio Đêm Muộn
            </button>
          </div>

          <AsmrKeyboardToggle variant="badge" />
        </div>

        {/* =========================================================================
            TAB 1: MÁY XÉ GIẤY DEADLINE (STRESS SHREDDER)
           ========================================================================= */}
        {activeTab === 'shredder' && (
          <div className="stress-shredder-view" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            {!showShredResult ? (
              <>
                {/* Phần thân có thể cuộn độc lập (Scrollable body) - Giới hạn chiều cao an toàn để footer không bao giờ bị đẩy tràn màn hình */}
                <div style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, maxHeight: 'calc(86vh - 270px)', paddingRight: '4px', marginBottom: '8px' }}>
                  {/* 1. KHAY CHỌN ICON CẢM XÚC (MOOD SELECTOR) */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🎭</span>
                        <span>Chọn cảm xúc của bạn lúc này:</span>
                      </span>
                      {selectedMood && (
                        <button
                          type="button"
                          onClick={() => { playClickSound(); setSelectedMood(null); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            padding: '0 4px',
                            textDecoration: 'underline',
                          }}
                        >
                          Bỏ chọn
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        overflowX: 'auto',
                        paddingBottom: '3px',
                        scrollbarWidth: 'none',
                      }}
                    >
                      {MOOD_LIST.map((mood) => {
                        const isSelected = selectedMood?.id === mood.id;
                        return (
                          <button
                            key={mood.id}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setSelectedMood(isSelected ? null : mood);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              fontWeight: isSelected ? 800 : 600,
                              cursor: 'pointer',
                              border: isSelected ? `2px solid ${mood.color}` : '1.5px solid #e2e8f0',
                              background: isSelected ? mood.bg : '#ffffff',
                              color: isSelected ? mood.color : '#64748b',
                              boxShadow: isSelected ? `0 2px 10px ${mood.color}33` : '0 1px 3px rgba(0,0,0,0.04)',
                              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              transform: isSelected ? 'scale(1.04)' : 'none',
                            }}
                            title={`Tâm trạng: ${mood.label}`}
                          >
                            <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{mood.icon}</span>
                            <span>{mood.label}</span>
                            {isSelected && <span style={{ fontSize: '0.65rem' }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. CÁC TAG MẪU GỢI Ý ĐIỀN NHANH */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                    {PRESET_STRESS_TAGS.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setStressText((prev) => (prev ? `${prev}, ${tag}` : tag));
                        }}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '999px',
                          padding: '3px 9px',
                          fontSize: '0.72rem',
                          color: '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#0d9488';
                          e.currentTarget.style.color = '#0d9488';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.color = '#475569';
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* 3. KHUNG TỜ GIẤY SỔ TAY KẺ NGANG + THANH CHÈN EMOJI */}
                  <div
                    className={`stress-paper-sheet ${isShredding ? 'is-shredding-anim' : ''}`}
                    style={{
                      position: 'relative',
                      background: '#fffdf0',
                      border: '1.5px solid #fef08a',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      boxShadow: '0 4px 12px rgba(234, 179, 8, 0.12)',
                      marginBottom: '6px',
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 25px, #fef08a 26px)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Badge Icon cảm xúc đính trên tờ giấy nếu có chọn */}
                    {selectedMood && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: selectedMood.bg,
                          border: `1px solid ${selectedMood.border}`,
                          color: selectedMood.color,
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          marginBottom: '6px',
                          letterSpacing: '0.2px',
                        }}
                      >
                        <span>{selectedMood.icon}</span>
                        <span>Tâm trạng: {selectedMood.label}</span>
                        <span
                          onClick={(e) => { e.stopPropagation(); playClickSound(); setSelectedMood(null); }}
                          style={{ cursor: 'pointer', marginLeft: '4px', opacity: 0.6 }}
                          title="Bỏ nhãn này"
                        >
                          ✕
                        </span>
                      </div>
                    )}

                    <textarea
                      ref={textareaRef}
                      rows={3}
                      placeholder="Viết ra áp lực của bạn... (Ví dụ: Deadline dí nghẹt thở, sếp dí KPI, khách hàng bắt sửa lại từ đầu...)"
                      value={stressText}
                      onChange={(e) => setStressText(e.target.value)}
                      disabled={isShredding}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        lineHeight: '26px',
                        color: '#713f12',
                        fontWeight: 600,
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* THANH CHÈN EMOJI NHANH NGAY DƯỚI KHUNG GIẤY */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px',
                        paddingTop: '6px',
                        borderTop: '1px dashed rgba(234, 179, 8, 0.4)',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', color: '#a16207', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span>😊</span>
                        <span>Emoji:</span>
                      </span>

                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          overflowX: 'auto',
                          scrollbarWidth: 'none',
                          padding: '1px 0',
                          flex: 1,
                        }}
                      >
                        {QUICK_EMOJIS.map((emoji, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleInsertEmoji(emoji)}
                            disabled={isShredding}
                            title={`Chèn ${emoji}`}
                            style={{
                              background: 'rgba(255, 255, 255, 0.85)',
                              border: '1px solid rgba(234, 179, 8, 0.35)',
                              borderRadius: '6px',
                              width: '26px',
                              height: '26px',
                              fontSize: '0.9rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isShredding ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s ease',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              if (!isShredding) {
                                e.currentTarget.style.background = '#fef08a';
                                e.currentTarget.style.transform = 'scale(1.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {stressText && !isShredding && (
                        <button
                          type="button"
                          onClick={() => { playClickSound(); setStressText(''); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            padding: '2px 5px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                          title="Xóa trắng nội dung"
                        >
                          Xóa hết
                        </button>
                      )}
                    </div>

                    {/* Hiệu ứng tia laser / lưỡi dao cắt khi đang xé */}
                    {isShredding && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          background: 'linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)',
                          boxShadow: '0 0 15px #ef4444',
                          animation: 'shredderBlade 1.8s linear forwards',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Phần footer cố định luôn luôn nổi ở đáy - Không bao giờ bị khuất (Sticky Action Footer) */}
                <div style={{ flexShrink: 0, paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  {/* 4. CHỌN HIỆU ỨNG TIÊU HỦY */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Hiệu ứng tiêu hủy:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label style={{ fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="radio"
                          name="shredStyle"
                          checked={shredStyle === 'shred'}
                          onChange={() => setShredStyle('shred')}
                        />
                        <span>⚡ Cắt vụn máy</span>
                      </label>
                      <label style={{ fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="radio"
                          name="shredStyle"
                          checked={shredStyle === 'flowers'}
                          onChange={() => setShredStyle('flowers')}
                        />
                        <span>🌸 Hóa cánh hoa</span>
                      </label>
                    </div>
                  </div>

                  {/* 5. NÚT BẤM XÉ NÁT TIÊU HỦY */}
                  <button
                    type="button"
                    className="modal-submit-btn"
                    onClick={handleStartShred}
                    disabled={!stressText.trim() || isShredding}
                    style={{
                      width: '100%',
                      padding: '11px',
                      margin: '0',
                      background: isShredding
                        ? '#94a3b8'
                        : 'linear-gradient(135deg, #dc2626, #ea580c)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: !stressText.trim() || isShredding ? 'not-allowed' : 'pointer',
                      boxShadow: '0 6px 18px rgba(220, 38, 38, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <span>{isShredding ? '⚙️' : '💥'}</span>
                    <span>{isShredding ? 'Đang nghiền nát và xé nhỏ áp lực...' : 'XÉ NÁT & TIÊU HỦY ÁP LỰC NGAY ➔'}</span>
                  </button>
                </div>
              </>
            ) : (
              /* MÀN HÌNH SAU KHI TIÊU HỦY THÀNH CÔNG */
              <div style={{ textAlign: 'center', padding: '16px 10px' }}>
                <div style={{ fontSize: '3.2rem', marginBottom: '8px' }}>
                  {shredStyle === 'flowers' ? '🌸✨' : '🎉🎊'}
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f766e', fontWeight: 800 }}>
                  ĐÃ TIÊU HỦY HOÀN TOÀN ÁP LỰC ĐÓ!
                </h4>

                {/* Khối chuyển hóa cảm xúc nhiệm màu */}
                {selectedMood && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                      border: '1.5px solid #86efac',
                      borderRadius: '999px',
                      padding: '5px 16px',
                      margin: '0 auto 10px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.15)',
                    }}
                  >
                    <span style={{ fontSize: '0.84rem', opacity: 0.6, textDecoration: 'line-through', color: '#475569' }}>
                      {selectedMood.icon} {selectedMood.label}
                    </span>
                    <span style={{ color: '#059669', fontWeight: 900, fontSize: '1rem' }}>➔</span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{selectedMood.transformed.icon}</span>
                      <span>{selectedMood.transformed.label}</span>
                    </span>
                  </div>
                )}
                <blockquote
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    margin: '12px 0 18px',
                    color: '#166534',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    fontStyle: 'italic',
                  }}
                >
                  "Tất cả những bực bội và deadline vừa rồi đã biến thành tro bụi. Bạn không cần phải ôm đồm tất cả một mình. Hãy thả lỏng đôi vai, uống một ngụm nước ấm và mỉm cười nhé!"
                </blockquote>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleResetShredder}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      padding: '9px 18px',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    📄 Xé thêm một áp lực khác
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveTab('breathing');
                      startBreathing();
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0d9488, #059669)',
                      border: 'none',
                      padding: '9px 18px',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                    }}
                  >
                    🧘 Tập thở 1 phút &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Thống kê số lần giải tỏa */}
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.78rem', color: '#94a3b8' }}>
              Cộng đồng đã tiêu hủy thành công <strong>{shreddedCount + 138}</strong> chiếc deadline áp lực!
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: NGHI THỨC TAN CA & THỞ SÂU 4-7-8
           ========================================================================= */}
        {activeTab === 'breathing' && (
          <div className="breathing-exercise-view" style={{ textAlign: 'center', padding: '10px 0' }}>
            {/* Banner Nghi thức tan ca nếu vào khung giờ chiều/tối */}
            {isClockOutTime && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                  border: '1.5px solid #fed7aa',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '18px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '1.6rem' }}>🌅</span>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#9a3412', display: 'block' }}>
                    Nghi Thức Tan Ca (Clock-out Ritual)
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#7c2d12', lineHeight: 1.4 }}>
                    Đã đến giờ tan sở rồi! Hãy gập laptop lại, đừng mang việc về nhà. Bạn đã làm việc rất chăm chỉ suốt ngày hôm nay!
                  </span>
                </div>
              </div>
            )}

            {/* Vòng tròn bài tập thở tương tác */}
            <div
              style={{
                width: '180px',
                height: '180px',
                margin: '18px auto 20px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Vòng hào quang phập phồng theo nhịp */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background:
                    breathPhase === 'inhale'
                      ? 'radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, rgba(14, 165, 233, 0) 70%)'
                      : breathPhase === 'hold'
                      ? 'radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, rgba(234, 179, 8, 0) 70%)'
                      : breathPhase === 'exhale'
                      ? 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 70%)'
                      : 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 0%, transparent 70%)',
                  transform:
                    breathPhase === 'inhale'
                      ? 'scale(1.3)'
                      : breathPhase === 'hold'
                      ? 'scale(1.2)'
                      : breathPhase === 'exhale'
                      ? 'scale(0.85)'
                      : 'scale(1)',
                  transition:
                    breathPhase === 'inhale'
                      ? 'transform 4s ease-out'
                      : breathPhase === 'hold'
                      ? 'transform 7s linear'
                      : breathPhase === 'exhale'
                      ? 'transform 8s ease-in-out'
                      : 'transform 0.5s ease',
                }}
              />

              {/* Vòng tròn chính */}
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  background:
                    breathPhase === 'inhale'
                      ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
                      : breathPhase === 'hold'
                      ? 'linear-gradient(135deg, #d97706, #fbbf24)'
                      : breathPhase === 'exhale'
                      ? 'linear-gradient(135deg, #059669, #34d399)'
                      : 'linear-gradient(135deg, #0d9488, #14b8a6)',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                  transform:
                    breathPhase === 'inhale'
                      ? 'scale(1.15)'
                      : breathPhase === 'hold'
                      ? 'scale(1.15)'
                      : breathPhase === 'exhale'
                      ? 'scale(0.85)'
                      : 'scale(1)',
                  transition:
                    breathPhase === 'inhale'
                      ? 'transform 4s ease-out'
                      : breathPhase === 'hold'
                      ? 'transform 7s linear'
                      : breathPhase === 'exhale'
                      ? 'transform 8s ease-in-out'
                      : 'transform 0.5s ease',
                  zIndex: 2,
                }}
              >
                <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                  {isBreathingActive ? breathSeconds : '4-7-8'}
                </span>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                  {breathPhase === 'inhale'
                    ? 'Hít vào'
                    : breathPhase === 'hold'
                    ? 'Giữ hơi'
                    : breathPhase === 'exhale'
                    ? 'Thở ra'
                    : 'Bắt đầu'}
                </span>
              </div>
            </div>

            {/* Hướng dẫn nhịp thở */}
            <p style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 600, margin: '0 0 18px' }}>
              {breathPhase === 'inhale'
                ? 'Hít vào sâu bằng mũi trong 4 giây... Hãy cảm nhận lồng ngực mở rộng.'
                : breathPhase === 'hold'
                ? 'Giữ hơi thở êm dịu trong 7 giây... Thả lỏng toàn bộ cơ mặt và đôi vai.'
                : breathPhase === 'exhale'
                ? 'Thở ra chậm rãi bằng miệng trong 8 giây... Đẩy hết mọi căng thẳng ra ngoài.'
                : 'Quy tắc thở 4-7-8 giúp hệ thần kinh kích hoạt trạng thái thư giãn tức thì.'}
            </p>

            {/* Điều khiển Bắt đầu / Tạm dừng */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {!isBreathingActive ? (
                <button
                  type="button"
                  onClick={startBreathing}
                  style={{
                    background: 'linear-gradient(135deg, #0d9488, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '11px 24px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>▶️ Bắt Đầu Tập Thở 4-7-8</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopBreathing}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '11px 24px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⏹ Dừng Lại (Đã hoàn thành {breathCycles} vòng)
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PHÒNG ĐẬP PHÁ ẢO (VIRTUAL RAGE ROOM / SMASH THERAPY) */}
        {activeTab === 'smash' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.08) 0%, rgba(244, 63, 94, 0.03) 100%)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '1.1rem' }}>💥</span>
                  <strong style={{ fontSize: '0.92rem', color: '#be123c' }}>Phòng Đập Phá Ảo • Xả Cơn Uất Ức</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                  Bấm hoặc chạm vào từng món đồ để đập vỡ tan tành cơn bực dọc!
                </p>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Đã đập vỡ:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#e11d48' }}>
                  {smashedTotal} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>món</span>
                </div>
              </div>
            </div>

            {/* Bàn gốm sứ với 6 món đồ áp lực */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                background: 'rgba(15, 23, 42, 0.03)',
                padding: '16px',
                borderRadius: '18px',
                border: '1.5px dashed rgba(244, 63, 94, 0.25)',
                position: 'relative',
                minHeight: '200px',
              }}
            >
              {smashItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSmashItem(item)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px 8px',
                    borderRadius: '14px',
                    background: item.smashed ? 'rgba(0, 0, 0, 0.03)' : '#ffffff',
                    border: item.smashed ? '1px dashed #cbd5e1' : `1.5px solid ${item.color}40`,
                    boxShadow: item.smashed ? 'none' : '0 6px 16px rgba(0,0,0,0.06)',
                    cursor: item.smashed ? 'default' : 'pointer',
                    transform: item.smashed ? 'scale(0.92)' : 'scale(1)',
                    opacity: item.smashed ? 0.45 : 1,
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    userSelect: 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '6px', filter: item.smashed ? 'grayscale(1)' : 'none' }}>
                    {item.smashed ? '💥' : item.icon}
                  </div>
                  <strong style={{ fontSize: '0.8rem', color: item.smashed ? '#94a3b8' : '#1e293b', textAlign: 'center', lineHeight: '1.2' }}>
                    {item.name}
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: item.smashed ? '#cbd5e1' : item.color, fontWeight: 700, marginTop: '3px' }}>
                    {item.smashed ? 'ĐÃ ĐẬP VỠ' : 'BẤM ĐẬP 🔨'}
                  </span>
                </div>
              ))}
            </div>

            {/* Thông điệp chữa lành & Nút dọn đĩa mới */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                🌿 Vỡ tan hết muộn phiền rồi, hít một hơi thật sâu nhé!
              </span>
              <button
                type="button"
                onClick={handleResetSmash}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <span>🧹 Dọn Đĩa Mới</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: BẤM BÓNG XỐP VÔ TẬN (BUBBLE WRAP POPPER) */}
        {activeTab === 'bubble' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🫧</span>
                  <strong style={{ fontSize: '0.92rem', color: '#1d4ed8' }}>Bóng Xốp Vô Tận • Bóp Nổ Tanh Tách</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                  Cảm giác bóp nổ bong bóng xốp gây nghiện, kích thích dopamine xua tan stress!
                </p>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Đã bóp nổ:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb' }}>
                  {poppedTotal} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>bóng</span>
                </div>
              </div>
            </div>

            {/* Tấm xốp bong bóng 32 ô */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '10px',
                background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
                padding: '16px',
                borderRadius: '18px',
                border: '1px solid #93c5fd',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              {bubbles.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handlePopBubble(b.id)}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: '50%',
                    border: b.popped ? '1.5px dashed #93c5fd' : '2px solid #38bdf8',
                    background: b.popped
                      ? 'rgba(147, 197, 253, 0.2)'
                      : 'radial-gradient(circle at 35% 35%, #ffffff 0%, #bae6fd 60%, #38bdf8 100%)',
                    boxShadow: b.popped
                      ? 'inset 0 2px 4px rgba(0,0,0,0.1)'
                      : '0 4px 8px rgba(14, 165, 233, 0.35), inset 0 2px 4px rgba(255,255,255,0.8)',
                    cursor: b.popped ? 'default' : 'pointer',
                    transform: b.popped ? 'scale(0.85)' : 'scale(1)',
                    transition: 'all 0.12s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    outline: 'none',
                  }}
                  title={b.popped ? 'Đã nổ' : 'Bấm để bóp nổ!'}
                >
                  {b.popped ? (
                    <span style={{ fontSize: '0.62rem', color: '#60a5fa', fontWeight: 700 }}>•</span>
                  ) : (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', opacity: 0.8, transform: 'translate(-3px, -3px)' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Thông điệp & Nút lấy tấm mới */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {bubbles.every((b) => b.popped)
                  ? '🎉 Bạn đã làm sạch toàn bộ tấm xốp! Hãy lấy tấm mới nào!'
                  : '💡 Mẹo: Bấm liên tục theo nhịp điệu để nghe âm thanh giòn tan thư giãn.'}
              </span>
              <button
                type="button"
                onClick={handleResetBubbles}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                }}
              >
                <span>✨ Trải Tấm Mới</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StressReliefModal;
