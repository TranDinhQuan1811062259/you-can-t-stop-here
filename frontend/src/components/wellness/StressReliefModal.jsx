import React, { useState, useEffect, useRef } from 'react';
import { playPaperShredSound, playSingingBowlSound, playClickSound } from '../../utils/soundEffects';

const PRESET_STRESS_TAGS = [
  '🔥 Deadline dí ngộp thở',
  '😤 Khách hàng đòi sửa lần thứ 15',
  '⏰ Sếp thông báo họp lúc 17h55',
  '💤 Kiệt sức, cạn kiệt năng lượng',
  '📑 Đống báo cáo chưa viết xong',
  '👥 Áp lực đồng nghiệp & so sánh',
];

export const StressReliefModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('shredder'); // 'shredder' | 'breathing'

  // State cho Máy Xé Giấy (Stress Shredder)
  const [stressText, setStressText] = useState('');
  const [shredStyle, setShredStyle] = useState('shred'); // 'shred' | 'burn' | 'flowers'
  const [isShredding, setIsShredding] = useState(false);
  const [shreddedCount, setShreddedCount] = useState(() => {
    return parseInt(localStorage.getItem('freedom_shredded_count') || '0', 10);
  });
  const [showShredResult, setShowShredResult] = useState(false);

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
    setShowShredResult(false);
    setIsShredding(false);
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
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box stress-relief-modal-box"
        style={{
          maxWidth: '560px',
          width: '94%',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          border: '1.5px solid #e2e8f0',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng modal */}
        <button
          className="modal-close-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            fontSize: '1rem',
            color: '#64748b',
          }}
        >
          ✕
        </button>

        {/* Tiêu đề Modal */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#059669',
              marginBottom: '8px',
            }}
          >
            <span>🌿</span>
            <span>Trạm Sạc Năng Lượng & Xả Áp Lực Công Sở</span>
          </span>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.45rem', color: '#0f172a', fontWeight: 800 }}>
            YOU CAN'T STOP HERE &bull; WELLNESS
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Nơi bạn có thể trút bỏ hoàn toàn gánh nặng deadline, thở một hơi thật sâu và lấy lại bình yên.
          </p>
        </div>

        {/* Tab Chuyển đổi giữa Máy Xé Giấy và Bài Tập Thở */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '20px',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('shredder');
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              borderRadius: '9px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'shredder' ? '#ffffff' : 'transparent',
              color: activeTab === 'shredder' ? '#0f766e' : '#64748b',
              boxShadow: activeTab === 'shredder' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📄</span>
            <span>Máy Xé Giấy Deadline</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('breathing');
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              borderRadius: '9px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'breathing' ? '#ffffff' : 'transparent',
              color: activeTab === 'breathing' ? '#0f766e' : '#64748b',
              boxShadow: activeTab === 'breathing' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🧘</span>
            <span>Nghi Thức Tan Ca & Thở 4-7-8</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: MÁY XÉ GIẤY DEADLINE (STRESS SHREDDER)
           ========================================================================= */}
        {activeTab === 'shredder' && (
          <div className="stress-shredder-view">
            {!showShredResult ? (
              <>
                <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Gõ vào đây bất kỳ điều gì đang làm bạn căng thẳng, bức xúc hoặc quá tải. Máy xé giấy sẽ hủy diệt hoàn toàn nó:
                </p>

                {/* Các tag mẫu gợi ý điền nhanh */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
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
                        padding: '4px 10px',
                        fontSize: '0.74rem',
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

                {/* Khung tờ giấy kẻ ngang mô phỏng sổ tay */}
                <div
                  className={`stress-paper-sheet ${isShredding ? 'is-shredding-anim' : ''}`}
                  style={{
                    position: 'relative',
                    background: '#fffdf0',
                    border: '1.5px solid #fef08a',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 6px 16px rgba(234, 179, 8, 0.12)',
                    marginBottom: '14px',
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #fef08a 28px)',
                    overflow: 'hidden',
                  }}
                >
                  <textarea
                    rows={4}
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
                      fontSize: '0.94rem',
                      lineHeight: '28px',
                      color: '#713f12',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                  />

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

                {/* Chọn hiệu ứng tiêu hủy */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Hiệu ứng tiêu hủy:</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        name="shredStyle"
                        checked={shredStyle === 'shred'}
                        onChange={() => setShredStyle('shred')}
                      />
                      <span>⚡ Cắt vụn máy</span>
                    </label>
                    <label style={{ fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

                {/* Nút bấm Xé Nát */}
                <button
                  type="button"
                  className="modal-submit-btn"
                  onClick={handleStartShred}
                  disabled={!stressText.trim() || isShredding}
                  style={{
                    width: '100%',
                    padding: '13px',
                    background: isShredding
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #dc2626, #ea580c)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: !stressText.trim() || isShredding ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 18px rgba(220, 38, 38, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{isShredding ? '⚙️' : '💥'}</span>
                  <span>{isShredding ? 'Đang nghiền nát và xé nhỏ áp lực...' : 'XÉ NÁT & TIÊU HỦY ÁP LỰC NGAY ➔'}</span>
                </button>
              </>
            ) : (
              /* MÀN HÌNH SAU KHI TIÊU HỦY THÀNH CÔNG */
              <div style={{ textAlign: 'center', padding: '16px 10px' }}>
                <div style={{ fontSize: '3.2rem', marginBottom: '10px' }}>
                  {shredStyle === 'flowers' ? '🌸✨' : '🎉🎊'}
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f766e', fontWeight: 800 }}>
                  ĐÃ TIÊU HỦY HOÀN TOÀN ÁP LỰC ĐÓ!
                </h4>
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
      </div>
    </div>
  );
};

export default StressReliefModal;
