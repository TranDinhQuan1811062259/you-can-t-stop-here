import React, { useState, useEffect } from 'react';
import { playClickSound, getAudioContext, isSoundEnabled } from '../../utils/soundEffects';

const WEATHER_TYPES = [
  {
    id: 'sunny',
    name: 'Nắng Rực Rỡ',
    icon: '☀️',
    temp: '28°C',
    color: '#f59e0b',
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 88, 12, 0.1))',
    borderColor: '#f59e0b',
    forecast: 'Áp cao năng lượng tích cực bao trùm toàn bộ tâm trí. Bất kể deadline có dày đặc hay task có phức tạp, bạn vẫn tràn đầy sinh lực và tự tin vượt qua gọn gàng.',
    beverage: '1 ly Cà phê muối béo ngậy hoặc Nước ép cam cà rốt tươi mát tiếp thêm sức mạnh.',
    survivalTip: 'Tận dụng ngay khung giờ vàng 9h - 11h sáng để giải quyết dứt điểm công việc hóc búa nhất trong ngày!',
    luckyCharm: 'Con số may mắn: 08 • Màu sắc tiếp sức: Vàng cam ấm áp 🌟',
  },
  {
    id: 'partly_cloudy',
    name: 'Nắng Gián Đoạn',
    icon: '⛅',
    temp: '24°C',
    color: '#06b6d4',
    bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.1))',
    borderColor: '#06b6d4',
    forecast: 'Tâm trạng nhìn chung ổn định, có đôi lúc vài đám mây oải người ghé qua làm giảm chút nhịp độ. Chỉ cần một vài quãng nghỉ ngắn là bạn lại vào form mượt mà.',
    beverage: '1 ly Trà đào cam sả ít đường hoặc Trà lài thanh mát giúp thanh lọc sự mỏi mệt.',
    survivalTip: 'Áp dụng quy tắc Pomodoro 25 phút tập trung + 5 phút đứng dậy vươn vai nhìn ra khoảng trời xa.',
    luckyCharm: 'Con số may mắn: 03 • Màu sắc tiếp sức: Xanh ngọc bích bình yên 🌿',
  },
  {
    id: 'rainy',
    name: 'Mưa Phùn Nhạy Cảm',
    icon: '🌧️',
    temp: '19°C',
    color: '#6366f1',
    bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
    borderColor: '#6366f1',
    forecast: 'Độ ẩm tâm hồn tăng cao. Hôm nay bạn rất nhạy cảm với lời nói và thái độ của người khác. Nhớ rằng đồng nghiệp gắt gỏng vì họ cũng đang mệt mỏi, không phải lỗi của bạn.',
    beverage: '1 tách Trà hoa cúc mật ong ấm hoặc Cacao nóng rắc chút bột quế vỗ về dạ dày.',
    survivalTip: 'Đeo tai nghe chống ồn, bật nhạc không lời nhẹ và hạn chế tham gia vào các cuộc tranh luận căng thẳng.',
    luckyCharm: 'Con số may mắn: 07 • Màu sắc tiếp sức: Tím oải hương dịu dàng 🌸',
  },
  {
    id: 'stormy',
    name: 'Bão Giông Deadline',
    icon: '⛈️',
    temp: '38°C',
    color: '#ef4444',
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.1))',
    borderColor: '#ef4444',
    forecast: 'Cảnh báo lốc xoáy deadline và áp lực tăng vọt. Não bộ đang ở trạng thái căng như dây đàn. Hít thở sâu ngay lập tức trước khi gõ bất kỳ email phản hồi nào!',
    beverage: '1 ly Nước dừa xiêm mát lành hoặc Nước lọc đá vắt nửa quả chanh hạ nhiệt cấp tốc.',
    survivalTip: 'Hạ bớt tiêu chuẩn hoàn hảo xuống mức "Đủ tốt". Hoàn thành đúng hạn tốt hơn hoàn hảo mà kiệt quệ!',
    luckyCharm: 'Con số may mắn: 09 • Màu sắc tiếp sức: Xanh lá cây hạ nhiệt 🍃',
  },
  {
    id: 'foggy',
    name: 'Sương Mù Mất Hướng',
    icon: '🌫️',
    temp: '16°C',
    color: '#94a3b8',
    bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.15), rgba(71, 85, 105, 0.1))',
    borderColor: '#94a3b8',
    forecast: 'Tầm nhìn nội tâm bị sương mù che phủ. Cảm thấy mông lung, tự hỏi mình đang cố gắng vì điều gì. Đừng hoảng sợ, đây chỉ là khoảng lặng tự nhiên trước khi một cánh cửa mới mở ra.',
    beverage: '1 ly Matcha Latte đá ngọt dịu hoặc Trà sữa ô long nướng thơm bùi.',
    survivalTip: 'Đừng cố ép mình tìm ra câu trả lời cho cả đời hôm nay. Chỉ cần hoàn thành những việc nhỏ trước mắt.',
    luckyCharm: 'Con số may mắn: 05 • Màu sắc tiếp sức: Trắng ngọc trai tinh khôi 🕊️',
  },
];

