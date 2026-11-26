import React, { useState, useEffect } from 'react';
import { playClickSound, playSingingBowlSound } from '../../utils/soundEffects';

const INITIAL_MOOD_COUNTS = {
  deadline: 1420,
  quit: 835,
  coffee: 1940,
  hug: 1120,
  gohome: 760,
  smallwin: 540,
};

const INITIAL_SHOUTOUTS = [
  { id: 's1', mood: 'deadline', text: 'Khách hàng bảo: Em đổi màu xanh này thành màu xanh hơn giùm anh =)))', author: 'Designer kiệt sức', time: '1 phút trước' },
  { id: 's2', mood: 'coffee', text: 'Ly cold brew thứ 3 rồi nhưng con mắt vẫn dính lại với nhau...', author: 'Dev ca đêm', time: '4 phút trước' },
  { id: 's3', mood: 'gohome', text: 'Vừa dắt xe ra khỏi hầm tòa nhà, hít một hơi gió đêm thấy đời vẫn đẹp!', author: 'Kế toán vừa chốt sổ', time: '7 phút trước' },
  { id: 's4', mood: 'hug', text: 'Bị sếp mắng oan trước mặt cả phòng, ráng nuốt nước mắt vào trong.', author: 'Intern năm nhất', time: '12 phút trước' },
  { id: 's5', mood: 'smallwin', text: 'Bug tồn tại 3 ngày cuối cùng cũng fix xong trước 23h đêm nay!', author: 'Backend Coder', time: '15 phút trước' },
  { id: 's6', mood: 'quit', text: 'Mỗi sáng thức dậy đi làm đều tự hỏi: Mình đi làm vì đam mê hay vì tiền trọ?', author: 'Copywriter 25 tuổi', time: '18 phút trước' },
];

