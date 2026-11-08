import React from 'react';
import { Soldier3DCanvas } from './Soldier3DCanvas';

/**
 * SoldiersParade29 - Hoạt cảnh người chiến sĩ QĐNDVN 3D giương cao cờ Quyết Thắng lướt duyệt binh qua màn hình
 * Áp dụng hoàn toàn mô hình 3D WebGL Three.js thay thế hoàn toàn ảnh 2D cũ.
 */
export const SoldiersParade29 = ({ className = '', style = {} }) => {
  return (
    <div
      className={`soldiers-parade-29-container ${className}`}
      style={{
        position: 'absolute',
        bottom: '6%',
        left: 0,
        width: '100%',
        height: '340px',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 10,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Mô hình Chiến Sĩ 3D WebGL Three.js bước diễu binh mang cờ Quyết Thắng 3D */}
      <Soldier3DCanvas
        mode="parade"
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, zIndex: 2 }}
      />

      {/* Dòng chữ khẩu hiệu rước cờ hào hùng */}
      <div
        className="parade-banner-pill"
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(218, 37, 29, 0.94) 0%, rgba(185, 28, 28, 0.94) 100%)',
          color: '#fef08a',
          border: '1.5px solid #facc15',
          borderRadius: '999px',
          padding: '6px 18px',
          fontWeight: 900,
          fontSize: '0.82rem',
          letterSpacing: '0.6px',
          boxShadow: '0 4px 20px rgba(218, 37, 29, 0.6)',
          zIndex: 3,
          whiteSpace: 'nowrap',
        }}
      >
        <span>★ NGƯỜI CHIẾN SĨ QUÂN ĐỘI NHÂN DÂN VIỆT NAM • QUYẾT CHIẾN QUYẾT THẮNG ★</span>
      </div>
    </div>
  );
};