export const MoodWeatherForecastModal = ({ isOpen, onClose }) => {
  const [selectedWeatherId, setSelectedWeatherId] = useState('sunny');
  const [savedForecast, setSavedForecast] = useState(() => {
    try {
      return localStorage.getItem('freedom_daily_weather_mood') || 'sunny';
    } catch {
      return 'sunny';
    }
  });

  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  useEffect(() => {
    if (savedForecast) {
      setSelectedWeatherId(savedForecast);
    }
  }, [savedForecast]);

  if (!isOpen) return null;

  const currentWeather = WEATHER_TYPES.find((w) => w.id === selectedWeatherId) || WEATHER_TYPES[0];

  const handleSelectWeather = (id) => {
    playClickSound();
    setSelectedWeatherId(id);
    setHasCheckedIn(false);
  };

  const handleConfirmCheckin = () => {
    playClickSound();
    setHasCheckedIn(true);
    try {
      localStorage.setItem('freedom_daily_weather_mood', selectedWeatherId);
    } catch (e) {
      console.warn('Err:', e);
    }
  };

  return (
    <div
      className="wellness-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
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
        className="mood-weather-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderRadius: '24px',
          border: `1.5px solid ${currentWeather.borderColor}`,
          boxShadow: `0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px ${currentWeather.color}22`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
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
                background: currentWeather.bg,
                border: `1.5px solid ${currentWeather.borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
              }}
            >
              {currentWeather.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                  Bản Tin Thời Tiết Nội Tâm Đầu Ngày
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    fontWeight: 600,
                  }}
                >
                  Daily Mood Forecast
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Check-in cảm xúc buổi sáng • Nhận ngay dự báo, toa đồ uống & mẹo sống sót công sở
              </p>
            </div>
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
            }}
          >
            ✕
          </button>
        </div>

        {/* Thân Bản Tin */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Thanh chọn 5 kiểu thời tiết */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>
              Thời tiết bên trong bạn hôm nay đang như thế nào?
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {WEATHER_TYPES.map((w) => {
                const isSelected = w.id === selectedWeatherId;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSelectWeather(w.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 10px',
                      borderRadius: '16px',
                      border: isSelected ? `2px solid ${w.borderColor}` : '1.5px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: isSelected ? w.bg : 'rgba(30, 41, 59, 0.5)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      boxShadow: isSelected ? `0 8px 20px ${w.color}33` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.6rem', marginBottom: '6px' }}>{w.icon}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                      {w.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: w.color, marginTop: '2px', fontWeight: 600 }}>
                      {w.temp}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khung Bản Tin Thời Tiết Chi Tiết */}
          <div
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              borderRadius: '20px',
              border: `1.5px solid ${currentWeather.borderColor}`,
              padding: '24px',
              background: currentWeather.bg,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: `0 12px 32px ${currentWeather.color}1a`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2.5rem' }}>{currentWeather.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>
                    Dự Báo: {currentWeather.name}
                  </h4>
                  <span style={{ fontSize: '0.82rem', color: currentWeather.color, fontWeight: 600 }}>
                    Nhiệt độ tâm hồn hôm nay: {currentWeather.temp}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmCheckin}
                style={{
                  backgroundColor: hasCheckedIn ? '#059669' : currentWeather.color,
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                {hasCheckedIn ? '✓ Đã Check-in Hôm Nay' : '📌 Xác Nhận Check-in'}
              </button>
            </div>

            {/* Lời Bình Dự Báo */}
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                padding: '14px 16px',
                borderRadius: '14px',
                borderLeft: `4px solid ${currentWeather.color}`,
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: '#e2e8f0',
              }}
            >
              <strong style={{ color: currentWeather.color, display: 'block', marginBottom: '4px' }}>
                🎙️ Lời bình thời tiết:
              </strong>
              {currentWeather.forecast}
            </div>

            {/* 2 Cột Toa Đồ Uống & Mẹo Sinh Tồn */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '14px',
              }}
            >
              {/* Toa đồ uống */}
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🧋</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fef3c7' }}>
                    Toa Đồ Uống Được Khuyên Dùng:
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {currentWeather.beverage}
                </div>
              </div>

              {/* Mẹo sinh tồn */}
              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a7f3d0' }}>
                    Chiêu Thức Sinh Tồn Hôm Nay:
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {currentWeather.survivalTip}
                </div>
              </div>
            </div>

            {/* Lucky Charm */}
            <div
              style={{
                textAlign: 'center',
                padding: '10px 16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                fontSize: '0.82rem',
                color: '#cbd5e1',
                fontWeight: 600,
              }}
            >
              {currentWeather.luckyCharm}
            </div>
          </div>
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
          <span>⛅ Mọi đám mây giông rồi cũng sẽ nhường chỗ cho bầu trời trong xanh</span>
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
            Bắt đầu ngày mới
          </button>
        </div>
      </div>
    </div>
  );
};
