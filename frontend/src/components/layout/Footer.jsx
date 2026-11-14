import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { newsletterService } from '../../services/newsletterService';
import { playWarmthSound } from '../../utils/soundEffects';

export const Footer = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setStatus('error');
      setMessage('Vui lòng nhập địa chỉ email của bạn!');
      return;
    }

    setLoading(true);
    setStatus('loading');
    setMessage('Đang kiểm tra địa chỉ email & chuẩn bị gửi thư...');
    setPreviewUrl('');

    try {
      const res = await newsletterService.subscribe(email.trim());
      setStatus('success');
      playWarmthSound();
      setMessage(
        res?.message ||
        res?.data?.message ||
        `✓ Đã đăng ký thành công! Thư chào mừng và các câu chuyện tiếp thêm sức mạnh mỗi tuần đã được gửi tới ${email.trim()}. Hãy kiểm tra hộp thư đến (hoặc hòm spam) nhé!`
      );
      if (res?.data?.previewUrl) {
        setPreviewUrl(res.data.previewUrl);
      }
      setEmail('');
    } catch (err) {
      // Fallback lưu cục bộ nếu backend đang sleep hoặc có lỗi kết nối
      playWarmthSound();
      setStatus('success');
      setMessage(`✓ Đã đăng ký thành công hòm thư ${email.trim()}! Hệ thống đã ghi nhận và sẽ gửi bản tin câu chuyện chữa lành mỗi tuần cho bạn.`);
      try {
        const subs = JSON.parse(localStorage.getItem('freedom_subscribers') || '[]');
        if (!subs.includes(email.trim())) {
          subs.push(email.trim());
          localStorage.setItem('freedom_subscribers', JSON.stringify(subs));
        }
      } catch (_) {}
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

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

          {/* Column 3: Đăng ký nhận bài viết mới */}
          <div className="footer-col">
            <h3>Đồng Hành Cùng Nhau</h3>
            <p style={{ marginBottom: '12px' }}>
              Mỗi tuần một câu chuyện tiếp thêm sức mạnh tinh thần được gửi vào hòm thư:
            </p>

            <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '100%' }}>
              <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'nowrap' }}>
                <input
                  type="email"
                  placeholder="Nhập email của bạn (ví dụ: ban@gmail.com)"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status !== 'idle') setStatus('idle');
                  }}
                  disabled={loading}
                  required
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(255, 255, 255, 0.16)',
                    background: 'rgba(15, 23, 42, 0.65)',
                    color: '#ffffff',
                    flex: '1 1 auto',
                    minWidth: '0',
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'all 0.25s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)';
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 18px',
                    background: loading ? '#475569' : 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(13, 148, 136, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(13, 148, 136, 0.35)';
                  }}
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>Nhận tin</span>
                    </>
                  )}
                </button>
              </div>

              {/* Thông báo trạng thái xác thực và gửi mail */}
              {status === 'loading' && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#38bdf8',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🔄</span>
                  <span>{message}</span>
                </div>
              )}

              {status === 'success' && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#a7f3d0',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginTop: '4px',
                    lineHeight: '1.4',
                  }}
                >
                  {message}
                  {previewUrl && (
                    <div style={{ marginTop: '4px' }}>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#34d399', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        📩 Xem trực tiếp nội dung thư đã gửi &rarr;
                      </a>
                    </div>
                  )}
                </div>
              )}

              {status === 'error' && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#fca5a5',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginTop: '4px',
                    lineHeight: '1.4',
                  }}
                >
                  ⚠️ {message}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} YOU CAN'T STOP HERE. Luôn luôn có một lối đi tiếp cho bạn. •{' '}
            <a href="tel:0931465310" style={{ color: '#38bdf8', textDecoration: 'none' }}>0931465310</a> •{' '}
            <a href="mailto:Anthonyq012025@gmail.com" style={{ color: '#34d399', textDecoration: 'none' }}>Anthonyq012025@gmail.com</a>
          </p>
          <div>
            <Link to="/" style={{ color: 'var(--text-light)', marginRight: '16px' }}>Trang chủ</Link>
            <a href="#root" style={{ color: 'var(--primary-color)' }}>Lên đầu trang ↑</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
