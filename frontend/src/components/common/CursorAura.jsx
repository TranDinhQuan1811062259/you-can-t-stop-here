import React, { useEffect, useState, useRef } from 'react';

/**
 * Hiệu ứng hào quang / vệt sáng lia chuột mượt mà (Cursor Glow & Click Ripple)
 */
export const CursorAura = () => {
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    // Không kích hoạt trên thiết bị cảm ứng (touchscreen)
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const handleMouseDown = (e) => {
      const newRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };
      setRipples((prev) => [...prev.slice(-4), newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 550);
    };

    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return (
    <>
      {/* Sóng phản hồi nhấp chuột nhẹ nhàng khi bấm (Không có đốm bám theo chuột) */}
      {ripples.map((rip) => (
        <span
          key={rip.id}
          className="cursor-click-ripple"
          style={{ left: rip.x, top: rip.y }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

