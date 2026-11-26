import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const footerTags = [
    { label: '#Burnout', tag: 'Burnout' },
    { label: '#Overtime', tag: 'Overtime' },
    { label: '#CareerCrisis', tag: 'CareerCrisis' },
    { label: '#ChuyểnNgành', tag: 'ChuyểnNgành' },
    { label: '#SmallWins', tag: 'SmallWins' },
    { label: '#SứcKhỏeTinhThần', tag: 'SứcKhỏeTinhThần' },
    { label: '#ImpostorSyndrome', tag: 'ImpostorSyndrome' },
  ];

  return (
    <footer className="site-footer" id="footer-contact">
      <div className="container">
        <div className="footer-grid">
          {/* Column 1: Giới thiệu blog & Thông tin liên hệ */}
          <div className="footer-col">
            <h3>You Can't Stop Here</h3>
            <p>
              Không gian an toàn để bạn trút bỏ những áp lực, sự hoang mang trong công việc
              và tìm lại động lực từ những lời động viên chân thành của cộng đồng người đi làm.
            </p>

            {/* Thông tin liên hệ trực tiếp SĐT & Email */}
            <div
              className="footer-contact-block"
              style={{
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Liên Hệ &amp; Hỗ Trợ:
              </div>

              <a
                href="tel:0931465310"
                style={{
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#38bdf8';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
                title="Gọi điện hoặc nhắn Zalo hỗ trợ: 0931465310"
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  <i className="fa-solid fa-phone"></i>
                </span>
                <span>Hotline / Zalo: <strong style={{ color: '#38bdf8' }}>0931465310</strong></span>
              </a>

              <a
                href="mailto:Anthonyq012025@gmail.com"
                style={{
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#34d399';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
                title="Gửi thư điện tử tới: Anthonyq012025@gmail.com"
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'rgba(52, 211, 153, 0.15)',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  <i className="fa-solid fa-envelope"></i>
                </span>
                <span>Email: <strong style={{ color: '#34d399' }}>Anthonyq012025@gmail.com</strong></span>
              </a>
            </div>
          </div>

          {/* Column 2: Thẻ từ khóa (Tags) - Có thể bấm vào để lọc bài viết */}
          <div className="footer-col">
            <h3>Chủ Đề Quan Tâm</h3>
            <div className="footer-tags">
              {footerTags.map((item, idx) => (
                <Link
                  key={idx}
                  to={`/?tag=${encodeURIComponent(item.tag)}`}
                  className="footer-tag-item"
                  title={`Xem các bài viết về ${item.label}`}
                  style={{ textDecoration: 'none' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-meta">
            <p>
              © {new Date().getFullYear()} YOU CAN'T STOP HERE. Luôn luôn có một lối đi tiếp cho bạn. •{' '}
              <a href="tel:0931465310" style={{ color: '#38bdf8', textDecoration: 'none' }}>0931465310</a> •{' '}
              <a href="mailto:Anthonyq012025@gmail.com" style={{ color: '#34d399', textDecoration: 'none' }}>Anthonyq012025@gmail.com</a>
            </p>
            <div className="footer-author-credit">
              <span>Phát triển bởi </span>
              <a
                href="https://www.facebook.com/anthony.qill/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-author-fb-link"
                aria-label="Trang Facebook cá nhân của Trần Đỉnh Quân (Anthony)"
                title="Mở Facebook cá nhân của Trần Đỉnh Quân (Anthony) ở tab mới"
              >
                <i className="fa-brands fa-facebook footer-author-fb-icon" aria-hidden="true"></i>
                <span className="footer-author-fb-name">Trần Đỉnh Quân (Anthony)</span>
              </a>
            </div>
          </div>
          <div className="footer-bottom-links">
            <Link to="/" style={{ color: 'var(--text-light)' }}>Trang chủ</Link>
            <Link to="/music" style={{ color: '#38bdf8', textDecoration: 'none' }}>Không gian nhạc ❄️</Link>
            <a href="#root" style={{ color: 'var(--primary-color)' }}>Lên đầu trang ↑</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
