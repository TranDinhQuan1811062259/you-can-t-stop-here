import React, { useState, useEffect } from 'react';
import { playClickSound, getAudioContext, isSoundEnabled } from '../../utils/soundEffects';

const PILLS_DATABASE = [
  {
    id: 'boss_criticism',
    title: 'Liều "Bị Khiển Trách / Bất Công Nơi Công Sở"',
    subtitle: 'Dành cho những lúc tự ái bị tổn thương, uất ức và tức tưởi',
    badge: 'Cấp Cứu Cảm Xúc',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.45)',
    icon: '💊',
    capsuleColor1: '#ea580c',
    capsuleColor2: '#fed7aa',
    views: [
      'Cơn giận dữ và lời gắt gỏng của họ phản ánh sự bế tắc và áp lực bên trong họ, không phải là thước đo định giá con người hay năng lực thực sự của bạn.',
      'Một ngày tồi tệ không có nghĩa là một sự nghiệp thất bại. 5 năm nữa nhìn lại, bạn thậm chí sẽ không thể nhớ nổi người ta đã quát điều gì.',
      'Bạn đi làm để nhận lương và trau dồi chuyên môn, bạn không bán lòng tự trọng cho sự bốc đồng hay thiếu chuyên nghiệp của bất kỳ ai.',
    ],
    action5m: 'Rời mắt khỏi màn hình ngay lập tức. Đi rửa mặt bằng vốc nước mát, uống một cốc nước ấm thật chậm rãi từng ngụm và thở sâu 10 nhịp cơ bụng.',
    mantra: 'Tôi tách biệt giá trị bản thân khỏi cảm xúc thất thường của người khác.',
  },
  {
    id: 'impostor_syndrome',
    title: 'Liều "Hội Chứng Kẻ Giả Mạo (Impostor Syndrome)"',
    subtitle: 'Dành cho lúc thấy mình bất tài, ăn may, thua kém bạn bè đồng nghiệp',
    badge: 'Hồi Phục Tự Tin',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.45)',
    icon: '🔮',
    capsuleColor1: '#9333ea',
    capsuleColor2: '#e9d5ff',
    views: [
      'Kẻ kém cỏi thường tự mãn vì không biết mình thiếu gì (Dunning-Kruger). Chỉ những người thông minh, cầu tiến và có trách nhiệm mới luôn lo lắng mình chưa đủ giỏi.',
      'Bạn không cần phải biết mọi thứ mới xứng đáng ở vị trí hiện tại. Bạn được chọn vì năng lực giải quyết vấn đề, sự tận tụy và tiềm năng học hỏi.',
      'So sánh hậu trường lộn xộn của bạn với sân khấu lộng lẫy được gọt giũa của người khác là phép so sánh bất công và tàn nhẫn nhất.',
    ],
    action5m: 'Mở ghi chú điện thoại hoặc lấy tờ giấy, viết ra đúng 3 điều bạn đã tự tay hoàn thành tốt trong tháng này mà 1 năm trước bạn chưa từng biết làm.',
    mantra: 'Tôi đang tiến bộ mỗi ngày theo nhịp điệu và quỹ đạo của riêng tôi.',
  },
  {
    id: 'midnight_overthinking',
    title: 'Liều "Overthinking Nửa Đêm Về Tương Lai & Tiền Bạc"',
    subtitle: 'Dành cho đêm mất ngủ, lo sợ nghèo khó, mông lung con đường phía trước',
    badge: 'An Thần Đêm Muộn',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.45)',
    icon: '🌙',
    capsuleColor1: '#4f46e5',
    capsuleColor2: '#c7d2fe',
    views: [
      'Vào lúc nửa đêm, não bộ mệt mỏi sẽ nhường chỗ cho hạch hạnh nhân phóng đại nỗi sợ lên gấp 10 lần. Mọi phán xét bi quan sau 23h đều là ảo giác hóa học.',
      'Hơn 85% những kịch bản tồi tệ nhất bạn từng trằn trọc trong quá khứ đã chưa từng xảy ra trên thực tế.',
      'Đêm nay không có bất kỳ quyết định tài chính nào cần phải giải quyết. Việc sống còn duy nhất của bạn đêm nay là ngủ để hồi sinh các nơ-ron thần kinh.',
    ],
    action5m: 'Cất điện thoại cách xa giường 2 mét. Bật tiếng mưa rơi nhẹ, nằm ngửa thả lỏng từng thớ cơ từ ngón chân lên đỉnh đầu, thở ra dài gấp đôi hít vào.',
    mantra: 'Ngày mai sẽ có sức mạnh của ngày mai. Đêm nay tôi cho phép tâm trí nghỉ ngơi.',
  },
  {
    id: 'deadline_panic',
    title: 'Liều "Deadline Dồn Dập, Ngột Ngạt & Muốn Buông Xuôi"',
    subtitle: 'Dành cho lúc ngộp thở vì danh sách việc dài vô tận, muốn trốn chạy',
    badge: 'Gỡ Rối Cấp Tốc',
    color: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.45)',
    icon: '⏱️',
    capsuleColor1: '#0d9488',
    capsuleColor2: '#99f6e4',
    views: [
      'Căng thẳng và hoảng loạn không làm deadline co ngắn lại, nó chỉ bào mòn 50% chỉ số IQ và khả năng phán đoán xử lý công việc của bạn.',
      'Không có bản báo cáo hay dòng code nào trên đời quý giá hơn nhịp tim và hệ thần kinh của bạn. Bầu trời sẽ không sụp đổ nếu việc chậm nửa ngày.',
      'Nếu mọi việc đều được dán nhãn "khẩn cấp", thì đó là sự kém cỏi trong sắp xếp quy trình của tổ chức, không phải lỗi cá nhân bạn.',
    ],
    action5m: 'Lấy giấy bút chỉ chọn DUY NHẤT 1 việc có tác động lớn nhất. Tắt toàn bộ tab thông báo trong 20 phút và chỉ làm đúng 1 gạch đầu dòng đầu tiên.',
    mantra: 'Mỗi lúc chỉ một việc. Bình tĩnh từng bước một là cách nhanh nhất.',
  },
  {
    id: 'burnout_exhaustion',
    title: 'Liều "Kiệt Sức (Burnout) & Cạn Kiệt Năng Lượng"',
    subtitle: 'Dành cho lúc không còn thiết tha điều gì, thức dậy thấy rã rời',
    badge: 'Tái Tạo Sinh Lực',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    borderColor: 'rgba(234, 179, 8, 0.45)',
    icon: '🔋',
    capsuleColor1: '#ca8a04',
    capsuleColor2: '#fef08a',
    views: [
      'Một chiếc máy hết xăng thì phải dừng lại đổ xăng, không thể quát tháo ép nó chạy bằng ý chí. Cơ thể bạn đang kêu cứu, hãy lắng nghe nó.',
      'Nghỉ ngơi không phải là một phần thưởng có điều kiện sau khi làm xong việc; nghỉ ngơi là nhu cầu sinh học bắt buộc để duy trì mạng sống.',
      'Bạn đã gồng gánh quá nhiều và quá lâu rồi. Được phép thả lỏng, được phép bất toàn mà không cần phải mang cảm giác tội lỗi.',
    ],
    action5m: 'Từ chối một cuộc hẹn không khẩn cấp. Nằm tựa lưng vào đệm êm, nhắm mắt nghe bản nhạc không lời trong 5 phút mà không chạm tay vào bất kỳ thiết bị nào.',
    mantra: 'Tôi xứng đáng được nghỉ ngơi trọn vẹn và vô điều kiện.',
  },
];

