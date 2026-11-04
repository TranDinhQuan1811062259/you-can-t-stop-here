import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="site-footer" id="footer-contact">
      <div className="container">
        <div className="footer-grid">
          {/* Column 1: Giới thiệu blog */}
          <div className="footer-col">
            <h3>You Can't Stop Here</h3>
            <p>
              Không gian an toàn để bạn trút bỏ những áp lực, sự hoang mang trong công việc
              và tìm lại động lực từ những lời động viên chân thành của cộng đồng người đi làm.
            </p>
          </div>

          {/* Column 2: Thẻ từ khóa (Tags) */}
          <div className="footer-col">
            <h3>Chủ Đề Quan Tâm</h3>
            <div className="footer-tags">
              <span className="footer-tag-item">#Burnout</span>
              <span className="footer-tag-item">#Overtime</span>
              <span className="footer-tag-item">#CareerCrisis</span>
              <span className="footer-tag-item">#ChuyểnNgành</span>
              <span className="footer-tag-item">#SmallWins</span>
              <span className="footer-tag-item">#SứcKhỏeTinhThần</span>
              <span className="footer-tag-item">#ImpostorSyndrome</span>
            </div>
          </div>

          {/* Column 3: Đăng ký nhận bài viết mới */}
          <div className="footer-col">
            <h3>Đồng Hành Cùng Nhau</h3>
            <p style={{ marginBottom: '12px' }}>
              Mỗi tuần một câu chuyện tiếp thêm sức mạnh tinh thần được gửi vào hòm thư:
            </p>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #4a5568',
                  background: '#1a202c',
                  color: '#fff',
                  flexGrow: 1,
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 14px',
                  background: 'var(--primary-color)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Nhận tin
              </button>
            </form>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} YOU CAN'T STOP HERE. Luôn luôn có một lối đi tiếp cho bạn.</p>
          <div>
            <Link to="/" style={{ color: 'var(--text-light)', marginRight: '16px' }}>Trang chủ</Link>
            <a href="#root" style={{ color: 'var(--primary-color)' }}>Lên đầu trang ↑</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
