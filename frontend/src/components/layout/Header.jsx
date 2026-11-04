import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { CreatePostModal } from '../blog/CreatePostModal';
import { EditProfileModal } from '../auth/EditProfileModal';

export const Header = () => {
  const {
    user,
    isAuthenticated,
    logout,
    openLoginModal,
    openRegisterModal,
    isProfileModalOpen,
    openProfileModal,
    closeProfileModal,
  } = useAuth();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();

  const toggleNav = () => setIsNavOpen((prev) => !prev);
  const closeNav = () => setIsNavOpen(false);

  const handlePostCreated = (newPost) => {
    navigate(`/post/${newPost.slug}`);
    window.location.reload();
  };

  return (
    <>
      <header className="site-header">
        <div className="container header-container">
          {/* Logo & Brand Name */}
          <Link to="/" className="logo-link" onClick={closeNav}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>❤️</span>
            <span className="logo-text">YOU CAN'T STOP HERE</span>
          </Link>

          {/* Mobile Hamburger Toggle Button */}
          <button
            className="mobile-menu-btn"
            onClick={toggleNav}
            aria-label="Toggle Navigation"
          >
            {isNavOpen ? '✕' : '☰'}
          </button>

          {/* Navigation Links */}
          <ul className={`nav-menu ${isNavOpen ? 'open' : ''}`}>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeNav}
                end
              >
                Trang Chủ
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/category/ap-luc-kiet-suc-burnout"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeNav}
              >
                Burnout
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/category/chuyen-nganh-bat-dau-lai-restart"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeNav}
              >
                Bắt Đầu Lại
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/category/nhung-tia-sang-dong-luc-small-wins"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeNav}
              >
                Small Wins
              </NavLink>
            </li>

            {/* Auth Actions inside Nav */}
            <li className="header-auth-group">
              {isAuthenticated ? (
                <div className="header-user-badge">
                  <button
                    className="write-post-btn"
                    onClick={() => {
                      setIsCreateOpen(true);
                      closeNav();
                    }}
                  >
                    ✍️ Viết tâm sự
                  </button>

                  {/* Bấm vào avatar hoặc tên để mở popup chỉnh sửa thông tin cá nhân */}
                  <div
                    className="header-profile-click"
                    onClick={() => {
                      openProfileModal();
                      closeNav();
                    }}
                    title="Bấm để xem và chỉnh sửa thông tin tài khoản của bạn"
                  >
                    <img
                      src={user?.avatar || '/images/man.jpg'}
                      alt={user?.name}
                      className="header-avatar"
                    />
                    <span className="header-username">
                      {user?.name}
                      {user?.role === 'admin' && (
                        <span
                          className="admin-badge-tag"
                          style={{
                            background: '#e74c3c',
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginLeft: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          👑 ADMIN
                        </span>
                      )}
                    </span>
                  </div>

                  <button
                    className="header-account-btn"
                    onClick={() => {
                      openProfileModal();
                      closeNav();
                    }}
                    title="Cài đặt thông tin tài khoản"
                  >
                    ⚙️ Tài khoản
                  </button>

                  <button
                    className="header-logout-btn"
                    onClick={() => {
                      logout();
                      closeNav();
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="header-guest-btns">
                  <button
                    type="button"
                    className="nav-btn-login"
                    onClick={() => {
                      openLoginModal();
                      closeNav();
                    }}
                  >
                    Đăng Nhập
                  </button>
                  <button
                    type="button"
                    className="nav-btn-register"
                    onClick={() => {
                      openRegisterModal();
                      closeNav();
                    }}
                  >
                    Đăng Ký
                  </button>
                </div>
              )}
            </li>
          </ul>
        </div>
      </header>

      {/* Auth Modal (Login / Register Popup) */}
      <AuthModal />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />
    </>
  );
};
