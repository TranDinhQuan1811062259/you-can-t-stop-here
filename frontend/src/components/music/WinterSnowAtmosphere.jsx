import React, { useEffect, useRef } from 'react';

/**
 * Hiệu ứng tuyết rơi mùa đông lãng mạn & tối ưu hiệu năng (Zero Lag Canvas 2D)
 * Tuân thủ Quy tắc 3 GEMINI.md:
 * - Lưu requestAnimationFrame và dọn dẹp triệt để bằng cancelAnimationFrame khi unmount.
 * - Tự động tạm dừng render khi tab trình duyệt bị ẩn (Page Visibility API).
 */
export const WinterSnowAtmosphere = ({ density = 35, speed = 0.6 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = null;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    // Khởi tạo tập hợp hạt tuyết cố định, không cấp phát thêm bộ nhớ trong vòng lặp render
    const count = Math.min(density, 60);
    const snowflakes = [];

    for (let i = 0; i < count; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8,
        density: Math.random() * count,
        baseSpeed: (Math.random() * 0.8 + 0.4) * speed,
        swaySpeed: Math.random() * 0.02 + 0.008,
        swayAngle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.6 + 0.25,
      });
    }

    // Xử lý thay đổi kích thước cửa sổ
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Vòng lặp vẽ tuyết
    let isTabVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (!isTabVisible) {
        animationFrameId = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < snowflakes.length; i++) {
        const flake = snowflakes[i];

        // Tính toán chuyển động lắc lư theo hàm sin
        flake.swayAngle += flake.swaySpeed;
        flake.y += flake.baseSpeed;
        flake.x += Math.sin(flake.swayAngle) * 0.6;

        // Vòng lặp tái sinh khi rơi hết màn hình
        if (flake.y > height + 5) {
          flake.y = -5;
          flake.x = Math.random() * width;
        }
        if (flake.x > width + 5) {
          flake.x = -5;
        } else if (flake.x < -5) {
          flake.x = width + 5;
        }

        // Vẽ bông tuyết với ánh sáng mờ sương
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 242, 254, ${flake.opacity})`;
        ctx.shadowColor = 'rgba(186, 230, 253, 0.4)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.closePath();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Dọn dẹp bắt buộc (Quy tắc 3 GEMINI.md)
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [density, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="winter-snow-canvas"
      aria-hidden="true"
    />
  );
};
