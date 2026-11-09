import React from 'react';
import { playClickSound, playSingingBowlSound } from '../../utils/soundEffects';

/**
 * Tính toán giai đoạn trưởng thành của Hạt Mầm / Cây Kỷ Niệm
 */
export const getPlantGrowthStage = (cap, currentTime) => {
  const unlockMs = new Date(cap.unlockDate).getTime();
  const diff = unlockMs - currentTime;

  if (diff <= 0 || cap.canOpen || cap.isOpened) {
    return {
      stageLevel: 5,
      stageName: 'Hoa Ánh Sáng Bung Nở',
      icon: '🌸',
      growthPercent: 100,
      canOpen: true,
      glowColor: '#fbbf24',
      badgeBg: 'rgba(245, 158, 11, 0.25)',
      description: 'Cây đã nở rộ những cánh hoa phát sáng! Bức thư từ quá khứ đã sẵn sàng mở khóa!',
    };
  }

  // Giả định thời gian tạo nếu không có createdAt: lùi lại tương ứng
  const createdMs = cap.createdAt ? new Date(cap.createdAt).getTime() : unlockMs - (90 * 86400000);
  const totalDuration = Math.max(86400000, unlockMs - createdMs);
  const elapsed = Math.max(0, currentTime - createdMs);
  const percent = Math.min(98, Math.max(8, Math.round((elapsed / totalDuration) * 100)));

  if (percent < 25) {
    return {
      stageLevel: 1,
      stageName: 'Hạt Mầm Hy Vọng',
      icon: '🌱',
      growthPercent: percent,
      canOpen: false,
      glowColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.2)',
      description: 'Hạt mầm vừa gieo xuống mảnh đất thời gian, đang được ấp ủ bằng niềm tin...',
    };
  } else if (percent < 50) {
    return {
      stageLevel: 2,
      stageName: 'Chồi Non Vươn Cành',
      icon: '🌿',
      growthPercent: percent,
      canOpen: false,
      glowColor: '#34d399',
      badgeBg: 'rgba(52, 211, 153, 0.2)',
      description: 'Chồi non nhú lên xanh ngát cùng hành trình nỗ lực từng ngày của bạn...',
    };
  } else if (percent < 75) {
    return {
      stageLevel: 3,
      stageName: 'Cây Kỷ Niệm Vững Vàng',
      icon: '🎋',
      growthPercent: percent,
      canOpen: false,
      glowColor: '#38bdf8',
      badgeBg: 'rgba(56, 189, 248, 0.2)',
      description: 'Thân cây đã vững chãi, cành lá sum suê lưu giữ những kỷ niệm quý giá...',
    };
  } else {
    return {
      stageLevel: 4,
      stageName: 'Nụ Hoa Sắp Bung Nở',
      icon: '🪷',
      growthPercent: percent,
      canOpen: false,
      glowColor: '#f472b6',
      badgeBg: 'rgba(244, 114, 182, 0.2)',
      description: 'Nụ hoa đang sáng bừng trong đêm, ngày tái ngộ bức thư đã rất gần...',
    };
  }
};

