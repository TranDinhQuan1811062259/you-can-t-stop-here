import React from 'react';

/**
 * SoldiersParade29 - Hoạt cảnh đoàn quân tiêu binh & chiến sĩ duyệt binh rước cờ Tổ quốc & cờ Quyết Thắng
 * Tái hiện chuẩn xác theo 2 hình ảnh thực tế:
 * - Khối tiêu binh duyệt binh rước cờ Quyết Thắng (Báo Quân Đội Nhân Dân)
 * - Người chiến sĩ K20 tác chiến dũng cảm kiên cường
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

        {/* Cụm khối tiêu binh + chiến sĩ K20 dẫn đầu */}
        <div className="parade-formation-duo" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
          {/* Người chiến sĩ K20 dẫn đầu đội hình */}
          <div
            className="parade-vanguard-soldier"
            style={{
              width: '180px',
              height: '240px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '2px solid #facc15',
              boxShadow: '0 8px 30px rgba(220, 38, 38, 0.6)',
              position: 'relative',
              flexShrink: 0,
              background: '#0f172a',
            }}
          >
            <img
              src="/festive/soldier-vietnam-k20.jpg"
              alt="Chiến sĩ Quân Đội Nhân Dân Việt Nam K20"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                background: 'rgba(218, 37, 29, 0.9)',
                color: '#ffff00',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid #facc15',
              }}
            >
              ★ K20
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.95))',
                padding: '6px 8px',
                color: '#facc15',
                fontSize: '0.72rem',
                fontWeight: 900,
                textAlign: 'center',
              }}
            >
              CHIẾN SĨ TIÊN PHONG
            </div>
          </div>

          {/* Khung ảnh thực tế khối tiêu binh duyệt binh hào hùng */}
          <div className="parade-soldiers-composite" style={{ flex: 1, minWidth: '420px' }}>
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
        </div>

        {/* Dòng chữ khẩu hiệu rước cờ */}
        <div className="parade-banner-pill" style={{ marginTop: '12px' }}>
          <span>★ KHỐI TIÊU BINH & CHIẾN SĨ QĐNDVN • QUYẾT CHIẾN QUYẾT THẮNG ★</span>
        </div>
      </div>
    </div>
  );
};
