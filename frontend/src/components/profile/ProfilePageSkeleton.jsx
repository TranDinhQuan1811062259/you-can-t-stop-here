import React from 'react';

/**
 * 🌟 ProfilePageSkeleton: Hiệu ứng Shimmer Skeleton đồng bộ chuẩn tỷ lệ bố cục UserProfilePage
 * - Chống giật layout (Cumulative Layout Shift = 0) khi truy cập trực tiếp bằng URL (Cache Miss)
 * - Tương thích mượt mà cả Desktop và Mobile (360px - 430px)
 */
export const ProfilePageSkeleton = ({ label = 'Đang chuẩn bị không gian trang cá nhân...' }) => {
  return (
    <div
      className="user-profile-page container profile-skeleton-container"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      style={{ pointerEvents: 'none' }}
    >
      {/* 1. Header Card Skeleton */}
      <div className="profile-header-card" style={{ overflow: 'hidden' }}>
        {/* Cover Banner */}
        <div
          className="profile-cover-banner skeleton-box"
          style={{ height: '140px', width: '100%', borderRadius: '16px 16px 0 0' }}
        />

        {/* Content Row */}
        <div className="profile-header-content" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Avatar tròn lớn */}
          <div className="profile-avatar-wrap" style={{ marginTop: '-55px', flexShrink: 0 }}>
            <div
              className="skeleton-box"
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                border: '4px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              }}
            />
          </div>

          {/* Meta Info */}
          <div className="profile-main-meta" style={{ flex: 1, minWidth: '260px', paddingTop: '10px' }}>
            {/* Tên & Badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div
                className="skeleton-line skeleton-box"
                style={{ width: '210px', height: '28px', borderRadius: '6px' }}
              />
              <div
                className="skeleton-line skeleton-box"
                style={{ width: '88px', height: '24px', borderRadius: '999px' }}
              />
              <div
                className="skeleton-line skeleton-box"
                style={{ width: '110px', height: '24px', borderRadius: '999px' }}
              />
            </div>

            {/* Chức danh & Bio */}
            <div
              className="skeleton-line skeleton-box"
              style={{ width: '150px', height: '16px', marginBottom: '10px', borderRadius: '4px' }}
            />
            <div
              className="skeleton-line skeleton-box"
              style={{ width: '92%', height: '14px', marginBottom: '8px', borderRadius: '4px' }}
            />
            <div
              className="skeleton-line skeleton-box"
              style={{ width: '64%', height: '14px', marginBottom: '18px', borderRadius: '4px' }}
            />

            {/* Hàng số liệu thống kê (Stats Grid) */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div
                className="skeleton-box"
                style={{ width: '84px', height: '52px', borderRadius: '10px' }}
              />
              <div
                className="skeleton-box"
                style={{ width: '84px', height: '52px', borderRadius: '10px' }}
              />
              <div
                className="skeleton-box"
                style={{ width: '84px', height: '52px', borderRadius: '10px' }}
              />
            </div>
          </div>

          {/* Nút hành động góc phải */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', paddingTop: '12px', flexWrap: 'wrap' }}>
            <div
              className="skeleton-box"
              style={{ width: '110px', height: '38px', borderRadius: '12px' }}
            />
            <div
              className="skeleton-box"
              style={{ width: '42px', height: '38px', borderRadius: '12px' }}
            />
          </div>
        </div>
      </div>

      {/* 2. Tiêu đề danh sách bài viết */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', marginTop: '32px' }}>
        <div
          className="skeleton-line skeleton-box"
          style={{ width: '190px', height: '24px', borderRadius: '6px' }}
        />
        <div
          className="skeleton-line skeleton-box"
          style={{ width: '90px', height: '18px', borderRadius: '4px' }}
        />
      </div>

      {/* 3. Lưới bài viết Skeleton Grid (6 cards chống giật layout) */}
      <div className="posts-grid" style={{ pointerEvents: 'none' }}>
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div key={idx} className="post-card post-card-skeleton" aria-hidden="true">
            <div className="card-img-wrap skeleton-box" style={{ height: '200px' }} />
            <div className="card-content" style={{ padding: '16px' }}>
              <div className="card-author-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div className="skeleton-avatar skeleton-box" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="skeleton-line skeleton-box" style={{ width: '50%', height: '13px', marginBottom: '6px' }} />
                  <div className="skeleton-line skeleton-box" style={{ width: '30%', height: '10px' }} />
                </div>
              </div>

              <div className="skeleton-line skeleton-box" style={{ width: '90%', height: '18px', marginBottom: '8px' }} />
              <div className="skeleton-line skeleton-box" style={{ width: '65%', height: '18px', marginBottom: '16px' }} />

              <div className="skeleton-line skeleton-box" style={{ width: '100%', height: '12px', marginBottom: '7px' }} />
              <div className="skeleton-line skeleton-box" style={{ width: '82%', height: '12px', marginBottom: '18px' }} />

              <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px' }}>
                <div className="skeleton-line skeleton-box" style={{ width: '88px', height: '14px' }} />
                <div className="skeleton-line skeleton-box" style={{ width: '68px', height: '14px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfilePageSkeleton;
