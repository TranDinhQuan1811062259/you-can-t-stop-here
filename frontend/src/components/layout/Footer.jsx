import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { newsletterService } from '../../services/newsletterService';

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
      setMessage(
        res.data?.message ||
        `✓ Đã xác nhận email tồn tại và gửi thư thành công tới ${email}! Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác/spam).`
      );
      if (res.data?.data?.previewUrl) {
        setPreviewUrl(res.data.data.previewUrl);
      }
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(
        err.message || 'Địa chỉ email này không hợp lệ hoặc không thể nhận thư. Vui lòng kiểm tra lại!'
      );
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
          {/* Column 1: Giới thiệu blog */}
          <div className="footer-col">
            <h3>You Can't Stop Here</h3>
            <p>
              Không gian an toàn để bạn trút bỏ những áp lực, sự hoang mang trong công việc
              và tìm lại động lực từ những lời động viên chân thành của cộng đồng người đi làm.
            </p>
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

            <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="Nhập email của bạn (ví dụ: anthonyq012025@gmail.com)"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status !== 'idle') setStatus('idle');
                  }}
                  disabled={loading}
                  required
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #4a5568',
                    background: '#1a202c',
                    color: '#fff',
                    flexGrow: 1,
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    background: loading ? '#475569' : 'var(--primary-color)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? '⏳ Đang gửi...' : 'Nhận tin'}
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
