import React, { useState, useEffect } from 'react';
import { playClickSound, playSingingBowlSound, playWarmthSound } from '../../utils/soundEffects';

const GROUNDING_STEPS = [
  {
    step: 5,
    title: '👀 5 Thứ bạn nhìn thấy quanh mình lúc này',
    description: 'Chậm rãi đảo mắt quanh phòng và bấm chọn 5 đồ vật thật bạn đang nhìn thấy:',
    items: ['💻 Màn hình máy tính', '☕ Chiếc cốc uống nước', '🖐️ Đôi bàn tay của bạn', '🪟 Khung cửa sổ / Bầu trời', '🌿 Một chậu cây hoặc vật thể gần bạn'],
  },
  {
    step: 4,
    title: '✋ 4 Thứ bạn có thể chạm và cảm nhận xúc giác',
    description: 'Tập trung vào cơ thể và cảm nhận sự tiếp xúc vật lý xung quanh:',
    items: ['🪵 Mặt bàn làm việc mát rượi', '🪑 Chiếc ghế đang nâng đỡ lưng bạn', '👕 Lớp vải áo mềm mại trên vai', '👣 Đôi bàn chân vững chãi chạm sàn'],
  },
  {
    step: 3,
    title: '👂 3 Âm thanh bạn đang nghe thấy',
    description: 'Lắng nghe những rung động âm thanh thật dịu êm xung quanh:',
    items: ['🌬️ Tiếng quạt gió hoặc máy tính', '🫁 Tiếng hơi thở êm dịu của chính bạn', '🚗 Tiếng xe cộ hoặc gió thoảng xa xa'],
  },
  {
    step: 2,
    title: '👃 2 Mùi hương bạn ngửi thấy',
    description: 'Hít một hơi thật sâu qua cánh mũi và cảm nhận:',
    items: ['☕ Thoang thoảng mùi nước ấm / cà phê', '🌿 Mùi không khí trong lành của căn phòng'],
  },
  {
    step: 1,
    title: '💖 1 Điều tốt đẹp bạn biết ơn lúc này',
    description: 'Đặt tay lên ngực và gửi một lời cảm ơn đến chính bạn:',
    items: ['✨ Bạn vẫn đang thở, và bạn vừa dũng cảm vượt qua khoảnh khắc hoảng loạn nhất!'],
  },
];

