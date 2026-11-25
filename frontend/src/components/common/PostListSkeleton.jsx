import React from 'react';

export const PostListSkeleton = ({ count = 6, label = 'Đang chuyển không gian bài viết...' }) => {
  const items = Array.from({ length: Math.max(1, count) });

  return (
    <div
      className="post-list-skeleton-wrap"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div className="posts-grid">
        {items.map((_, index) => (
          <div key={index} className="post-card post-card-skeleton" aria-hidden="true">
            <div className="card-img-wrap skeleton-box" />
            <div className="card-content">
              <div className="card-author-row">
                <div className="skeleton-avatar skeleton-box" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="skeleton-line skeleton-box" style={{ width: '48%', height: '13px', marginBottom: '6px' }} />
                  <div className="skeleton-line skeleton-box" style={{ width: '32%', height: '10px' }} />
                </div>
              </div>

              <div className="skeleton-line skeleton-box" style={{ width: '92%', height: '18px', marginBottom: '8px' }} />
              <div className="skeleton-line skeleton-box" style={{ width: '68%', height: '18px', marginBottom: '16px' }} />

              <div className="skeleton-line skeleton-box" style={{ width: '100%', height: '12px', marginBottom: '7px' }} />
              <div className="skeleton-line skeleton-box" style={{ width: '84%', height: '12px', marginBottom: '18px' }} />

              <div className="card-footer">
                <div className="skeleton-line skeleton-box" style={{ width: '96px', height: '14px' }} />
                <div className="skeleton-line skeleton-box" style={{ width: '78px', height: '14px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostListSkeleton;
