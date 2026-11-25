import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getWarmCachedUserProfile, authService } from '../../services/authService';
import apiClient from '../../services/apiClient';
import { playClickSound } from '../../utils/soundEffects';
import { getHighestBadge } from '../../utils/badgeHelper';
import { MutualMemoriesDrawer } from './MutualMemoriesDrawer';

// Module-level cache cho điểm gắn kết 2 chiều (TTL 60 giây)
const mutualBondCache = new Map();
const BOND_CACHE_TTL_MS = 60 * 1000;

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 7.5a3 3 0 100 6 3 3 0 000-6zm-6.75 10.5a7.48 7.48 0 0113.5 0 8.22 8.22 0 01-13.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";

const getSafeAvatar = (user, fallback = '') => {
  if (user?.avatar && !user.avatar.includes('/images/man.jpg') && !user.avatar.includes('google_avatar')) {
    return user.avatar;
  }
  if (fallback && !fallback.includes('/images/man.jpg') && !fallback.includes('google_avatar')) {
    return fallback;
  }
  if (user?.role === 'admin' || user?.email === 'anthonyq012025@gmail.com') {
    return '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
  }
  return DEFAULT_AVATAR;
};

/**
 * 🌟 AuthorQuickPeekWrapper:
 * - Khi hover vào vùng tác giả trên Desktop (>= 260ms, chỉ bật khi có chuột), hiển thị tooltip card mini.
 * - [QA & Bảo mật]: Không hiện cho chính mình, chỉ hiện khi đã đăng nhập, dọn dẹp sạch timer.
 * - [Hiệu năng & Mobile UX]: Giữ nguyên touch trên màn hình 360px-430px, không layout shift.
 */