export const TimeCapsuleGardenView = ({
  capsules = [],
  currentTime = Date.now(),
  onOpenCapsule,
  onDeleteCapsule,
}) => {
  return (
    <div className="time-capsule-garden-container">
      {/* Garden Atmosphere Banner */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.6rem' }}>🪴</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#a7f3d0' }}>
              Khu Vườn Thời Gian Của Bạn
            </h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
              Mỗi bức thư là một cây non lớn dần theo thời gian. Cây sẽ đơm hoa khi đến ngày mở khóa!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#cbd5e1' }}>
          <span>🌟 Sẵn sàng mở:</span>
          <strong style={{ color: '#fef08a' }}>
            {capsules.filter((c) => new Date(c.unlockDate).getTime() <= currentTime || c.canOpen).length}
          </strong>
          <span>/</span>
          <span>Tổng {capsules.length} cây</span>
        </div>
      </div>

      {/* Grid of Living Plants */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '14px',
        }}
      >
        {capsules.map((cap) => {
          const plant = getPlantGrowthStage(cap, currentTime);
          const diff = new Date(cap.unlockDate).getTime() - currentTime;
          const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

          return (
            <div
              key={cap._id}
              onClick={() => plant.canOpen && onOpenCapsule(cap)}
              style={{
                borderRadius: '18px',
                padding: '16px',
                background: plant.canOpen
                  ? 'linear-gradient(165deg, rgba(245, 158, 11, 0.18) 0%, rgba(30, 27, 75, 0.75) 100%)'
                  : 'linear-gradient(165deg, rgba(255, 255, 255, 0.04) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: plant.canOpen
                  ? '1.5px solid rgba(251, 191, 36, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: plant.canOpen
                  ? '0 8px 30px rgba(245, 158, 11, 0.25), 0 0 20px rgba(245, 158, 11, 0.15)'
                  : '0 4px 16px rgba(0, 0, 0, 0.3)',
                cursor: plant.canOpen ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s ease',
              }}
            >
              {/* Plant Visual Center */}
              <div style={{ textAlign: 'center', padding: '10px 0 14px', position: 'relative' }}>
                {/* Halo Glow */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80px',
                    height: '80px',
                    background: `radial-gradient(circle, ${plant.glowColor}35 0%, transparent 70%)`,
                    filter: 'blur(8px)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Animated Growing Plant Icon */}
                <div
                  style={{
                    fontSize: plant.canOpen ? '3.2rem' : '2.8rem',
                    lineHeight: 1,
                    display: 'inline-block',
                    animation: plant.canOpen
                      ? 'plantBloomPulse 2s ease-in-out infinite'
                      : 'plantSway 3s ease-in-out infinite alternate',
                    filter: plant.canOpen ? 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.7))' : 'none',
                  }}
                >
                  {plant.icon}
                </div>

                {/* Pot Illustration */}
                <div
                  style={{
                    width: '54px',
                    height: '14px',
                    margin: '6px auto 0',
                    background: 'linear-gradient(180deg, #78350f, #451a03)',
                    borderRadius: '0 0 10px 10px',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                  }}
                />
              </div>

              {/* Plant Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      background: plant.badgeBg,
                      color: plant.glowColor,
                      border: `1px solid ${plant.glowColor}50`,
                    }}
                  >
                    {plant.stageName}
                  </span>

                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                    {plant.growthPercent}%
                  </span>
                </div>

                <h4
                  style={{
                    margin: '6px 0 4px',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: plant.canOpen ? '#fef08a' : '#f1f5f9',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={cap.title}
                >
                  {cap.title}
                </h4>

                <p style={{ margin: '0 0 10px', fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  {plant.description}
                </p>

                {/* Progress Bar of Growth */}
                <div
                  style={{
                    width: '100%',
                    height: '5px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: `${plant.growthPercent}%`,
                      height: '100%',
                      background: plant.canOpen
                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : `linear-gradient(90deg, #10b981, ${plant.glowColor})`,
                      borderRadius: '999px',
                      transition: 'width 0.4s ease',
                      boxShadow: `0 0 8px ${plant.glowColor}`,
                    }}
                  />
                </div>

                {/* Action / Countdown Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {plant.canOpen ? (
                    <button
                      type="button"
                      onClick={() => onOpenCapsule(cap)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        border: 'none',
                        color: '#0f172a',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>✨</span>
                      <span>Mở Thư Ngay!</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>
                      ⏳ Còn {daysLeft} ngày mở khóa
                    </span>
                  )}

                  {cap._id !== 'capsule_welcome_demo' && (
                    <button
                      type="button"
                      onClick={(e) => onDeleteCapsule(cap._id, e)}
                      title="Gỡ bỏ cây này"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: '4px 6px',
                        marginLeft: '8px',
                        opacity: 0.7,
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes plantSway {
          0% { transform: rotate(-3deg) scale(1); }
          100% { transform: rotate(3deg) scale(1.04); }
        }
        @keyframes plantBloomPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15) rotate(5deg); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