export const WorkplaceMoodRadarModal = ({ isOpen, onClose }) => {
  const STORAGE_KEY = 'freedom_workplace_mood_radar';
  const SHOUTOUTS_KEY = 'freedom_workplace_shoutouts';

  const [moodCounts, setMoodCounts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_MOOD_COUNTS;
  });

  const [shoutouts, setShoutouts] = useState(() => {
    try {
      const saved = localStorage.getItem(SHOUTOUTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_SHOUTOUTS;
  });

  const [userVotedMood, setUserVotedMood] = useState(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [newShoutoutText, setNewShoutoutText] = useState('');
  const [activeFilterMood, setActiveFilterMood] = useState('all');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(moodCounts));
    } catch (_) {}
  }, [moodCounts]);

  useEffect(() => {
    try {
      localStorage.setItem(SHOUTOUTS_KEY, JSON.stringify(shoutouts));
    } catch (_) {}
  }, [shoutouts]);

  if (!isOpen) return null;

  const totalVotes = Object.values(moodCounts).reduce((a, b) => a + b, 0);

  const MOOD_TYPES = [
    { id: 'deadline', icon: '⚡', label: 'Deadline Dí Nghẹt Thở', color: '#ef4444', count: moodCounts.deadline },
    { id: 'coffee', icon: '☕', label: 'Uống Ly Cafe Thứ 3', color: '#f59e0b', count: moodCounts.coffee },
    { id: 'hug', icon: '🫂', label: 'Kiệt Sức Cần Cái Ôm', color: '#ec4899', count: moodCounts.hug },
    { id: 'quit', icon: '🌧️', label: 'Muốn Nộp Đơn Bỏ Việc', color: '#8b5cf6', count: moodCounts.quit },
    { id: 'gohome', icon: '🏠', label: 'Vừa Xong Việc Để Về', color: '#06b6d4', count: moodCounts.gohome },
    { id: 'smallwin', icon: '✨', label: 'Có 1 Niềm Vui Nhỏ', color: '#10b981', count: moodCounts.smallwin },
  ];

  // Bấm 1 chạm bình chọn cảm xúc
  const handleVoteMood = (moodId) => {
    playClickSound();
    setUserVotedMood(moodId);
    setPulseKey((p) => p + 1);

    setMoodCounts((prev) => ({
      ...prev,
      [moodId]: prev[moodId] + 1,
    }));
  };

  // Gửi một câu chia sẻ ngắn
  const handleAddShoutout = (e) => {
    e.preventDefault();
    if (!newShoutoutText.trim()) return;

    playSingingBowlSound();
    const newItem = {
      id: `s_${Date.now()}`,
      mood: userVotedMood || 'deadline',
      text: newShoutoutText.trim(),
      author: 'Bạn (Vừa gửi)',
      time: 'Vừa xong',
    };

    setShoutouts((prev) => [newItem, ...prev]);
    setNewShoutoutText('');
  };

  const filteredShoutouts = activeFilterMood === 'all'
    ? shoutouts
    : shoutouts.filter((s) => s.mood === activeFilterMood);

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
        background: 'rgba(8, 12, 22, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="mood-radar-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '820px',
          maxHeight: '92vh',
          borderRadius: '26px',
          background: 'linear-gradient(165deg, #090f1d 0%, #111a2e 50%, #060913 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.45)',
          color: '#ffffff',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.95), 0 0 50px rgba(56, 189, 248, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header Radar Bản Đồ Cảm Xúc */}
        <div
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(8, 12, 20, 0.98))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 8px rgba(56, 189, 248, 0.5))' }}>
              🌐
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#e0f2fe', fontWeight: 900 }}>
                Radar Cảm Xúc Thời Gian Thực (Workplace Mood Radar)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                Hôm nay bạn thế nào? Nhìn thấy {totalVotes.toLocaleString()} đồng nghiệp trên cả nước cũng đang cùng cảm xúc với bạn.
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
              color: '#e0f2fe',
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

        {/* Thân cửa sổ Radar */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* ========================================================
              1. KHỐI RADAR QUÉT 360 ĐỘ + BẦU TRỜI CẢM XÚC
             ======================================================== */}
          <div
            style={{
              background: 'radial-gradient(circle at center, #0f1c38 0%, #080d1a 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '20px',
              padding: '20px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '20px',
              boxShadow: 'inset 0 0 30px rgba(56, 189, 248, 0.15)',
            }}
          >
            {/* Vòng tròn Radar quét */}
            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '1.5px dashed rgba(56, 189, 248, 0.3)',
                margin: '0 auto 14px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Tia quét Radar xoay 360 độ */}
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg at 50% 50%, rgba(56, 189, 248, 0.35) 0deg, transparent 60deg, transparent 360deg)',
                  animation: 'radarSweep 4s linear infinite',
                }}
              />

              {/* Tâm Radar */}
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  boxShadow: '0 0 20px rgba(56, 189, 248, 0.7)',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {userVotedMood ? MOOD_TYPES.find((m) => m.id === userVotedMood)?.icon : '❤️'}
              </div>

              {/* Vòng sóng năng lượng lan tỏa khi vừa vote */}
              {pulseKey > 0 && (
                <div
                  key={pulseKey}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '2px solid #38bdf8',
                    animation: 'radarPulse 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                  }}
                />
              )}
            </div>

            <div style={{ fontSize: '0.86rem', color: '#bae6fd', fontWeight: 700 }}>
              {userVotedMood ? (
                <span>Bạn đã truyền đi tín hiệu: <strong style={{ color: '#38bdf8' }}>{MOOD_TYPES.find((m) => m.id === userVotedMood)?.label}</strong>! 📡</span>
              ) : (
                <span>Bấm 1 chạm vào tâm trạng bên dưới để truyền năng lượng lên Radar:</span>
              )}
            </div>
          </div>

          {/* ========================================================
              2. BỘ PHÍM BẤM 1 CHẠM (ONE-TAP PULSE BUTTONS)
             ======================================================== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '22px' }}>
            {MOOD_TYPES.map((m) => {
              const isSelected = userVotedMood === m.id;
              const percentage = Math.round((m.count / totalVotes) * 100);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleVoteMood(m.id)}
                  style={{
                    background: isSelected ? 'rgba(56, 189, 248, 0.22)' : 'rgba(15, 23, 42, 0.7)',
                    border: isSelected ? `2px solid ${m.color}` : '1.5px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: isSelected ? `0 0 20px ${m.color}60` : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: isSelected ? m.color : '#f1f5f9' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {m.count.toLocaleString()} người ({percentage}%)
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: isSelected ? m.color : '#64748b', fontWeight: 800 }}>
                    {isSelected ? 'ĐÃ CHỌN ✓' : '+1 Chạm'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ========================================================
              3. DÒNG SUỐI TÂM TƯ (LIVE WORKPLACE SHOUTOUT TICKER)
             ======================================================== */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '18px',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>💬</span>
                <strong style={{ fontSize: '0.92rem', color: '#e0f2fe' }}>
                  Dòng Suối Tâm Tư Công Sở (Trực Tiếp):
                </strong>
              </div>

              {/* Lọc theo cảm xúc */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{ id: 'all', label: 'Tất cả' }, { id: 'deadline', label: '⚡ Deadline' }, { id: 'quit', label: '🌧️ Bỏ việc' }, { id: 'coffee', label: '☕ Cà phê' }].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => { playClickSound(); setActiveFilterMood(f.id); }}
                    style={{
                      background: activeFilterMood === f.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0,0,0,0.3)',
                      border: activeFilterMood === f.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                      color: activeFilterMood === f.id ? '#38bdf8' : '#94a3b8',
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô nhập câu chia sẻ 1 dòng */}
            <form noValidate onSubmit={handleAddShoutout} style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newShoutoutText}
                onChange={(e) => setNewShoutoutText(e.target.value)}
                placeholder="Gửi một dòng tâm sự nhanh (tối đa 60 ký tự, không cần đăng nhập)..."
                maxLength={80}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1.5px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '12px',
                  padding: '9px 14px',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!newShoutoutText.trim()}
                style={{
                  background: newShoutoutText.trim() ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(255, 255, 255, 0.1)',
                  color: newShoutoutText.trim() ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '9px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: newShoutoutText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Gửi Đi 📡
              </button>
            </form>

            {/* Danh sách lời nhắn */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredShoutouts.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.84rem', color: '#f1f5f9', fontWeight: 600 }}>
                      "{s.text}"
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                      {s.author} • {s.time}
                    </div>
                  </div>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                    {MOOD_TYPES.find((m) => m.id === s.mood)?.icon || '💭'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Style keyframe cho Radar */}
        <style>{`
          @keyframes radarSweep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes radarPulse {
            0% { transform: scale(1); opacity: 0.9; }
            100% { transform: scale(1.4); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
};
