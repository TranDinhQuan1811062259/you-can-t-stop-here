import React, { useState, useEffect } from 'react';
import { playClickSound, playWaterDropSound, playStarChimeSound, playWarmthSound } from '../../utils/soundEffects';

export const CommunityResilienceTree = () => {
  const [waterCount, setWaterCount] = useState(() => {
    return parseInt(localStorage.getItem('freedom_tree_water_count') || '142', 10);
  });
  const [leavesCount, setLeavesCount] = useState(() => {
    return parseInt(localStorage.getItem('freedom_tree_leaves_count') || '1428', 10);
  });
  const [activeDrops, setActiveDrops] = useState([]);
  const [fireflies, setFireflies] = useState([]);
  const [isGlowing, setIsGlowing] = useState(false);
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);

  // Thả đom đóm ngẫu nhiên ban đầu
  useEffect(() => {
    const initialFlies = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20,
      dur: Math.random() * 4 + 3,
    }));
    setFireflies(initialFlies);
  }, []);

  // Tưới nước cho cây
  const handleWaterTree = (e) => {
    e.stopPropagation();
    playWaterDropSound();

    const dropId = Date.now() + Math.random();
    setActiveDrops((prev) => [...prev, { id: dropId, x: Math.random() * 40 + 30 }]);
    setTimeout(() => {
      setActiveDrops((prev) => prev.filter((d) => d.id !== dropId));
    }, 1200);

    // Tăng số lượt tưới và lá mầm
    const nextWater = waterCount + 1;
    const nextLeaves = leavesCount + 3;
    setWaterCount(nextWater);
    setLeavesCount(nextLeaves);
    try {
      localStorage.setItem('freedom_tree_water_count', String(nextWater));
      localStorage.setItem('freedom_tree_leaves_count', String(nextLeaves));
    } catch (_) {}

    setIsGlowing(true);
    setTimeout(() => setIsGlowing(false), 800);
  };

  // Thêm hoa anh đào hy vọng
  const handleAddFlower = (e) => {
    e.stopPropagation();
    playStarChimeSound();
    const nextLeaves = leavesCount + 5;
    setLeavesCount(nextLeaves);
    try {
      localStorage.setItem('freedom_tree_leaves_count', String(nextLeaves));
    } catch (_) {}

    setIsGlowing(true);
    setTimeout(() => setIsGlowing(false), 900);
  };

  // Thả thêm đàn đom đóm
  const handleSpawnFireflies = (e) => {
    e.stopPropagation();
    playWarmthSound();
    const newFlies = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 10,
      dur: Math.random() * 4 + 3,
    }));
    setFireflies((prev) => [...prev.slice(-12), ...newFlies]);
  };

  return (
    <section
      className="community-resilience-tree-section"
      style={{
        marginTop: '18px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.85) 0%, rgba(236, 253, 245, 0.95) 100%)',
        border: '1.5px solid #86efac',
        borderRadius: '24px',
        padding: '18px 24px',
        boxShadow: '0 8px 30px rgba(16, 185, 129, 0.1)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Vệt hào quang phát sáng khi cây được tưới */}
      {isGlowing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle, rgba(74, 222, 128, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
            animation: 'fadeInOut 0.8s ease',
          }}
        />
      )}

      {/* Header Khối Cây Hồi Sinh */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setIsTreeExpanded((prev) => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.7rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
            🌳
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.64rem', background: '#059669', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                CỘNG ĐỒNG LIVE
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#166534', fontWeight: 900 }}>
                Cây Hồi Sinh & Tái Tạo Năng Lượng (Tree of Resilience)
              </strong>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#15803d' }}>
              Mỗi giọt nước bạn tưới hay mỗi deadline bạn xả sẽ làm đâm chồi những mầm sống hy vọng!
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Huy hiệu số mầm đã nở */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #86efac',
              borderRadius: '999px',
              padding: '4px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#059669',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🌱</span>
            <span>{leavesCount.toLocaleString()} Mầm Hy Vọng</span>
          </div>

          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              color: '#15803d',
              cursor: 'pointer',
              padding: '4px',
            }}
            title={isTreeExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isTreeExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Nội dung tương tác cây (Khi mở rộng) */}
      {isTreeExpanded && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Khu Vực Cây Sinh Thái Tương Tác 3D */}
          <div
            style={{
              height: '160px',
              background: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)',
              border: '1px solid #a7f3d0',
              borderRadius: '16px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Đom đóm bay phập phồng */}
            {fireflies.map((ff) => (
              <span
                key={ff.id}
                style={{
                  position: 'absolute',
                  left: `${ff.x}%`,
                  top: `${ff.y}%`,
                  fontSize: '0.75rem',
                  filter: 'drop-shadow(0 0 6px #fde047)',
                  animation: `summerSparkleGlow ${ff.dur}s ease-in-out infinite alternate`,
                  pointerEvents: 'none',
                }}
              >
                ✨
              </span>
            ))}

            {/* Giọt nước rơi xuống khi tưới */}
            {activeDrops.map((d) => (
              <span
                key={d.id}
                style={{
                  position: 'absolute',
                  left: `${d.x}%`,
                  top: '10px',
                  fontSize: '1.4rem',
                  animation: 'foodNomNom 0.8s ease-in forwards',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                💧
              </span>
            ))}

            {/* Cây Cổ Thụ Biểu Tượng Trung Tâm */}
            <div
              style={{
                textAlign: 'center',
                transform: isGlowing ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div style={{ fontSize: '4.8rem', lineHeight: 1, filter: 'drop-shadow(0 6px 12px rgba(16, 185, 129, 0.35))' }}>
                🌳
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#15803d',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <span>Đã được tưới {waterCount} lần hôm nay</span>
              </div>
            </div>
          </div>

          {/* Thanh Nút Hành Động Chăm Sóc Cây */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Nút Tưới Nước */}
              <button
                type="button"
                onClick={handleWaterTree}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span>💧</span>
                <span>Tưới Nước Cho Cây</span>
              </button>

              {/* Nút Thêm Cánh Hoa */}
              <button
                type="button"
                onClick={handleAddFlower}
                style={{
                  background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span>🌸</span>
                <span>Thêm Cánh Hoa Hy Vọng</span>
              </button>

              {/* Nút Thả Đom Đóm */}
              <button
                type="button"
                onClick={handleSpawnFireflies}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #eab308)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span>✨</span>
                <span>Thả Đom Đóm Đêm</span>
              </button>
            </div>

            <span style={{ fontSize: '0.74rem', color: '#166534', fontStyle: 'italic' }}>
              Mỗi hành động của bạn đều giúp cộng đồng tươi sáng hơn 🌿
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
