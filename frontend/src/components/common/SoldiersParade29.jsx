import React from 'react';

/**
 * SoldiersParade29 - Hoạt cảnh đoàn quân tiêu binh duyệt binh rước cờ Tổ quốc & cờ Quyết Thắng
 * Mô phỏng nguyên mẫu khối chiến sĩ duyệt binh Quân Đội Nhân Dân Việt Nam (Ảnh Báo Quân Đội Nhân Dân)
 * - Quân phục duyệt binh trang nghiêm, mũ kê-pi, găng tay trắng, thắt lưng trắng
 * - Bước chân duyệt binh dõng dạc (Goose-step Parade March)
 * - Giương cao cờ đỏ sao vàng Quyết Thắng kiêu hãnh lướt qua màn hình
 */
export const SoldiersParade29 = ({ className = '', style = {} }) => {
  return (
    <div
      className={`soldiers-parade-29-container ${className}`}
      style={{
        position: 'absolute',
        bottom: '10%',
        left: 0,
        width: '100%',
        height: '320px',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 6,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Hào quang đường chân trời nơi đoàn quân bước tới */}
      <div className="parade-ground-runway" />

      {/* Khối chiến sĩ duyệt binh lướt qua màn hình từ trái sang phải */}
      <div className="parade-soldiers-marching-unit">
        {/* Lớp bóng đổ mặt đường diễu binh */}
        <div className="parade-ground-shadow" />

        {/* Khung ảnh thực tế khối tiêu binh duyệt binh hào hùng */}
        <div className="parade-soldiers-composite">
          <img
            src="/festive/soldiers-marching-29.jpg"
            alt="Khối tiêu binh duyệt binh Quân Đội Nhân Dân Việt Nam giương cờ Quyết Thắng"
            className="parade-soldiers-img"
          />

          {/* Dàn cờ Quyết Thắng đỏ sao vàng 3D bay dập dờn phía trên cán cờ */}
          <div className="parade-waving-flags-overlay">
            {[...Array(4)].map((_, idx) => (
              <div
                key={idx}
                className={`parade-mini-flag flag-${idx}`}
                style={{
                  left: `${20 + idx * 22}%`,
                  top: `${-20 - (idx % 2) * 12}px`,
                  animationDelay: `${idx * 0.18}s`,
                }}
              >
                <div className="mini-flag-cloth">
                  <span className="mini-flag-star">★</span>
                  <span className="mini-flag-text">QUYẾT THẮNG</span>
                  <span className="mini-flag-tassels" />
                </div>
              </div>
            ))}
          </div>

          {/* Tia sáng phản chiếu từ mũ kê-pi và găng tay trắng */}
          <div className="parade-glint-sparks">
            <span className="glint-spark glint-1">✨</span>
            <span className="glint-spark glint-2">✨</span>
            <span className="glint-spark glint-3">✨</span>
          </div>
        </div>

        {/* Dòng chữ khẩu hiệu rước cờ */}
        <div className="parade-banner-pill">
          <span>★ KHỐI TIÊU BINH DANH DỰ • QUYẾT CHIẾN QUYẾT THẮNG ★</span>
        </div>
      </div>
    </div>
  );
};
