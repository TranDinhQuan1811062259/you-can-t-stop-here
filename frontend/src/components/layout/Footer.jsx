import React from 'react';
import { Link } from 'react-router-dom';
import { playClickSound } from '../../utils/soundEffects';

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

  const handleScrollToTop = () => {
    playClickSound();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <footer className="site-footer" id="footer-contact">
      <div className="container">
        <div className="footer-grid">
          {/* Column 1: Giới thiệu blog & Thông tin liên hệ */}
          <div className="footer-col">
            <h3>You Can't Stop Here</h3>
            <p className="footer-desc">
              Không gian an toàn để bạn trút bỏ những áp lực, sự hoang mang trong công việc
              và tìm lại động lực từ những lời động viên chân thành của cộng đồng người đi làm.
            </p>

            {/* Thông tin liên hệ trực tiếp SĐT, Email & Kết nối tác giả */}
            <div className="footer-contact-block">
              <div className="footer-contact-meta">
                Liên Hệ &amp; Hỗ Trợ:
              </div>

              <a
                href="tel:0931465310"
                className="footer-contact-link"
                title="Gọi điện hoặc nhắn Zalo hỗ trợ: 0931465310"
              >
                <span className="footer-contact-icon footer-contact-icon--phone" aria-hidden="true">
                  <i className="fa-solid fa-phone"></i>
                </span>
                <span>
                  Hotline / Zalo:{' '}
                  <strong className="footer-contact-link--fb">0931465310</strong>
                </span>
              </a>

              <a
                href="mailto:Anthonyq012025@gmail.com"
                className="footer-contact-link"
                title="Gửi thư điện tử tới: Anthonyq012025@gmail.com"
              >
                <span className="footer-contact-icon footer-contact-icon--email" aria-hidden="true">
                  <i className="fa-solid fa-envelope"></i>
                </span>
                <span>
                  Email:{' '}
                  <strong className="footer-contact-link--zalo">Anthonyq012025@gmail.com</strong>
                </span>
              </a>

              {/* Hàng Liên hệ & Kết nối chứa 3 badge tác giả đồng bộ (Facebook, LinkedIn, GitHub) */}
              <div className="footer-connect-block">
                <span className="footer-connect-label">Liên hệ &amp; Kết nối:</span>
                <div className="footer-author-links">
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

                  <a
                    href="https://www.linkedin.com/in/anthonyqill/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-author-social-badge is-linkedin"
                    aria-label="Hồ sơ LinkedIn của Trần Đỉnh Quân (Anthony)"
                    title="Mở hồ sơ LinkedIn của Trần Đỉnh Quân (Anthony) ở tab mới"
                  >
                    <i className="fa-brands fa-linkedin footer-author-social-icon" aria-hidden="true"></i>
                    <span>LinkedIn</span>
                  </a>

                  <a
                    href="https://github.com/TranDinhQuan1811062259"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-author-social-badge is-github"
                    aria-label="Trang GitHub của Trần Đỉnh Quân (Anthony)"
                    title="Mở GitHub của Trần Đỉnh Quân (Anthony) ở tab mới"
                  >
                    <i className="fa-brands fa-github footer-author-social-icon" aria-hidden="true"></i>
                    <span>GitHub</span>
                  </a>
                </div>
              </div>
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
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} YOU CAN&apos;T STOP HERE. Luôn luôn có một lối đi tiếp cho bạn.
          </p>
          <div className="footer-bottom-links">
            <Link
              to="/"
              state={{ transitionDirection: 'prev', targetSlug: '', forceScrollTop: true }}
              onClick={() => playClickSound()}
              className="footer-bottom-nav-link"
            >
              Trang chủ
            </Link>
            <Link
              to="/music"
              state={{ transitionDirection: 'next', targetSlug: '__music__' }}
              onClick={() => playClickSound()}
              className="footer-bottom-nav-link is-music"
            >
              Không gian nhạc ❄️
            </Link>
            <button
              type="button"
              onClick={handleScrollToTop}
              className="footer-bottom-nav-link is-top-btn"
              aria-label="Cuộn lên đầu trang"
            >
              Lên đầu trang ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