export const AuthorQuickPeekWrapper = ({
  targetUserId,
  fallbackName = 'Thành viên',
  fallbackAvatar = '',
  fallbackJob = '',
  className = '',
  style = {},
  children,
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [bondData, setBondData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const enterTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const popoverRef = useRef(null);
  const wrapperRef = useRef(null);

  const cleanTargetId = targetUserId ? String(targetUserId).trim() : '';
  const currentUserId = currentUser?._id || currentUser?.id ? String(currentUser._id || currentUser.id).trim() : '';

  // Chỉ bật hover Quick-Peek khi:
  // 1. Đã đăng nhập
  // 2. Không phải là chính mình
  // 3. Target ID hợp lệ
  const isSelf = Boolean(currentUserId && cleanTargetId && currentUserId === cleanTargetId);
  const canQuickPeek = Boolean(isAuthenticated && currentUserId && cleanTargetId && !isSelf);

  const clearTimers = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const loadPeekData = useCallback(async () => {
    if (!cleanTargetId || !canQuickPeek) return;

    setLoading(true);

    // 1. Lấy dữ liệu hồ sơ từ warm-cache hoặc API
    try {
      const warm = getWarmCachedUserProfile(cleanTargetId);
      if (warm?.data?.user) {
        setUserData(warm.data.user);
      } else {
        const res = await authService.getUserProfile(cleanTargetId);
        if (res?.data?.user) {
          setUserData(res.data.user);
        }
      }
    } catch (_) {
      // Fallback dữ liệu từ props
    }

    // 2. Lấy dữ liệu Mutual Bond (có cache nhẹ)
    try {
      const cacheKey = `${currentUserId}:${cleanTargetId}`;
      const cached = mutualBondCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < BOND_CACHE_TTL_MS) {
        setBondData(cached.data);
      } else {
        const bondRes = await apiClient.get(`/user/bonds/${cleanTargetId}`);
        const bondInfo = bondRes?.data?.data || null;
        if (bondInfo) {
          mutualBondCache.set(cacheKey, { data: bondInfo, cachedAt: Date.now() });
          setBondData(bondInfo);
        }
      }
    } catch (_) {
      // Lỗi hoặc chưa có tương tác
    } finally {
      setLoading(false);
    }
  }, [canQuickPeek, cleanTargetId, currentUserId]);

  const handleMouseEnter = useCallback(() => {
    // Chỉ kích hoạt trên thiết bị có chuột (Desktop / Laptop)
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isFinePointer || !canQuickPeek) return;

    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    if (isVisible) return;

    // Delay 260ms tránh popover bật loạn xạ khi lướt chuột nhanh
    enterTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      loadPeekData();
    }, 260);
  }, [canQuickPeek, isVisible, loadPeekData]);

  const handleMouseLeave = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }

    // Delay 140ms để người dùng kịp di chuột từ avatar/tên vào bên trong QuickPeekCard
    leaveTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 140);
  }, []);

  // Lắng nghe phím Escape và click ra ngoài để đóng tooltip
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearTimers();
        setIsVisible(false);
      }
    };

    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        clearTimers();
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [clearTimers, isVisible]);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const displayUser = userData || {
    name: fallbackName,
    avatar: fallbackAvatar,
    jobTitle: fallbackJob,
  };

  const finalAvatar = getSafeAvatar(displayUser, fallbackAvatar);
  const honorBadge = getHighestBadge(displayUser?.streakCount);
  const profileUrl = `/profile/${cleanTargetId || encodeURIComponent(fallbackName)}`;
  const tierInfo = bondData?.tierInfo || null;
  const mutualScore = bondData?.mutualScore || 0;

  return (
    <div
      ref={wrapperRef}
      className={`author-quick-peek-anchor ${className}`.trim()}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Popover Card */}
      {isVisible && canQuickPeek && (
        <div
          ref={popoverRef}
          className="author-quick-peek-card"
          onMouseEnter={() => {
            if (leaveTimerRef.current) {
              clearTimeout(leaveTimerRef.current);
              leaveTimerRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={`Thẻ nhanh hồ sơ của ${displayUser.name}`}
        >
          {/* Header Card với Avatar và Tên */}
          <div className="peek-header-row">
            <Link to={profileUrl} className="peek-avatar-link" onClick={() => setIsVisible(false)}>
              <img
                src={finalAvatar}
                alt={displayUser.name}
                className={`peek-avatar-img frame-${displayUser.customLayout?.frameStyle || 'none'}`}
              />
            </Link>

            <div className="peek-info-col">
              <div className="peek-name-row">
                <Link to={profileUrl} className="peek-name-link" onClick={() => setIsVisible(false)}>
                  <span className="peek-user-name">{displayUser.name}</span>
                </Link>
                {displayUser.role === 'admin' && <span className="peek-badge-admin">ADMIN</span>}
              </div>

              {displayUser.jobTitle ? (
                <div className="peek-job-text">{displayUser.jobTitle}</div>
              ) : (
                <div className="peek-job-text">Thành viên cộng đồng</div>
              )}

              {honorBadge && (
                <div
                  className="peek-streak-badge"
                  style={{
                    background: honorBadge.bg,
                    color: honorBadge.color,
                    border: `1px solid ${honorBadge.border}`,
                  }}
                  title={`Chuỗi ${displayUser?.streakCount || 0} ngày giữ lửa: ${honorBadge.desc}`}
                >
                  <span>{honorBadge.icon}</span>
                  <span>{honorBadge.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tiểu sử ngắn gọn */}
          {displayUser.bio && (
            <p className="peek-bio-text">
              {displayUser.bio.length > 90 ? `${displayUser.bio.slice(0, 90)}...` : displayUser.bio}
            </p>
          )}

          {/* Dải gắn kết 2 chiều (Mutual Bond Row) */}
          <div className="peek-bond-bar">
            {loading && !bondData ? (
              <span className="peek-bond-loading">Đang đọc sợi dây gắn kết...</span>
            ) : mutualScore > 0 && tierInfo ? (
              <div className="peek-bond-active-wrap">
                <div
                  className="peek-bond-pill"
                  style={{
                    background: tierInfo.bg || 'rgba(56, 189, 248, 0.15)',
                    color: tierInfo.color || '#38bdf8',
                    border: `1px solid ${tierInfo.border || 'rgba(56, 189, 248, 0.35)'}`,
                  }}
                  title={`Điểm gắn kết 2 chiều: ${mutualScore} điểm`}
                >
                  <span className="peek-bond-icon">{tierInfo.icon || '🤝'}</span>
                  <span className="peek-bond-name">{tierInfo.name}</span>
                  <span className="peek-bond-score">({mutualScore}đ)</span>
                </div>

                <button
                  type="button"
                  className="peek-bond-action-btn"
                  onClick={() => {
                    playClickSound();
                    setIsVisible(false);
                    setIsDrawerOpen(true);
                  }}
                  title={`Mở Nhật Ký Tri Kỷ cùng ${displayUser.name}`}
                >
                  📖 Nhật Ký
                </button>
              </div>
            ) : (
              <div className="peek-bond-fresh-wrap">
                <span className="peek-bond-fresh-tag">🌱 Mới kết nối</span>
                <span className="peek-bond-fresh-hint">Tương tác bài viết để tích lũy điểm tri kỷ</span>
              </div>
            )}
          </div>

          {/* Chân thẻ: Nút xem trang cá nhân */}
          <div className="peek-footer-row">
            <Link
              to={profileUrl}
              className="peek-view-profile-btn"
              onClick={() => setIsVisible(false)}
            >
              <span>Xem hồ sơ</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      )}

      {/* Drawer Nhật Ký Tri Kỷ mở trực tiếp khi bấm nút trên QuickPeekCard */}
      {isDrawerOpen && cleanTargetId && (
        <MutualMemoriesDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          targetUserId={cleanTargetId}
          partnerName={displayUser.name}
          partnerAvatar={finalAvatar}
        />
      )}
    </div>
  );
};

export default AuthorQuickPeekWrapper;