// Âm thanh bóc vỉ thuốc (foil pop synth)
const playFoilPopSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) {
    console.warn('Audio err:', e);
  }
};

// Âm thanh uống nước êm dịu
const playSipWaterSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.28);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn('Audio err:', e);
  }
};

export const MentalFirstAidModal = ({ isOpen, onClose }) => {
  const [selectedPillId, setSelectedPillId] = useState(PILLS_DATABASE[0].id);
  const [isPopped, setIsPopped] = useState(false);
  const [hasTaken, setHasTaken] = useState(false);
  const [activeTab, setActiveTab] = useState('dispenser'); // 'dispenser' | 'history' | 'hotline'
  const [takenHistory, setTakenHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('freedom_mental_first_aid_log') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!isOpen) {
      setIsPopped(false);
      setHasTaken(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPill = PILLS_DATABASE.find((p) => p.id === selectedPillId) || PILLS_DATABASE[0];

  const handleSelectPill = (id) => {
    playClickSound();
    setSelectedPillId(id);
    setIsPopped(false);
    setHasTaken(false);
  };

  const handlePopPill = () => {
    playFoilPopSound();
    setIsPopped(true);
  };

  const handleTakeDose = () => {
    playSipWaterSound();
    setHasTaken(true);
    const newRecord = {
      id: Date.now(),
      pillId: currentPill.id,
      pillTitle: currentPill.title,
      mantra: currentPill.mantra,
      takenAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
    };
    const updated = [newRecord, ...takenHistory].slice(0, 20);
    setTakenHistory(updated);
    try {
      localStorage.setItem('freedom_mental_first_aid_log', JSON.stringify(updated));
    } catch (e) {
      console.warn('Save err:', e);
    }
  };

  return (
    <div
      className="wellness-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        className="mental-first-aid-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderRadius: '24px',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)',
              }}
            >
              💊
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                  Hộp Thuốc Cứu Thương Tâm Trí
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(236, 72, 153, 0.2)',
                    color: '#f472b6',
                    fontWeight: 600,
                  }}
                >
                  Mental First-Aid Kit
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Liều thuốc tâm lý xoa dịu những cơn đau, uất ức & ngột ngạt công sở
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '3px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('dispenser');
                }}
                style={{
                  border: 'none',
                  background: activeTab === 'dispenser' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: activeTab === 'dispenser' ? '#ffffff' : '#94a3b8',
                  padding: '6px 12px',
                  borderRadius: '9px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Tủ thuốc
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('history');
                }}
                style={{
                  border: 'none',
                  background: activeTab === 'history' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: activeTab === 'history' ? '#ffffff' : '#94a3b8',
                  padding: '6px 12px',
                  borderRadius: '9px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Nhật ký ({takenHistory.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title="Đóng hộp thuốc"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Nội Dung */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeTab === 'dispenser' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Thanh chọn 5 vỉ thuốc */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>
                  Chọn vỉ thuốc phù hợp với cơn đau hiện tại của bạn:
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {PILLS_DATABASE.map((pill) => {
                    const isSelected = pill.id === selectedPillId;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => handleSelectPill(pill.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '12px 10px',
                          borderRadius: '16px',
                          border: isSelected ? `2px solid ${pill.color}` : '1.5px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: isSelected ? pill.bg : 'rgba(30, 41, 59, 0.5)',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: isSelected ? 'translateY(-2px)' : 'none',
                          boxShadow: isSelected ? `0 8px 20px ${pill.color}33` : 'none',
                        }}
                      >
                        <span style={{ fontSize: '1.6rem', marginBottom: '6px' }}>{pill.icon}</span>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: isSelected ? '#ffffff' : '#cbd5e1',
                            textAlign: 'center',
                            lineHeight: 1.3,
                          }}
                        >
                          {pill.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Khu vực vỉ thuốc tương tác (Blister Pack) */}
              <div
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.7)',
                  borderRadius: '20px',
                  border: `1.5px solid ${currentPill.borderColor}`,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  background: `linear-gradient(145deg, rgba(30, 41, 59, 0.8), ${currentPill.bg})`,
                  boxShadow: `0 10px 30px -5px ${currentPill.color}22`,
                }}
              >
                {/* Tiêu đề thuốc & Tình trạng */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        backgroundColor: currentPill.color,
                        color: '#ffffff',
                        marginBottom: '8px',
                      }}
                    >
                      {currentPill.badge} • Liều Uống Cấp Tốc
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                      {currentPill.title}
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                      {currentPill.subtitle}
                    </p>
                  </div>

                  {/* Vỉ thuốc 3D để bấm bóc (Pop) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      onClick={!isPopped ? handlePopPill : undefined}
                      style={{
                        width: '74px',
                        height: '74px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.03))',
                        border: '2px dashed rgba(255, 255, 255, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isPopped ? 'default' : 'pointer',
                        transition: 'all 0.3s',
                        position: 'relative',
                        boxShadow: isPopped ? 'inset 0 4px 10px rgba(0,0,0,0.4)' : '0 6px 16px rgba(0,0,0,0.2)',
                      }}
                      title={isPopped ? 'Viên thuốc đã được bóc' : 'Bấm để bóc 1 viên thuốc'}
                    >
                      {/* Viên nang thuốc 2 màu */}
                      <div
                        style={{
                          width: '38px',
                          height: '18px',
                          borderRadius: '10px',
                          background: `linear-gradient(90deg, ${currentPill.capsuleColor1} 50%, ${currentPill.capsuleColor2} 50%)`,
                          boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                          transform: isPopped ? 'translateY(18px) scale(0.9) rotate(25deg)' : 'none',
                          transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          opacity: isPopped ? 0.95 : 1,
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: isPopped ? '#10b981' : '#cbd5e1', marginTop: '6px', fontWeight: 600 }}>
                        {isPopped ? 'Đã bóc ✓' : 'Bấm bóc 👆'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Phần toa thuốc sau khi bóc */}
                {isPopped ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      backgroundColor: 'rgba(15, 23, 42, 0.7)',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      animation: 'slideUp 0.3s ease',
                    }}
                  >
                    {/* 3 Góc Nhìn Xoa Dịu */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '1.1rem' }}>🩺</span>
                        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                          3 Góc Nhìn Xoa Dịu Cơn Đau (Toa Thuốc Nhận Thức):
                        </h5>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {currentPill.views.map((v, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              backgroundColor: 'rgba(30, 41, 59, 0.6)',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              borderLeft: `3px solid ${currentPill.color}`,
                            }}
                          >
                            <span style={{ fontSize: '0.85rem', color: currentPill.color, fontWeight: 700 }}>
                              {idx + 1}.
                            </span>
                            <span style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                              {v}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 1 Hành Động Cụ Thể Trong 5 Phút */}
                    <div
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>⏱️</span>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>
                          Hành động cụ thể cần làm ngay trong 5 phút:
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#f0fdf4', marginTop: '2px' }}>
                          {currentPill.action5m}
                        </div>
                      </div>
                    </div>

                    {/* Câu Thần Chú Bình Yên (Mantra) */}
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '12px',
                        background: 'linear-gradient(90deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1))',
                        borderRadius: '12px',
                        border: '1px dashed rgba(236, 72, 153, 0.3)',
                      }}
                    >
                      <span style={{ fontSize: '0.78rem', color: '#f472b6', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        ✨ Câu thần chú nhẩm trong đầu:
                      </span>
                      <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', fontStyle: 'italic' }}>
                        "{currentPill.mantra}"
                      </span>
                    </div>

                    {/* Nút uống thuốc */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={handleTakeDose}
                        disabled={hasTaken}
                        style={{
                          backgroundColor: hasTaken ? '#059669' : currentPill.color,
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 32px',
                          borderRadius: '30px',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          cursor: hasTaken ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                          transition: 'all 0.25s',
                        }}
                      >
                        {hasTaken ? (
                          <>
                            <span>✓</span> Đã Uống Liều Này (Ghi Vào Nhật Ký)
                          </>
                        ) : (
                          <>
                            <span>🥛</span> Uống 1 Ngụm Nước & Hấp Thụ Liều Thuốc Này
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={handlePopPill}
                    style={{
                      textAlign: 'center',
                      padding: '36px 20px',
                      backgroundColor: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '16px',
                      border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      Bấm vào vỉ thuốc bên trên để "bóc" 1 liều cấp cứu
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                      Thuốc sẽ bung ra 3 góc nhìn tâm lý giải tỏa tức thì + 1 việc cần làm trong 5 phút
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                  📜 Nhật Ký Đã Uống Thuốc Tâm Trí
                </h4>
                {takenHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Xóa sạch lịch sử uống thuốc?')) {
                        setTakenHistory([]);
                        localStorage.removeItem('freedom_mental_first_aid_log');
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Xóa lịch sử
                  </button>
                )}
              </div>

              {takenHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📭</div>
                  <div>Bạn chưa uống liều thuốc nào gần đây.</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Khi gặp áp lực, hãy bóc 1 viên thuốc để xoa dịu nhé!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {takenHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>
                          {item.pillTitle}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontStyle: 'italic', marginTop: '2px' }}>
                          "{item.mantra}"
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {item.takenAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#94a3b8',
          }}
        >
          <span>🌿 You Can't Stop Here • Không gian an toàn chăm sóc sức khỏe tinh thần</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Đã khỏe hơn rồi
          </button>
        </div>
      </div>
    </div>
  );
};
