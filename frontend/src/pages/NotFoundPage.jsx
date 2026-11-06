import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1 style={{ fontSize: '5rem', color: 'var(--primary-color)', fontFamily: 'var(--font-serif)' }}>
        404
      </h1>
      <h2 style={{ marginBottom: '16px', color: 'var(--bg-dark)' }}>
        Trang Không Tồn Tại
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        Địa chỉ bạn đang tìm kiếm có thể đã bị xóa hoặc đường dẫn không chính xác.
      </p>
      <Link to="/" className="back-home-btn">
        &larr; Trở về Trang Chủ
      </Link>
    </div>
  );
};

