import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { uploadService } from '../../services/uploadService';

const SAMPLE_AVATARS = [
  '/images/man.jpg',
  '/images/img2.jpg',
  '/images/1.jpg',
  '/images/2.jpg',
  '/images/3.jpg',
];

export const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUserProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    jobTitle: '',
    bio: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        jobTitle: user.jobTitle || '',
        bio: user.bio || '',
        avatar: user.avatar || '/images/man.jpg',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordChange(false);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErrorMsg('');

    // Tạo preview Base64 ngay lập tức
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result;
      setFormData((prev) => ({ ...prev, avatar: base64Url }));

      try {
        const result = await uploadService.uploadImage(file);
        if (result?.url) {
          setFormData((prev) => ({ ...prev, avatar: result.url }));
        }
      } catch (err) {
        console.warn('Lỗi upload avatar lên API, dùng ảnh cục bộ/Base64:', err.message);
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên hiển thị.');
      return;
    }

    if (showPasswordChange) {
      if (!formData.newPassword) {
        setErrorMsg('Vui lòng nhập mật khẩu mới nếu muốn đổi mật khẩu.');
        return;
      }
      if (formData.newPassword.length < 6) {
        setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setErrorMsg('Xác nhận mật khẩu mới không trùng khớp.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        name: formData.name.trim(),
        jobTitle: formData.jobTitle.trim(),
        bio: formData.bio.trim(),
        avatar: formData.avatar,
      };

      if (showPasswordChange && formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const res = await authService.updateProfile(payload);
      if (res.data) {
        updateUserProfile(res.data);
        setSuccessMsg('✓ Đã cập nhật thông tin tài khoản thành công!');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Không thể cập nhật thông tin lúc này. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: '580px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <h3 className="modal-heading">👤 Chỉnh Sửa Thông Tin Cá Nhân</h3>
        <p className="modal-subtitle">
          Cập nhật tên hiển thị, chức danh, ảnh đại diện và thông tin của bạn.
        </p>

        {errorMsg && <div className="modal-error">{errorMsg}</div>}
        {successMsg && (
          <div
            style={{
              background: '#ecfdf5',
              borderLeft: '4px solid #10b981',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '0.88rem',
              marginBottom: '14px',
              fontWeight: 500,
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Avatar Preview & Upload */}
          <div className="form-group" style={{ textAlign: 'center' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Ảnh đại diện</label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <img
                src={formData.avatar || '/images/man.jpg'}
                alt={formData.name}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--primary-color)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                }}
              />
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? '⏳ Đang tải ảnh...' : '📷 Tải ảnh mới từ máy tính'}
              </button>
              <input
                type="file"
                ref={avatarInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFileChange}
              />
            </div>

            {/* Avatar Presets */}
            <div style={{ marginTop: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Hoặc chọn nhanh ảnh đại diện:
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                {SAMPLE_AVATARS.map((av, idx) => (
                  <img
                    key={idx}
                    src={av}
                    alt={`Avatar ${idx + 1}`}
                    onClick={() => setFormData({ ...formData, avatar: av })}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: formData.avatar === av ? '2px solid var(--primary-color)' : '1px solid #ddd',
                      opacity: formData.avatar === av ? 1 : 0.65,
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Họ và tên hiển thị *</label>
            <input
              type="text"
              name="name"
              placeholder="Ví dụ: Trần Đình Quân"
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
              placeholder="Ví dụ: System Admin & Lead Dev / Frontend Dev..."
              value={formData.jobTitle}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Email tài khoản</label>
            <input
              type="email"
              value={user.email}
              disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
            />
          </div>

          <div className="form-group">
            <label>Giới thiệu ngắn gọn về bản thân (Bio)</label>
            <textarea
              name="bio"
              rows={3}
              placeholder="Đang cố gắng vượt qua từng ngày bão giông nơi công sở..."
              value={formData.bio}
              onChange={handleChange}
            />
          </div>

          {/* Đổi mật khẩu toggle */}
          <div style={{ marginTop: '10px', marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={showPasswordChange}
                onChange={(e) => setShowPasswordChange(e.target.checked)}
              />
              <span style={{ fontWeight: 600, color: 'var(--bg-dark)' }}>🔐 Tôi muốn đổi mật khẩu</span>
            </label>
          </div>

          {showPasswordChange && (
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div className="form-group">
                <label>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  name="currentPassword"
                  placeholder="Nhập mật khẩu hiện tại (mặc định 123456)"
                  value={formData.currentPassword}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Nhập mật khẩu mới"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu mới"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              className="page-btn"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="modal-submit-btn"
              style={{ flex: 2, margin: 0 }}
              disabled={loading || uploadingAvatar}
            >
              {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

