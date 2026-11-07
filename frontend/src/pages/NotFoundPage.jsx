import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <section className="hero-banner" style={{ padding: '64px 0', minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <span className="hero-tag-pill">🧭 404 • Lạc Lối</span>
        <h1 className="hero-title">
          Trang Không Tồn Tại
        </h1>
        <p className="hero-subtitle" style={{ maxWidth: '580px', margin: '0 auto 20px' }}>
          Địa chỉ bạn đang tìm kiếm có thể đã bị xóa, đổi tên hoặc đường dẫn không chính xác.
        </p>
        <div style={{ marginTop: '16px' }}>
          <Link to="/" className="hero-back-link">
            &larr; Xem tất cả các câu chuyện khác
          </Link>
        </div>
      </div>
    </section>
  );
};