export const EmergencyCalmModal = ({ isOpen, onClose }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [checkedItems, setCheckedItems] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  // Kích hoạt chuông chánh niệm khi mở modal
  useEffect(() => {
    if (isOpen) {
      playSingingBowlSound();
      setCurrentStepIdx(0);
      setCheckedItems({});
      setIsCompleted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStepData = GROUNDING_STEPS[currentStepIdx];
  const stepRequiredCount = currentStepData.items.length;
  const stepCheckedCount = (checkedItems[currentStepIdx] || []).length;
  const isStepDone = stepCheckedCount >= stepRequiredCount;

  const handleToggleItem = (idx) => {
    playClickSound();
    const currentList = checkedItems[currentStepIdx] || [];
    const nextList = currentList.includes(idx)
      ? currentList.filter((i) => i !== idx)
      : [...currentList, idx];

    setCheckedItems({ ...checkedItems, [currentStepIdx]: nextList });
  };

  const handleNextStep = () => {
    playSingingBowlSound();
    if (currentStepIdx < GROUNDING_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      playWarmthSound();
    }
  };

  return (
    <div
      className="modal-backdrop emergency-calm-backdrop"
      onClick={onClose}
      style={{
        zIndex: 100000,
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'radial-gradient(circle at 50% 50%, rgba(4, 30, 36, 0.94) 0%, rgba(15, 23, 42, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="emergency-calm-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '560px',
          background: 'linear-gradient(160deg, #081720 0%, #040e14 100%)',
          border: '1.5px solid rgba(45, 212, 191, 0.45)',
          borderRadius: '26px',
          padding: '28px 24px',
          color: '#ffffff',
          boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(13, 148, 136, 0.35)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
          animation: 'fadeInUp 0.3s ease',
        }}
      >
        {/* Nút thoát */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: '#e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
        >
          ✕
        </button>

        {!isCompleted ? (
          <>
            {/* Huy hiệu SOS & Cứu trợ */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.35) 100%)',
                border: '1.5px solid #ef4444',
                borderRadius: '999px',
                color: '#fecaca',
                fontSize: '0.82rem',
                fontWeight: 900,
                letterSpacing: '0.5px',
                marginBottom: '16px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
              }}
            >
              <span>🆘 TRẠM CỨU TRỢ KHẨN CẤP</span>
              <span>•</span>
              <span>ĐỊNH TÂM 5-4-3-2-1</span>
            </div>

            {/* Vòng hào quang phập phồng điều hòa nhịp tim */}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(45, 212, 191, 0.35) 0%, transparent 70%)',
                border: '2px solid rgba(45, 212, 191, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 0 30px rgba(45, 212, 191, 0.45)',
                animation: 'calmPulseGlow 3.5s ease-in-out infinite',
              }}
            >
              <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>🧘</span>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem', color: '#5eead4', fontWeight: 900, textShadow: '0 2px 10px rgba(45, 212, 191, 0.3)' }}>
              {currentStepData.title}
            </h3>

            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5, fontWeight: 500 }}>
              {currentStepData.description}
            </p>

            {/* Thanh tiến độ số lượng cần chọn */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '0.78rem', color: '#94a3b8' }}>
              <span>Đã xác nhận:</span>
              <strong style={{ color: isStepDone ? '#2dd4bf' : '#fbbf24', fontSize: '0.9rem' }}>
                {stepCheckedCount} / {stepRequiredCount}
              </strong>
            </div>

            {/* Danh sách các giác quan cần xác nhận (Độ tương phản cao, thẻ nổi bật) */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '22px' }}>
              {currentStepData.items.map((item, idx) => {
                const isChecked = (checkedItems[currentStepIdx] || []).includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleItem(idx)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      background: isChecked
                        ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.35) 0%, rgba(20, 184, 166, 0.45) 100%)'
                        : 'rgba(255, 255, 255, 0.08)',
                      border: isChecked ? '2px solid #2dd4bf' : '1.5px solid rgba(255, 255, 255, 0.2)',
                      color: isChecked ? '#ffffff' : '#f8fafc',
                      fontSize: '0.9rem',
                      fontWeight: isChecked ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      boxShadow: isChecked
                        ? '0 4px 16px rgba(13, 148, 136, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        : '0 2px 6px rgba(0, 0, 0, 0.25)',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.6)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{item.split(' ')[0]}</span>
                      <span style={{ color: isChecked ? '#a7f3d0' : '#ffffff', fontWeight: isChecked ? 800 : 600 }}>
                        {item.split(' ').slice(1).join(' ')}
                      </span>
                    </span>
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: isChecked ? '#2dd4bf' : 'rgba(255, 255, 255, 0.12)',
                        color: isChecked ? '#042f2e' : 'transparent',
                        border: isChecked ? 'none' : '1.5px solid rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        boxShadow: isChecked ? '0 2px 8px rgba(45, 212, 191, 0.6)' : 'none',
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Nút Chuyển Bước Tiếp Theo */}
            <button
              type="button"
              onClick={handleNextStep}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '14px',
                border: 'none',
                background: isStepDone
                  ? 'linear-gradient(135deg, #0d9488, #10b981)'
                  : 'rgba(255, 255, 255, 0.12)',
                color: isStepDone ? '#ffffff' : '#94a3b8',
                fontSize: '0.94rem',
                fontWeight: 800,
                cursor: isStepDone ? 'pointer' : 'default',
                boxShadow: isStepDone ? '0 6px 24px rgba(13, 148, 136, 0.5)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {currentStepIdx < GROUNDING_STEPS.length - 1
                ? `Tiếp Tục Bước ${currentStepIdx + 2} / 5 ➔`
                : 'Hoàn Thành Bài Tập Định Tâm 🎉'}
            </button>
          </>
        ) : (
          /* Màn hình sau khi hoàn thành 5 bước định tâm */
          <div style={{ padding: '20px 10px', animation: 'fadeInUp 0.3s ease' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🌟🌸</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.4rem', color: '#5eead4', fontWeight: 900 }}>
              Cơn Bão Đã Đi Qua Rồi!
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.94rem', color: '#e2e8f0', lineHeight: 1.6, fontWeight: 500 }}>
              Bạn đang ở một nơi an toàn. Nhịp tim của bạn đã chậm lại và cơ thể đã trở về với hiện tại. Hãy nhớ rằng không có deadline hay áp lực nào quan trọng hơn bình an và tính mạng của bạn.
            </p>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0d9488, #059669)',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(13, 148, 136, 0.4)',
              }}
            >
              Tôi Đã Bình Tĩnh Hơn Rất Nhiều ✨
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
