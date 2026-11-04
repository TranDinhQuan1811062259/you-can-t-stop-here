import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const AuthModal = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    closeAuthModal,
    login,
    register,
  } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    jobTitle: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleQuickLogin = (email, password = 'password123') => {
    setAuthModalMode('login');
    setFormData((prev) => ({ ...prev, email, password }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (authModalMode === 'login') {
        await login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          jobTitle: formData.jobTitle || 'Thành viên cộng đồng',
        });
      }
    } catch (err) {
      if (err.message === 'Network Error' || err.message?.includes('Network Error')) {
        setErrorMsg(
          'Không thể kết nối đến Backend (Cổng 5050)! Hãy chắc chắn bạn đã mở terminal gõ: npm run dev trong thư mục backend nhé.'
        );
      } else {
        setErrorMsg(err.message || 'Thao tác thất bại, vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Nút đóng modal */}
        <button className="modal-close-btn" onClick={closeAuthModal}>
          ✕
        </button>

        {/* Chuyển tab Đăng nhập / Đăng ký */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${authModalMode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setAuthModalMode('login');
              setErrorMsg('');
            }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            className={`modal-tab ${authModalMode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setAuthModalMode('register');
              setErrorMsg('');
            }}
          >
            Đăng Ký
          </button>
        </div>

        <p className="modal-subtitle">
          {authModalMode === 'login'
            ? 'Đăng nhập để chia sẻ câu chuyện và gửi lời động viên tới mọi người.'
            : 'Tham gia không gian sẻ chia "You Can\'t Stop Here" cùng những người đi làm.'}
        </p>

        {errorMsg && <div className="modal-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {authModalMode === 'register' && (
            <>
              <div className="form-group">
                <label>Họ tên hoặc Biệt danh *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Ví dụ: Đình Quân Trần"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Công việc / Vị trí hiện tại</label>
                <input
                  type="text"
                  name="jobTitle"
                  placeholder="Ví dụ: Dev, Designer, PM..."
                  value={formData.jobTitle}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Địa chỉ Email *</label>
            <input
              type="email"
              name="email"
              placeholder="anthonyq012025@gmail.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu (mặc định các tài khoản mẫu: 123456) *</label>
            <input
              type="password"
              name="password"
              placeholder="••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="modal-submit-btn"
            disabled={loading}
          >
            {loading
              ? 'Đang xử lý...'
              : authModalMode === 'login'
              ? 'Đăng Nhập Ngay'
              : 'Tạo Tài Khoản Mới'}
          </button>
        </form>

        {/* Quick test accounts box */}
        <div style={{
          marginTop: '18px',
          padding: '12px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '8px',
          fontSize: '0.8rem',
        }}>
          <p style={{ fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            ⚡ Tài khoản mẫu có sẵn (Mật khẩu: 123456):
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="page-btn"
              style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#e74c3c', color: '#c0392b' }}
              onClick={() => handleQuickLogin('anthonyq012025@gmail.com', '123456')}
            >
              👑 Admin (Đình Quân)
            </button>
            <button
              type="button"
              className="page-btn"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => handleQuickLogin('minhanh@cantstophere.com', '123456')}
            >
              ✍️ Tác giả (Minh Anh)
            </button>
            <button
              type="button"
              className="page-btn"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => handleQuickLogin('nam.pm@cantstophere.com', '123456')}
            >
              ✍️ Tác giả (Thành Nam)
            </button>
          </div>
        </div>

        <div className="modal-footer-note">
          {authModalMode === 'login' ? (
            <p>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => setAuthModalMode('register')}
              >
                Đăng ký ngay
              </button>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => setAuthModalMode('login')}
              >
                Đăng nhập
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
