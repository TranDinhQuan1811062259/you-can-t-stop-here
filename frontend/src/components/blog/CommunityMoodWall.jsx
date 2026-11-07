import React, { useState, useEffect } from 'react';
import { playClickSound } from '../../utils/soundEffects';

const INITIAL_MOODS = [
  {
    id: 'exhausted',
    icon: '💤',
    label: 'Cần ngủ / Kiệt sức',
    count: 142,
    color: '#6366f1',
    bg: '#eef2ff',
    advice: 'Bạn đã gánh vác quá nhiều rồi. Hãy chợp mắt 15 phút hoặc nghỉ sớm tối nay nhé!',
  },
  {
    id: 'deadline',
    icon: '🔥',
    label: 'Đang bơi trong deadline',
    count: 118,
    color: '#ef4444',
    bg: '#fef2f2',
    advice: 'Chia nhỏ từng việc ra và giải quyết từng task một. Hít thở sâu, bạn sẽ vượt qua được!',
  },
  {
    id: 'coffee',
    icon: '☕',
    label: 'Cần một ly cà phê',
    count: 86,
    color: '#b45309',
    bg: '#fffbeb',
    advice: 'Nhâm nhi một ngụm ấm áp và nghe một bản nhạc nhẹ nhàng trong lúc làm việc nhé.',
  },
  {
    id: 'peaceful',
    icon: '🌿',
    label: 'Tìm thấy bình yên',
    count: 94,
    color: '#10b981',
    bg: '#ecfdf5',
    advice: 'Thật tuyệt vời! Hãy lan tỏa sự thư thái này đến những người đồng nghiệp xung quanh.',
  },
  {
    id: 'motivated',
    icon: '✨',
    label: 'Tràn đầy năng lượng',
    count: 73,
    color: '#f59e0b',
    bg: '#fffbeb',
    advice: 'Hãy giữ vững ngọn lửa nhiệt huyết này và tạo nên những điều tuyệt vời hôm nay!',
  },
];

export const CommunityMoodWall = ({ onOpenWellness }) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const [selectedMoodId, setSelectedMoodId] = useState(() => {
    try {
      const saved = localStorage.getItem(`freedom_mood_${todayKey}`);
      return saved || null;
    } catch (e) {
      return null;
    }
  });

  const [moods, setMoods] = useState(() => {
    try {
      const savedList = localStorage.getItem('freedom_mood_counts');
      if (savedList) return JSON.parse(savedList);
    } catch (e) {}
    return INITIAL_MOODS;
  });

  const totalVotes = moods.reduce((sum, m) => sum + m.count, 0);

  const handleVote = (moodId) => {
    playClickSound();
    const updated = moods.map((m) => {
      if (m.id === moodId) {
        return { ...m, count: m.count + (selectedMoodId === moodId ? 0 : 1) };
      }
      if (m.id === selectedMoodId && selectedMoodId !== moodId) {
        return { ...m, count: Math.max(0, m.count - 1) };
      }
      return m;
    });

    setMoods(updated);
    setSelectedMoodId(moodId);
    try {
      localStorage.setItem(`freedom_mood_${todayKey}`, moodId);
      localStorage.setItem('freedom_mood_counts', JSON.stringify(updated));
    } catch (e) {}
  };

  const selectedMoodObj = moods.find((m) => m.id === selectedMoodId);

  return (
    <div
      className="community-mood-wall"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '26px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📊</span>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
              Bức Tường Tâm Trạng Hôm Nay
            </strong>
            <span
              style={{
                background: '#f1f5f9',
                color: '#64748b',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {totalVotes} người đã chia sẻ
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Hôm nay cảm xúc công việc của bạn thế nào? Bấm 1 chạm để cùng chia sẻ với đồng nghiệp nhé:
          </p>
        </div>

        {onOpenWellness && (
          <button
            type="button"
            onClick={onOpenWellness}
            style={{
              background: 'linear-gradient(135deg, #0d9488, #059669)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.2)',
            }}
          >
            <span>🌿</span>
            <span>Trạm Xả Áp Lực & Thở 4-7-8 &rarr;</span>
          </button>
        )}
      </div>

      {/* Grid các nút bấm tâm trạng */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        {moods.map((m) => {
          const isSelected = selectedMoodId === m.id;
          const percentage = totalVotes > 0 ? Math.round((m.count / totalVotes) * 100) : 0;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleVote(m.id)}
              style={{
                background: isSelected ? m.bg : '#ffffff',
                border: isSelected ? `2px solid ${m.color}` : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 10px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 4px 14px ${m.color}33` : '0 1px 3px rgba(0,0,0,0.03)',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{m.icon}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? m.color : '#334155', marginBottom: '6px' }}>
                {m.label}
              </div>

              {/* Thanh % nhỏ bên dưới */}
              <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    background: m.color,
                    height: '100%',
                    width: `${percentage}%`,
                    borderRadius: '3px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                {percentage}% ({m.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Lời khuyên ấm áp hiển thị ngay sau khi chọn */}
      {selectedMoodObj && (
        <div
          style={{
            background: selectedMoodObj.bg,
            border: `1px solid ${selectedMoodObj.color}44`,
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeInMood 0.3s ease-out',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>{selectedMoodObj.icon}</span>
          <div style={{ flex: 1, fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.45 }}>
            <strong>Thông điệp dành riêng cho bạn: </strong>
            <span>{selectedMoodObj.advice}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityMoodWall;
