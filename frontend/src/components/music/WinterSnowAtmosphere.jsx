import React, { useEffect, useRef } from 'react';

/**
 * Hiệu ứng tuyết rơi mùa đông lãng mạn & tối ưu hiệu năng (Zero Lag Canvas 2D)
 * Tuân thủ Quy tắc 3 GEMINI.md:
 * - Lưu requestAnimationFrame và dọn dẹp triệt để bằng cancelAnimationFrame khi unmount.
 * - Tự động tạm dừng render khi tab trình duyệt bị ẩn (Page Visibility API).
 */
export const WinterSnowAtmosphere = ({ density = 35, speed = 0.6, enabled = true }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = null;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    // Kiểm tra chế độ giảm chuyển động của hệ điều hành (Chế độ tiết kiệm pin/hỗ trợ thị giác)
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Khởi tạo tập hợp hạt tuyết cố định, tối ưu số lượng trên điện thoại/webview để tiết kiệm pin & GPU
    const isMobile = width <= 640;
    const count = prefersReducedMotion
      ? Math.min(density, 10)
      : isMobile
      ? Math.min(density, 20)
      : Math.min(density, 60);
    const effectiveSpeed = prefersReducedMotion ? speed * 0.4 : speed;
    const snowflakes = [];

    for (let i = 0; i < count; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8,
        density: Math.random() * count,
        baseSpeed: (Math.random() * 0.8 + 0.4) * effectiveSpeed,
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

        // Vẽ bông tuyết hạt mềm mượt mà tự nhiên (Soft Radial Gradient Particle)
        // Tâm sáng tinh khiết, viền ngoài lan tỏa mờ dịu vào không gian, không tốn GPU shadowBlur
        const grad = ctx.createRadialGradient(
          flake.x,
          flake.y,
          0,
          flake.x,
          flake.y,
          flake.radius
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${flake.opacity})`);
        grad.addColorStop(0.4, `rgba(224, 242, 254, ${flake.opacity * 0.8})`);
        grad.addColorStop(1, 'rgba(224, 242, 254, 0)');

        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.closePath();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animationFrameId = requestAnimationFrame(render);

    // Dọn dẹp bắt buộc (Quy tắc 3 GEMINI.md)
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [density, speed, enabled]);

  return (
    <canvas
      ref={canvasRef}
      className="winter-snow-canvas"
      aria-hidden="true"
    />
  );
};
